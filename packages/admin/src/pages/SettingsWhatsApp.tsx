import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

// ── Tipos (espelham o controller whatsapp.controller.ts) ──────────────────
interface WhatsAppIntegration {
  id: string;
  provider: string;
  status: string;
  botEnabled: boolean;
  phoneNumber: string | null;
  displayName: string | null;
  phoneNumberId: string | null;
  businessAccountId: string | null;
  webhookConfigured: boolean;
  webhookVerified: boolean;
  lastWebhookAt: string | null;
  lastMessageAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  lastTestAt: string | null;
  lastTestStatus: string | null;
  n8nStatus: string;
  n8nLastExecutionAt: string | null;
  n8nLastError: string | null;
  updatedAt: string;
  config: {
    hasAccessToken: boolean;
    hasAppSecret: boolean;
    hasVerifyToken: boolean;
    hasPhoneNumberId: boolean;
    hasN8nUrl: boolean;
    hasAiKey: boolean;
  };
}

interface Conversation {
  id: string;
  whatsappNumber: string;
  customerId: string | null;
  mode: string;
  currentIntent: string | null;
  currentStep: string | null;
  lastMessageAt: string;
  expiresAt: string;
  messages: { text: string | null; direction: string; createdAt: string }[];
}

const STATUS_LABEL: Record<string, string> = {
  CONNECTED: 'Conectado',
  CONFIGURATION_PENDING: 'Configuração pendente',
  DISCONNECTED: 'Desconectado',
  ERROR: 'Erro',
};

const STATUS_COLOR: Record<string, string> = {
  CONNECTED: 'bg-emerald-100 text-emerald-700',
  CONFIGURATION_PENDING: 'bg-yellow-100 text-yellow-700',
  DISCONNECTED: 'bg-gray-100 text-gray-500',
  ERROR: 'bg-red-100 text-red-700',
};

const MODE_LABEL: Record<string, { label: string; dot: string }> = {
  BOT: { label: 'Bot', dot: 'bg-blue-500' },
  HUMAN: { label: 'Humano', dot: 'bg-emerald-500' },
  WAITING: { label: 'Aguardando', dot: 'bg-yellow-400' },
  CLOSED: { label: 'Encerrada', dot: 'bg-gray-400' },
};

function maskPhone(p: string): string {
  return p.replace(/^(\d{2})(\d{2})(\d{5})(\d{4})$/, '+$1 ($2) $3-$4');
}

export default function SettingsWhatsApp() {
  const [status, setStatus] = useState<WhatsAppIntegration | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        api.get<{ success: boolean; data: WhatsAppIntegration }>('/whatsapp/status'),
        api.get<{ success: boolean; data: Conversation[] }>('/whatsapp/conversations'),
      ]);
      setStatus(s.data);
      setConversations(c.data);
    } catch (e: any) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runTest = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const r = await api.post<{ success: boolean; data: { ok: boolean; status: string; checks: Record<string, { ok: boolean; detail: string }> } }>('/whatsapp/test', {});
      const checks = r.data.checks;
      const lines = Object.entries(checks).map(
        ([k, v]) => `${v.ok ? '✅' : '❌'} ${k}: ${v.detail}`
      );
      setMessage({ ok: r.data.ok, text: lines.join('\n') });
      load();
    } catch (e: any) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setTesting(false);
    }
  };

  const sendTest = async () => {
    if (!testPhone.trim()) return;
    setSendingTest(true);
    setMessage(null);
    try {
      const r = await api.post<{ success: boolean; data: { ok: boolean; status: string } }>('/whatsapp/test-message', { phone: testPhone.trim() });
      setMessage({ ok: r.success, text: r.data.ok ? `Mensagem enviada (status: ${r.data.status})` : 'Falha ao enviar — veja o erro no status' });
    } catch (e: any) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setSendingTest(false);
    }
  };

  const toggleBot = async () => {
    if (!status) return;
    setMessage(null);
    try {
      const r = await api.post<{ success: boolean; data: { botEnabled: boolean } }>('/whatsapp/bot', { enabled: !status.botEnabled });
      setStatus((s) => (s ? { ...s, botEnabled: r.data.botEnabled } : s));
      setMessage({ ok: true, text: r.data.botEnabled ? '🤖 Bot ligado' : 'Bot desligado' });
    } catch (e: any) {
      setMessage({ ok: false, text: e.message });
    }
  };

  const setMode = async (id: string, mode: string) => {
    setMessage(null);
    try {
      await api.post(`/whatsapp/conversations/${id}/handoff`, { mode });
      load();
    } catch (e: any) {
      setMessage({ ok: false, text: e.message });
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">Carregando central WhatsApp…</div>
    );
  }

  const cfg = status?.config;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Central WhatsApp</h1>
          <p className="text-sm text-gray-500 mt-1">
            Canal de vendas via WhatsApp — orquestrado por n8n + IA, backend King Food como fonte da verdade.
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[status?.status || 'DISCONNECTED'] || STATUS_COLOR.DISCONNECTED}`}>
          {STATUS_LABEL[status?.status || 'DISCONNECTED'] ?? status?.status}
        </span>
      </div>

      {message && (
        <div className={`text-xs whitespace-pre-line rounded-lg p-3 ${message.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* ── Configuração (flags, sem secrets) ─────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Configuração</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { k: 'hasAccessToken', label: 'META_ACCESS_TOKEN' },
            { k: 'hasAppSecret', label: 'META_APP_SECRET' },
            { k: 'hasVerifyToken', label: 'META_VERIFY_TOKEN' },
            { k: 'hasPhoneNumberId', label: 'META_PHONE_NUMBER_ID' },
            { k: 'hasN8nUrl', label: 'N8N_BASE_URL' },
            { k: 'hasAiKey', label: 'Chave IA' },
          ].map(({ k, label }) => (
            <div key={k} className={`rounded-lg px-3 py-2 text-xs font-medium ${cfg?.[k as keyof typeof cfg] ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {cfg?.[k as keyof typeof cfg] ? '✅' : '⬜'} {label}
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-gray-500">
          Webhook: <span className="font-mono">GET/POST /api/whatsapp/webhook</span>
          {status?.webhookVerified ? ' · verificado ✅' : ' · não verificado'}
          {status?.phoneNumber && <span> · número: {status.phoneNumber}</span>}
        </div>
      </div>

      {/* ── Ações ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Ações</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={runTest}
            disabled={testing}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {testing ? 'Testando…' : '🔍 Testar conexão'}
          </button>
          <button
            onClick={toggleBot}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${status?.botEnabled ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
          >
            {status?.botEnabled ? 'Bot ligado — desligar' : 'Ligar bot automático'}
          </button>
          <div className="flex items-center gap-2 ml-2">
            <input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="Telefone teste (5511999999999)"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-56"
            />
            <button
              onClick={sendTest}
              disabled={sendingTest || !testPhone.trim()}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {sendingTest ? 'Enviando…' : 'Enviar teste'}
            </button>
          </div>
        </div>
        {status?.lastTestStatus && (
          <p className="mt-3 text-xs text-gray-500">
            Último teste: {status.lastTestStatus === 'PASS' ? 'passou ✅' : 'falhou ❌'}
            {status.lastTestAt && ` · ${new Date(status.lastTestAt).toLocaleString('pt-BR')}`}
          </p>
        )}
        {status?.lastError && (
          <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg p-2">
            Erro: {status.lastError}
          </p>
        )}
      </div>

      {/* ── Conversas ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800">Conversas recentes</h2>
          <span className="text-xs text-gray-400">{conversations.length}</span>
        </div>
        {conversations.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Nenhuma conversa ainda. Mensagens do webhook aparecerão aqui.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map((c) => {
              const mode = MODE_LABEL[c.mode] ?? { label: c.mode, dot: 'bg-gray-400' };
              const last = c.messages[0];
              return (
                <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{maskPhone(c.whatsappNumber)}</span>
                      <span className={`inline-flex items-center gap-1 text-xs ${mode.dot} text-transparent`}>
                        <span className={`w-2 h-2 rounded-full ${mode.dot}`} />{mode.label}
                      </span>
                    </div>
                    {last && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {last.direction === 'INBOUND' ? '📩' : '📤'} {last.text || '(sem texto)'}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {c.currentIntent ? `intenção: ${c.currentIntent}` : 'sem intenção'} · {new Date(c.lastMessageAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.mode !== 'HUMAN' && (
                      <button onClick={() => setMode(c.id, 'HUMAN')} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700">
                        Atender
                      </button>
                    )}
                    {c.mode !== 'BOT' && (
                      <button onClick={() => setMode(c.id, 'BOT')} className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium hover:bg-gray-50">
                        Voltar ao bot
                      </button>
                    )}
                    <button onClick={() => setMode(c.id, 'CLOSED')} className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-500 hover:bg-gray-50">
                      Encerrar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
