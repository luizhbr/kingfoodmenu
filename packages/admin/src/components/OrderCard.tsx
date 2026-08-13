import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePrintOrder } from '../lib/usePrintOrder.js';

// ── Tipos (espelham a API existente — NENHUM contrato alterado) ─────────────
interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  comment: string | null;
  options: { id: string; name: string; value: string; priceModifier: number }[];
}

interface OrderSummary {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  total: number;
  createdAt: string;
  scheduledAt: string | null;
  customer: { id: string; name: string; email: string } | null;
  location: { id: string; name: string };
  _count: { items: number };
}

interface OrderDetail extends OrderSummary {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  comment: string | null;
  customer: { id: string; name: string; email: string; phone: string | null } | null;
  items: OrderItem[];
  address?: { street?: string; city?: string; state?: string; zip?: string } | null;
  paymentMethod?: string | null;
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

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Em preparo',
  READY: 'Pronto',
  OUT_FOR_DELIVERY: 'Em entrega',
  DELIVERED: 'Entregue',
  PICKED_UP: 'Retirado',
  CANCELLED: 'Cancelado',
};

// Ação primária contextual — fluxo operacional em 1 toque (GNOME: reduce effort)
const NEXT_ACTION: Record<string, { label: string; next: string; tone: string }> = {
  PENDING: { label: 'Aceitar pedido', next: 'CONFIRMED', tone: 'bg-[#FFD100] text-ink hover:bg-[#FFD414]' },
  CONFIRMED: { label: 'Iniciar preparo', next: 'PREPARING', tone: 'bg-ink text-cream hover:bg-ink/90' },
  PREPARING: { label: 'Marcar pronto', next: 'READY', tone: 'bg-ink text-cream hover:bg-ink/90' },
  READY: { label: 'Saiu para entrega', next: 'OUT_FOR_DELIVERY', tone: 'bg-ink text-cream hover:bg-ink/90' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString();
}

interface Props {
  order: OrderSummary;
  token: string;
  onStatusChange: (orderId: string, newStatus: string) => void;
}

/**
 * OrderCard — preview expandido + ação rápida (UX loop, Material 3 hero moment).
 * - Preview: info essencial legível em 3s.
 * - Expansão: progressive disclosure (Apple HIG) — detalhe buscado lazy via GET /orders/:id.
 * - Ação primária contextual em 1 toque (GNOME) — PATCH /orders/:id/status.
 * - PENDING ganha pulso dourado (hero moment).
 */
export default function OrderCard({ order, token, onStatusChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState('');
  const { printState, printOrder } = usePrintOrder();

  const isPending = order.status === 'PENDING';
  const action = NEXT_ACTION[order.status];

  async function toggleExpand() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (detail || loadingDetail) return;
    setLoadingDetail(true);
    setDetailError('');
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao carregar detalhes');
      const data = await res.json();
      setDetail(data.data);
    } catch (err: any) {
      setDetailError(err.message || 'Não foi possível carregar os detalhes.');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function runAction() {
    if (!action || updating) return;
    setUpdating(true);
    setActionError('');
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: action.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível atualizar o pedido.');
      onStatusChange(order.id, action.next);
    } catch (err: any) {
      setActionError(err.message || 'Não foi possível atualizar o pedido.');
    } finally {
      setUpdating(false);
    }
  }

  const isTerminal = ['DELIVERED', 'PICKED_UP', 'CANCELLED'].includes(order.status);

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-300 ${
        isPending ? 'border-[#FFD100] order-card-pulse' : 'border-gray-200 hover:shadow-md'
      }`}
    >
      {/* Preview — tarefa principal óbvia em 3s */}
      <button
        type="button"
        onClick={toggleExpand}
        aria-expanded={expanded}
        aria-label={`Pedido ${order.orderNumber} — ${STATUS_LABELS[order.status] || order.status}. Expandir detalhes`}
        className="w-full text-left px-4 py-3.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-sm font-bold text-ink">{order.orderNumber}</span>
            {order.scheduledAt && (
              <span className="text-indigo-600 text-sm" title="Agendado" aria-label="Pedido agendado">🕒</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
              {STATUS_LABELS[order.status] || order.status.replace(/_/g, ' ')}
            </span>
          </div>
          <span className="text-xs text-gray-400 shrink-0">{timeAgo(order.createdAt)}</span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-gray-800 font-medium truncate">
              {order.customer ? order.customer.name : 'Convidado'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
              order.orderType === 'DELIVERY' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
            }`}>
              {order.orderType === 'DELIVERY' ? 'Entrega' : 'Retirada'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500">{order._count.items} item{order._count.items !== 1 ? 's' : ''}</span>
            <span className="text-sm font-bold text-ink">${order.total.toFixed(2)}</span>
          </div>
        </div>
      </button>

      {/* Ação primária — 1 toque, sem sair da lista */}
      <div className="px-4 pb-3.5">
        {action ? (
          <button
            type="button"
            onClick={runAction}
            disabled={updating}
            className={`w-full min-h-[48px] rounded-xl font-bold transition-colors disabled:opacity-60 ${action.tone}`}
          >
            {updating ? 'Atualizando...' : action.label}
          </button>
        ) : (
          <div className="flex gap-2">
            {!isTerminal && (
              <Link
                to={`/orders/${order.id}`}
                className="flex-1 min-h-[48px] flex items-center justify-center rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Ver detalhes
              </Link>
            )}
          </div>
        )}
        {actionError && (
          <p className="text-xs text-red-600 mt-1.5" role="alert">{actionError}</p>
        )}

        {/* Impressão — ação operacional (PRINT-V1) */}
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => void printOrder(order.id, 'REPRINT')}
            disabled={printState.status === 'sending'}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            aria-label={`Imprimir pedido ${order.orderNumber}`}
          >
            <span aria-hidden>🖨</span>
            {printState.status === 'sending' ? 'Imprimindo...' : 'Imprimir'}
          </button>
        </div>
        {printState.status !== 'idle' && (
          <p className={`text-xs mt-1.5 font-medium ${
            printState.status === 'printed' ? 'text-emerald-600' :
            printState.status === 'failed' ? 'text-red-600' : 'text-blue-600'
          }`} role="status">
            {printState.message}
          </p>
        )}
      </div>

      {/* Expansão — detalhes essenciais (Apple HIG: progressive disclosure) */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3.5 space-y-3 animate-order-expand">
          {loadingDetail && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label="Carregando detalhes" />
              Carregando...
            </div>
          )}
          {detailError && (
            <p className="text-sm text-red-600" role="alert">{detailError}</p>
          )}
          {detail && (
            <>
              {/* Itens */}
              <div className="space-y-1.5">
                {detail.items.map((it) => (
                  <div key={it.id} className="flex items-start justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium text-ink">{it.quantity}× {it.name}</span>
                      {it.options.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {it.options.map((o) => `${o.name}: ${o.value}`).join(' · ')}
                        </div>
                      )}
                      {it.comment && <div className="text-xs text-gray-500 italic">"{it.comment}"</div>}
                    </div>
                    <span className="text-gray-700 shrink-0">${it.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Totais */}
              <div className="text-xs text-gray-600 space-y-0.5 pt-1">
                {detail.subtotal > 0 && <div className="flex justify-between"><span>Subtotal</span><span>${detail.subtotal.toFixed(2)}</span></div>}
                {detail.discount > 0 && <div className="flex justify-between text-green-600"><span>Desconto</span><span>−${detail.discount.toFixed(2)}</span></div>}
                {detail.deliveryFee > 0 && <div className="flex justify-between"><span>Taxa de entrega</span><span>${detail.deliveryFee.toFixed(2)}</span></div>}
                {detail.tax > 0 && <div className="flex justify-between"><span>Impostos</span><span>${detail.tax.toFixed(2)}</span></div>}
                <div className="flex justify-between font-bold text-ink text-sm pt-0.5"><span>Total</span><span>${detail.total.toFixed(2)}</span></div>
              </div>

              {/* Metadados */}
              {(detail.comment || detail.customer?.phone || detail.address?.street) && (
                <div className="text-xs text-gray-600 space-y-0.5 border-t border-gray-100 pt-2">
                  {detail.comment && <div><span className="font-medium">Observação:</span> {detail.comment}</div>}
                  {detail.customer?.phone && <div><span className="font-medium">Telefone:</span> {detail.customer.phone}</div>}
                  {detail.orderType === 'DELIVERY' && detail.address?.street && (
                    <div><span className="font-medium">Endereço:</span> {detail.address.street}{detail.address.city ? `, ${detail.address.city}` : ''}</div>
                  )}
                  {detail.paymentMethod && <div><span className="font-medium">Pagamento:</span> {detail.paymentMethod}</div>}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Link
                  to={`/orders/${order.id}`}
                  className="flex-1 min-h-[44px] flex items-center justify-center rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Abrir pedido completo
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
