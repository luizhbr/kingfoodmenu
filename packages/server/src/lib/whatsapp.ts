/**
 * King Food WhatsApp notifications — provider interface
 *
 * WHATSAPP_PROVIDER:
 *   stub     — log only (default)
 *   webhook  — POST JSON to WHATSAPP_WEBHOOK_URL (n8n / Hermes later)
 *   twilio   — Twilio Content API style send (requires credentials)
 *
 * Shared env:
 *   WHATSAPP_ENABLED=true|false
 *   WHATSAPP_NOTIFY_NUMBER=13802695741
 *   WHATSAPP_WEBHOOK_URL=https://...
 *   TWILIO_ACCOUNT_SID=
 *   TWILIO_AUTH_TOKEN=
 *   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
 *
 * Legacy aliases still accepted:
 *   WHATSAPP_STUB_ENABLED, WHATSAPP_STUB_WEBHOOK_URL
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

export type WhatsAppProviderName = 'stub' | 'webhook' | 'twilio';

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

function isEnabled(): boolean {
  if (process.env.NODE_ENV === 'test') return false;
  const v = process.env.WHATSAPP_ENABLED ?? process.env.WHATSAPP_STUB_ENABLED;
  if (v === 'false') return false;
  return true; // default on for observability in foundation
}

function resolveProvider(): WhatsAppProviderName {
  const p = (process.env.WHATSAPP_PROVIDER || 'stub').toLowerCase();
  if (p === 'webhook' || p === 'twilio' || p === 'stub') return p;
  return 'stub';
}

function notifyNumber(): string {
  return process.env.WHATSAPP_NOTIFY_NUMBER || '';
}

function webhookUrl(): string {
  return process.env.WHATSAPP_WEBHOOK_URL || process.env.WHATSAPP_STUB_WEBHOOK_URL || '';
}

async function sendStub(message: string, order: WhatsAppOrderPayload): Promise<void> {
  console.info('[whatsapp:stub]', {
    orderNumber: order.orderNumber,
    to: notifyNumber() || '(not set)',
    preview: message.slice(0, 240),
  });
}

async function sendWebhook(message: string, order: WhatsAppOrderPayload): Promise<void> {
  const url = webhookUrl();
  if (!url) {
    console.warn('[whatsapp:webhook] WHATSAPP_WEBHOOK_URL not set — falling back to stub log');
    await sendStub(message, order);
    return;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'king-food',
      channel: 'whatsapp',
      provider: 'webhook',
      to: notifyNumber(),
      message,
      order,
    }),
  });

  if (!res.ok) {
    console.warn('[whatsapp:webhook] failed', res.status);
  } else {
    console.info('[whatsapp:webhook] ok', order.orderNumber);
  }
}

/**
 * Twilio WhatsApp send.
 * Docs: https://www.twilio.com/docs/whatsapp
 * From must be whatsapp:+... sandbox or approved sender.
 */
async function sendTwilio(message: string, order: WhatsAppOrderPayload): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const toRaw = notifyNumber();

  if (!sid || !token || !from || !toRaw) {
    console.warn(
      '[whatsapp:twilio] missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM / WHATSAPP_NOTIFY_NUMBER — stub log only'
    );
    await sendStub(message, order);
    return;
  }

  const to = toRaw.startsWith('whatsapp:') ? toRaw : `whatsapp:+${toRaw.replace(/\D/g, '')}`;

  const body = new URLSearchParams({
    From: from,
    To: to,
    Body: message,
  });

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.warn('[whatsapp:twilio] failed', res.status, text.slice(0, 300));
  } else {
    console.info('[whatsapp:twilio] sent', order.orderNumber);
  }
}

export async function notifyOrderWhatsApp(order: WhatsAppOrderPayload): Promise<void> {
  if (!isEnabled()) return;

  const message = formatOrderWhatsAppMessage(order);
  const provider = resolveProvider();

  try {
    if (provider === 'twilio') {
      await sendTwilio(message, order);
    } else if (provider === 'webhook') {
      await sendWebhook(message, order);
    } else {
      await sendStub(message, order);
    }
  } catch (err) {
    console.warn('[whatsapp] provider error', provider, err);
  }
}
