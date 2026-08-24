import { describe, it, expect, beforeEach } from 'vitest';
import { createChannelAdapter, WhatsAppWebAdapter } from '../../lib/whatsapp-adapter/index.js';
import { clearSession, sessionStatus } from '../../lib/whatsapp-adapter/session.js';

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
      creds: { me: { id: '5511999999999:22@s.whatsapp.net', name: 'King Food Teste' } },
      keys: { 'pre-key': { 'p1': { id: 'chave-1' } }, session: { 's1': { x: 1 } } },
    };
    anyA.persistSession();

    // recria o adapter (novo processo) e carrega do disco
    const adapter2 = new WhatsAppWebAdapter();
    const any2 = adapter2 as any;
    expect(any2.session.creds.me.id).toBe('5511999999999:22@s.whatsapp.net');
    expect(any2.session.keys['pre-key']['p1'].id).toBe('chave-1');
    expect(any2.session.keys['session']['s1'].x).toBe(1);
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
});
