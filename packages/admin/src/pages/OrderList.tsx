import { useState, useEffect, useCallback, useRef } from 'react';
import ManualOrderModal from '../components/ManualOrderModal.js';
import OrderCard from '../components/OrderCard.js';
import SoundActivationBanner from '../components/SoundActivationBanner.js';
import { useOrderAlerts } from '../lib/useOrderAlerts.js';
import { usePermissions } from '../lib/usePermissions.js';

interface Order {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  subtotal: number;
  total: number;
  createdAt: string;
  scheduledAt: string | null;
  customer: { id: string; name: string; email: string } | null;
  location: { id: string; name: string };
  _count: { items: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activatingSound, setActivatingSound] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const firstLoadRef = useRef(true);

  const token = localStorage.getItem('token') || '';

  const {
    soundEnabled,
    showActivateBanner,
    alertNewOrders,
    enableSound,
    markAllAsSeen,
    requestSoundActivation,
  } = useOrderAlerts();

  const { has } = usePermissions();

  const loadOrders = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('orderType', typeFilter);

      fetch(`/api/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Falha ao carregar pedidos');
          return res.json();
        })
        .then((data) => {
          setOrders(data.data);
          setPagination(data.pagination);
          if (firstLoadRef.current) {
            // Primeira carga: pedidos antigos NÃO tocam o som.
            markAllAsSeen(data.data);
            firstLoadRef.current = false;
          } else {
            // Cargas seguintes: alerta somente pedidos realmente novos.
            alertNewOrders(data.data);
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    },
    [page, statusFilter, typeFilter, token, alertNewOrders]
  );

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOrders]);

  // Polling de novos pedidos (15s) — mesmo padrão do KitchenDisplay.
  // Sem Socket.IO no Vercel serverless; intervalo limpo no unmount, nunca duplicado.
  useEffect(() => {
    const timer = setInterval(() => loadOrders(true), 15000);
  return () => clearInterval(timer);
  }, [loadOrders]);

  // Ao entrar no painel de pedidos: inicializa o áudio o quanto antes.
  useEffect(() => {
    requestSoundActivation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSoundActivate = useCallback(() => {
    setActivatingSound(true);
    // Um pequeno delay para o estado visual; o clique desbloqueia o AudioContext.
    setTimeout(() => {
      const ok = enableSound();
      if (ok) {
        try { sessionStorage.setItem('kf_sound_activated', '1'); } catch { /* ignore */ }
      }
      setActivatingSound(false);
    }, 200);
  }, [enableSound]);

  const handleStatusChange = useCallback(
    (_orderId: string, _newStatus: string) => {
      loadOrders(true);
    },
    [loadOrders]
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (prev.size === orders.length) return new Set();
      return new Set(orders.map((o) => o.id));
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/orders/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir pedido');
      setDeleteTarget(null);
      loadOrders(true);
    } catch (err: any) {
      setDeleteError(err.message || 'Falha ao excluir o pedido');
    } finally {
      setDeleting(false);
    }
  }

  const [manualOrderOpen, setManualOrderOpen] = useState(false);

  const handleManualOrderSuccess = useCallback(() => {
    setManualOrderOpen(false);
    loadOrders(true);
  }, [loadOrders]);
;

  const confirmBatchDelete = async () => {
    if (selected.size === 0 || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/orders/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: [...selected] }),
      });
      if (!res.ok) throw new Error('Falha ao excluir pedidos');
      setSelected(new Set());
      setBatchMode(false);
      loadOrders(true);
    } catch (err: any) {
      setDeleteError(err.message || 'Falha ao excluir os pedidos');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        {pagination && (
          <span className="text-sm text-gray-500">{pagination.total} pedido{pagination.total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Alerta sonoro: ativação explícita exigida pelo navegador */}
      {showActivateBanner && !soundEnabled && (
        <SoundActivationBanner onActivate={handleSoundActivate} activating={activatingSound} />
      )}
      {soundEnabled && (
        <div
          role="status"
          className="mb-4 px-4 py-2 rounded-kf-lg border border-kf-border bg-kf-surface text-sm text-kf-foreground/80"
        >
          🔊 Alertas sonoros ativados
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {has('orders.create') && (
          <button
            onClick={() => setManualOrderOpen(true)}
            className="ml-auto px-4 py-2 rounded-lg bg-kf-primary text-white font-semibold hover:bg-kf-primary/90 transition min-h-[44px]"
          >
            + Novo Pedido
          </button>
        )}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          aria-label="Filtrar por status"
        >
          <option value="">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="CONFIRMED">Confirmado</option>
          <option value="PREPARING">Em preparo</option>
          <option value="READY">Pronto</option>
          <option value="OUT_FOR_DELIVERY">Em entrega</option>
          <option value="DELIVERED">Entregue</option>
          <option value="PICKED_UP">Retirado</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          aria-label="Filtrar por tipo de pedido"
        >
          <option value="">Todos os tipos</option>
          <option value="DELIVERY">Entrega</option>
          <option value="PICKUP">Retirada</option>
        </select>
      </div>

      {/* Barra de seleção em lote */}
      {orders.length > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-kf-surface border border-kf-border rounded-kf-lg">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selected.size === orders.length && orders.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              aria-label="Marcar todos os pedidos"
            />
            <span className="text-sm font-medium text-kf-foreground">Marcar todos</span>
          </label>
          {selected.size > 0 && (
            <>
              <span className="text-sm text-kf-muted">{selected.size} selecionado{selected.size !== 1 ? 's' : ''}</span>
              <button
                onClick={() => setBatchMode(true)}
                className="ml-auto px-3 py-1.5 bg-kf-danger text-white text-xs font-bold rounded-kf-md hover:bg-kf-danger/90 transition-colors"
              >
                Excluir selecionados
              </button>
            </>
          )}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label="Carregando" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>
      )}

      {!loading && !error && orders.length === 0 && (
        <p className="text-gray-500 text-center py-12">Nenhum pedido encontrado.</p>
      )}

      {!loading && orders.length > 0 && (
        <>
          {/* Grid de cards — mobile-first, expande no tablet/desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {orders.map((order) => (
              <div key={order.id} className={`relative rounded-kf-lg transition-all ${selected.has(order.id) ? 'ring-2 ring-primary-500' : ''}`}>
                <label className="absolute top-2 left-2 z-10 flex items-center justify-center w-6 h-6 bg-white/90 rounded-md shadow-sm cursor-pointer" aria-label={`Selecionar ${order.orderNumber}`}>
                  <input
                    type="checkbox"
                    checked={selected.has(order.id)}
                    onChange={() => toggleSelect(order.id)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
                <OrderCard
                  order={order}
                  token={token}
                  onStatusChange={handleStatusChange}
                  onDelete={() => setDeleteTarget({ id: order.id, name: order.orderNumber })}
                />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >Anterior</button>
              <span className="text-sm text-gray-600">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >Próximo</button>
            </div>
          )}
        </>
      )}
      {/* Modal excluir individual */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Confirmar exclusão">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Excluir pedido?</h3>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-bold text-gray-900">{deleteTarget.name}</span> será apagado
              definitivamente (incluindo histórico, pagamentos e impressões).
            </p>
            {deleteError && <p className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-3" role="alert">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >Cancelar</button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" /> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal excluir em lote */}
      {batchMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Confirmar exclusão em lote">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Excluir {selected.size} pedido{selected.size !== 1 ? 's' : ''}?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Os pedidos selecionados serão apagados definitivamente (incluindo histórico, pagamentos e impressões).
            </p>
            {deleteError && <p className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-3" role="alert">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setBatchMode(false); setDeleteError(null); }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >Cancelar</button>
              <button
                onClick={confirmBatchDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" /> : 'Excluir todos'}
              </button>
            </div>
          </div>
        </div>
      )}
    
            <ManualOrderModal
        isOpen={manualOrderOpen}
        onClose={() => setManualOrderOpen(false)}
        onSuccess={handleManualOrderSuccess}
      /></div>
  );
}
