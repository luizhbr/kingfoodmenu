// ============================================================
// KING AGENT — tipos neutros de canal
// ============================================================
// O cérebro do sistema é independente do canal. Recebe mensagens
// normalizadas (site, whatsapp, mock) e produz respostas.
// Reutiliza os tipos do whatsapp-bot (carrinho, intenção, contexto).

import type { NormalizedMessage } from '../whatsapp-adapter/types.js';
import type { BotContext, BotReply, InboundMessage } from '../whatsapp-bot/types.js';

export type AgentMode = 'AI_ACTIVE' | 'HUMAN_ACTIVE' | 'PAUSED' | 'CLOSED';

export interface AgentConversation {
  conversationId: string;
  channel: string;
  senderId: string;
  senderName?: string;
  mode: AgentMode;
  lastActivityAt: string;
  messageCount: number;
}

export interface AgentResult {
  reply?: string;
  mode: AgentMode;
  deterministic: boolean;
  intent?: string;
  needsHuman?: boolean;
  error?: string;
}

export function toInboundMessage(msg: NormalizedMessage): InboundMessage {
  return {
    messageId: msg.messageId,
    phone: msg.senderId,
    name: msg.senderName,
    text: msg.text,
    timestamp: msg.timestamp,
    type: msg.type,
    raw: msg.raw,
  };
}

export function toBotContext(conv: AgentConversation, state: unknown, currentIntent?: string | null, currentStep?: string | null): BotContext {
  return {
    conversationId: conv.conversationId,
    integrationId: conv.channel,
    whatsappNumber: conv.senderId,
    customerName: conv.senderName,
    state: (state as any) || { items: [], orderType: null, currentStep: 'IDLE' },
    mode: conv.mode === 'HUMAN_ACTIVE' ? 'HUMAN' : conv.mode === 'PAUSED' ? 'WAITING' : 'BOT',
    currentIntent,
    currentStep,
  };
}
