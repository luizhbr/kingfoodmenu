// ── KING PRINT P15.3 — Receipt renderer ──────────────────────────────────────
// Pure function: (order + template) → plain text ticket (ESC/POS friendly).
// No hardware access, no DB access — deterministic and unit-testable.
// The agent's escpos builder converts this text into printer bytes.

import { ReceiptTemplate, effectiveTemplate } from './receipt-template.js';

export interface RenderLine {
  name: string;
  qty: number;
  unitPrice: number;
  options?: string[];
  comment?: string;
}

export interface RenderOrder {
  id: string;
  orderNumber: string;
  createdAt: string | Date;
  orderType: string;
  status?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  deliveryAddress?: string | null;
  comment?: string | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  tax: number;
  tip?: number;
  total: number;
  paymentMethod?: string | null;
  lines: RenderLine[];
}

export interface RenderResult {
  text: string;
  template: ReceiptTemplate;
  usedDefault: boolean;
}

const CURRENCY = (v: number): string => `$${v.toFixed(2)}`;

function separator(style: string, width: number): string {
  if (style === 'equals') return '='.repeat(width);
  if (style === 'none') return '';
  return '-'.repeat(width);
}

function align(text: string, width: number, mode: 'left' | 'center' | 'right'): string {
  if (mode === 'center') {
    const pad = Math.max(0, width - text.length);
    const l = Math.floor(pad / 2);
    return ' '.repeat(l) + text + ' '.repeat(pad - l);
  }
  if (mode === 'right') return text.padStart(width);
  return text.padEnd(width);
}

/** Render a receipt from an order + template. Deterministic. */
export function renderReceipt(order: RenderOrder, templateInput?: Partial<ReceiptTemplate> | null): RenderResult {
  const template = effectiveTemplate(templateInput);
  const usedDefault = templateInput == null;
  const W = template.characterWidth;
  const sep = separator(template.separatorStyle, W);
  const out: string[] = [];

  // ── Header ──
  // Logo placeholder only — the data URL (raster) is stored in the template
  // config but must NEVER leak into the printed text. The agent's ESC/POS
  // builder is text-only (no raster support), so a full data:image/... URL
  // would print as garbage. Mirrors the admin preview's `[LOGO]` marker.
  if (template.showLogo && template.logoUrl) {
    out.push('[LOGO]');
  }
  if (template.showBusinessName && template.businessName) {
    out.push(align(template.businessName, W, 'center'));
  }
  if (template.showPhone && template.phone) {
    out.push(align(template.phone, W, 'center'));
  }
  if (template.showAddress && template.address) {
    out.push(align(template.address, W, 'center'));
  }
  if (template.showInstagram && template.instagram) {
    out.push(align(template.instagram, W, 'center'));
  }
  if (sep) out.push(sep);

  // ── Order info ──
  if (template.showOrderNumber) {
    out.push(align(`PEDIDO #${order.orderNumber}`, W, 'center'));
  }
  if (template.showDateTime) {
    const d = new Date(order.createdAt);
    const dt = d.toLocaleString('en-US', { hour12: false });
    out.push(align(dt, W, 'center'));
  }
  if (template.showOrderType) {
    out.push(align(order.orderType, W, 'center'));
  }
  if (sep) out.push(sep);

  // ── Customer ──
  const customerName = order.customerName || order.guestName;
  const customerPhone = order.customerPhone || order.guestPhone;
  if (template.showCustomer && customerName) {
    out.push(`CLIENTE: ${customerName}`);
  }
  if (template.showCustomerPhone && customerPhone) {
    out.push(`TEL: ${customerPhone}`);
  }
  if (template.showDeliveryAddress && order.deliveryAddress) {
    out.push(`END: ${order.deliveryAddress}`);
  }

  // ── Items ──
  for (const line of order.lines) {
    const qty = template.showQuantity ? `${line.qty}x ` : '';
    const name = template.showItemName ? line.name : '';
    const price = template.showPrices ? ` ${CURRENCY(line.unitPrice * line.qty)}` : '';
    out.push(`${qty}${name}${price}`);
    if (template.showModifiers) {
      for (const o of line.options ?? []) out.push(`   + ${o}`);
    }
    if (line.comment) out.push(`   (${line.comment})`);
  }
  if (sep) out.push(sep);

  // ── Financial ──
  const money = (label: string, value: number) => {
    const left = label;
    const right = CURRENCY(value);
    const gap = Math.max(1, W - left.length - right.length);
    return left + ' '.repeat(gap) + right;
  };
  if (template.showSubtotal) out.push(money('Subtotal', order.subtotal));
  if (template.showDeliveryFee && order.deliveryFee > 0) out.push(money('Delivery', order.deliveryFee));
  if (template.showDiscount && order.discount > 0) out.push(money('Discount', -order.discount));
  if (template.showTax && order.tax > 0) out.push(money('Tax', order.tax));
  if (template.showTotal) out.push(money('TOTAL', order.total));
  if (template.showPaymentMethod && order.paymentMethod) {
    out.push(`PAGAMENTO: ${order.paymentMethod}`);
  }

  // ── Notes ──
  if (template.showNotes && order.comment) {
    if (sep) out.push(sep);
    out.push(`OBS: ${order.comment}`);
  }

  // ── Footer ──
  if (template.showFooter && template.footerText) {
    if (sep) out.push(sep);
    out.push(align(template.footerText, W, template.footerAlignment));
  }

  out.push('');
  out.push('');
  return { text: out.join('\n'), template, usedDefault };
}

/** Build a sample order for the Admin preview (never sent to a printer). */
export function buildPreviewOrder(): RenderOrder {
  return {
    id: 'preview',
    orderNumber: 'KF-123456',
    createdAt: new Date('2026-08-12T16:41:00'),
    orderType: 'PICKUP',
    status: 'CONFIRMED',
    customerName: 'Maria Silva',
    customerPhone: '(614) 555-0134',
    deliveryAddress: '123 Main St, Columbus, OH',
    subtotal: 16.9,
    deliveryFee: 0,
    discount: 0,
    tax: 1.35,
    total: 18.25,
    paymentMethod: 'CARD',
    lines: [
      { name: 'Açaí King Tradicional Bowl', qty: 1, unitPrice: 12.9, options: ['Banana', 'Morango'] },
      { name: 'Coxinha de Frango', qty: 2, unitPrice: 2.0 },
    ],
  };
}
