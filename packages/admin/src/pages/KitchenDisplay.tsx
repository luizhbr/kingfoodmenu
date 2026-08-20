import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api.js';
import { usePrintOrder } from '../lib/usePrintOrder.js';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  comment: string | null;
  options: { name: string; value: string }[];
}

interface KitchenOrder {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  comment: string | null;
  createdAt: string;
  scheduledAt: string | null;
  customer: { name: string } | null;
  items: OrderItem[];
}

const KITCHEN_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'];

// ── Status config ────────────────────────────────────────────────────────────
// IMPORTANT: values MUST match the backend enum (English). Sending PT-BR
// labels ('CONFIRMADO', 'EM PREPARO', 'PRONTO', 'CANCELADO') returns 400 and
// leaves orders stuck forever.
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; next: string | null }> = {
  PENDING: { label: 'Novos', color: 'text-kf-warning', bg: 'bg-kf-warning/10 border-kf-warning/30', next: 'CONFIRMED' },
  CONFIRMED: { label: 'Confirmado', color: 'text-kf-info', bg: 'bg-kf-info/10 border-kf-info/30', next: 'PREPARING' },
  PREPARING: { label: 'Em preparo', color: 'text-kf-primary', bg: 'bg-kf-primary/10 border-kf-primary/30', next: 'READY' },
  READY: { label: 'Pronto', color: 'text-kf-success', bg: 'bg-kf-success/10 border-kf-success/30', next: null },
};

const NEXT_ACTION: Record<string, string> = {
  PENDING: 'Confirmar',
  CONFIRMED: 'Iniciar preparo',
  PREPARING: 'Marcar pronto',
};

const POLL_INTERVAL_MS = 5000; // 5s — near real-time on serverless (no WebSocket)

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [live, setLive] = useState(true);
  const prevOrderIds = useRef<Set<string>>(new Set());
  const { printState, printOrder } = usePrintOrder();

  const fetchOrders = useCallback((silent = false) => {
    // Fetch pedidos ativos (non-completed, non-cancelled)
    const statuses = KITCHEN_STATUSES.join(',');
    api.get<{ data: KitchenOrder[] }>(`/orders?limit=50&includeItems=true&status=${statuses}`)
      .then((res) => {
        const incoming = res.data;
        setOrders(incoming);
        setLastRefresh(new Date());

        // Highlight NEW orders (ids not present in the previous fetch)
        const incomingIds = new Set(incoming.map((o) => o.id));
        const fresh = new Set<string>();
        for (const o of incoming) {
          if (!prevOrderIds.current.has(o.id)) fresh.add(o.id);
        }
        if (fresh.size > 0) {
          setNewOrderIds(fresh);
          // Clear highlight after 4s
          setTimeout(() => {
            setNewOrderIds((prev) => {
              const next = new Set(prev);
              fresh.forEach((id) => next.delete(id));
              return next;
            });
          }, 4000);
        }
        prevOrderIds.current = incomingIds;
      })
      .catch(() => { /* silent — keep last known state */ })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Near real-time: silent polling every 5s. No manual refresh button needed —
  // the page stays in sync automatically. Interval is cleared on unmount and
  // never duplicated (single effect).
  useEffect(() => {
    const timer = setInterval(() => fetchOrders(true), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchOrders]);

  // Pause polling when the tab is hidden (battery/bandwidth friendly)
  useEffect(() => {
    const onVisibility = () => {
      setLive(!document.hidden);
      if (!document.hidden) fetchOrders(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      // Optimistic update; polling will reconcile with the server
      setOrders((prev) => {
        if (!KITCHEN_STATUSES.includes(newStatus)) {
          return prev.filter((o) => o.id !== orderId);
        }
        return prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
      });
    } catch {
      // Refresh on error
      fetchOrders();
    } finally {
      setUpdating(null);
    }
  };

  const handleComplete = async (orderId: string, orderType: string) => {
    const completedStatus = orderType === 'DELIVERY' ? 'OUT_FOR_DELIVERY' : 'PICKED_UP';
    setUpdating(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: completedStatus });
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch {
      fetchOrders();
    } finally {
      setUpdating(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    setUpdating(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: 'CANCELLED' });
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch {
      fetchOrders();
    } finally {
      setUpdating(null);
    }
  };

  const getTimeSince = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min atrás`;
    return `${Math.floor(mins / 60)}h ${mins % 60}min atrás`;
  };

  // Separate scheduled vs immediate orders
  const scheduledOrders = orders
    .filter((o) => o.scheduledAt && new Date(o.scheduledAt) > new Date())
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
  const immediateOrders = orders.filter((o) => !o.scheduledAt || new Date(o.scheduledAt) <= new Date());

  const ordersByStatus = KITCHEN_STATUSES.map((status) => ({
    status,
    config: STATUS_CONFIG[status],
    orders: immediateOrders.filter((o) => o.status === status).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ),
  }));

  return (
    <div className="min-h-screen bg-kf-bg">
      {/* Header */}
      <div className="bg-kf-surface border-b border-kf-border px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-kf-foreground">Cozinha — Display</h1>
          <div className="flex items-center gap-2" role="status">
            <span className={`w-2 h-2 rounded-full ${live ? 'bg-kf-success animate-pulse' : 'bg-kf-muted'}`} />
            <span className="text-xs text-kf-muted">
              {live ? 'Tempo real' : 'Pausado'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-kf-muted">
            {orders.length} pedidos ativos · atualizado {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-kf-primary/20 border-t-kf-primary rounded-full animate-spin" role="status" aria-label="Carregando" />
        </div>
      ) : (
        <>
          {/* Scheduled orders banner */}
          {scheduledOrders.length > 0 && (
            <div className="mx-4 mt-4 bg-kf-info/10 border border-kf-info/30 rounded-kf-lg p-4">
              <h3 className="text-sm font-bold text-kf-info mb-2">
                Pedidos agendados ({scheduledOrders.length})
              </h3>
              <div className="flex flex-wrap gap-3">
                {scheduledOrders.map((order) => (
                  <div key={order.id} className="bg-kf-surface rounded-kf-lg border border-kf-info/30 px-3 py-2 text-xs">
                    <span className="font-mono font-bold text-kf-foreground">#{order.orderNumber}</span>
                    <span className={`ml-2 px-1.5 py-0.5 rounded-kf-md font-medium ${order.orderType === 'DELIVERY' ? 'bg-kf-info/10 text-kf-info' : 'bg-kf-success/10 text-kf-success'
                      }`}>
                      {order.orderType === 'DELIVERY' ? 'Entrega' : order.orderType === 'PICKUP' ? 'Retirada' : order.orderType}
                    </span>
                    <span className="ml-2 text-kf-info font-medium">
                      {new Date(order.scheduledAt!).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {order.customer && <span className="ml-2 text-kf-muted">{order.customer.name}</span>}
                    <span className="ml-2 text-kf-muted">{order.items.length} itens</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 h-auto md:h-[calc(100vh-52px)] overflow-x-auto">
              {ordersByStatus.map(({ status, config, orders: statusOrders }) => (
                <div key={status} className="flex flex-col min-h-0 min-w-[280px]">
                  {/* Column header */}
                  <div className={`rounded-t-kf-lg px-4 py-2 border-b-2 ${config.bg}`}>
                    <div className="flex items-center justify-between">
                      <h2 className={`font-bold text-sm ${config.color}`}>{config.label}</h2>
                      <span className={`text-xs font-bold ${config.color} bg-kf-surface/60 px-2 py-0.5 rounded-full`}>
                        {statusOrders.length}
                      </span>
                    </div>
                  </div>

                  {/* Order cards */}
                  <div className="flex-1 overflow-y-auto space-y-3 py-3">
                    {statusOrders.length === 0 && (
                      <p className="text-center text-kf-muted text-sm py-8">Sem pedidos</p>
                    )}
                    {statusOrders.map((order) => (
                      <div
                        key={order.id}
                        className={`bg-kf-surface rounded-kf-lg shadow-sm border p-4 mx-1 transition-all duration-300 ${
                          updating === order.id ? 'opacity-50' : ''
                        } ${newOrderIds.has(order.id) ? 'border-kf-primary ring-2 ring-kf-primary/30 animate-pulse' : 'border-kf-border'}`}
                      >
                        {/* Order header */}
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-mono text-sm font-bold text-kf-foreground">
                              #{order.orderNumber}
                            </span>
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-kf-md font-medium ${order.orderType === 'DELIVERY'
                                ? 'bg-kf-info/10 text-kf-info'
                                : 'bg-kf-success/10 text-kf-success'
                              }`}>
                              {order.orderType === 'DELIVERY' ? 'Entrega' : order.orderType === 'PICKUP' ? 'Retirada' : order.orderType}
                            </span>
                          </div>
                          <span className="text-xs text-kf-muted">{getTimeSince(order.createdAt)}</span>
                        </div>

                        {/* Customer */}
                        {order.customer && (
                          <p className="text-xs text-kf-muted mb-2">{order.customer.name}</p>
                        )}

                        {/* Items */}
                        <div className="space-y-1 mb-3">
                          {order.items.map((item) => (
                            <div key={item.id} className="text-sm">
                              <div className="flex items-start gap-2">
                                <span className="font-bold text-kf-muted text-xs min-w-[20px]">
                                  {item.quantity}x
                                </span>
                                <div className="flex-1">
                                  <span className="font-medium text-kf-foreground">{item.name}</span>
                                  {item.options.length > 0 && (
                                    <p className="text-xs text-kf-muted">
                                      {item.options.map((o) => `${o.name}: ${o.value}`).join(', ')}
                                    </p>
                                  )}
                                  {item.comment && (
                                    <p className="text-xs text-kf-warning italic">{item.comment}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Order comment */}
                        {order.comment && (
                          <div className="bg-kf-warning/10 border border-kf-warning/30 rounded-kf-md p-2 mb-3">
                            <p className="text-xs text-kf-warning">{order.comment}</p>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          {config.next && (
                            <button
                              onClick={() => handleStatusUpdate(order.id, config.next!)}
                              disabled={updating === order.id}
                              className="flex-1 bg-kf-primary text-kf-primary-fg text-xs font-medium py-2 rounded-kf-lg hover:bg-kf-primary/90 transition-colors disabled:opacity-50"
                              aria-label={`${NEXT_ACTION[status]} order ${order.orderNumber}`}
                            >
                              {NEXT_ACTION[status]}
                            </button>
                          )}
                          {status === 'READY' && (
                            <button
                              onClick={() => handleComplete(order.id, order.orderType)}
                              disabled={updating === order.id}
                              className="flex-1 bg-kf-success text-white text-xs font-medium py-2 rounded-kf-lg hover:bg-kf-success/90 transition-colors disabled:opacity-50"
                              aria-label={`Mark order ${order.orderNumber} as ${order.orderType === 'DELIVERY' ? 'out for delivery' : 'picked up'}`}
                            >
                              {order.orderType === 'DELIVERY' ? 'Em entrega' : 'Retirado'}
                            </button>
                          )}
                          <button
                            onClick={() => void printOrder(order.id, 'REPRINT')}
                            disabled={updating === order.id || printState.status === 'sending'}
                            className="text-kf-muted hover:text-kf-foreground text-xs font-medium px-2 py-2 rounded-kf-lg hover:bg-kf-surface-muted transition-colors disabled:opacity-50"
                            aria-label={`Imprimir comanda ${order.orderNumber}`}
                          >
                            🖨
                          </button>
                          <button
                            onClick={() => handleCancel(order.id)}
                            disabled={updating === order.id}
                            className="text-kf-danger hover:text-kf-danger/80 text-xs font-medium px-2 py-2 rounded-kf-lg hover:bg-kf-danger/10 transition-colors disabled:opacity-50"
                            aria-label={`Cancelar order ${order.orderNumber}`}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
