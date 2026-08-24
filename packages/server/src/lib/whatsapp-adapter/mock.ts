// ============================================================
// WHATSAPP ADAPTER — Mock (desenvolvimento/testes)
// ============================================================
// Valida todo o pipeline (agente → SafetyGate → adapter) SEM
// enviar mensagens reais. Nenhuma rede, nenhuma sessão, nenhum QR.
// Usado até que o adapter real seja autorizado (fase 2).

import { randomUUID } from 'crypto';
import type {
  ChannelConnectionInfo,
  ChannelEvent,
  ChannelLogEntry,
  MessagingChannel,
  NormalizedMessage,
  SendMessageInput,
} from './types.js';

export class MockWhatsAppAdapter implements MessagingChannel {
  readonly name = 'mock';
  private status: ChannelConnectionInfo = { status: 'DISCONNECTED' };
  private messageHandler: ((msg: NormalizedMessage) => void) | null = null;
  private eventHandler: ((event: ChannelEvent) => void) | null = null;
  private logs: ChannelLogEntry[] = [];
  private sent: { to: string; text: string; at: string }[] = [];
  private connected = false;

  /** Mensagens que o "cliente" envia para o bot (simulação). */
  async simulateIncoming(text: string, senderId = '5511999999999', senderName = 'Cliente Teste'): Promise<NormalizedMessage> {
    const msg: NormalizedMessage = {
      channel: 'mock',
      conversationId: `mock-conv-${senderId}`,
      messageId: `mock-${randomUUID()}`,
      senderId,
      senderName,
      text,
      type: 'text',
      timestamp: new Date().toISOString(),
    };
    this.emit('message_received', `mock incoming: ${text.slice(0, 60)}`, msg.messageId);
    this.messageHandler?.(msg);
    return msg;
  }

  async connect(): Promise<void> {
    this.connected = true;
    this.status = { status: 'CONNECTED', phoneNumber: '15550000000', displayName: 'Mock King Food', connectedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString() };
    this.emit('connection_started', 'mock connect');
    this.emit('connection_established', 'mock connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.status = { status: 'DISCONNECTED' };
    this.emit('connection_lost', 'mock disconnected');
  }

  async getStatus(): Promise<ChannelConnectionInfo> {
    return { ...this.status };
  }

  async sendMessage(input: SendMessageInput): Promise<{ ok: boolean; reason?: string }> {
    if (!this.connected) return { ok: false, reason: 'mock desconectado' };
    this.sent.push({ to: input.to, text: input.text, at: new Date().toISOString() });
    this.emit('message_sent', `mock sent to ${input.to}: ${input.text.slice(0, 60)}`, input.messageId);
    return { ok: true };
  }

  onMessage(handler: (msg: NormalizedMessage) => void): void {
    this.messageHandler = handler;
  }

  onEvent(handler: (event: ChannelEvent) => void): void {
    this.eventHandler = handler;
  }

  /** Mensagens "enviadas" pelo mock (para testes). */
  getSent(): { to: string; text: string; at: string }[] {
    return [...this.sent];
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
