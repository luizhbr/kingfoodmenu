import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  createdAt: string;
  comment?: string;
  deliveryLine1?: string;
  deliveryLine2?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryPostalCode?: string;
  deliveryFormattedAddress?: string;
  guestName?: string;
  guestPhone?: string;
  customer?: { name?: string; phone?: string } | null;
  assignedToId?: string;
  items?: { name: string; quantity: number; options?: { name: string }[] }[];
}

function getToken(): string | null {
  return localStorage.getItem('driver_token');
}

const ACTION_BY_STATUS: Record<string, { label: string; endpoint: string }> = {
  READY: { label: 'Mark as Picked Up', endpoint: 'pickup' },
  PICKED_UP: { label: 'Start Delivery', endpoint: 'out-for-delivery' },
  OUT_FOR_DELIVERY: { label: 'Mark as Delivered', endpoint: 'delivered' },
};

export default function DriverOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      navigate('/driver/login');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/driver/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('driver_token');
        navigate('/driver/login');
        return;
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load');
      setOrder(data.data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const advance = async () => {
    if (!order) return;
    const action = ACTION_BY_STATUS[order.status];
    if (!action) return;
    setActing(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/driver/orders/${order.id}/${action.endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      setOrder((prev) => (prev ? { ...prev, status: data.data.status } : prev));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActing(false);
    }
  };

  if (loading && !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error || 'Order not found'}</p>
          <button onClick={() => navigate('/driver')} className="text-primary-600 font-medium">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const customerName = order.customer?.name || order.guestName;
  const customerPhone = order.customer?.phone || order.guestPhone;
  const address = order.deliveryFormattedAddress || [order.deliveryLine1, order.deliveryLine2, order.deliveryCity, order.deliveryState, order.deliveryPostalCode].filter(Boolean).join(', ');
  const action = ACTION_BY_STATUS[order.status];

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto pb-20">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/driver')} className="text-gray-500 text-sm font-medium">
          ← Back
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">{order.orderNumber}</h1>
          <span className="text-xs px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full font-medium">
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="px-4 py-4 space-y-4">
        {/* Address */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Delivery</h2>
          <p className="text-gray-900 font-medium">{address}</p>
          {order.comment && <p className="text-sm text-gray-600 mt-2">Note: {order.comment}</p>}
        </div>

        {/* Customer */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Customer</h2>
          <p className="text-gray-900 font-medium">{customerName || 'Guest'}</p>
          {customerPhone && (
            <a href={`tel:${customerPhone}`} className="text-primary-600 text-sm font-medium">
              {customerPhone}
            </a>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</h2>
          <ul className="divide-y divide-gray-100">
            {(order.items || []).map((item, i) => (
              <li key={i} className="py-2 flex justify-between">
                <div>
                  <p className="text-gray-900">
                    {item.quantity}× {item.name}
                  </p>
                  {item.options && item.options.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {item.options.map((o) => o.name).join(', ')}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Action */}
        {action && (
          <button
            onClick={advance}
            disabled={acting}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50"
          >
            {acting ? 'Updating...' : action.label}
          </button>
        )}
        {!action && order.status === 'DELIVERED' && (
          <div className="text-center text-sm text-green-600 font-medium bg-green-50 border border-green-200 rounded-xl py-3">
            ✅ Delivered
          </div>
        )}
      </div>
    </div>
  );
}
