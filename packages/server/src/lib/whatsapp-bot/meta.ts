// ============================================================
// WHATSAPP BOT — Meta WhatsApp Cloud API (oficial)
// ============================================================
// Envio de mensagens + validação de assinatura x-hub-signature-256.
// NUNCA armazena tokens; lê de env vars.

import crypto from 'crypto';

export interface MetaSendResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  status?: number;
  data?: unknown;
}

function graphBase(): string {
  const v = process.env.META_GRAPH_VERSION || 'v21.0';
  return `https://graph.facebook.com/${v}`;
}

export function metaConfigured(): boolean {
  return Boolean(process.env.META_ACCESS_TOKEN && process.env.META_PHONE_NUMBER_ID);
}

/**
 * Verifica x-hub-signature-256 (HMAC-SHA256 do raw body com META_APP_SECRET).
 * Formato esperado: "sha256=<hex>". Usa timingSafeEqual.
 */
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader || !appSecret) return false;
  if (!signatureHeader.startsWith('sha256=')) return false;
  const expectedHex = signatureHeader.slice('sha256='.length);
  if (!expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const computed = crypto.createHmac('sha256', appSecret).update(rawBody).digest();
  if (expected.length !== computed.length) return false;
  try {
    return crypto.timingSafeEqual(expected, computed);
  } catch {
    return false;
  }
}

/** Envia texto via Cloud API. */
export async function sendMetaText(
  toPhone: string,
  message: string,
  opts?: { phoneNumberId?: string; timeoutMs?: number }
): Promise<MetaSendResult> {
  const token = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = opts?.phoneNumberId || process.env.META_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { ok: false, skipped: true, reason: 'Meta não configurada (META_ACCESS_TOKEN / META_PHONE_NUMBER_ID)' };
  }
  if (!toPhone) return { ok: false, skipped: true, reason: 'telefone vazio' };

  const url = `${graphBase()}/${phoneNumberId}/messages`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 25_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toPhone.replace(/\D/g, ''),
        type: 'text',
        text: { preview_url: false, body: message },
      }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[whatsapp-bot:meta] send HTTP', res.status);
      return { ok: false, status: res.status, data };
    }
    return { ok: true, status: res.status, data };
  } catch (err) {
    console.error('[whatsapp-bot:meta] send error', String(err));
    return { ok: false, reason: String(err) };
  } finally {
    clearTimeout(timeout);
  }
}

/** Marca mensagem como lida (UX). */
export async function markMetaRead(messageId: string, phoneNumberId?: string): Promise<void> {
  const token = process.env.META_ACCESS_TOKEN;
  const pnid = phoneNumberId || process.env.META_PHONE_NUMBER_ID;
  if (!token || !pnid || !messageId) return;
  try {
    await fetch(`${graphBase()}/${pnid}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
  } catch {
    // não-bloqueante
  }
}

/** Extrai mensagens de texto do payload do webhook da Meta. */
export function extractMetaMessages(body: Record<string, unknown>): {
  phone: string;
  name: string;
  text: string;
  messageId: string;
  phoneNumberId: string;
  timestamp: string;
  type: string;
}[] {
  const entries = body?.entry;
  if (!Array.isArray(entries)) return [];
  const out: {
    phone: string;
    name: string;
    text: string;
    messageId: string;
    phoneNumberId: string;
    timestamp: string;
    type: string;
  }[] = [];
  for (const entry of entries) {
    const changes = entry?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = change?.value;
      if (!value) continue;
      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const messages = Array.isArray(value.messages) ? value.messages : [];
      const phoneNumberId = value.metadata?.phone_number_id || '';
      for (const msg of messages) {
        if (msg?.type !== 'text') continue;
        const contact = contacts.find((c: any) => c?.wa_id === msg.from) || contacts[0];
        out.push({
          phone: String(msg.from || contact?.wa_id || ''),
          name: String(contact?.profile?.name || 'Cliente'),
          text: String(msg.text?.body || ''),
          messageId: String(msg.id || ''),
          phoneNumberId: String(phoneNumberId),
          timestamp: String(msg.timestamp || ''),
          type: String(msg.type || 'text'),
        });
      }
    }
  }
  return out;
}
