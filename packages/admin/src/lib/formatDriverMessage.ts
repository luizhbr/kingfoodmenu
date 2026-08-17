// ── formatDriverWhatsAppMessage — função pura, testável ────────────────────
// Order → string formatada para WhatsApp do entregador.
// Não mistura React, API, WhatsApp ou formatação.
// Número do entregador: +12673107535

export interface DriverOrder {
  orderNumber: string;
  orderType: string;
  status: string;
  total: number;
  comment: string | null;
  guestName: string | null;
  guestPhone: string | null;
  customer: { name: string | null; phone: string | null } | null;
  deliveryLine1: string | null;
  deliveryLine2: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  deliveryPostalCode: string | null;
  items: {
    name: string;
    quantity: number;
    comment: string | null;
    options: { name: string; value: string }[];
  }[];
}

export const DRIVER_WHATSAPP_NUMBER = "12673107535";

export function formatDriverWhatsAppMessage(order: DriverOrder): string {
  if (!order || !order.orderNumber) return "";

  const lines: string[] = [];
  lines.push("🍔 KING FOOD");
  lines.push("");

  const isDelivery = order.orderType === "DELIVERY";
  lines.push(isDelivery ? "🚗 NOVO PEDIDO PARA ENTREGA" : "🏪 NOVO PEDIDO PARA RETIRADA");
  lines.push("");

  // Pedido
  lines.push(`📦 Pedido #${order.orderNumber}`);

  // Cliente
  const name = order.guestName || order.customer?.name || "—";
  lines.push(`👤 Cliente: ${name}`);

  // Telefone
  const phone = order.guestPhone || order.customer?.phone;
  if (phone) {
    lines.push(`📞 Telefone: ${phone}`);
  }
  lines.push("");

  // Endereço (somente DELIVERY)
  if (isDelivery) {
    lines.push("📍 ENDEREÇO");
    if (order.deliveryLine1) lines.push(order.deliveryLine1);
    if (order.deliveryLine2) lines.push(order.deliveryLine2);
    const cityState = [order.deliveryCity, order.deliveryState].filter(Boolean).join(", ");
    const cityLine = [cityState, order.deliveryPostalCode].filter(Boolean).join(" ");
    if (cityLine) lines.push(cityLine);
    lines.push("");
  }

  // Itens
  lines.push("🛒 ITENS");
  for (const item of order.items) {
    lines.push(`${item.quantity}x ${item.name}`);
    for (const opt of item.options) {
      lines.push(`   - ${opt.name}: ${opt.value}`);
    }
    if (item.comment) {
      lines.push(`   ⚠️ ${item.comment}`);
    }
  }
  lines.push("");

  // Observação
  if (order.comment) {
    lines.push("📝 OBSERVAÇÃO");
    lines.push(order.comment);
    lines.push("");
  }

  // Total
  lines.push(`💰 TOTAL: $${order.total.toFixed(2)}`);

  return lines.join("\n");
}

/**
 * Gera a URL do WhatsApp com a mensagem pré-preenchida (URL-encoded).
 * SEM número de destino: o WhatsApp abre e pede para escolher o contato
 * (o usuário escolhe o entregador na hora). Usar wa.me/<número fixo>
 * enviava direto para o número do King — comportamento indesejado.
 */
export function buildWhatsAppUrl(order: DriverOrder): string {
  const msg = formatDriverWhatsAppMessage(order);
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
}

/**
 * Compartilha a comanda pelo fluxo nativo:
 * 1. Mobile: abre o share sheet do sistema (escolher app — WhatsApp, etc.).
 * 2. Desktop (sem navigator.share): abre o WhatsApp Web pedindo o contato.
 * Retorna 'shared' (compartilhado), 'cancelled' (usuário cancelou o sheet)
 * ou 'fallback' (abriu o link no desktop).
 */
export function shareDriverOrder(order: DriverOrder): Promise<'shared' | 'cancelled' | 'fallback'> {
  const msg = formatDriverWhatsAppMessage(order);
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    return navigator
      .share({ title: `Comanda ${order.orderNumber}`, text: msg })
      .then(() => 'shared' as const)
      .catch((err) => {
        // AbortError = usuário fechou o sheet — respeitar, não forçar nada.
        // Outro erro (share indisponível no browser/OS) = cair no fallback.
        if (err && (err as Error).name === 'AbortError') return 'cancelled' as const;
        window.open(buildWhatsAppUrl(order), '_blank', 'noopener,noreferrer');
        return 'fallback' as const;
      });
  }
  window.open(buildWhatsAppUrl(order), '_blank', 'noopener,noreferrer');
  return Promise.resolve('fallback');
}
