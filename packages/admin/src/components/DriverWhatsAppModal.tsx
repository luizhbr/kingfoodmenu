import { useState } from 'react';
import { buildWhatsAppUrl, type DriverOrder } from '../lib/formatDriverMessage.js';

// ── DriverWhatsAppModal — popup "Enviar comanda para o entregador?" ──────────
// O pedido JÁ EXISTE. O modal é secundário — não bloqueia nada.

interface Props {
  order: DriverOrder | null;
  onClose: () => void;
}

export default function DriverWhatsAppModal({ order, onClose }: Props) {
  const [sending, setSending] = useState(false);

  if (!order) return null;

  function handleSend() {
    if (!order) return;
    setSending(true);
    const url = buildWhatsAppUrl(order);
    // Abre WhatsApp (app no mobile, web no desktop)
    window.open(url, "_blank");
    setTimeout(() => {
      setSending(false);
      onClose();
    }, 1500);
  }

  const isDelivery = order.orderType === "DELIVERY";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Enviar comanda para o entregador"
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h2 className="text-lg font-bold text-gray-900 text-center mb-1">
          ✓ Pedido confirmado!
        </h2>
        <p className="text-sm text-gray-500 text-center mb-4">
          Pedido #{order.orderNumber}
        </p>

        <p className="text-sm text-gray-700 text-center mb-4">
          Deseja enviar a comanda para o entregador?
        </p>

        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-500 mb-1">{isDelivery ? "🚗 Entregador" : "🏪 Retirada"}</p>
          <p className="text-sm font-medium text-gray-900">
            {order.guestName || order.customer?.name || "—"}
          </p>
          {isDelivery && order.deliveryLine1 && (
            <p className="text-xs text-gray-500 mt-1">
              {order.deliveryLine1}
              {order.deliveryLine2 ? `, ${order.deliveryLine2}` : ""}
              {order.deliveryCity ? ` — ${order.deliveryCity}` : ""}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {order.items.length} {order.items.length === 1 ? "item" : "itens"} · ${order.total.toFixed(2)}
          </p>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white font-bold text-sm hover:bg-[#25D366]/90 disabled:opacity-50 transition-colors"
            aria-label="Enviar pelo WhatsApp"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {sending ? "Preparando comanda..." : "Enviar pelo WhatsApp"}
          </button>
          <button
            onClick={onClose}
            className="w-full min-h-[44px] rounded-xl border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
