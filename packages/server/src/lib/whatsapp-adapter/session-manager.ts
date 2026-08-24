// ============================================================
// WHATSAPP SESSION MANAGER — singleton do adapter web (QR)
// ============================================================
// Ponto único de controle da sessão QR no processo do server.
// Conecta adapter -> KingAgent (bridge) e expõe operações para
// o admin (conectar, desconectar, logout, status).
//
// SEGURANÇA:
//  - Automação só liga se WHATSAPP_AUTOMATION_ENABLED=true
//    (kill switch global). Padrão: desligada.
//  - NUNCA expõe sessão/credenciais na API.
//  - O KingAgent aplica SafetyGate + horário + handoff + loop.

import { WhatsAppWebAdapter } from './web.js';
import { AgentBridge } from '../king-agent/bridge.js';
import { KingAgent } from '../king-agent/index.js';
import type { ChannelConnectionInfo, MessagingChannel } from './types.js';

const AUTOMATION_ENABLED = process.env.WHATSAPP_AUTOMATION_ENABLED === 'true';

class WhatsAppSessionManager {
  private adapter: WhatsAppWebAdapter | null = null;
  private bridge: AgentBridge | null = null;
  private agent: KingAgent | null = null;
  private connectingPromise: Promise<void> | null = null;

  /** Conecta (ou devolve a sessão existente). Idempotente. */
  async connect(): Promise<ChannelConnectionInfo> {
    if (!AUTOMATION_ENABLED) {
      // O adapter ainda pode conectar (QR), mas o agente não responde.
      // O kill switch é por mensagem: aiEnabled=false.
      this.ensureAdapter();
    } else {
      this.ensureAdapter();
    }
    if (!this.connectingPromise) {
      this.connectingPromise = this.getAdapter().connect().finally(() => {
        this.connectingPromise = null;
      });
    }
    await this.connectingPromise;
    return this.getAdapter().getStatus();
  }

  async disconnect(): Promise<ChannelConnectionInfo> {
    if (this.adapter) await this.adapter.disconnect();
    return this.status();
  }

  async logout(): Promise<ChannelConnectionInfo> {
    if (this.adapter) await this.adapter.logout();
    this.bridge = null;
    this.agent = null;
    return this.status();
  }

  async status(): Promise<ChannelConnectionInfo> {
    if (!this.adapter) {
      return { status: 'DISCONNECTED' };
    }
    return this.adapter.getStatus();
  }

  getAdapter(): WhatsAppWebAdapter {
    this.ensureAdapter();
    return this.adapter!;
  }

  getAgent(): KingAgent | null {
    return this.agent;
  }

  private ensureAdapter(): void {
    if (this.adapter) return;
    this.adapter = new WhatsAppWebAdapter();
    this.agent = new KingAgent({
      aiEnabled: AUTOMATION_ENABLED,
      activeHours: parseHours(process.env.AI_ACTIVE_HOURS),
      afterHoursMessage: process.env.AI_AFTER_HOURS_MESSAGE || undefined,
    });
    this.bridge = new AgentBridge(this.adapter, this.agent, { sendReplies: AUTOMATION_ENABLED });
  }
}

function parseHours(v?: string): { start: string; end: string } | null {
  if (!v) return null;
  const m = v.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (!m) return null;
  return { start: m[1], end: m[2] };
}

/** Singleton exportado — um único adapter por processo. */
export const whatsappSessionManager = new WhatsAppSessionManager();
