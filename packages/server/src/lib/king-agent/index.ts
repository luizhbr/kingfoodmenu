// ============================================================
// KING AGENT — cérebro do atendimento (independente de canal)
// ============================================================
// Recebe mensagens normalizadas (site | whatsapp | mock) e produz
// respostas. NÃO conhece o mecanismo de transporte — só o adapter
// muda. Reutiliza o router/whatsapp-bot existente (determinístico
// + IA via Ollama Cloud) como motor de processamento.
//
// SEGURANÇA:
//  - REACTIVE MODE: só responde a mensagens do cliente. Nunca inicia.
//  - Loop protection: mensagens do próprio agente nunca são processadas.
//  - Idempotência: messageId único — nunca responde duas vezes.
//  - SafetyGate antes de qualquer envio.

import type { NormalizedMessage } from '../whatsapp-adapter/types.js';
import { SafetyGate } from './safety.js';
import { processMessage } from '../whatsapp-bot/router.js';
import { emptyCart } from '../whatsapp-bot/cart.js';
import type { AgentConversation, AgentResult, AgentMode } from './types.js';
import { toBotContext, toInboundMessage } from './types.js';

export { SafetyGate } from './safety.js';
export { AgentBridge } from './bridge.js';
export * from './types.js';

export interface KingAgentOptions {
  /** horário de atendimento (formato "HH:MM") — vazio = 24h */
  activeHours?: { start: string; end: string } | null;
  /** mensagem fora do horário */
  afterHoursMessage?: string;
  /** kill switch global (env WHATSAPP_AI_ENABLED) */
  aiEnabled?: boolean;
}

const DEFAULT_AFTER_HOURS =
  'Estamos fora do horário de atendimento. 🕐\nPosso registrar sua mensagem e respondemos assim que abrirmos.';

export class KingAgent {
  private safety: SafetyGate;
  private seenMessageIds = new Set<string>();
  private conversations = new Map<string, AgentConversation>();
  private options: KingAgentOptions;

  constructor(options: KingAgentOptions = {}, safety?: SafetyGate) {
    this.options = {
      activeHours: options.activeHours ?? null,
      afterHoursMessage: options.afterHoursMessage || DEFAULT_AFTER_HOURS,
      aiEnabled: options.aiEnabled ?? true,
    };
    this.safety = safety ?? new SafetyGate();
  }

  getSafetyGate(): SafetyGate {
    return this.safety;
  }

  /** Kill switch — desliga TODAS as respostas automáticas. */
  pauseAutomation(reason: string): void {
    this.safety.pauseAutomation(reason);
  }

  resumeAutomation(): void {
    this.safety.resumeAutomation();
  }

  isAutomationPaused(): boolean {
    return this.safety.isAutomationPaused();
  }

  /** Processa mensagem recebida (reactive mode). Retorna resposta a enviar, se houver. */
  async handleMessage(msg: NormalizedMessage): Promise<AgentResult> {
    // Loop protection: mensagem do próprio agente nunca é processada
    if (msg.fromAgent) {
      return { mode: 'PAUSED', deterministic: true, error: 'self-message ignored' };
    }

    // Idempotência: messageId já processado → ignorar
    if (this.seenMessageIds.has(msg.messageId)) {
      return { mode: 'PAUSED', deterministic: true, error: 'duplicate ignored' };
    }

    // SafetyGate (entrada)
    const inboundCheck = this.safety.checkInbound(msg.conversationId, msg.messageId, this.seenMessageIds);
    if (!inboundCheck.allow) {
      if (inboundCheck.code === 'DUPLICATE') return { mode: 'PAUSED', deterministic: true, error: 'duplicate ignored' };
      return { mode: 'HUMAN_ACTIVE', deterministic: true, needsHuman: true, error: inboundCheck.reason };
    }
    this.seenMessageIds.add(msg.messageId);

    // Conversa
    let conv = this.conversations.get(msg.conversationId);
    if (!conv) {
      conv = {
        conversationId: msg.conversationId,
        channel: msg.channel,
        senderId: msg.senderId,
        senderName: msg.senderName,
        mode: 'AI_ACTIVE',
        lastActivityAt: new Date().toISOString(),
        messageCount: 0,
      };
      this.conversations.set(msg.conversationId, conv);
    }
    conv.lastActivityAt = new Date().toISOString();
    conv.messageCount += 1;

    // Modo humano: não responde
    if (conv.mode === 'HUMAN_ACTIVE') {
      return { mode: 'HUMAN_ACTIVE', deterministic: true };
    }
    if (conv.mode === 'CLOSED') {
      return { mode: 'CLOSED', deterministic: true };
    }

    // Kill switch / automação desligada
    if (!this.options.aiEnabled || this.safety.isAutomationPaused()) {
      return { mode: 'PAUSED', deterministic: true, error: 'automation disabled' };
    }

    // Horário de atendimento
    if (this.options.activeHours && !this.isWithinHours(new Date())) {
      return {
        reply: this.options.afterHoursMessage,
        mode: 'PAUSED',
        deterministic: true,
        intent: 'STORE_HOURS',
      };
    }

    // Processa com o motor existente (determinístico + IA)
    try {
      const ctx = toBotContext(conv, emptyCart(), null, null);
      const inbound = toInboundMessage(msg);
      const botReply = await processMessage(ctx, inbound);

      // Handoff humano detectado pelo motor
      if (botReply.intent === 'HUMAN_SUPPORT' && ctx.mode === 'HUMAN') {
        conv.mode = 'HUMAN_ACTIVE';
        return { reply: botReply.text, mode: 'HUMAN_ACTIVE', deterministic: botReply.deterministic, intent: botReply.intent };
      }

      if (!botReply.text) {
        return { mode: conv.mode as any, deterministic: true };
      }

      // SafetyGate (saída) — antes de qualquer envio
      const outboundCheck = this.safety.checkOutbound(msg.conversationId, botReply.text, msg.senderId);
      if (!outboundCheck.allow) {
        this.safety.recordGlobalFailure();
        return { mode: 'HUMAN_ACTIVE', deterministic: true, needsHuman: true, error: outboundCheck.reason };
      }
      this.safety.recordGlobalSuccess();

      return {
        reply: botReply.text,
        mode: conv.mode as any,
        deterministic: botReply.deterministic,
        intent: botReply.intent,
      };
    } catch (err) {
      this.safety.recordError(msg.conversationId);
      this.safety.recordGlobalFailure();
      return {
        mode: 'PAUSED',
        deterministic: true,
        error: String(err),
      };
    }
  }

  /** Handoff humano (admin). */
  setMode(conversationId: string, mode: AgentMode): void {
    const conv = this.conversations.get(conversationId);
    if (conv) conv.mode = mode;
  }

  getConversation(conversationId: string): AgentConversation | undefined {
    return this.conversations.get(conversationId);
  }

  listConversations(): AgentConversation[] {
    return [...this.conversations.values()].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  }

  private isWithinHours(now: Date): boolean {
    const h = this.options.activeHours;
    if (!h) return true;
    const mins = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = h.start.split(':').map(Number);
    const [eh, em] = h.end.split(':').map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (start <= end) return mins >= start && mins < end;
    // horário que cruza a meia-noite (ex: 22:00 — 02:00)
    return mins >= start || mins < end;
  }
}
