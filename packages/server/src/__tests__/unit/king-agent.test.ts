import { describe, it, expect, vi } from 'vitest';
import { SafetyGate, DEFAULT_SAFETY_CONFIG } from '../../lib/king-agent/safety.js';
import { KingAgent } from '../../lib/king-agent/index.js';
import { MockWhatsAppAdapter } from '../../lib/whatsapp-adapter/mock.js';
import { AgentBridge } from '../../lib/king-agent/bridge.js';
import type { NormalizedMessage } from '../../lib/whatsapp-adapter/types.js';

// ============================================================
// KING AGENT — testes de segurança e orquestração
// ============================================================

function mockMsg(overrides: Partial<NormalizedMessage> = {}): NormalizedMessage {
  return {
    channel: 'mock',
    conversationId: 'conv-1',
    messageId: 'msg-1',
    senderId: '5511999999999',
    senderName: 'Cliente',
    text: 'oi',
    type: 'text',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe('SafetyGate', () => {
  it('permite mensagem válida', () => {
    const gate = new SafetyGate();
    const seen = new Set<string>();
    expect(gate.checkInbound('c1', 'm1', seen).allow).toBe(true);
    expect(gate.checkOutbound('c1', 'Olá!', '5511999999999').allow).toBe(true);
  });

  it('bloqueia mensagem duplicada (idempotência)', () => {
    const gate = new SafetyGate();
    const seen = new Set<string>(['m1']);
    const d = gate.checkInbound('c1', 'm1', seen);
    expect(d.allow).toBe(false);
    expect(d.code).toBe('DUPLICATE');
  });

  it('bloqueia destinatário inválido', () => {
    const gate = new SafetyGate();
    const d = gate.checkOutbound('c1', 'Olá!', '');
    expect(d.allow).toBe(false);
    expect(d.code).toBe('INVALID_RECIPIENT');
  });

  it('bloqueia mensagem vazia', () => {
    const gate = new SafetyGate();
    const d = gate.checkOutbound('c1', '   ', '5511999999999');
    expect(d.allow).toBe(false);
    expect(d.code).toBe('EMPTY_MESSAGE');
  });

  it('bloqueia loop bot→bot (respostas consecutivas sem nova entrada)', () => {
    const gate = new SafetyGate({ ...DEFAULT_SAFETY_CONFIG, maxConsecutiveAutoReplies: 2, cooldownMs: 0 });
    const seen = new Set<string>();
    gate.checkInbound('c1', 'm1', seen);
    expect(gate.checkOutbound('c1', 'r1', '5511999999999').allow).toBe(true);
    expect(gate.checkOutbound('c1', 'r2', '5511999999999').allow).toBe(true);
    const d = gate.checkOutbound('c1', 'r3', '5511999999999');
    expect(d.allow).toBe(false);
    expect(d.code).toBe('LOOP_DETECTED');
  });

  it('aplica cooldown entre respostas', () => {
    const gate = new SafetyGate({ ...DEFAULT_SAFETY_CONFIG, cooldownMs: 60_000 });
    const seen = new Set<string>();
    gate.checkInbound('c1', 'm1', seen);
    expect(gate.checkOutbound('c1', 'r1', '5511999999999').allow).toBe(true);
    const d = gate.checkOutbound('c1', 'r2', '5511999999999');
    expect(d.allow).toBe(false);
    expect(d.code).toBe('COOLDOWN');
  });

  it('marca NEEDS_HUMAN após limite de respostas por janela', () => {
    const gate = new SafetyGate({ ...DEFAULT_SAFETY_CONFIG, maxAutoRepliesPerWindow: 2, cooldownMs: 0 });
    const seen = new Set<string>();
    gate.checkInbound('c1', 'm1', seen);
    expect(gate.checkOutbound('c1', 'r1', '5511999999999').allow).toBe(true);
    expect(gate.checkOutbound('c1', 'r2', '5511999999999').allow).toBe(true);
    const d = gate.checkOutbound('c1', 'r3', '5511999999999');
    expect(d.allow).toBe(false);
    expect(d.code).toBe('RATE_LIMIT');
  });

  it('pausa automação global (kill switch)', () => {
    const gate = new SafetyGate();
    gate.pauseAutomation('teste');
    expect(gate.isAutomationPaused()).toBe(true);
    const seen = new Set<string>();
    expect(gate.checkInbound('c1', 'm1', seen).allow).toBe(false);
    gate.resumeAutomation();
    expect(gate.isAutomationPaused()).toBe(false);
  });

  it('circuit breaker: pausa após falhas consecutivas', () => {
    const gate = new SafetyGate({ ...DEFAULT_SAFETY_CONFIG, globalMaxConsecutiveFailures: 3 });
    gate.recordGlobalFailure();
    gate.recordGlobalFailure();
    gate.recordGlobalFailure();
    expect(gate.isAutomationPaused()).toBe(true);
    expect(gate.getPauseInfo().reason).toContain('proteção');
  });
});

describe('KingAgent', () => {
  it('ignora mensagem do próprio agente (loop protection)', async () => {
    const agent = new KingAgent();
    const r = await agent.handleMessage(mockMsg({ fromAgent: true }));
    expect(r.reply).toBeUndefined();
  });

  it('ignora mensagem duplicada (idempotência)', async () => {
    const agent = new KingAgent();
    await agent.handleMessage(mockMsg({ messageId: 'dup-1' }));
    const r = await agent.handleMessage(mockMsg({ messageId: 'dup-1' }));
    expect(r.reply).toBeUndefined();
  });

  it('não responde em modo humano', async () => {
    const agent = new KingAgent();
    const msg = mockMsg();
    await agent.handleMessage(msg);
    agent.setMode('conv-1', 'HUMAN_ACTIVE');
    const r = await agent.handleMessage(mockMsg({ messageId: 'msg-2' }));
    expect(r.mode).toBe('HUMAN_ACTIVE');
    expect(r.reply).toBeUndefined();
  });

  it('não responde com automação desligada (kill switch)', async () => {
    const agent = new KingAgent({ aiEnabled: false });
    const r = await agent.handleMessage(mockMsg());
    expect(r.reply).toBeUndefined();
    expect(r.mode).toBe('PAUSED');
  });

  it('responde fora do horário com mensagem configurada', async () => {
    const agent = new KingAgent({
      activeHours: { start: '08:00', end: '09:00' },
      afterHoursMessage: 'Fora do horário.',
    });
    const r = await agent.handleMessage(mockMsg());
    expect(r.reply).toBe('Fora do horário.');
  });
});

describe('MockWhatsAppAdapter + AgentBridge', () => {
  it('fluxo completo: cliente → agente → resposta (sem rede)', async () => {
    const channel = new MockWhatsAppAdapter();
    const agent = new KingAgent();
    const bridge = new AgentBridge(channel, agent, { sendReplies: true });
    await channel.connect();

    await channel.simulateIncoming('oi');
    // resposta assíncrona — aguarda um tick
    await new Promise((r) => setTimeout(r, 50));

    const sent = channel.getSent();
    expect(sent.length).toBeGreaterThan(0);
    expect(sent[0].to).toBe('5511999999999');
    expect(sent[0].text.length).toBeGreaterThan(0);
  });

  it('modo observação: processa mas NÃO envia', async () => {
    const channel = new MockWhatsAppAdapter();
    const agent = new KingAgent();
    const bridge = new AgentBridge(channel, agent, { sendReplies: false });
    await channel.connect();

    await channel.simulateIncoming('oi');
    await new Promise((r) => setTimeout(r, 50));

    expect(channel.getSent().length).toBe(0);
  });
});
