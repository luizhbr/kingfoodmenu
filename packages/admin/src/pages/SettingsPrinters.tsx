import { useState, useEffect, useCallback } from 'react';

// ── Tipos (espelham o schema Prisma Printer + PrintJob) ────────────────────
interface Printer {
  id: string;
  name: string;
  type: 'USB' | 'NETWORK' | 'OS_PRINTER';
  paperWidth: number;
  location: string | null;
  status: string;
  enabled: boolean;
  lastSeenAt: string | null;
  deviceId: string | null;
  pairingCode: string | null;
  pairingExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PrintJob {
  id: string;
  orderId: string | null;
  printerId: string;
  type: string;
  status: string;
  attempts: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  TESTING: 'Testando',
  ERROR: 'Erro',
  UNKNOWN: 'Desconhecida',
};

const STATUS_COLOR: Record<string, string> = {
  ONLINE: 'bg-emerald-100 text-emerald-700',
  OFFLINE: 'bg-gray-100 text-gray-500',
  TESTING: 'bg-blue-100 text-blue-700',
  ERROR: 'bg-red-100 text-red-700',
  UNKNOWN: 'bg-gray-100 text-gray-500',
};

const JOB_STATUS: Record<string, { label: string; dot: string }> = {
  QUEUED: { label: 'Na fila', dot: 'bg-yellow-400' },
  PRINTING: { label: 'Imprimindo', dot: 'bg-blue-500' },
  PRINTED: { label: 'Impresso', dot: 'bg-emerald-500' },
  FAILED: { label: 'Falhou', dot: 'bg-red-500' },
  CANCELLED: { label: 'Cancelado', dot: 'bg-gray-400' },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-2">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-2 py-1.5 text-sm"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded" />
      {label}
    </label>
  );
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString();
}

export default function SettingsPrinters() {
  const token = localStorage.getItem('token') || '';
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'OS_PRINTER', paperWidth: '80', location: '', enabled: true });

  // Test state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { status: string; message: string }>>({});

  // Pairing state
  const [pairingFor, setPairingFor] = useState<string | null>(null);
  // Restart state
  const [restartingId, setRestartingId] = useState<string | null>(null);
  const [restartMsg, setRestartMsg] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [pairingMsg, setPairingMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/print', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Falha ao carregar impressoras');
      const data = await res.json();
      setPrinters(data.data || []);
      const jres = await fetch('/api/print/jobs?limit=10', { headers: { Authorization: `Bearer ${token}` } });
      if (jres.ok) {
        const jdata = await jres.json();
        setJobs(jdata.data || []);
      }
      setError('');
    } catch (e: any) {
      setError(e.message || 'Não foi possível carregar impressoras.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function savePrinter() {
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return; }
    setError('');
    try {
      const body = {
        name: form.name,
        type: form.type,
        paperWidth: Number(form.paperWidth),
        location: form.location || null,
        enabled: form.enabled,
      };
      const res = await fetch(editingId ? `/api/print/${editingId}` : '/api/print', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Falha ao salvar impressora');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', type: 'OS_PRINTER', paperWidth: '80', location: '', enabled: true });
      void load();
    } catch (e: any) {
      setError(e.message || 'Falha ao salvar impressora.');
    }
  }

  async function deletePrinter(id: string) {
    if (!window.confirm('Excluir esta impressora?')) return;
    try {
      const res = await fetch(`/api/print/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir');
      void load();
    } catch (e: any) {
      setError(e.message || 'Falha ao excluir impressora.');
    }
  }

  /** Reinicia o print-agent da impressora (sinal via API; o agente reinicia sozinho). */
  async function restartAgent(p: Printer) {
    if (!window.confirm(`Reiniciar o agente de impressão de "${p.name}"?`)) return;
    setRestartingId(p.id);
    setRestartMsg('');
    try {
      const res = await fetch(`/api/print/${p.id}/restart`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao reiniciar agente');
      setRestartMsg(`Sinal enviado — o agente de "${p.name}" vai reiniciar em segundos.`);
      setTimeout(() => void load(), 3000);
    } catch (e: any) {
      setRestartMsg(e.message || 'Falha ao reiniciar agente.');
    } finally {
      setRestartingId(null);
    }
  }

  function startEdit(p: Printer) {
    setEditingId(p.id);
    setForm({ name: p.name, type: p.type, paperWidth: String(p.paperWidth), location: p.location || '', enabled: p.enabled });
    setShowForm(true);
  }

  /** Teste REAL de impressão — cria job TEST que o print-agent imprime fisicamente. */
  async function runTest(printer: Printer) {
    setTestingId(printer.id);
    setTestResult((prev) => ({ ...prev, [printer.id]: { status: 'testing', message: 'Testando...' } }));
    try {
      const res = await fetch('/api/print/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ printerId: printer.id, type: 'TEST' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao criar job de teste');
      const job = data.data;
      setTestResult((prev) => ({
        ...prev,
        [printer.id]: { status: 'queued', message: `Teste enviado (job ${job.id.slice(0, 8)}). Aguardando impressão...` },
      }));
      // Poll job status up to 20s
      const deadline = Date.now() + 20000;
      const poll = async () => {
        try {
          const jres = await fetch(`/api/print/jobs/${job.id}`, { headers: { Authorization: `Bearer ${token}` } });
          if (jres.ok) {
            const jd = await jres.json();
            const j = jd.data;
            if (j.status === 'PRINTED') {
              setTestResult((prev) => ({ ...prev, [printer.id]: { status: 'printed', message: 'Teste impresso ✓' } }));
              return;
            }
            if (j.status === 'FAILED') {
              setTestResult((prev) => ({ ...prev, [printer.id]: { status: 'failed', message: `Falha na impressão: ${j.errorMessage || 'erro desconhecido'}` } }));
              return;
            }
            if (j.status === 'CANCELLED') {
              setTestResult((prev) => ({ ...prev, [printer.id]: { status: 'failed', message: 'Teste cancelado' } }));
              return;
            }
          }
          if (Date.now() < deadline) {
            setTimeout(poll, 2000);
          } else {
            setTestResult((prev) => ({ ...prev, [printer.id]: { status: 'timeout', message: 'Tempo limite excedido — verifique se o print-agent está rodando.' } }));
          }
        } catch {
          if (Date.now() < deadline) setTimeout(poll, 2000);
        }
      };
      setTimeout(poll, 2000);
    } catch (e: any) {
      setTestResult((prev) => ({ ...prev, [printer.id]: { status: 'failed', message: e.message || 'Falha ao criar job de teste' } }));
    } finally {
      setTestingId(null);
    }
  }

  async function generatePairing(printer: Printer) {
    setPairingMsg('');
    try {
      const res = await fetch(`/api/print/${printer.id}/pairing`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar código');
      setPairingFor(printer.id);
      setPairingCode(data.data.code);
      setPairingMsg(`Código válido por 10 min. No computador da impressora, rode: king-print pair ${printer.id} ${data.data.code}`);
    } catch (e: any) {
      setPairingMsg(e.message || 'Falha ao gerar código de pareamento.');
    }
  }

  const testTone: Record<string, string> = {
    testing: 'text-blue-600',
    queued: 'text-blue-600',
    printed: 'text-emerald-600',
    failed: 'text-red-600',
    timeout: 'text-amber-600',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Impressoras</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure impressoras térmicas e o print-agent. O teste envia um job real para a impressora.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: '', type: 'OS_PRINTER', paperWidth: '80', location: '', enabled: true }); }}
          className="min-h-[44px] px-4 py-2 rounded-lg bg-[#FFD100] text-ink font-bold hover:bg-[#FFD100]/90"
        >
          {showForm ? 'Cancelar' : '+ Nova impressora'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4" role="alert">{error}</div>
      )}

      {restartMsg && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-lg mb-4" role="status">{restartMsg}</div>
      )}

      {showForm && (
        <Section title={editingId ? 'Editar impressora' : 'Nova impressora'}>
          <TextInput label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Ex: Cozinha 80mm" />
          <Select
            label="Tipo de conexão"
            value={form.type}
            onChange={(v) => setForm({ ...form, type: v })}
            options={[
              { value: 'OS_PRINTER', label: 'Impressora do Windows (spooler)' },
              { value: 'USB', label: 'USB direto (ESC/POS)' },
              { value: 'NETWORK', label: 'Rede (TCP 9100)' },
            ]}
          />
          <Select
            label="Largura do papel"
            value={form.paperWidth}
            onChange={(v) => setForm({ ...form, paperWidth: v })}
            options={[
              { value: '80', label: '80mm' },
              { value: '58', label: '58mm' },
            ]}
          />
          <TextInput label="Local (opcional)" value={form.location} onChange={(v) => setForm({ ...form, location: v })} placeholder="Ex: Cozinha" />
          <Check label="Ativa" checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} />
          <div className="flex gap-2 pt-2">
            <button onClick={savePrinter} className="min-h-[44px] px-4 py-2 rounded-lg bg-ink text-cream font-bold hover:bg-ink/90">
              {editingId ? 'Salvar alterações' : 'Criar impressora'}
            </button>
          </div>
        </Section>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : printers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Nenhuma impressora configurada.</p>
          <p className="text-sm text-gray-400 mt-1">Clique em "+ Nova impressora" para começar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {printers.map((p) => {
            const tr = testResult[p.id];
            return (
              <div key={p.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg" aria-hidden>🖨</span>
                      <h3 className="font-bold text-gray-900">{p.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[p.status] || STATUS_COLOR.UNKNOWN}`}>
                        {STATUS_LABEL[p.status] || p.status}
                      </span>
                      {!p.enabled && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Inativa</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {p.paperWidth}mm · {p.type === 'OS_PRINTER' ? 'Windows spooler' : p.type === 'USB' ? 'USB ESC/POS' : 'Rede TCP'}
                      {p.location ? ` · ${p.location}` : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Última atividade: {timeAgo(p.lastSeenAt)}
                      {p.deviceId ? ' · pareada' : ' · sem agent'}
                    </p>
                    {tr && (
                      <p className={`text-sm mt-1 font-medium ${testTone[tr.status] || 'text-gray-600'}`} role="status">
                        {tr.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void runTest(p)}
                      disabled={testingId === p.id}
                      className="min-h-[44px] px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {testingId === p.id ? 'Testando...' : 'Imprimir teste'}
                    </button>
                    <button
                      onClick={() => void generatePairing(p)}
                      className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                    >
                      Parear agent
                    </button>
                    <button
                      onClick={() => void restartAgent(p)}
                      disabled={restartingId === p.id || !p.deviceId}
                      title={p.deviceId ? 'Reiniciar o agente de impressão' : 'Impressora sem agent pareado'}
                      className="min-h-[44px] px-3 py-2 rounded-lg border border-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-50 disabled:opacity-50"
                    >
                      {restartingId === p.id ? 'Reiniciando...' : '🔄 Reiniciar agent'}
                    </button>
                    <button
                      onClick={() => startEdit(p)}
                      className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => void deletePrinter(p.id)}
                      className="min-h-[44px] px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
                {pairingFor === p.id && pairingCode && (
                  <div className="mt-3 bg-ink text-cream rounded-lg p-3 text-sm">
                    <p className="font-bold mb-1">Código de pareamento: <span className="font-mono text-[#FFD100]">{pairingCode}</span></p>
                    <p className="text-cream/80 text-xs">{pairingMsg}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Jobs recentes */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Trabalhos de impressão recentes</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum job ainda.</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2">Job</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Tentativas</th>
                  <th className="px-4 py-2">Criado</th>
                  <th className="px-4 py-2">Erro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((j) => {
                  const js = JOB_STATUS[j.status] || { label: j.status, dot: 'bg-gray-400' };
                  return (
                    <tr key={j.id}>
                      <td className="px-4 py-2 font-mono text-xs">{j.id.slice(0, 8)}</td>
                      <td className="px-4 py-2">{j.type}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${js.dot}`} />
                          {js.label}
                        </span>
                      </td>
                      <td className="px-4 py-2">{j.attempts}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{new Date(j.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-2 text-xs text-red-600 max-w-[200px] truncate" title={j.errorMessage || ''}>
                        {j.errorMessage || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
