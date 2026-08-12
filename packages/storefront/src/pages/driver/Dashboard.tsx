import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface DriverOrder {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryLine1?: string;
  deliveryFormattedAddress?: string;
  guestName?: string;
  customer?: { name?: string; phone?: string } | null;
  _count?: { items: number };
}

function getToken(): string | null {
  return localStorage.getItem('driver_token');
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [assigned, setAssigned] = useState<DriverOrder[]>([]);
  const [available, setAvailable] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<{ name: string } | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      navigate('/driver/login');
      return;
    }
    try {
      const [ordersRes, profileRes] = await Promise.all([
        fetch(`${API_BASE}/api/driver/orders`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/driver/profile`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (ordersRes.status === 401 || ordersRes.status === 403) {
        localStorage.removeItem('driver_token');
        navigate('/driver/login');
        return;
      }
      const orders = await ordersRes.json();
      const prof = await profileRes.json();
      if (orders.success) {
        setAssigned(orders.data.assigned || []);
        setAvailable(orders.data.available || []);
      }
      if (prof.success) setProfile(prof.data);
      setError('');
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Poll every 15s (same pattern as the kitchen display)
  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const acceptOrder = async (id: string) => {
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/api/driver/orders/${id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Accept failed');
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('driver_token');
    navigate('/driver/login');
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Driver</h1>
          {profile && <p className="text-xs text-gray-500">{profile.name}</p>}
        </div>
        <button onClick={logout} className="text-sm text-red-600 font-medium">
          Logout
        </button>
      </header>

      {error && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Assigned */}
      <section className="px-4 py-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          My Deliveries ({assigned.length})
        </h2>
        {assigned.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-xl border border-gray-200 p-4 text-center">
            No active deliveries
          </p>
        ) : (
          <div className="space-y-3">
            {assigned.map((o) => (
              <Link
                key={o.id}
                to={`/driver/orders/${o.id}`}
                className="block bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-900">{o.orderNumber}</span>
                  <span className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded-full font-medium">
                    {o.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {o.deliveryFormattedAddress || `${o.deliveryLine1 || ''} ${o.deliveryCity || ''}`.trim()}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {o._count?.items || 0} items ·{' '}
                  {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Available */}
      <section className="px-4 pb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Available ({available.length})
        </h2>
        {available.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-xl border border-gray-200 p-4 text-center">
            No orders available right now
          </p>
        ) : (
          <div className="space-y-3">
            {available.map((o) => (
              <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-900">{o.orderNumber}</span>
                  <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full font-medium">READY</span>
                </div>
                <p className="text-sm text-gray-600">
                  {o.deliveryFormattedAddress || `${o.deliveryLine1 || ''} ${o.deliveryCity || ''}`.trim()}
                </p>
                <button
                  onClick={() => acceptOrder(o.id)}
                  className="mt-3 w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
                >
                  Accept Delivery
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 max-w-lg mx-auto">
        <div className="flex">
          <button onClick={() => navigate('/driver')} className="flex-1 py-3 text-xs font-medium text-primary-600">
            Deliveries
          </button>
          <button onClick={() => navigate('/driver/history')} className="flex-1 py-3 text-xs font-medium text-gray-500">
            History
          </button>
          <button onClick={() => navigate('/driver/profile')} className="flex-1 py-3 text-xs font-medium text-gray-500">
            Profile
          </button>
        </div>
      </nav>
    </div>
  );
}
