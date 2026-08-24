// ============================================================
// KING AGENT — bridge (adapter ↔ agente)
// ============================================================
// Conecta o canal (adapter) ao cérebro (KingAgent). O adapter
// entrega mensagens normalizadas; o agente decide; a resposta
// volta pelo MESMO adapter. Nenhuma inteligência aqui.

import type { MessagingChannel, NormalizedMessage } from '../whatsapp-adapter/types.js';
import { KingAgent } from './index.js';
import type { AgentResult } from './types.js';

export interface BridgeOptions {
  /** envia a resposta de volta pelo canal (true = modo real) */
  sendReplies: boolean;
}

export class AgentBridge {
  private agent: KingAgent;
  private channel: MessagingChannel;
  private options: BridgeOptions;

  constructor(channel: MessagingChannel, agent: KingAgent, options: BridgeOptions = { sendReplies: true }) {
    this.channel = channel;
    this.agent = agent;
    this.options = options;
    this.channel.onMessage((msg) => void this.onIncoming(msg));
  }

  private async onIncoming(msg: NormalizedMessage): Promise<void> {
    const result: AgentResult = await this.agent.handleMessage(msg);
    if (!result.reply) return; // nada a enviar (humano, pausado, duplicado, self)

    if (!this.options.sendReplies) {
      // Modo observação: registra mas não envia (testes/validação)
      return;
    }

    const send = await this.channel.sendMessage({
      conversationId: msg.conversationId,
      to: msg.senderId,
      text: result.reply,
    });
    if (!send.ok) {
      this.agent.getSafetyGate().recordGlobalFailure();
    }
  }

  getAgent(): KingAgent {
    return this.agent;
  }

  getChannel(): MessagingChannel {
    return this.channel;
  }
}
