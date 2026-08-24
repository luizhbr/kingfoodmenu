// ============================================================
// WHATSAPP — controller (webhook Meta + Central WhatsApp Admin)
// ============================================================
// O backend King Food continua sendo a fonte da verdade.
// Este controller gerencia o CANAL WhatsApp: webhook, status,
// bot on/off, handoff humano e teste de conexão.
// Secrets nunca são expostos — apenas flags e status.

import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/db.js';
import { auditLog } from '../lib/audit.js';
import {
  extractMetaMessages,
  markMetaRead,
  sendMetaText,
  verifyMetaSignature,
} from '../lib/whatsapp-bot/meta.js';
import { processMessage } from '../lib/whatsapp-bot/router.js';
import { whatsappSessionManager } from '../lib/whatsapp-adapter/session-manager.js';
import { emptyCart } from '../lib/whatsapp-bot/cart.js';
import { SESSION_TTL_MS } from '../lib/whatsapp-bot/types.js';
import type { BotContext, BotReply, InboundMessage } from '../lib/whatsapp-bot/types.js';

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || '';
const APP_SECRET = process.env.META_APP_SECRET || '';
const N8N_BASE_URL = process.env.N8N_BASE_URL || '';
const KINGFOOD_API_URL = process.env.KINGFOOD_API_URL || '';

// ── n8n (orquestração externa) ─────────────────────────────────────
// Arquitetura oficial: Meta → Backend (valida/persiste) → n8n → Backend → Meta.
// O backend é o gateway de segurança; o n8n processa intenção/IA e retorna.
// Se o n8n estiver indisponível ou não configurado, o backend usa o
// processamento local (router.ts) como fallback — nunca falha silencioso.
export async function callN8n(event: Record<string, unknown>, timeoutMs = 8000): Promise<{ ok: boolean; reply?: string; error?: string }> {
  const baseUrl = process.env.N8N_BASE_URL || '';
  if (!baseUrl) return { ok: false, error: 'N8N_BASE_URL ausente' };
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/webhook/whatsapp/incoming`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { ok: false, error: `n8n HTTP ${res.status}` };
    const data = (await res.json()) as Record<string, unknown>;
    const reply = data?.reply || data?.text || data?.output;
    if (!reply) return { ok: false, error: 'n8n respondeu sem texto' };
    return { ok: true, reply: String(reply) };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ── Helpers ─────────────────────────────────────────────────────

async function getOrCreateIntegration(): Promise<any> {
  let integration = await prisma.whatsAppIntegration.findFirst();
  if (!integration) {
    integration = await prisma.whatsAppIntegration.create({
      data: {
        provider: 'meta',
        status: 'CONFIGURATION_PENDING',
        botEnabled: false,
        phoneNumber: process.env.WHATSAPP_NOTIFY_NUMBER || null,
        phoneNumberId: process.env.META_PHONE_NUMBER_ID || null,
        webhookConfigured: Boolean(process.env.META_VERIFY_TOKEN),
        webhookVerified: false,
      },
    });
  }
  return integration;
}

function publicIntegration(integration: any) {
  // NUNCA expor tokens/secrets — apenas status e flags.
  return {
    id: integration.id,
    provider: integration.provider,
    status: integration.status,
    botEnabled: integration.botEnabled,
    phoneNumber: integration.phoneNumber,
    displayName: integration.displayName,
    phoneNumberId: integration.phoneNumberId ? '••••••••' + integration.phoneNumberId.slice(-4) : null,
    businessAccountId: integration.businessAccountId ? '••••••••' + integration.businessAccountId.slice(-4) : null,
    webhookConfigured: integration.webhookConfigured,
    webhookVerified: integration.webhookVerified,
    lastWebhookAt: integration.lastWebhookAt,
    lastMessageAt: integration.lastMessageAt,
    lastError: integration.lastError,
    lastErrorAt: integration.lastErrorAt,
    lastTestAt: integration.lastTestAt,
    lastTestStatus: integration.lastTestStatus,
    n8nStatus: integration.n8nStatus,
    n8nLastExecutionAt: integration.n8nLastExecutionAt,
    n8nLastError: integration.n8nLastError,
    updatedAt: integration.updatedAt,
    // Flags de configuração (sem valores)
    config: {
      hasAccessToken: Boolean(process.env.META_ACCESS_TOKEN),
      hasAppSecret: Boolean(process.env.META_APP_SECRET),
      hasVerifyToken: Boolean(process.env.META_VERIFY_TOKEN),
      hasPhoneNumberId: Boolean(process.env.META_PHONE_NUMBER_ID),
      hasN8nUrl: Boolean(process.env.N8N_BASE_URL),
      hasAiKey: Boolean(process.env.AI_API_KEY || process.env.OLLAMA_API_KEY),
    },
  };
}

async function findOrCreateConversation(integrationId: string, phone: string, name?: string) {
  const now = new Date();
  // Vincula ao Customer existente pelo telefone (sem duplicar clientes).
  // Normaliza para dígitos e busca pelo sufixo E.164.
  const digits = (phone || '').replace(/\D/g, '');
  const suffix = digits.slice(-10);
  const customer = suffix.length >= 10
    ? await prisma.customer.findFirst({ where: { phone: { endsWith: suffix } }, select: { id: true } })
    : null;

  let conversation = await prisma.whatsAppConversation.findUnique({
    where: { integrationId_whatsappNumber: { integrationId, whatsappNumber: phone } },
  });
  if (!conversation) {
    conversation = await prisma.whatsAppConversation.create({
      data: {
        integrationId,
        whatsappNumber: phone,
        customerId: customer?.id || null,
        state: emptyCart() as any,
        mode: 'BOT',
        lastMessageAt: now,
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      },
    });
  } else {
    // Sessão expirada → reset
    if (conversation.expiresAt < now) {
      conversation = await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          state: emptyCart() as any,
          mode: 'BOT',
          currentIntent: null,
          currentStep: null,
          lastMessageAt: now,
          expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
        },
      });
    } else {
      conversation = await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) },
      });
    }
  }
  return conversation;
}

// ── Webhook Meta ────────────────────────────────────────────────

/**
 * GET /api/whatsapp/webhook — verificação do webhook da Meta.
 * Meta chama com ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
 */
export async function verifyWebhook(req: Request, res: Response): Promise<void> {
  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;

  if (mode === 'subscribe' && VERIFY_TOKEN && token === VERIFY_TOKEN && challenge) {
    const integration = await getOrCreateIntegration();
    await prisma.whatsAppIntegration.update({
      where: { id: integration.id },
      data: { webhookVerified: true, lastWebhookAt: new Date() },
    });
    res.status(200).send(challenge);
    return;
  }
  res.status(403).send('Verification failed');
}


/** POST /api/whatsapp/process — chamado pelo n8n (workflow Incoming).
 *  O n8n processa intenção/IA e retorna { reply }. O backend valida,
 *  persiste e envia pela Meta Cloud API. Sem credenciais Meta, retorna
 *  a resposta sem enviar (não falha silencioso).
 */
export async function processN8nEvent(req: Request, res: Response): Promise<void> {
  // Proteção: token interno compartilhado com o n8n (N8N_WEBHOOK_SECRET).
  // Sem ele, qualquer um poderia forçar envio de mensagens pela Meta.
  const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || '';
  if (N8N_WEBHOOK_SECRET) {
    const token = req.headers['x-n8n-token'] as string | undefined;
    if (!token || token !== N8N_WEBHOOK_SECRET) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
  }
  const { reply, messageId, phone, conversationId } = req.body as {
    reply?: string;
    messageId?: string;
    phone?: string;
    conversationId?: string;
  };
  if (!reply || !phone) {
    res.status(400).json({ success: false, error: 'reply e phone são obrigatórios' });
    return;
  }
  const integration = await getOrCreateIntegration();
  const conv = conversationId
    ? await prisma.whatsAppConversation.findUnique({ where: { id: String(conversationId) } })
    : null;
  const targetConv = conv || (await findOrCreateConversation(integration.id, phone));

  // Persiste a resposta do n8n
  const stored = await prisma.whatsAppMessage.create({
    data: {
      conversationId: targetConv.id,
      messageId: `n8n_${crypto.randomUUID()}`,
      direction: 'OUTBOUND',
      type: 'text',
      text: reply,
      status: 'PROCESSED',
      intent: 'N8N',
    },
  });

  // Envia pela Meta Cloud API
  const send = await sendMetaText(phone, reply, { phoneNumberId: process.env.META_PHONE_NUMBER_ID || undefined });
  await prisma.whatsAppMessage.update({
    where: { id: stored.id },
    data: { status: send.ok ? 'SENT' : 'FAILED', error: send.ok ? null : send.reason || null },
  });
  await prisma.whatsAppIntegration.update({
    where: { id: integration.id },
    data: { n8nStatus: 'ONLINE', n8nLastExecutionAt: new Date(), n8nLastError: send.ok ? null : send.reason || null },
  });

  res.json({ success: true, data: { sent: send.ok, status: send.status } });
}

/**
 * POST /api/whatsapp/webhook — mensagens recebidas da Meta Cloud API.
 * Valida assinatura, deduplica por messageId, processa e responde.
 */
export async function receiveWebhook(req: Request, res: Response): Promise<void> {
  // 1. Validação de assinatura (fail-closed em produção)
  // express.raw() entrega Buffer — converter para string SEM re-serializar
  // (re-serializar quebraria o HMAC, que é calculado sobre os bytes exatos).
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8')
    : typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body);
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  if (APP_SECRET && !verifyMetaSignature(rawBody, signature || null, APP_SECRET)) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  // 2. Extrai mensagens
  const messages = extractMetaMessages(req.body as Record<string, unknown>);
  if (messages.length === 0) {
    // Pode ser um evento de status (delivered/read) — ack 200
    res.status(200).json({ received: true, processed: 0 });
    return;
  }

  const integration = await getOrCreateIntegration();
  await prisma.whatsAppIntegration.update({
    where: { id: integration.id },
    data: { lastWebhookAt: new Date(), lastMessageAt: new Date() },
  });

  // ACK imediato — a Meta espera resposta rápida (< 5s). O processamento
  // (incluindo IA com timeout de 30s) roda em background. A idempotência
  // por messageId garante que um retry da Meta nunca duplica processamento.
  res.status(200).json({ received: true, processed: messages.length });

  // Processamento em background (fire-and-forget). Em serverless, se o
  // runtime for encerrado antes do fim, o retry da Meta reprocessa com
  // segurança (messageId único já registrado → skip).
  void (async () => {
    for (const msg of messages) {
      try {
        // 3. Idempotência: messageId único
        const existing = await prisma.whatsAppMessage.findUnique({ where: { messageId: msg.messageId } });
        if (existing) continue; // já processada — nunca reprocessar

        // 4. Conversa
        const conversation = await findOrCreateConversation(integration.id, msg.phone, msg.name);

        // 5. Registra mensagem
        const stored = await prisma.whatsAppMessage.create({
          data: {
            conversationId: conversation.id,
            messageId: msg.messageId,
            direction: 'INBOUND',
            type: msg.type,
            text: msg.text,
            status: 'RECEIVED',
          },
        });

        // 6. Bot ligado? Processa e responde
        if (integration.botEnabled && conversation.mode === 'BOT') {
          try {
            const ctx: BotContext = {
              conversationId: conversation.id,
              integrationId: integration.id,
              whatsappNumber: msg.phone,
              customerId: conversation.customerId,
              customerName: msg.name,
              state: (conversation.state as any) || emptyCart(),
              mode: conversation.mode as any,
              currentIntent: conversation.currentIntent,
              currentStep: conversation.currentStep,
            };

            const inbound: InboundMessage = {
              messageId: msg.messageId,
              phone: msg.phone,
              name: msg.name,
              text: msg.text,
              timestamp: msg.timestamp,
              type: msg.type,
            };

            // Arquitetura oficial: Backend → n8n → Backend.
            // O n8n processa intenção/IA e retorna a resposta; se estiver
            // indisponível, o backend usa o processamento local (router.ts)
            // como fallback — nunca falha silencioso.
            let reply: BotReply;
            const n8nResult = await callN8n({
              event: 'message',
              messageId: msg.messageId,
              phone: msg.phone,
              name: msg.name,
              text: msg.text,
              timestamp: msg.timestamp,
              conversationId: conversation.id,
              integrationId: integration.id,
              customerId: conversation.customerId,
              state: ctx.state,
              mode: ctx.mode,
              currentIntent: ctx.currentIntent,
              currentStep: ctx.currentStep,
            });

            if (n8nResult.ok && n8nResult.reply) {
              reply = {
                text: n8nResult.reply,
                deterministic: false,
                intent: 'N8N',
                context: ctx,
              };
            } else {
              // Fallback local (n8n ausente/indisponível)
              if (n8nResult.error) {
                await prisma.whatsAppIntegration.update({
                  where: { id: integration.id },
                  data: { n8nStatus: 'OFFLINE', n8nLastError: n8nResult.error.slice(0, 500), n8nLastExecutionAt: new Date() },
                });
              }
              reply = await processMessage(ctx, inbound);
            }

            // Persiste estado atualizado
            await prisma.whatsAppConversation.update({
              where: { id: conversation.id },
              data: {
                state: ctx.state as any,
                currentIntent: ctx.currentIntent,
                currentStep: ctx.currentStep,
                mode: ctx.mode,
                customerId: ctx.customerId || null,
              },
            });

            await prisma.whatsAppMessage.update({
              where: { id: stored.id },
              data: { status: 'PROCESSED', intent: reply.intent },
            });

            // Envia resposta
            if (reply.text) {
              const send = await sendMetaText(msg.phone, reply.text, { phoneNumberId: msg.phoneNumberId });
              await prisma.whatsAppMessage.create({
                data: {
                  conversationId: conversation.id,
                  messageId: `out_${crypto.randomUUID()}`,
                  direction: 'OUTBOUND',
                  type: 'text',
                  text: reply.text,
                  status: send.ok ? 'SENT' : 'FAILED',
                  error: send.ok ? null : send.reason || null,
                },
              });
            }
          } catch (err) {
            console.error('[whatsapp-bot] process error:', String(err));
            await prisma.whatsAppMessage.update({
              where: { id: stored.id },
              data: { status: 'FAILED', error: String(err).slice(0, 500) },
            });
            await prisma.whatsAppIntegration.update({
              where: { id: integration.id },
              data: { lastError: String(err).slice(0, 500), lastErrorAt: new Date() },
            });
          }
        } else {
          // Bot desligado ou handoff humano: registra mas não responde
          await prisma.whatsAppMessage.update({
            where: { id: stored.id },
            data: { status: 'RECEIVED' },
          });
        }
      } catch (err) {
        console.error('[whatsapp-bot] background process error:', String(err));
      }
    }
  })();
}

// ── Central WhatsApp (Admin) ───────────────────────────────────

/** GET /api/whatsapp/status — status da integração (sem secrets). */
export async function getStatus(_req: Request, res: Response): Promise<void> {
  const integration = await getOrCreateIntegration();
  res.json({ success: true, data: publicIntegration(integration) });
}

/** POST /api/whatsapp/test — testa conexão (Meta, webhook, n8n, backend). */
export async function testConnection(_req: Request, res: Response): Promise<void> {
  const integration = await getOrCreateIntegration();
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  // Meta configurada?
  checks.meta = {
    ok: Boolean(process.env.META_ACCESS_TOKEN && process.env.META_PHONE_NUMBER_ID),
    detail: process.env.META_ACCESS_TOKEN && process.env.META_PHONE_NUMBER_ID
      ? 'configurado'
      : 'META_ACCESS_TOKEN / META_PHONE_NUMBER_ID ausentes',
  };

  // Webhook configurado?
  checks.webhook = {
    ok: Boolean(process.env.META_VERIFY_TOKEN && process.env.META_APP_SECRET),
    detail: process.env.META_VERIFY_TOKEN && process.env.META_APP_SECRET
      ? 'configurado'
      : 'META_VERIFY_TOKEN / META_APP_SECRET ausentes',
  };

  // n8n online?
  if (N8N_BASE_URL) {
    try {
      const r = await fetch(`${N8N_BASE_URL.replace(/\/$/, '')}/healthz`, { signal: AbortSignal.timeout(5000) });
      checks.n8n = { ok: r.ok, detail: r.ok ? 'online' : `HTTP ${r.status}` };
    } catch (err) {
      checks.n8n = { ok: false, detail: String(err) };
    }
  } else {
    checks.n8n = { ok: false, detail: 'N8N_BASE_URL ausente (opcional nesta fase)' };
  }

  // Backend (self)
  checks.backend = { ok: true, detail: 'online' };

  const allOk = Object.values(checks).every((c) => c.ok);
  // Sem credenciais reais → CONFIGURATION_PENDING (não fingir conexão)
  const hasMetaCreds = Boolean(process.env.META_ACCESS_TOKEN && process.env.META_PHONE_NUMBER_ID);
  const status = allOk ? 'CONNECTED' : hasMetaCreds ? 'ERROR' : 'CONFIGURATION_PENDING';
  await prisma.whatsAppIntegration.update({
    where: { id: integration.id },
    data: { status, lastTestAt: new Date(), lastTestStatus: allOk ? 'PASS' : 'FAIL' },
  });

  res.json({ success: true, data: { ok: allOk, status, checks } });
}

/** POST /api/whatsapp/test-message — envia mensagem de teste (SUPER_ADMIN/MANAGER). */
export async function sendTestMessage(req: Request, res: Response): Promise<void> {
  const { phone } = req.body as { phone?: string };
  if (!phone) {
    res.status(400).json({ success: false, error: 'phone é obrigatório' });
    return;
  }
  const integration = await getOrCreateIntegration();
  const send = await sendMetaText(phone, '✅ Teste do King Food WhatsApp! Conexão funcionando.');
  await prisma.whatsAppIntegration.update({
    where: { id: integration.id },
    data: { lastTestAt: new Date(), lastTestStatus: send.ok ? 'PASS' : 'FAIL', lastError: send.ok ? null : send.reason || null },
  });
  auditLog(req, { action: 'create', entity: 'WhatsAppTestMessage', details: { phone: phone.slice(0, 4) + '****' } });
  res.json({ success: send.ok, data: { ok: send.ok, status: send.status } });
}

/** POST /api/whatsapp/bot — liga/desliga o bot. */
export async function setBotEnabled(req: Request, res: Response): Promise<void> {
  const { enabled } = req.body as { enabled?: boolean };
  if (typeof enabled !== 'boolean') {
    res.status(400).json({ success: false, error: 'enabled (boolean) é obrigatório' });
    return;
  }
  const integration = await getOrCreateIntegration();
  await prisma.whatsAppIntegration.update({
    where: { id: integration.id },
    data: { botEnabled: enabled },
  });
  auditLog(req, {
    action: 'update',
    entity: 'WhatsAppBot',
    details: { enabled },
  });
  res.json({ success: true, data: { botEnabled: enabled } });
}

/** GET /api/whatsapp/conversations — conversas (handoff humano). */
export async function listConversations(_req: Request, res: Response): Promise<void> {
  const conversations = await prisma.whatsAppConversation.findMany({
    orderBy: { lastMessageAt: 'desc' },
    take: 50,
    select: {
      id: true,
      whatsappNumber: true,
      customerId: true,
      mode: true,
      currentIntent: true,
      currentStep: true,
      lastMessageAt: true,
      expiresAt: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { text: true, direction: true, createdAt: true },
      },
    },
  });
  res.json({ success: true, data: conversations });
}

/** POST /api/whatsapp/conversations/:id/handoff — assume/libera para o bot. */
export async function setHandoff(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id || '');
  const { mode } = req.body as { mode?: string };
  if (!['BOT', 'HUMAN', 'WAITING', 'CLOSED'].includes(mode || '')) {
    res.status(400).json({ success: false, error: 'mode inválido (BOT|HUMAN|WAITING|CLOSED)' });
    return;
  }
  const conversation = await prisma.whatsAppConversation.findUnique({ where: { id } });
  if (!conversation) {
    res.status(404).json({ success: false, error: 'Conversa não encontrada' });
    return;
  }
  await prisma.whatsAppConversation.update({ where: { id }, data: { mode: mode as string } });
  auditLog(req, { action: 'update', entity: 'WhatsAppHandoff', entityId: id, details: { mode } });
  res.json({ success: true, data: { id, mode } });
}

// ── Sessão WhatsApp Web (QR) — adapter não-oficial ──────────────────
// Sessão vinculada ao WhatsApp (não é a API oficial da Meta).
// Uso exclusivo para atendimento legítimo iniciado pelos clientes.
// O QR é entregue como data URL PNG com validade curta (2 min).
// A automação só responde se WHATSAPP_AUTOMATION_ENABLED=true.

/** GET /api/whatsapp/web/status — status + QR (quando disponível). */
export async function getWebStatus(_req: Request, res: Response): Promise<void> {
  try {
    const info = await whatsappSessionManager.status();
    res.json({ success: true, data: info });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

/** POST /api/whatsapp/web/connect — inicia conexão QR (idempotente). */
export async function connectWeb(_req: Request, res: Response): Promise<void> {
  try {
    const info = await whatsappSessionManager.connect();
    res.json({ success: true, data: info });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

/** POST /api/whatsapp/web/disconnect — desconecta SEM apagar a sessão. */
export async function disconnectWeb(_req: Request, res: Response): Promise<void> {
  try {
    const info = await whatsappSessionManager.disconnect();
    res.json({ success: true, data: info });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}

/** POST /api/whatsapp/web/logout — desconecta E apaga a sessão local. */
export async function logoutWeb(_req: Request, res: Response): Promise<void> {
  try {
    const info = await whatsappSessionManager.logout();
    res.json({ success: true, data: info });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
}
