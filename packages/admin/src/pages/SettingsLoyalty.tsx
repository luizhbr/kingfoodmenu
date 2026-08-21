import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Reward {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  value: number;
  isActive: boolean;
}

export default function SettingsLoyalty() {
  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Config
  const [pointsPerDollar, setPointsPerDollar] = useState(1);
  const [pointsValue, setPointsValue] = useState(0.01);
  const [cashbackPercent, setCashbackPercent] = useState(5);
  const [minRedeemPoints, setMinRedeemPoints] = useState(100);
  const [benefitCap, setBenefitCap] = useState(50);

  // Rewards
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardName, setRewardName] = useState('');
  const [rewardDesc, setRewardDesc] = useState('');
  const [rewardCost, setRewardCost] = useState(100);
  const [rewardValue, setRewardValue] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings/loyalty', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.pointsPerDollar !== undefined) setPointsPerDollar(d.pointsPerDollar);
          if (d.pointsValue !== undefined) setPointsValue(d.pointsValue);
          if (d.cashbackPercent !== undefined) setCashbackPercent(d.cashbackPercent * 100);
          if (d.minRedeemPoints !== undefined) setMinRedeemPoints(d.minRedeemPoints);
          if (d.benefitCapPercent !== undefined) setBenefitCap(d.benefitCapPercent * 100);
        }
      })
      .catch(() => {})
      .finally(() => {
        fetch('/api/loyalty/rewards', { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.json())
          .then((res) => { if (res.success) setRewards(res.data); })
          .catch(() => {})
          .finally(() => setLoading(false));
      });
  }, [token]);

  async function handleSaveSettings() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings/loyalty', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pointsPerDollar,
          pointsValue,
          cashbackPercent: cashbackPercent / 100,
          minRedeemPoints,
          benefitCapPercent: benefitCap / 100,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Configuração de fidelidade salva');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : 'Falha ao salvar');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveReward(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    const body = { name: rewardName, description: rewardDesc || undefined, pointsCost: rewardCost, value: rewardValue, isActive: true };
    try {
      const url = editingId ? `/api/loyalty/rewards/${editingId}` : '/api/loyalty/rewards';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setRewardName('');
        setRewardDesc('');
        setRewardCost(100);
        setRewardValue(5);
        setEditingId(null);
        setSuccess(editingId ? 'Prêmio atualizado' : 'Prêmio criado');
        setTimeout(() => setSuccess(''), 3000);
        const list = await fetch('/api/loyalty/rewards', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
        if (list.success) setRewards(list.data);
      } else {
        setError(typeof data.error === 'string' ? data.error : 'Falha ao salvar prêmio');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(r: Reward) {
    try {
      await fetch(`/api/loyalty/rewards/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !r.isActive }),
      });
      setRewards((prev) => prev.map((x) => (x.id === r.id ? { ...x, isActive: !r.isActive } : x)));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteReward(r: Reward) {
    if (!window.confirm(`Excluir o prêmio "${r.name}"?`)) return;
    try {
      await fetch(`/api/loyalty/rewards/${r.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setRewards((prev) => prev.filter((x) => x.id !== r.id));
    } catch (err: any) {
      setError(err.message);
    }
  }

  function startEdit(r: Reward) {
    setEditingId(r.id);
    setRewardName(r.name);
    setRewardDesc(r.description || '');
    setRewardCost(r.pointsCost);
    setRewardValue(r.value);
  }

  if (loading) return <div className="p-6 text-gray-500">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700">&larr; Voltar às Configurações</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Fidelidade &amp; Recompensas</h1>
          <p className="text-sm text-gray-500 mt-1">Pontos por compra, valor do ponto, cashback e prêmios resgatáveis</p>
        </div>
        <button onClick={handleSaveSettings} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar Configuração'}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      {/* Rules */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Regras do programa</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pontos por US$ 1 gasto</label>
            <input type="number" min={0.01} step={0.1} value={pointsPerDollar} onChange={(e) => setPointsPerDollar(parseFloat(e.target.value) || 1)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
            <p className="text-xs text-gray-400 mt-1">Ex: 1 = 1 ponto por dólar; 2 = 2 pontos por dólar</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor de cada ponto (US$)</label>
            <input type="number" min={0.0001} step={0.001} value={pointsValue} onChange={(e) => setPointsValue(parseFloat(e.target.value) || 0.01)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
            <p className="text-xs text-gray-400 mt-1">Ex: 0.01 = 100 pontos valem US$ 1 de desconto</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cashback (%)</label>
            <input type="number" min={0} max={50} step={0.5} value={cashbackPercent} onChange={(e) => setCashbackPercent(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
            <p className="text-xs text-gray-400 mt-1">Porcentagem devolvida na carteira após o pedido ser concluído</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mínimo de pontos p/ resgatar</label>
            <input type="number" min={1} step={1} value={minRedeemPoints} onChange={(e) => setMinRedeemPoints(parseInt(e.target.value) || 100)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
            <p className="text-xs text-gray-400 mt-1">Quantidade mínima que o cliente precisa ter para usar pontos</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teto de benefício (%)</label>
            <input type="number" min={0} max={100} step={1} value={benefitCap} onChange={(e) => setBenefitCap(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
            <p className="text-xs text-gray-400 mt-1">Máximo do subtotal que o cliente pode descontar somando cupom + pontos + cashback</p>
          </div>
        </div>
      </div>

      {/* Rewards */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Prêmios resgatáveis</h2>
        <p className="text-sm text-gray-500 mb-4">O cliente troca pontos por um cupom de desconto único (gerado na hora do resgate).</p>

        <form onSubmit={handleSaveReward} className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input value={rewardName} onChange={(e) => setRewardName(e.target.value)} required placeholder="Ex: R$5 de desconto" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input value={rewardDesc} onChange={(e) => setRewardDesc(e.target.value)} placeholder="Ex: Cupom de US$ 5 no próximo pedido" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pontos</label>
            <input type="number" min={1} step={1} value={rewardCost} onChange={(e) => setRewardCost(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (US$)</label>
            <input type="number" min={0.01} step={0.01} value={rewardValue} onChange={(e) => setRewardValue(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={saving} className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
              {editingId ? 'Atualizar' : 'Adicionar'}
            </button>
          </div>
        </form>
        {editingId && (
          <button onClick={() => { setEditingId(null); setRewardName(''); setRewardDesc(''); setRewardCost(100); setRewardValue(5); }} className="text-sm text-gray-500 hover:text-gray-700 mb-2">
            Cancelar edição
          </button>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-4 font-medium">Prêmio</th>
                <th className="py-2 pr-4 font-medium">Pontos</th>
                <th className="py-2 pr-4 font-medium">Desconto</th>
                <th className="py-2 pr-4 font-medium">Ativo</th>
                <th className="py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rewards.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-gray-400">Nenhum prêmio criado ainda. Adicione o primeiro acima.</td></tr>
              )}
              {rewards.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-4">
                    <div className="font-medium text-gray-900">{r.name}</div>
                    {r.description && <div className="text-xs text-gray-500">{r.description}</div>}
                  </td>
                  <td className="py-2 pr-4">{r.pointsCost}</td>
                  <td className="py-2 pr-4">US$ {r.value.toFixed(2)}</td>
                  <td className="py-2 pr-4">
                    <button onClick={() => handleToggleActive(r)} className={`px-2 py-1 rounded-full text-xs font-medium ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                      {r.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(r)} className="text-primary-600 hover:text-primary-700 text-sm font-medium">Editar</button>
                      <button onClick={() => handleDeleteReward(r)} className="text-red-600 hover:text-red-700 text-sm font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
