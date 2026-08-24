// ============================================================
// WHATSAPP ADAPTER — contrato abstrato de canal de mensageria
// ============================================================
// O cérebro (king-agent) é independente do canal. Este módulo
// define a interface que qualquer canal deve implementar:
//   - WhatsAppWebAdapter  (sessão QR — fase 2, requer autorização)
//   - MetaCloudAdapter    (API oficial Meta — já existente)
//   - MockWhatsAppAdapter (desenvolvimento/testes — fase 1)
//
// SEGURANÇA: o adapter NUNCA contém inteligência. Ele apenas:
//   recebe mensagens, normaliza, envia, controla sessão e informa status.

export type ChannelStatus =
  | 'DISCONNECTED'
  | 'WAITING_QR'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR'
  | 'AUTOMATION_PAUSED';

export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document';

/** Mensagem normalizada — formato único para qualquer canal. */
export interface NormalizedMessage {
  channel: 'whatsapp' | 'site' | 'mock';
  conversationId: string;
  messageId: string; // idempotência: processar uma única vez
  senderId: string;
  senderName?: string;
  text: string;
  type: MessageType;
  timestamp: string;
  /** true quando a mensagem foi enviada pelo próprio agente (loop protection) */
  fromAgent?: boolean;
  raw?: unknown;
}

export interface SendMessageInput {
  conversationId: string;
  to: string; // número/identificador do destinatário
  text: string;
  messageId?: string;
}

export interface ChannelConnectionInfo {
  status: ChannelStatus;
  phoneNumber?: string;
  displayName?: string;
  connectedAt?: string;
  lastActivityAt?: string;
  lastError?: string;
  lastErrorAt?: string;
  qr?: string; // QR data (nunca credenciais de sessão)
  qrExpiresAt?: string;
}

export interface MessagingChannel {
  readonly name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): Promise<ChannelConnectionInfo>;
  sendMessage(input: SendMessageInput): Promise<{ ok: boolean; reason?: string }>;
  /** Registra handler de mensagens recebidas (reactive mode). */
  onMessage(handler: (msg: NormalizedMessage) => void): void;
  /** Registra handler de eventos de sessão (qr, connected, disconnected, error). */
  onEvent(handler: (event: ChannelEvent) => void): void;
}

export type ChannelEventType =
  | 'qr_generated'
  | 'connection_started'
  | 'connection_established'
  | 'connection_lost'
  | 'message_received'
  | 'message_sent'
  | 'message_blocked'
  | 'error';

export interface ChannelEvent {
  type: ChannelEventType;
  at: string;
  detail?: string;
  messageId?: string;
}

/** Log de eventos — nunca contém credenciais, tokens ou conteúdo sensível. */
export interface ChannelLogEntry {
  type: ChannelEventType;
  at: string;
  detail?: string;
}
