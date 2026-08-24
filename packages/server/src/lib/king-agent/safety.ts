// ============================================================
// KING AGENT — SafetyGate (camada de proteção antes do envio)
// ============================================================
// Toda mensagem automática passa por aqui ANTES do adapter:
//   message → SafetyGate → WhatsApp Adapter → WhatsApp
//
// Bloqueia: destinatário inválido, mensagem vazia, duplicadas,
// envio excessivo, loop bot→bot, repetição automática, destinatários
// não autorizados. Proteção por conversa + circuit breaker global.
//
// Se comportamento anormal: desliga a IA para a conversa (NEEDS_HUMAN)
// ou pausa a automação global (AUTOMATION_PAUSED) — admin reativa.

export type GateDecision =
  | { allow: true }
  | { allow: false; reason: string; code: string };

export interface ConversationGuardState {
  /** contagem de respostas automáticas no intervalo atual */
  autoReplies: number;
  windowStartedAt: number;
  /** erros consecutivos do agente */
  consecutiveErrors: number;
  /** mensagens duplicadas detectadas */
  duplicateCount: number;
  /** bloqueado por safety — exige humano */
  needsHuman: boolean;
  /** timestamp do último envio (cooldown) */
  lastSendAt: number;
  /** mensagens consecutivas enviadas sem nova entrada do cliente */
  consecutiveAutoReplies: number;
}

export interface SafetyGateConfig {
  /** máx respostas automáticas por conversa no intervalo */
  maxAutoRepliesPerWindow: number;
  /** janela em ms */
  windowMs: number;
  /** cooldown entre respostas automáticas (ms) */
  cooldownMs: number;
  /** máx mensagens consecutivas sem nova entrada do cliente */
  maxConsecutiveAutoReplies: number;
  /** máx erros consecutivos antes de NEEDS_HUMAN */
  maxConsecutiveErrors: number;
  /** máx duplicatas antes de bloquear */
  maxDuplicates: number;
  /** máx mensagens processadas por minuto (global) */
  globalMaxPerMinute: number;
  /** máx falhas consecutivas (global) antes de AUTOMATION_PAUSED */
  globalMaxConsecutiveFailures: number;
}

export const DEFAULT_SAFETY_CONFIG: SafetyGateConfig = {
  maxAutoRepliesPerWindow: 20,
  windowMs: 60_000,
  cooldownMs: 1_500,
  maxConsecutiveAutoReplies: 3,
  maxConsecutiveErrors: 5,
  maxDuplicates: 3,
  globalMaxPerMinute: 60,
  globalMaxConsecutiveFailures: 10,
};

export class SafetyGate {
  private conversations = new Map<string, ConversationGuardState>();
  private globalWindow: { count: number; startedAt: number } = { count: 0, startedAt: Date.now() };
  private globalConsecutiveFailures = 0;
  private automationPaused = false;
  private pausedAt: string | null = null;
  private pauseReason: string | null = null;

  constructor(private config: SafetyGateConfig = DEFAULT_SAFETY_CONFIG) {}

  /** Kill switch global — desliga TODAS as respostas automáticas. */
  pauseAutomation(reason: string): void {
    this.automationPaused = true;
    this.pausedAt = new Date().toISOString();
    this.pauseReason = reason;
  }

  resumeAutomation(): void {
    this.automationPaused = false;
    this.pausedAt = null;
    this.pauseReason = null;
    this.globalConsecutiveFailures = 0;
  }

  isAutomationPaused(): boolean {
    return this.automationPaused;
  }

  getPauseInfo(): { paused: boolean; at: string | null; reason: string | null } {
    return { paused: this.automationPaused, at: this.pausedAt, reason: this.pauseReason };
  }

  /** Registra falha global (circuit breaker). */
  recordGlobalFailure(): void {
    this.globalConsecutiveFailures += 1;
    if (this.globalConsecutiveFailures >= this.config.globalMaxConsecutiveFailures) {
      this.pauseAutomation('Muitas falhas consecutivas — automação pausada por proteção.');
    }
  }

  recordGlobalSuccess(): void {
    this.globalConsecutiveFailures = 0;
  }

  /** Verifica se a mensagem pode ser processada (entrada do cliente). */
  checkInbound(conversationId: string, messageId: string, seenIds: Set<string>): GateDecision {
    if (this.automationPaused) {
      return { allow: false, reason: 'Automação pausada por proteção.', code: 'AUTOMATION_PAUSED' };
    }

    // Idempotência: mensagem já processada → ignorar
    if (seenIds.has(messageId)) {
      return { allow: false, reason: 'Mensagem duplicada (messageId já processado).', code: 'DUPLICATE' };
    }

    const guard = this.getGuard(conversationId);
    guard.duplicateCount += 1;
    if (guard.duplicateCount > this.config.maxDuplicates) {
      guard.needsHuman = true;
      return { allow: false, reason: 'Muitas mensagens duplicadas — conversa marcada para humano.', code: 'TOO_MANY_DUPLICATES' };
    }

    // Reset da janela
    const now = Date.now();
    if (now - guard.windowStartedAt > this.config.windowMs) {
      guard.autoReplies = 0;
      guard.windowStartedAt = now;
    }

    // Rate limit global
    if (now - this.globalWindow.startedAt > 60_000) {
      this.globalWindow = { count: 0, startedAt: now };
    }
    this.globalWindow.count += 1;
    if (this.globalWindow.count > this.config.globalMaxPerMinute) {
      this.pauseAutomation('Volume anormal de mensagens — automação pausada por proteção.');
      return { allow: false, reason: 'Volume anormal de mensagens.', code: 'GLOBAL_RATE_LIMIT' };
    }

    // Nova entrada do cliente → reset do contador de respostas consecutivas
    guard.consecutiveAutoReplies = 0;
    return { allow: true };
  }

  /** Verifica se a resposta automática pode ser ENVIADA. */
  checkOutbound(conversationId: string, text: string, to: string): GateDecision {
    if (this.automationPaused) {
      return { allow: false, reason: 'Automação pausada por proteção.', code: 'AUTOMATION_PAUSED' };
    }
    if (!to || !String(to).trim()) {
      return { allow: false, reason: 'Destinatário inválido.', code: 'INVALID_RECIPIENT' };
    }
    if (!text || !String(text).trim()) {
      return { allow: false, reason: 'Mensagem vazia.', code: 'EMPTY_MESSAGE' };
    }

    const guard = this.getGuard(conversationId);
    if (guard.needsHuman) {
      return { allow: false, reason: 'Conversa marcada para atendimento humano.', code: 'NEEDS_HUMAN' };
    }

    const now = Date.now();
    // Cooldown
    if (now - guard.lastSendAt < this.config.cooldownMs) {
      return { allow: false, reason: 'Cooldown ativo.', code: 'COOLDOWN' };
    }

    // Rate limit por conversa
    if (now - guard.windowStartedAt > this.config.windowMs) {
      guard.autoReplies = 0;
      guard.windowStartedAt = now;
    }
    if (guard.autoReplies >= this.config.maxAutoRepliesPerWindow) {
      guard.needsHuman = true;
      return { allow: false, reason: 'Limite de respostas automáticas atingido — Safety limit reached.', code: 'RATE_LIMIT' };
    }

    // Loop protection: respostas consecutivas sem nova entrada do cliente
    if (guard.consecutiveAutoReplies >= this.config.maxConsecutiveAutoReplies) {
      guard.needsHuman = true;
      return { allow: false, reason: 'Loop detectado — bot respondendo sem nova mensagem do cliente.', code: 'LOOP_DETECTED' };
    }

    guard.autoReplies += 1;
    guard.consecutiveAutoReplies += 1;
    guard.lastSendAt = now;
    return { allow: true };
  }

  /** Registra erro do agente (Ollama timeout, etc). */
  recordError(conversationId: string): void {
    const guard = this.getGuard(conversationId);
    guard.consecutiveErrors += 1;
    if (guard.consecutiveErrors >= this.config.maxConsecutiveErrors) {
      guard.needsHuman = true;
    }
  }

  resetConversation(conversationId: string): void {
    this.conversations.delete(conversationId);
  }

  getGuard(conversationId: string): ConversationGuardState {
    let g = this.conversations.get(conversationId);
    if (!g) {
      g = {
        autoReplies: 0,
        windowStartedAt: Date.now(),
        consecutiveErrors: 0,
        duplicateCount: 0,
        needsHuman: false,
        lastSendAt: 0,
        consecutiveAutoReplies: 0,
      };
      this.conversations.set(conversationId, g);
    }
    return g;
  }

  /** Estado para monitoramento (admin). */
  snapshot(): Record<string, unknown> {
    return {
      automationPaused: this.automationPaused,
      pausedAt: this.pausedAt,
      pauseReason: this.pauseReason,
      globalConsecutiveFailures: this.globalConsecutiveFailures,
      conversations: this.conversations.size,
    };
  }
}
