import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getToken(): string | null {
  return localStorage.getItem('driver_token');
}

export default function DriverHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) { navigate('/driver/login'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/driver/orders/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) { localStorage.removeItem('driver_token'); navigate('/driver/login'); return; }
      const data = await res.json();
      if (data.success) setOrders(data.data);
    } finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto pb-20">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/driver')} className="text-gray-500 text-sm font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">Delivery History</h1>
      </header>
      <div className="px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-xl border border-gray-200 p-4 text-center">No deliveries yet</p>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-gray-900">{o.orderNumber}</p>
                <p className="text-xs text-gray-500">{o.deliveryCity || ''} · {o._count?.items || 0} items</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${o.status === 'DELIVERED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {o.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
