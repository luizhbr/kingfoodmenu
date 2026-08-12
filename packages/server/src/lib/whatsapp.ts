/**
 * WhatsApp notification stub — King Food
 *
 * Milestone 4: fire-and-forget log + optional webhook URL.
 * Does NOT integrate Hermes/N8N yet. Safe no-op without env.
 *
 * Env:
 *   WHATSAPP_STUB_WEBHOOK_URL  — optional POST target (JSON body)
 *   WHATSAPP_NOTIFY_NUMBER     — shop phone, e.g. 13802695741
 *   WHATSAPP_STUB_ENABLED      — "true" to enable (default: true in non-test)
 */

export interface WhatsAppOrderPayload {
  orderNumber: string;
  orderType: string;
  total: number;
  guestName?: string | null;
  guestPhone?: string | null;
  customerName?: string | null;
  items: { name: string; quantity: number; subtotal: number }[];
}

export function formatOrderWhatsAppMessage(order: WhatsAppOrderPayload): string {
  const lines = [
    `🛒 *King Food — Novo pedido*`,
    `Pedido: *${order.orderNumber}*`,
    `Tipo: ${order.orderType}`,
    `Total: $${order.total.toFixed(2)}`,
    order.customerName || order.guestName
      ? `Cliente: ${order.customerName || order.guestName}`
      : null,
    order.guestPhone ? `Tel: ${order.guestPhone}` : null,
    ``,
    `*Itens:*`,
    ...order.items.map((i) => `• ${i.quantity}x ${i.name} ($${i.subtotal.toFixed(2)})`),
  ].filter(Boolean);
  return lines.join('\n');
}

export async function notifyOrderWhatsApp(order: WhatsAppOrderPayload): Promise<void> {
  const enabled = process.env.WHATSAPP_STUB_ENABLED;
  if (enabled === 'false' || process.env.NODE_ENV === 'test') {
    return;
  }

  const message = formatOrderWhatsAppMessage(order);
  const notifyNumber = process.env.WHATSAPP_NOTIFY_NUMBER || '';
  const webhook = process.env.WHATSAPP_STUB_WEBHOOK_URL || '';

  // Always log in foundation (observable stub)
  console.info('[whatsapp-stub]', {
    orderNumber: order.orderNumber,
    notifyNumber: notifyNumber || '(not set)',
    preview: message.slice(0, 200),
  });

  if (!webhook) {
    return;
  }

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'king-food',
        channel: 'whatsapp-stub',
        to: notifyNumber,
        message,
        order,
      }),
    });
    if (!res.ok) {
      console.warn('[whatsapp-stub] webhook failed', res.status);
    }
  } catch (err) {
    console.warn('[whatsapp-stub] webhook error', err);
  }
}
