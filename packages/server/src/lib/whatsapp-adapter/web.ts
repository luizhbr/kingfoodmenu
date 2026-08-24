// ============================================================
// WHATSAPP ADAPTER — WhatsApp Web (sessão QR via Baileys)
// ============================================================
// Sessão vinculada ao WhatsApp (NÃO é a API oficial da Meta).
// Uso EXCLUSIVO para atendimento legítimo e conversas iniciadas
// pelos clientes (reactive mode). Nunca disparo em massa.
//
// SEGURANÇA:
//  - Sessão COMPLETA (creds + chaves signal) persistida em disco
//    criptografada (AES-256-GCM) com chave de ENV
//    (WHATSAPP_SESSION_ENCRYPTION_KEY). Nunca exposta:
//    nem no frontend, nem na API, nem em logs, nem em git.
//  - A sessão sobrevive a restart: novo QR só quando expirada
//    ou removida (logout). (Requisito seção 6 do prompt.)
//  - QR: data URL PNG com validade curta (2 min).
//  - Loop protection: mensagens do próprio bot (fromMe) ignoradas.
//  - Baileys é ESM puro; este server é CommonJS -> import() dinâmico.

import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, renameSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import type {
  ChannelConnectionInfo,
  ChannelEvent,
  ChannelLogEntry,
  MessagingChannel,
  NormalizedMessage,
  SendMessageInput,
} from './types.js';

// Diretório e chave são lidos a cada acesso (testável, configurável em runtime).
function getSessionDir(): string {
  return process.env.WHATSAPP_SESSION_DIR || join(process.cwd(), '.whatsapp-session');
}
function getAuthFile(): string {
  return join(getSessionDir(), 'auth.enc.json');
}
function getEncryptionKey(): string {
  return process.env.WHATSAPP_SESSION_ENCRYPTION_KEY || '';
}
const QR_TTL_MS = 120_000; // QR válido por 2 minutos

type Socket = any;

/** Deriva chave AES-256 da ENV. Em produção, SEM chave = falha (nunca chave DEV). */
function deriveKey(secret: string): Buffer {
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('WHATSAPP_SESSION_ENCRYPTION_KEY é OBRIGATÓRIA em produção');
    }
    console.warn('[whatsapp-adapter] chave DEV insegura em uso (fora de produção)');
    return crypto.createHash('sha256').update('king-food-session-dev-only').digest();
  }
  return crypto.createHash('sha256').update(secret).digest();
}

interface SessionSnapshot {
  creds: any;
  keys: Record<string, Record<string, any>>;
}

export class WhatsAppWebAdapter implements MessagingChannel {
  readonly name = 'web';

  private sock: Socket | null = null;
  private baileys: any = null;
  private messageHandler: ((msg: NormalizedMessage) => void) | null = null;
  private eventHandler: ((event: ChannelEvent) => void) | null = null;
  private logs: ChannelLogEntry[] = [];
  private info: ChannelConnectionInfo = { status: 'DISCONNECTED' };
  private connecting = false;
  private qrBuffer: { data: string; expiresAt: number } | null = null;
  private selfJids = new Set<string>(); // jids do próprio bot (loop protection)
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  // ── sessão em memória (creds + keys), espelhada no disco criptografado ──
  private session: SessionSnapshot = {
    creds: null as any, // preenchido no constructor com initAuthCreds()
    keys: {},
  };

  constructor() {
    this.loadSessionFromDisk();
    if (!this.session.creds?.noiseKey) {
      // Sem creds válidas (primeira vez ou sessão perdida) — o initAuthCreds()
      // gera noiseKey, signedIdentityKey, registrationId etc. do Baileys.
      // Carregado async no connect(); até lá, placeholder seguro.
      this.session.creds = this.emptyCreds();
    }
    if (!getEncryptionKey()) {
      console.warn('[whatsapp-adapter] WHATSAPP_SESSION_ENCRYPTION_KEY ausente — usando chave DEV insegura. Defina em produção.');
    }
  }

  private emptyCreds(): any {
    return {
      me: {},
      signalIdentities: [],
      platform: 'smba',
      version: 2,
      registered: false,
      noiseKey: undefined,
      signedIdentityKey: undefined,
      signedPreKey: undefined,
      registrationId: 0,
      advSecretKey: undefined,
      nextPreKeyId: 1,
      firstUnuploadedPreKeyId: 1,
      serverHasPreKeys: false,
      account: undefined,
    };
  }

  // ── ciclo de vida ──────────────────────────────────────────

  async connect(): Promise<void> {
    if (this.connecting || (this.sock && this.info.status === 'CONNECTED')) return;
    this.connecting = true;
    this.emit('connection_started', 'web adapter connect');
    try {
      const mod = await import('@whiskeysockets/baileys');
      this.baileys = mod;
      if (!this.session.creds?.noiseKey || !this.session.creds?.signedIdentityKey) {
        // Sessão nova/vazia — gera creds oficiais do Baileys (noiseKey etc.)
        this.session.creds = mod.initAuthCreds();
        this.persistSession();
      }
      mkdirSync(getSessionDir(), { recursive: true });

      const { state, saveCreds } = this.buildAuthState();
      const { version } = await this.baileys.fetchLatestBaileysVersion();

      const socket = this.baileys.makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: this.baileys.Browsers.macOS('Chrome'),
        syncFullHistory: false,
        markOnlineOnConnect: true,
        connectTimeoutMs: 30_000,
      });
      this.sock = socket;
      this.bindEvents(socket, saveCreds);
    } catch (err) {
      this.connecting = false;
      this.fail(`falha ao inicializar Baileys: ${String(err)}`);
    }
  }

  async disconnect(): Promise<void> {
    this.clearReconnect();
    this.flushPersist();
    try { this.sock?.end(new Error('disconnect manual')); } catch { /* noop */ }
    this.sock = null;
    this.connecting = false;
    this.qrBuffer = null;
    this.info = { status: 'DISCONNECTED' };
    this.emit('connection_lost', 'web disconnected');
  }

  /** Desconecta E apaga a sessão local (deslogar o aparelho). */
  async logout(): Promise<void> {
    this.clearReconnect();
    this.flushPersist();
    try {
      this.sock?.logout();
      this.sock?.close(new Error('logout'));
    } catch { /* noop */ }
    this.sock = null;
    this.connecting = false;
    this.qrBuffer = null;
    this.info = { status: 'DISCONNECTED' };
    this.session = { creds: this.emptyCreds(), keys: {} };
    this.selfJids.clear();
    try { rmSync(getSessionDir(), { recursive: true, force: true }); } catch { /* noop */ }
    this.emit('connection_lost', 'web adapter logged out (sessão removida)');
  }

  async getStatus(): Promise<ChannelConnectionInfo> {
    const s = { ...this.info };
    if (this.qrBuffer && Date.now() < this.qrBuffer.expiresAt) {
      s.status = 'WAITING_QR';
      s.qr = this.qrBuffer.data;
      s.qrExpiresAt = new Date(this.qrBuffer.expiresAt).toISOString();
    } else if (this.qrBuffer) {
      this.qrBuffer = null; // expirado
    }
    return s;
  }

  // ── envio ──────────────────────────────────────────────────

  async sendMessage(input: SendMessageInput): Promise<{ ok: boolean; reason?: string }> {
    if (!this.sock || this.info.status !== 'CONNECTED') {
      return { ok: false, reason: 'web desconectado' };
    }
    try {
      const jid = normalizeJid(input.to);
      await this.sock.sendMessage(jid, { text: input.text });
      this.touchActivity();
      this.emit('message_sent', `web sent to ${maskPhone(jid)}`, input.messageId);
      return { ok: true };
    } catch (err) {
      this.emit('message_blocked', String(err), input.messageId);
      return { ok: false, reason: String(err) };
    }
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

  // ── auth state (Baileys) ───────────────────────────────────

  private buildAuthState(): { state: any; saveCreds: () => void } {
    const state = {
      creds: this.session.creds,
      keys: {
        get: async (type: string, ids: string[]) => {
          const bucket = this.session.keys[type] ?? {};
          const out: Record<string, any> = {};
          for (const id of ids) {
            if (bucket[id] !== undefined) out[id] = bucket[id];
          }
          return out;
        },
        set: async (data: Record<string, Record<string, any>>) => {
          for (const type of Object.keys(data)) {
            const bucket = data[type] ?? {};
            for (const id of Object.keys(bucket)) {
              if (!this.session.keys[type]) this.session.keys[type] = {};
              this.session.keys[type][id] = bucket[id];
            }
          }
          this.persistSession();
        },
        clear: async () => {
          this.session.keys = {};
          this.persistSession();
        },
      },
    };

    const saveCreds = () => {
      const sockAuth = this.sock?.auth as any;
      if (sockAuth?.creds) this.session.creds = sockAuth.creds;
      this.persistSession();
      this.syncFromCreds();
    };

    return { state, saveCreds };
  }

  // ── persistência criptografada ─────────────────────────────

  private loadSessionFromDisk(): void {
    try {
      if (!existsSync(getAuthFile())) return;
      const cipher = JSON.parse(readFileSync(getAuthFile(), 'utf-8'));
      const buf = decryptAes(
        Buffer.from(cipher.data, 'base64'),
        Buffer.from(cipher.iv, 'base64'),
        Buffer.from(cipher.tag, 'base64'),
        deriveKey(getEncryptionKey()),
      );
      const snap = JSON.parse(buf.toString('utf-8'), bufferReviver) as SessionSnapshot;
      if (snap?.creds) this.session.creds = snap.creds;
      if (snap?.keys) this.session.keys = snap.keys;
      this.syncSessionFromCreds();
    } catch (err) {
      console.warn('[whatsapp-adapter] sessão criptografada ilegível — novo QR será necessário:', String(err));
    }
  }

  private persistTimer: NodeJS.Timeout | null = null;
  private persistChain: Promise<void> = Promise.resolve(); // serializa writes

  /** Persistência com debounce (150ms) — o Baileys chama set() centenas de vezes
   *  no login; gravar síncrono a cada set() bloquearia o event loop.
   *  Write atômico (temp → rename) + fila serializada: nunca deixa snapshot
   *  corrompido em crash (recomendação de revisão externa). */
  private persistSession(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persistChain = this.persistChain.then(() => this.writeSnapshot());
    }, 150);
  }

  private writeSnapshot(): Promise<void> {
    return new Promise((resolve) => {
      try {
        mkdirSync(getSessionDir(), { recursive: true });
        const { iv, tag, data } = encryptAes(
          Buffer.from(JSON.stringify(this.session, bufferReplacer), 'utf-8'),
          deriveKey(getEncryptionKey()),
        );
        const payload = JSON.stringify({ iv: iv.toString('base64'), tag: tag.toString('base64'), data: data.toString('base64') });
        const tmp = getAuthFile() + '.tmp';
        writeFileSync(tmp, payload, { mode: 0o600 });
        renameSync(tmp, getAuthFile()); // atômico no mesmo filesystem
      } catch (err) {
        console.error('[whatsapp-adapter] erro ao salvar sessão criptografada:', String(err));
      }
      resolve();
    });
  }

  private syncFromCreds(): void {
    const me = this.session.creds?.me;
    if (!me?.id) return;
    // me.id vem como '5511...:22@s.whatsapp.net' — normalizar para o formato
    // do remoteJid das mensagens ('5511...@s.whatsapp.net') para o loop protection
    const raw = String(me.id);
    const jid = raw.includes(':') ? raw.replace(/^([^:]+):\d+(@.*)$/, '$1$2') : raw;
    this.selfJids.add(jid);
    this.selfJids.add(raw);
    if (!this.info.phoneNumber && me.id) this.info.phoneNumber = String(me.id).split(':')[0];
    if (!this.info.displayName && me.name) this.info.displayName = me.name;
  }

  private syncSessionFromCreds(): void {
    this.syncFromCreds();
  }

  // ── eventos do socket ─────────────────────────────────────

  private bindEvents(socket: any, saveCreds: () => void): void {
    socket.ev.on('connection.update', (update: any) => {
      void this.onConnectionUpdate(update, saveCreds).catch((err) => {
        console.error('[whatsapp-adapter] erro no connection.update:', String(err));
      });
    });
    socket.ev.on('creds.update', saveCreds);
    socket.ev.on('messages.upsert', (u: any) => {
      void this.onMessagesUpsert(u).catch((err) => {
        console.error('[whatsapp-adapter] erro no messages.upsert:', String(err));
      });
    });
  }

  private async onConnectionUpdate(update: any, saveCreds: () => void): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const Qr = await import('qrcode');
        const dataUrl = await Qr.toDataURL(qr, { width: 256, margin: 1 });
        this.qrBuffer = { data: dataUrl, expiresAt: Date.now() + QR_TTL_MS };
        this.info = { status: 'WAITING_QR' };
        this.emit('qr_generated', 'novo QR gerado');
      } catch (err) {
        console.error('[whatsapp-adapter] falha ao gerar QR:', String(err));
      }
      return;
    }

    if (connection === 'connecting') {
      this.info = { status: 'CONNECTING' };
      return;
    }

    if (connection === 'close') {
      this.sock = null;
      this.connecting = false;
      this.qrBuffer = null;
      // DisconnectReason do Baileys é NUMÉRICO (nunca comparar com string):
      //   408 timedOut/connectionLost · 428 connectionClosed · 515 restartRequired → transitórios: reconectar
      //   401 loggedOut · 500 badSession → sessão inválida: limpar + novo QR
      //   403 forbidden → conta bloqueada: ERROR sem reconectar
      //   503 unavailableService → tentar depois (backoff)
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      if (statusCode === 401 || statusCode === 500) {
        // logged out / bad session — limpar creds + disco para forçar novo QR limpo
        this.session.creds = this.emptyCreds();
        this.session.keys = {};
        this.selfJids.clear();
        try { rmSync(getSessionDir(), { recursive: true, force: true }); } catch { /* noop */ }
        this.info = { status: 'WAITING_QR' };
        this.emit('connection_lost', 'sessão inválida — novo QR necessário');
      } else if (statusCode === 403) {
        this.info = { status: 'ERROR', lastError: 'conta bloqueada (403 forbidden) — verifique o WhatsApp', lastErrorAt: new Date().toISOString() };
        this.emit('error', 'conta bloqueada (403)');
      } else {
        // 408/428/503/515 e demais → transitório: reconectar com backoff
        this.info = { status: 'DISCONNECTED' };
        this.emit('connection_lost', `reconectando (${String(statusCode)})`);
        this.scheduleReconnect();
      }
      return;
    }

    if (connection === 'open') {
      this.connecting = false;
      this.reconnectAttempts = 0;
      this.qrBuffer = null; // QR consumido — nunca mostrar WAITING_QR conectado
      const me = (this.sock as any)?.user;
      this.info = {
        status: 'CONNECTED',
        phoneNumber: me?.id ? String(me.id).split(':')[0] : this.info.phoneNumber,
        displayName: me?.name || this.info.displayName,
        connectedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      };
      if (me?.id) {
        const raw = String(me.id);
        const jid = raw.includes(':') ? raw.replace(/^([^:]+):\d+(@.*)$/, '$1$2') : raw;
        this.selfJids.add(jid);
        this.selfJids.add(raw);
      }
      this.emit('connection_established', 'whatsapp conectado via QR');
    }
  }

  private async onMessagesUpsert(u: any): Promise<void> {
    if (!u?.messages?.length || u.type !== 'notify') return;
    for (const m of u.messages) {
      if (m.key?.fromMe) continue; // loop protection: nunca processar o próprio envio
      const remote = m.key?.remoteJid ?? '';
      if (!remote) continue;
      if (remote.endsWith('@g.us')) continue; // grupos: fora de escopo nesta fase
      if (this.selfJids.has(remote)) continue; // conversa com o próprio bot
      const msg = this.normalizeIncoming(m);
      if (!msg) continue;
      this.emit('message_received', `web incoming from ${maskPhone(msg.senderId)}: ${msg.text.slice(0, 40)}`, msg.messageId);
      this.touchActivity();
      this.messageHandler?.(msg);
    }
  }

  private normalizeIncoming(raw: any): NormalizedMessage | null {
    try {
      const key = raw.key ?? {};
      const remote = key.remoteJid ?? '';
      const text =
        raw.message?.conversation ||
        raw.message?.extendedTextMessage?.text ||
        raw.message?.imageMessage?.caption ||
        raw.message?.videoMessage?.caption ||
        '';
      if (!text || !remote) return null;
      return {
        channel: 'whatsapp',
        conversationId: remote,
        messageId: String(key.id ?? `wam-${randomUUID()}`),
        senderId: remote,
        senderName: raw.pushName,
        text,
        type: 'text',
        timestamp: new Date(Number(key.timestamp ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        fromAgent: false,
        raw,
      };
    } catch {
      return null;
    }
  }

  private touchActivity(): void {
    this.info.lastActivityAt = new Date().toISOString();
  }

  private scheduleReconnect(): void {
    this.clearReconnect();
    this.reconnectAttempts += 1;
    if (this.reconnectAttempts > this.MAX_RECONNECT_ATTEMPTS) {
      // Desiste após 5 tentativas — exige ação do admin (evita loop infinito)
      this.info = { status: 'ERROR', lastError: 'falha ao reconectar após 5 tentativas — verifique a sessão', lastErrorAt: new Date().toISOString() };
      this.emit('error', 'reconnect esgotado (5 tentativas)');
      return;
    }
    const delay = Math.min(5_000 * this.reconnectAttempts, 30_000); // backoff 5s→10s→15s→20s→30s
    this.reconnectTimer = setTimeout(() => void this.connect(), delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }

  private flushPersist(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    // Escrita síncrona imediata (chamado só no disconnect/logout — raro).
    // Atomic write garante que uma escrita pendente da chain não corrompe.
    this.writeSnapshot();
  }

  private fail(detail: string): void {
    this.info = { status: 'ERROR', lastError: detail, lastErrorAt: new Date().toISOString() };
    this.emit('error', detail);
  }

  private emit(type: ChannelEvent['type'], detail?: string, messageId?: string): void {
    const event: ChannelEvent = { type, at: new Date().toISOString(), detail: detail ? detail.slice(0, 500) : undefined, messageId };
    this.logs.push(event);
    if (this.logs.length > 500) this.logs.splice(0, this.logs.length - 500); // cap: 500 eventos
    this.eventHandler?.(event);
  }
}

// ── helpers ──────────────────────────────────────────────────────

/** JSON.stringify com Buffer -> {__buf: base64} (round-trip seguro da sessão). */
function bufferReplacer(_key: string, value: unknown): unknown {
  if (Buffer.isBuffer(value)) {
    return { __buf: value.toString('base64') };
  }
  const obj = value as Record<string, unknown> | null;
  if (obj && typeof obj === 'object' && obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return { __buf: Buffer.from(obj.data as number[]).toString('base64') };
  }
  return value;
}

/** JSON.parse com reviver que restaura {__buf: base64} -> Buffer. */
function bufferReviver(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && typeof (value as any).__buf === 'string') {
    return Buffer.from((value as any).__buf, 'base64');
  }
  return value;
}

export function normalizeJid(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits || digits.length < 10 || digits.length > 15) {
    throw new Error(`jid inválido: ${maskPhone(phone)}`);
  }
  return `${digits}@s.whatsapp.net`;
}

function maskPhone(jid: string): string {
  const d = jid.replace(/\D/g, '');
  return d.slice(0, 2) + '****' + d.slice(-4);
}

function encryptAes(plain: Buffer, key: Buffer): { iv: Buffer; tag: Buffer; data: Buffer } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv, tag, data };
}

function decryptAes(data: Buffer, iv: Buffer, tag: Buffer, key: Buffer): Buffer {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}
