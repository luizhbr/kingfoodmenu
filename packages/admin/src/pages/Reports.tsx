import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface PeriodOption {
  value: string;
  label: string;
}

const PERIODS: PeriodOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'prevMonth', label: 'Previous month' },
];

interface Overview {
  orders: number;
  completed: number;
  cancelled: number;
  pending: number;
  revenue: number;
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFees: number;
  grossSales: number;
  aov: number;
  itemsSold: number;
  customers: number;
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">{title}</h2>
      {children}
    </div>
  );
}

export default function Reports() {
  const { token } = useAuth();
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState<any>(null);
  const [products, setProducts] = useState<any>(null);
  const [marketing, setMarketing] = useState<any>(null);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const base = `${API_BASE}/api/reports`;
      const q = `?period=${period}`;
      const [ov, pr, mk, ly, dl] = await Promise.all([
        fetch(`${base}/overview${q}`, { headers }).then((r) => r.json()),
        fetch(`${base}/products${q}`, { headers }).then((r) => r.json()),
        fetch(`${base}/marketing${q}`, { headers }).then((r) => r.json()),
        fetch(`${base}/loyalty${q}`, { headers }).then((r) => r.json()),
        fetch(`${base}/delivery${q}`, { headers }).then((r) => r.json()),
      ]);
      if (!ov.success) throw new Error(ov.error || 'Failed');
      setData(ov.data);
      setProducts(pr.data);
      setMarketing(mk.data);
      setLoyalty(ly.data);
      setDelivery(dl.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [token, period]);

  useEffect(() => { load(); }, [load]);

  const exportExcel = async () => {
    if (!token || exporting) return;
    setExporting(true);
    setExportMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/reports/export?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KingFood_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportMsg('✅ Excel exported');
      setTimeout(() => setExportMsg(''), 4000);
    } catch (err: any) {
      setExportMsg(`❌ ${err.message}`);
      setTimeout(() => setExportMsg(''), 5000);
    } finally {
      setExporting(false);
    }
  };

  const ov: Overview | undefined = data?.overview;
  const fmt = (n?: number) => (n === undefined ? '$0' : `$${n.toFixed(2)}`);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">{data?.range?.label || 'Loading...'}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <button
            onClick={exportExcel}
            disabled={exporting}
            className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <button
            onClick={load}
            className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {exportMsg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${exportMsg.startsWith('✅') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {exportMsg}
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Headline */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card label="Revenue" value={fmt(ov?.revenue)} sub={`${ov?.orders ?? 0} orders`} />
            <Card label="AOV" value={fmt(ov?.aov)} />
            <Card label="Customers" value={`${ov?.customers ?? 0}`} sub={`${data?.customers?.newCustomers ?? 0} new`} />
            <Card label="Items Sold" value={`${ov?.itemsSold ?? 0}`} />
          </div>

          {/* Financial detail */}
          <Section title="Sales Breakdown">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card label="Gross Sales" value={fmt(ov?.grossSales)} />
              <Card label="Discounts" value={fmt(ov?.discount)} />
              <Card label="Tax" value={fmt(ov?.tax)} />
              <Card label="Delivery Fees" value={fmt(ov?.deliveryFees)} />
              <Card label="Net Revenue" value={fmt(ov?.revenue)} />
            </div>
          </Section>

          {/* Orders */}
          <Section title="Orders">
            <div className="grid grid-cols-3 gap-4">
              <Card label="Completed" value={`${ov?.completed ?? 0}`} />
              <Card label="Pending" value={`${ov?.pending ?? 0}`} />
              <Card label="Cancelled" value={`${ov?.cancelled ?? 0}`} />
            </div>
          </Section>

          {/* Top products & categories */}
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Top Products">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-2">Product</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right">Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(products?.products || []).map((p: any, i: number) => (
                      <tr key={i}>
                        <td className="px-4 py-2 font-medium">{p.name}</td>
                        <td className="px-4 py-2 text-right">{p.quantity}</td>
                        <td className="px-4 py-2 text-right">{fmt(p.sales)}</td>
                      </tr>
                    ))}
                    {(!products?.products || products.products.length === 0) && (
                      <tr><td className="px-4 py-4 text-gray-400" colSpan={3}>No data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Top Categories">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-2">Category</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right">Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(products?.categories || []).map((c: any, i: number) => (
                      <tr key={i}>
                        <td className="px-4 py-2 font-medium">{c.name}</td>
                        <td className="px-4 py-2 text-right">{c.quantity}</td>
                        <td className="px-4 py-2 text-right">{fmt(c.sales)}</td>
                      </tr>
                    ))}
                    {(!products?.categories || products.categories.length === 0) && (
                      <tr><td className="px-4 py-4 text-gray-400" colSpan={3}>No data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>

          {/* Marketing */}
          <Section title="Marketing">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Attribution by Source</h3>
                {(marketing?.attribution?.bySource || []).map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-600 capitalize">{s.source}</span>
                    <span className="text-sm font-medium">{s.count} ({s.pct}%)</span>
                  </div>
                ))}
                {(!marketing?.attribution?.bySource || marketing.attribution.bySource.length === 0) && (
                  <p className="text-sm text-gray-400">No attribution data</p>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Coupons</h3>
                <div className="flex justify-between py-1.5">
                  <span className="text-sm text-gray-600">Total usage</span>
                  <span className="text-sm font-medium">{marketing?.coupons?.totalUsage ?? 0}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-sm text-gray-600">Discount generated</span>
                  <span className="text-sm font-medium">{fmt(marketing?.coupons?.discountGenerated)}</span>
                </div>
                {(marketing?.coupons?.byCoupon || []).slice(0, 5).map((c: any, i: number) => (
                  <div key={i} className="flex justify-between py-1 border-t border-gray-100">
                    <span className="text-sm text-gray-600 font-mono">{c.code}</span>
                    <span className="text-sm">{c.usage}× {fmt(c.discount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Loyalty / Cashback */}
          <Section title="Loyalty & Cashback">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Loyalty Points</h3>
                <div className="flex justify-between py-1.5">
                  <span className="text-sm text-gray-600">Earned</span>
                  <span className="text-sm font-medium">{loyalty?.loyalty?.earned ?? 0}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-sm text-gray-600">Redeemed</span>
                  <span className="text-sm font-medium">{loyalty?.loyalty?.redeemed ?? 0}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-sm text-gray-600">Adjusted</span>
                  <span className="text-sm font-medium">{loyalty?.loyalty?.adjusted ?? 0}</span>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Cashback (ledger)</h3>
                <div className="flex justify-between py-1.5">
                  <span className="text-sm text-gray-600">Credited</span>
                  <span className="text-sm font-medium">{fmt(loyalty?.cashback?.credited)} ({loyalty?.cashback?.creditedCount ?? 0})</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-sm text-gray-600">Used</span>
                  <span className="text-sm font-medium">{fmt(loyalty?.cashback?.debited)} ({loyalty?.cashback?.debitedCount ?? 0})</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-sm text-gray-600">Reversed</span>
                  <span className="text-sm font-medium">{fmt(loyalty?.cashback?.reversed)} ({loyalty?.cashback?.reversedCount ?? 0})</span>
                </div>
              </div>
            </div>
          </Section>

          {/* Delivery */}
          <Section title="Delivery">
            <div className="grid grid-cols-3 gap-4">
              <Card label="Delivery Orders" value={`${delivery?.deliveryOrders ?? 0}`} />
              <Card label="Delivered" value={`${delivery?.delivered ?? 0}`} />
              <Card label="Cancelled" value={`${delivery?.cancelled ?? 0}`} />
            </div>
            {delivery?.driverPerformance && delivery.driverPerformance.length > 0 && (
              <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-2">Driver</th>
                      <th className="px-4 py-2 text-right">Assigned</th>
                      <th className="px-4 py-2 text-right">Delivered</th>
                      <th className="px-4 py-2 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {delivery.driverPerformance.map((d: any, i: number) => (
                      <tr key={i}>
                        <td className="px-4 py-2 font-medium">{d.driverName}</td>
                        <td className="px-4 py-2 text-right">{d.assigned}</td>
                        <td className="px-4 py-2 text-right">{d.delivered}</td>
                        <td className="px-4 py-2 text-right">{d.completionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
