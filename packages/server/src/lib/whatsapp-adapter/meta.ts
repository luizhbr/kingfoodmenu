// ============================================================
// WHATSAPP ADAPTER — Meta Cloud API (oficial)
// ============================================================
// Envolve a implementação existente (whatsapp-bot/meta.ts) na
// interface MessagingChannel. O agente não sabe se está falando
// com WhatsApp Web (QR) ou Meta Cloud API — só o adapter muda.
// NUNCA armazena tokens; lê de env vars.

import type {
  ChannelConnectionInfo,
  ChannelEvent,
  ChannelLogEntry,
  MessagingChannel,
  NormalizedMessage,
  SendMessageInput,
} from './types.js';
import { metaConfigured, sendMetaText } from '../whatsapp-bot/meta.js';

export class MetaCloudAdapter implements MessagingChannel {
  readonly name = 'meta';
  private messageHandler: ((msg: NormalizedMessage) => void) | null = null;
  private eventHandler: ((event: ChannelEvent) => void) | null = null;
  private logs: ChannelLogEntry[] = [];
  private lastActivityAt: string | null = null;

  async connect(): Promise<void> {
    this.emit('connection_started', 'meta adapter connect');
    if (!metaConfigured()) {
      this.emit('error', 'Meta não configurada (META_ACCESS_TOKEN / META_PHONE_NUMBER_ID)');
      return;
    }
    this.emit('connection_established', 'meta adapter ready');
  }

  async disconnect(): Promise<void> {
    this.emit('connection_lost', 'meta adapter disconnected');
  }

  async getStatus(): Promise<ChannelConnectionInfo> {
    return {
      status: metaConfigured() ? 'CONNECTED' : 'DISCONNECTED',
      phoneNumber: process.env.META_PHONE_NUMBER_ID ? '••••' + process.env.META_PHONE_NUMBER_ID.slice(-4) : undefined,
      lastActivityAt: this.lastActivityAt || undefined,
    };
  }

  async sendMessage(input: SendMessageInput): Promise<{ ok: boolean; reason?: string }> {
    const res = await sendMetaText(input.to, input.text);
    this.lastActivityAt = new Date().toISOString();
    if (res.ok) {
      this.emit('message_sent', `meta sent to ${input.to.slice(0, 4)}****`, input.messageId);
      return { ok: true };
    }
    this.emit('message_blocked', res.reason || 'meta send failed', input.messageId);
    return { ok: false, reason: res.reason };
  }

  onMessage(handler: (msg: NormalizedMessage) => void): void {
    this.messageHandler = handler;
  }

  onEvent(handler: (event: ChannelEvent) => void): void {
    this.eventHandler = handler;
  }

  getLogs(): ChannelLogEntry[] {
    return [...this.logs];
  }

  private emit(type: ChannelEvent['type'], detail?: string, messageId?: string): void {
    const event: ChannelEvent = { type, at: new Date().toISOString(), detail, messageId };
    this.logs.push(event);
    this.eventHandler?.(event);
  }
}
