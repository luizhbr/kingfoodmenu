import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface DashboardData {
  metrics: {
    ordersToday: number;
    revenueToday: number;
    ordersThisWeek: number;
    revenueThisWeek: number;
    ordersThisMonth: number;
    revenueThisMonth: number;
    totalOrders: number;
    totalRevenue: number;
    activeItems: number;
    totalCustomers: number;
    pendingReservations: number;
    pendingReviews: number;
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    orderType: string;
    createdAt: string;
    customer: { name: string } | null;
  }[];
  topItems: {
    menuItemId: string;
    name: string;
    totalQuantity: number;
  }[];
}

interface AnálisesData {
  dailyStats: { date: string; orders: number; revenue: number }[];
  orderTypeDistribution: { type: string; count: number }[];
  orderStatusDistribution: { status: string; count: number }[];
  hourlyDistribution: { hour: number; orders: number }[];
  categoryRevenue: { name: string; revenue: number; orders: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  READY: 'bg-green-100 text-green-800',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-200 text-green-900',
  PICKED_UP: 'bg-green-200 text-green-900',
  CANCELLED: 'bg-red-100 text-red-800',
};

const CHART_COLORS = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#7c3aed', '#2563eb', '#059669'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [analytics, setAnálises] = useState<AnálisesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnálisesLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'analytics'>('overview');
  const [analyticsDays, setAnálisesDays] = useState(30);

  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    fetch(`/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load dashboard');
        return res.json();
      })
      .then((result) => setData(result.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    setAnálisesLoading(true);
    fetch(`/api/dashboard/analytics?days=${analyticsDays}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load analytics');
        return res.json();
      })
      .then((result) => setAnálises(result.data))
      .catch(() => { })
      .finally(() => setAnálisesLoading(false));
  }, [token, analyticsDays]);

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Painel</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['Pedidos hoje', 'Receita', 'Reservas', 'Active Items'].map((label) => (
            <div key={label} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <p className="text-sm text-gray-500">{label}</p>
              <div className="h-9 bg-gray-200 rounded mt-2 w-20" role="status" aria-label="Carregando" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Painel</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['Pedidos hoje', 'Receita hoje', 'Reservas pendentes', 'Itens ativos no cardápio'].map((label) => (
            <div key={label} className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">--</p>
            </div>
          ))}
        </div>
        {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mt-4">{error}</div>}
      </div>
    );
  }

  const m = data.metrics;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Painel</h2>
        <div className="flex bg-gray-100 rounded-lg p-1" role="tablist">
          <button
            onClick={() => setTab('overview')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'overview' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            role="tab"
            aria-selected={tab === 'overview'}
          >
            Visão geral
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'analytics' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            role="tab"
            aria-selected={tab === 'analytics'}
          >
            Análises
          </button>
        </div>
      </div>

      {/* Key Metrics — always visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Pedidos hoje</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{m.ordersToday}</p>
          <p className="text-xs text-gray-400 mt-1">{m.ordersThisWeek} this week</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Receita hoje</p>
          <p className="text-3xl font-bold text-primary-600 mt-1">${m.revenueToday.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">${m.revenueThisMonth.toFixed(2)} this month</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Reservas pendentes</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{m.pendingReservations}</p>
          <p className="text-xs text-gray-400 mt-1">{m.totalCustomers} total customers</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Itens ativos no cardápio</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{m.activeItems}</p>
          <p className="text-xs text-gray-400 mt-1">{m.pendingReviews} reviews pending</p>
        </div>
      </div>

      {tab === 'overview' && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{m.totalOrders}</p>
              <p className="text-xs text-gray-500">Total de pedidos</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">${m.totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Receita total</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{m.ordersThisMonth}</p>
              <p className="text-xs text-gray-500">Pedidos este mês</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">${m.revenueThisWeek.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Receita esta semana</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Pedidos recentes</h3>
                <Link to="/orders" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  Ver todos
                </Link>
              </div>
              {data.recentOrders.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum pedido ainda.</p>
              ) : (
                <div className="space-y-3">
                  {data.recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded"
                    >
                      <div>
                        <span className="font-mono text-xs font-medium text-gray-900">{order.orderNumber}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {order.customer?.name || 'Convidado'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-medium">${order.total.toFixed(2)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Top Selling Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Itens mais vendidos</h3>
                <Link to="/menu/items" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  Ver cardápio
                </Link>
              </div>
              {data.topItems.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum dado de vendas ainda.</p>
              ) : (
                <div className="space-y-3">
                  {data.topItems.map((item, idx) => (
                    <div key={item.menuItemId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-400 w-5">{idx + 1}</span>
                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">{item.totalQuantity} sold</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'analytics' && (
        <AnálisesPanel
          analytics={analytics}
          loading={analyticsLoading}
          days={analyticsDays}
          onDaysChange={setAnálisesDays}
        />
      )}
    </div>
  );
}

function AnálisesPanel({
  analytics,
  loading,
  days,
  onDaysChange,
}: {
  analytics: AnálisesData | null;
  loading: boolean;
  days: number;
  onDaysChange: (d: number) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label="Carregando" />
      </div>
    );
  }

  if (!analytics) {
    return <p className="text-gray-500 text-sm">Não foi possível carregar os dados.</p>;
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
  };

  // Fill missing hours (0-23)
  const fullHourly = Array.from({ length: 24 }, (_, i) => {
    const found = analytics.hourlyDistribution.find((h) => h.hour === i);
    return { hour: i, label: formatHour(i), orders: found?.orders || 0 };
  });

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex justify-end">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[7, 14, 30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => onDaysChange(d)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${days === d ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              aria-label={`Show last ${d} days`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Tendência de receita */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendência de receita</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={analytics.dailyStats.map((d) => ({ ...d, label: formatDate(d.date) }))}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Receita']}
              contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#ea580c" fill="url(#revenueGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Pedidos diários */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pedidos diários</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={analytics.dailyStats.map((d) => ({ ...d, label: formatDate(d.date) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
            <Bar dataKey="orders" fill="#ea580c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Type Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tipos de pedido</h3>
          {analytics.orderTypeDistribution.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhum dado disponível.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.orderTypeDistribution}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={false}
                >
                  {analytics.orderTypeDistribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status do pedido Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status do pedido</h3>
          {analytics.orderStatusDistribution.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhum dado disponível.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.orderStatusDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="status"
                  tick={{ fontSize: 11 }}
                  width={110}
                  tickFormatter={(v) => v.replace(/_/g, ' ')}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(value) => [value, 'Pedidos']}
                />
                <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Hourly Distribution */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pedidos por hora do dia</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={fullHourly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
            <Bar dataKey="orders" fill="#fb923c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category Revenue */}
      {analytics.categoryRevenue.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Receita por categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.categoryRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(value, name) => [
                  name === 'Receita' ? `$${Number(value).toFixed(2)}` : value,
                  name,
                ]}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#ea580c" radius={[4, 4, 0, 0]} name="Receita" />
              <Bar dataKey="orders" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Pedidos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
