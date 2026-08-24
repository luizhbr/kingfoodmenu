import { describe, it, expect, beforeEach } from 'vitest';
import { createChannelAdapter, WhatsAppWebAdapter } from '../../lib/whatsapp-adapter/index.js';
import { clearSession, sessionStatus } from '../../lib/whatsapp-adapter/session.js';
import { normalizeJid } from '../../lib/whatsapp-adapter/web.js';

describe('whatsapp-adapter: factory', () => {
  it('mock é o padrão (nunca envia real sem escolha explícita)', () => {
    const old = process.env.WHATSAPP_ADAPTER;
    delete process.env.WHATSAPP_ADAPTER;
    const a = createChannelAdapter();
    expect(a.name).toBe('mock');
    process.env.WHATSAPP_ADAPTER = old;
  });

  it('web cria WhatsAppWebAdapter', () => {
    const a = createChannelAdapter('web');
    expect(a).toBeInstanceOf(WhatsAppWebAdapter);
  });
});

describe('whatsapp-adapter: sessão criptografada', () => {
  beforeEach(async () => {
    process.env.WHATSAPP_SESSION_DIR = './.test-session-tmp';
    process.env.WHATSAPP_SESSION_ENCRYPTION_KEY = 'test-key-123';
    const fs = await import('fs');
    fs.rmSync(process.env.WHATSAPP_SESSION_DIR, { recursive: true, force: true });
  });

  afterAll(() => {
    clearSession();
  });

  it('persistência round-trip: escreve e lê sem perder dados', async () => {
    const adapter = new WhatsAppWebAdapter();
    const anyA = adapter as any;

    // simula uma sessão Baileys
    anyA.session = {
      creds: {
        me: { id: '5511999999999:22@s.whatsapp.net', name: 'King Food Teste' },
        noiseKey: { public: Buffer.from('nk-pub'), private: Buffer.from('nk-priv') },
      },
      keys: { 'pre-key': { 'p1': { id: 'chave-1' } }, session: { 's1': { x: 1 } } },
    };
    anyA.persistSession();
    anyA.flushPersist(); // debounce de 150ms — forçar gravação síncrona

    // recria o adapter (novo processo) e carrega do disco
    const adapter2 = new WhatsAppWebAdapter();
    const any2 = adapter2 as any;
    expect(any2.session.creds.me.id).toBe('5511999999999:22@s.whatsapp.net');
    expect(Buffer.isBuffer(any2.session.creds.noiseKey.public)).toBe(true);
    expect(any2.session.keys['pre-key']['p1'].id).toBe('chave-1');
    expect(any2.session.keys['session']['s1'].x).toBe(1);
  });

  it('persistência preserva Buffers (noiseKey etc.) — round-trip real', async () => {
    const adapter = new WhatsAppWebAdapter();
    const anyA = adapter as any;
    anyA.session = {
      creds: {
        me: { id: '5511999999999:22@s.whatsapp.net' },
        noiseKey: { public: Buffer.from('pub-bytes-01'), private: Buffer.from('priv-bytes-02') },
        signedIdentityKey: { public: Buffer.from('sig-pub-03'), private: Buffer.from('sig-priv-04') },
        registrationId: 42,
        registered: true,
      },
      keys: { 'pre-key': { 'p1': Buffer.from('chave-binaria') } },
    };
    anyA.persistSession();
    anyA.flushPersist();

    const adapter2 = new WhatsAppWebAdapter();
    const any2 = adapter2 as any;
    expect(Buffer.isBuffer(any2.session.creds.noiseKey.public)).toBe(true);
    expect(any2.session.creds.noiseKey.public.toString()).toBe('pub-bytes-01');
    expect(Buffer.isBuffer(any2.session.creds.signedIdentityKey.private)).toBe(true);
    expect(Buffer.isBuffer(any2.session.keys['pre-key']['p1'])).toBe(true);
    expect(any2.session.creds.registrationId).toBe(42);
    expect(any2.session.creds.registered).toBe(true);
  });

  it('sessão corrompida não quebra: cai para creds vazias (novo QR)', async () => {
    const fs = await import('fs');
    const { join } = await import('path');
    const dir = process.env.WHATSAPP_SESSION_DIR!;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(join(dir, 'auth.enc.json'), '{{corrompido');
    const adapter = new WhatsAppWebAdapter();
    expect((adapter as any).session.creds.me).toEqual({});
  });

  it('status da sessão: não existe antes, existe depois', async () => {
    const s0 = sessionStatus();
    expect(s0.exists).toBe(false);
    const adapter = new WhatsAppWebAdapter();
    (adapter as any).persistSession();
    (adapter as any).flushPersist();
    const s1 = sessionStatus();
    expect(s1.exists).toBe(true);
    expect(s1.sizeBytes).toBeGreaterThan(0);
    clearSession();
  });
});

describe('whatsapp-adapter: normalização de mensagens Baileys', () => {
  it('extrai texto de extendedTextMessage', () => {
    const adapter = new WhatsAppWebAdapter() as any;
    const msg = adapter.normalizeIncoming({
      key: { remoteJid: '5511999999999@s.whatsapp.net', id: 'wamid_ABC', fromMe: false, timestamp: 1700000000 },
      pushName: 'João',
      message: { extendedTextMessage: { text: 'Oi, quero um açaí' } },
    });
    expect(msg).not.toBeNull();
    expect(msg.conversationId).toBe('5511999999999@s.whatsapp.net');
    expect(msg.senderId).toBe('5511999999999@s.whatsapp.net');
    expect(msg.text).toBe('Oi, quero um açaí');
    expect(msg.type).toBe('text');
    expect(msg.fromAgent).toBe(false);
  });

  it('retorna null para mensagem sem texto', () => {
    const adapter = new WhatsAppWebAdapter() as any;
    expect(adapter.normalizeIncoming({ key: { remoteJid: 'x@s.whatsapp.net' }, message: { imageMessage: {} } })).toBeNull();
    expect(adapter.normalizeIncoming({ key: {} })).toBeNull();
  });

describe('whatsapp-adapter: reconexão e statusCode (DisconnectReason numérico)', () => {
  it('408 (timedOut) → reconecta com backoff (transitório)', () => {
    const adapter = new WhatsAppWebAdapter() as any;
    adapter.sock = { end: () => {} };
    adapter.connecting = false;
    adapter.onConnectionUpdate({ connection: 'close', lastDisconnect: { error: { output: { statusCode: 408 } } } }, () => {});
    expect(adapter.info.status).toBe('DISCONNECTED');
    expect(adapter.reconnectTimer).not.toBeNull();
    adapter.clearReconnect();
  });

  it('515 (restartRequired) → reconecta (transitório)', () => {
    const adapter = new WhatsAppWebAdapter() as any;
    adapter.sock = { end: () => {} };
    adapter.connecting = false;
    adapter.onConnectionUpdate({ connection: 'close', lastDisconnect: { error: { output: { statusCode: 515 } } } }, () => {});
    expect(adapter.info.status).toBe('DISCONNECTED');
    expect(adapter.reconnectTimer).not.toBeNull();
    adapter.clearReconnect();
  });

  it('401 (loggedOut) → limpa sessão e aguarda novo QR (sem reconectar)', () => {
    const adapter = new WhatsAppWebAdapter() as any;
    adapter.sock = { end: () => {} };
    adapter.connecting = false;
    adapter.session.creds = { noiseKey: Buffer.from('x'), me: { id: '5511:22@s.whatsapp.net' } };
    adapter.onConnectionUpdate({ connection: 'close', lastDisconnect: { error: { output: { statusCode: 401 } } } }, () => {});
    expect(adapter.info.status).toBe('WAITING_QR');
    expect(adapter.reconnectTimer).toBeNull();
    expect(adapter.session.creds.noiseKey).toBeUndefined();
  });

  it('500 (badSession) → limpa sessão e aguarda novo QR', () => {
    const adapter = new WhatsAppWebAdapter() as any;
    adapter.sock = { end: () => {} };
    adapter.connecting = false;
    adapter.onConnectionUpdate({ connection: 'close', lastDisconnect: { error: { output: { statusCode: 500 } } } }, () => {});
    expect(adapter.info.status).toBe('WAITING_QR');
    expect(adapter.reconnectTimer).toBeNull();
  });

  it('403 (forbidden) → ERROR sem reconectar', () => {
    const adapter = new WhatsAppWebAdapter() as any;
    adapter.sock = { end: () => {} };
    adapter.connecting = false;
    adapter.onConnectionUpdate({ connection: 'close', lastDisconnect: { error: { output: { statusCode: 403 } } } }, () => {});
    expect(adapter.info.status).toBe('ERROR');
    expect(adapter.reconnectTimer).toBeNull();
  });

  it('reconexão esgota após 5 tentativas (sem loop infinito)', () => {
    const adapter = new WhatsAppWebAdapter() as any;
    for (let i = 0; i < 6; i++) adapter.scheduleReconnect();
    expect(adapter.info.status).toBe('ERROR');
    expect(adapter.reconnectTimer).toBeNull();
  });
});

describe('whatsapp-adapter: validação de JID no envio', () => {
  it('rejeita jid sem número', () => {
    expect(() => normalizeJid('abc')).toThrow();
  });

  it('rejeita número curto demais', () => {
    expect(() => normalizeJid('12345')).toThrow();
  });

  it('normaliza número válido', () => {
    expect(normalizeJid('5511999999999')).toBe('5511999999999@s.whatsapp.net');
  });
});

});
