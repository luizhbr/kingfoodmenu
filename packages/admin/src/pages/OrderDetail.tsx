import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePrintOrder } from '../lib/usePrintOrder.js';
import OrderActionModal from '../components/OrderActionModal.js';
import { useOrderActions, isActionable, actionLabelFor } from '../lib/useOrderActions.js';
import { api } from '../lib/api.js';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  comment: string | null;
  menuItem: { id: string; name: string; slug: string };
  options: { id: string; name: string; value: string; priceModifier: number }[];
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  comment: string | null;
  scheduledAt: string | null;
  createdAt: string;
  customer: { id: string; name: string; email: string; phone: string | null } | null;
  location: { id: string; name: string };
  items: OrderItem[];
}

interface MenuItemOption {
  id: string;
  name: string;
  price: number;
  image: string | null;
  category: { id: string; name: string };
}

const STATUSES = [
  'PENDING', 'CONFIRMED', 'PREPARING', 'READY',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP', 'CANCELLED',
];

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

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const { printState, printOrder } = usePrintOrder();
  const { actionState, runOrderAction, resetState } = useOrderActions();
  const [actionModal, setActionModal] = useState<'reject' | 'cancel' | null>(null);

  // ── Status drawer (gaveta) ────────────────────────────────────────────────
  const [statusDrawerOpen, setStatusDrawerOpen] = useState(false);

  // ── Edit items ────────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [editLines, setEditLines] = useState<{ menuItemId: string; name: string; quantity: number; unitPrice: number }[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    fetch(`/api/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load order');
        return res.json();
      })
      .then((data) => setOrder(data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrder((prev) => prev ? { ...prev, status: newStatus } : prev);
      setStatusDrawerOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  // ── Edit items ────────────────────────────────────────────────────────────
  function openEdit() {
    if (!order) return;
    setEditLines(order.items.map((i) => ({ menuItemId: i.menuItem.id, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })));
    setEditOpen(true);
    setEditError('');
    setProductQuery('');
    api.get<{ success: boolean; data: MenuItemOption[] }>('/menu/items?limit=100&noImages=true')
      .then((res) => setMenuItems(res.data))
      .catch(() => setMenuItems([]));
  }

  function addEditProduct(item: MenuItemOption) {
    setEditLines((prev) => {
      const existing = prev.find((l) => l.name === item.name);
      if (existing) {
        return prev.map((l) => (l.name === item.name ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1, unitPrice: item.price }];
    });
  }

  function changeEditQty(name: string, delta: number) {
    setEditLines((prev) =>
      prev.map((l) => (l.name === name ? { ...l, quantity: l.quantity + delta } : l)).filter((l) => l.quantity > 0)
    );
  }

  async function saveEdit() {
    if (!order || editLines.length === 0) return;
    setSavingEdit(true);
    setEditError('');
    try {
      const res = await fetch(`/api/orders/${id}/items`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: editLines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setOrder(data.data);
      setEditOpen(false);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label="Carregando" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div>
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error || 'Pedido não encontrado'}</div>
        <Link to="/orders" className="text-primary-600 hover:text-primary-700 text-sm">
          Voltar para Pedidos
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:gap-4">
        {/* Título + data — ocupa a linha toda no mobile, quebra o número em múltiplas linhas */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link
            to="/orders"
            className="shrink-0 mt-0.5 p-2 -m-2 text-gray-400 hover:text-gray-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Voltar para pedidos"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
              Pedido {order.orderNumber}
            </h1>
            <p className="text-sm text-gray-500">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Status + imprimir — quebram para a linha seguinte no mobile */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100'}`}>
            {order.status.replace(/_/g, ' ')}
          </span>
          <button
            onClick={() => void printOrder(order.id, 'REPRINT')}
            disabled={printState.status === 'sending'}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-ink text-cream text-sm font-bold hover:bg-ink/90 disabled:opacity-50 inline-flex items-center gap-2"
            aria-label={`Imprimir pedido ${order.orderNumber}`}
          >
            <span aria-hidden>🖨</span>
            {printState.status === 'sending' ? 'Imprimindo...' : 'Imprimir pedido'}
          </button>
          {isActionable(order.status) && (
            <button
              onClick={() => setActionModal(order.status === 'PENDING' ? 'reject' : 'cancel')}
              disabled={actionState.status === 'pending'}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-bold hover:bg-red-100 disabled:opacity-50 inline-flex items-center gap-2 transition"
              aria-label={`${actionLabelFor(order.status)} ${order.orderNumber}`}
            >
              <span aria-hidden>✕</span>
              {actionLabelFor(order.status)}
            </button>
          )}
        </div>
      </div>

      {printState.status !== 'idle' && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium ${
          printState.status === 'printed' ? 'bg-emerald-50 text-emerald-700' :
          printState.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
        }`} role="status">
          {printState.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Itens</h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="font-medium text-gray-900">
                      <span className="text-gray-400 mr-1">{item.quantity}x</span>
                      {item.name}
                    </div>
                    {item.options.length > 0 && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.options.map((o) => `${o.name}: ${o.value}`).join(', ')}
                      </div>
                    )}
                    {item.comment && (
                      <div className="text-xs text-gray-400 mt-0.5 italic">Observação: {item.comment}</div>
                    )}
                  </div>
                  <span className="font-medium text-gray-900">${item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Imposto</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxa de entrega</span>
                  <span>${order.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto</span>
                  <span>-${order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-primary-600">${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.comment && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Observações do Pedido</h2>
              <p className="text-gray-600 text-sm">{order.comment}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status + edit actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações</h2>
            <div className="space-y-2">
              <button
                onClick={() => setStatusDrawerOpen(true)}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-ink text-cream text-sm font-bold hover:bg-ink/90 transition inline-flex items-center justify-center gap-2"
              >
                <span aria-hidden>🔄</span>
                Atualizar Status
              </button>
              {!['DELIVERED', 'PICKED_UP', 'CANCELLED'].includes(order.status) && (
                <button
                  onClick={openEdit}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50 transition inline-flex items-center justify-center gap-2"
                >
                  <span aria-hidden>✏️</span>
                  Editar itens
                </button>
              )}
            </div>
          </div>

          {/* Order info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalhes</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Tipo do Pedido</dt>
                <dd className="font-medium text-gray-900">{order.orderType}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Local</dt>
                <dd className="font-medium text-gray-900">{order.location.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Cliente</dt>
                <dd className="font-medium text-gray-900">
                  {order.customer ? (
                    <>
                      {order.customer.name}
                      <span className="block text-xs text-gray-400">{order.customer.email}</span>
                      {order.customer.phone && (
                        <span className="block text-xs text-gray-400">{order.customer.phone}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">Convidado</span>
                  )}
                </dd>
              </div>
              {order.scheduledAt && (
                <div>
                  <dt className="text-gray-500">Agendado Para</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(order.scheduledAt).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {actionModal && (
        <OrderActionModal
          orderNumber={order.orderNumber}
          type={actionModal}
          busy={actionState.status === 'pending'}
          error={actionState.status === 'error' ? actionState.message : ''}
          onConfirm={async () => {
            const ok = await runOrderAction(order.id, actionModal);
            if (ok) {
              // Sincroniza com o backend: o status exibido deve refletir a API
              setOrder((prev) => (prev ? { ...prev, status: 'CANCELLED' } : prev));
              setActionModal(null);
              resetState();
            }
          }}
          onClose={() => {
            setActionModal(null);
            resetState();
          }}
        />
      )}

      {/* ── Status drawer (gaveta) ─────────────────────────────────────────── */}
      {statusDrawerOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-end justify-center" onClick={() => setStatusDrawerOpen(false)} role="dialog" aria-modal="true" aria-label="Atualizar status">
          <div className="bg-white w-full max-w-md rounded-t-2xl p-4 pb-8 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">Atualizar Status</h3>
              <button onClick={() => setStatusDrawerOpen(false)} className="p-2 text-gray-400 hover:text-gray-600" aria-label="Fechar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">O status é o mesmo que o cliente vê no acompanhamento do pedido.</p>
            <div className="space-y-2">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  disabled={updating || order.status === status}
                  onClick={() => updateStatus(status)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${order.status === status
                      ? STATUS_COLORS[status] + ' cursor-default'
                      : 'text-gray-600 hover:bg-gray-100 disabled:opacity-40'
                    }`}
                  aria-label={`Definir status para ${status.replace(/_/g, ' ')}`}
                >
                  {status.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit items modal ───────────────────────────────────────────────── */}
      {editOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-end justify-center" onClick={() => setEditOpen(false)} role="dialog" aria-modal="true" aria-label="Editar itens">
          <div className="bg-white w-full max-w-md rounded-t-2xl p-4 pb-8 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">Editar itens</h3>
              <button onClick={() => setEditOpen(false)} className="p-2 text-gray-400 hover:text-gray-600" aria-label="Fechar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {editError && <p className="text-xs text-red-600 mb-2">{editError}</p>}

            {/* Current lines */}
            <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
              {editLines.map((l) => (
                <div key={l.name} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-gray-800 truncate">{l.name}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => changeEditQty(l.name, -1)} className="w-7 h-7 rounded-md border border-gray-300 text-gray-700 flex items-center justify-center">−</button>
                    <span className="w-6 text-center font-bold">{l.quantity}</span>
                    <button onClick={() => changeEditQty(l.name, 1)} className="w-7 h-7 rounded-md border border-gray-300 text-gray-700 flex items-center justify-center">+</button>
                  </div>
                  <span className="w-16 text-right font-bold">${(l.unitPrice * l.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Add product */}
            <input
              type="text"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Adicionar produto..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-800 mb-2"
            />
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {menuItems.filter((m) => m.name.toLowerCase().includes(productQuery.toLowerCase())).slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  onClick={() => addEditProduct(item)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="text-sm text-gray-800 truncate">{item.name}</span>
                  <span className="text-sm font-bold text-gray-700">${item.price.toFixed(2)}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
              <button onClick={() => setEditOpen(false)} disabled={savingEdit} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold text-sm disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={saveEdit} disabled={savingEdit || editLines.length === 0} className="flex-1 py-2.5 rounded-lg bg-ink text-cream font-bold text-sm disabled:opacity-50">
                {savingEdit ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
