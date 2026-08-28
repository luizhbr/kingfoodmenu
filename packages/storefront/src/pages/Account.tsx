import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
const API_BASE = import.meta.env.VITE_API_URL || '';

interface Reward {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  value: number;
}

interface Redemption {
  id: string;
  couponCode: string;
  pointsCost: number;
  createdAt: string;
  reward: { name: string };
}

interface LoyaltyData {
  points: number;
  dollarValue: number;
  pointsValue: number;
  minRedeemPoints: number;
  transactions: Array<{
    id: string;
    type: string;
    points: number;
    description: string | null;
    createdAt: string;
    order: { orderNumber: string } | null;
  }>;
  rewards: Reward[];
  redemptions: Redemption[];
}

export default function Account() {
  const { t } = useTranslation();
  const { user, token, isLoading, logout } = useAuth();
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [newCoupon, setNewCoupon] = useState<string | null>(null);

  const loadLoyalty = () => {
    if (!token) return;
    fetch(`${API_BASE}/api/loyalty/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setLoyalty(data.data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadLoyalty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    setSaveError(null);
    try {
      const res = await fetch(`${API_BASE}/api/customer/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editName, phone: editPhone || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      setSaveMsg('Profile updated');
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const redeemReward = async (reward: Reward) => {
    if (!token || !window.confirm(`Resgatar "${reward.name}" por ${reward.pointsCost} pontos?`)) return;
    setRedeemingId(reward.id);
    setRedeemMsg(null);
    setRedeemError(null);
    setNewCoupon(null);
    try {
      const res = await fetch(`${API_BASE}/api/loyalty/rewards/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rewardId: reward.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Falha ao resgatar');
      setNewCoupon(data.data.couponCode);
      setRedeemMsg(`Prêmio resgatado! Use o cupom ${data.data.couponCode} no checkout.`);
      loadLoyalty();
    } catch (err: any) {
      setRedeemError(err.message);
    } finally {
      setRedeemingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const txs = loyalty?.transactions || [];
  const rewards = loyalty?.rewards || [];
  const redemptions = loyalty?.redemptions || [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('account.title')}</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Profile */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('account.personalInfo')}</h2>
          <form onSubmit={saveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t('auth.name')}</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t('account.emailLabel')}</label>
              <p className="text-gray-900 font-medium">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t('account.phoneLabel')}</label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              {saveMsg && <span className="text-sm text-green-600">{saveMsg}</span>}
              {saveError && <span className="text-sm text-red-600">{saveError}</span>}
            </div>
          </form>
        </div>

        {/* Loyalty */}
        {loyalty && (
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Fidelidade</h2>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary-600">{loyalty.points}</span>
              <span className="text-sm text-gray-500">pontos (US$ {loyalty.dollarValue.toFixed(2)} em descontos)</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Ganhe pontos a cada pedido e troque por prêmios. Mínimo para resgatar: {loyalty.minRedeemPoints} pontos.</p>

            {/* Redeem messages */}
            {newCoupon && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                🎉 Cupom gerado: <span className="font-bold">{newCoupon}</span> — use no checkout
              </div>
            )}
            {redeemError && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{redeemError}</div>}
            {redeemMsg && !newCoupon && <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{redeemMsg}</div>}

            {/* Rewards */}
            {rewards.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Prêmios disponíveis</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rewards.map((r) => (
                    <div key={r.id} className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{r.name}</div>
                        {r.description && <div className="text-xs text-gray-500">{r.description}</div>}
                        <div className="text-xs text-primary-600 mt-1 font-medium">{r.pointsCost} pontos</div>
                      </div>
                      <button
                        onClick={() => redeemReward(r)}
                        disabled={redeemingId === r.id || loyalty.points < r.pointsCost}
                        className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 disabled:opacity-40"
                      >
                        {redeemingId === r.id ? '...' : 'Resgatar'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Redemptions */}
            {redemptions.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Meus cupons resgatados</h3>
                <div className="space-y-2">
                  {redemptions.map((rd) => (
                    <div key={rd.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-gray-900">{rd.reward.name}</span>
                        <span className="text-gray-400 ml-2 text-xs">resgatado em {new Date(rd.createdAt).toLocaleDateString()}</span>
                      </div>
                      <code className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-bold text-primary-600">{rd.couponCode}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {txs.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Histórico de pontos</h3>
                <div className="space-y-1.5">
                  {txs.slice(0, 8).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-700">{tx.description || tx.type}</span>
                        {tx.order && <span className="text-gray-400 text-xs ml-2">#{tx.order.orderNumber}</span>}
                      </div>
                      <span className={`font-medium ${tx.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {tx.points >= 0 ? '+' : ''}{tx.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Links */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('footer.quickLinks')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to="/account/orders" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <h3 className="font-medium text-gray-900">{t('account.orderHistory')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('account.orderHistoryDesc')}</p>
            </Link>
          </div>
        </div>

        {/* Logout */}
        <div className="p-6">
          <button
            onClick={logout}
            className="text-red-600 hover:text-red-700 font-medium text-sm"
          >
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
