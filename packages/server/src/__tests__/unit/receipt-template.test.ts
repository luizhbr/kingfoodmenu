import { describe, it, expect } from 'vitest';
import { DEFAULT_TEMPLATE, sanitizeTemplate, effectiveTemplate } from '../../lib/receipt-template.js';
import { renderReceipt, buildPreviewOrder } from '../../lib/receipt-renderer.js';
import { processLogo, sniffImageType, LogoError, buildLogoEscpos } from '../../lib/logo-processor.js';

describe('P15.3 receipt-template', () => {
  it('DEFAULT_TEMPLATE is the legacy visual equivalent', () => {
    expect(DEFAULT_TEMPLATE.businessName).toBe('KING FOOD');
    expect(DEFAULT_TEMPLATE.showOrderNumber).toBe(true);
    expect(DEFAULT_TEMPLATE.showTotal).toBe(false); // legacy kitchen ticket: no financial block
    expect(DEFAULT_TEMPLATE.showPrices).toBe(false); // kitchen ticket: no prices
    expect(DEFAULT_TEMPLATE.paperWidth).toBe(80);
  });

  it('sanitizeTemplate rejects unknown fields and clamps values', () => {
    const t = sanitizeTemplate({ name: 'X', type: 'EVIL', showTotal: 'yes', lineWidth: 99999, paperWidth: 42 });
    expect(t.type).toBe('KITCHEN'); // invalid → default
    expect(t.showTotal).toBe(false); // non-boolean ignored → keeps default
    expect(t.lineWidth).toBeLessThanOrEqual(200);
    expect(t.paperWidth).toBe(80); // invalid → 80
  });

  it('sanitizeTemplate accepts valid values', () => {
    const t = sanitizeTemplate({ name: 'Customer', type: 'CUSTOMER', showPrices: true, showSubtotal: true, showTax: true, paperWidth: 58 });
    expect(t.type).toBe('CUSTOMER');
    expect(t.showPrices).toBe(true);
    expect(t.showSubtotal).toBe(true);
    expect(t.paperWidth).toBe(58);
  });

  it('effectiveTemplate falls back to DEFAULT on null', () => {
    expect(effectiveTemplate(null)).toBe(DEFAULT_TEMPLATE);
    expect(effectiveTemplate(undefined)).toBe(DEFAULT_TEMPLATE);
  });

  it('effectiveTemplate sanitizes partial rows', () => {
    const t = effectiveTemplate({ name: 'Partial', showTotal: false } as any);
    expect(t.name).toBe('Partial');
    expect(t.showTotal).toBe(false);
    expect(t.businessName).toBe('KING FOOD'); // untouched → default
  });

  it('strips ESC/POS control bytes from config (no raw commands from frontend)', () => {
    // ESC @, ESC E, GS V — all control bytes must be stripped; plain chars stay
    const evil = 'KING\x1b@FOOD\x1bE\x1d\x56';
    const t = sanitizeTemplate({ businessName: evil, footerText: '\x1b@RAW\x1b@' });
    expect(t.businessName).toBe('KING@FOODEV');
    expect(t.businessName).not.toContain('\x1b');
    expect(t.businessName).not.toContain('\x1d');
    expect(t.footerText).toBe('@RAW@');
    expect(t.footerText).not.toContain('\x1b');
  });
});

describe('P15.3 receipt-renderer', () => {
  const order = buildPreviewOrder();

  it('renders deterministically (same input → same output)', () => {
    const a = renderReceipt(order, DEFAULT_TEMPLATE);
    const b = renderReceipt(order, DEFAULT_TEMPLATE);
    expect(a.text).toBe(b.text);
  });

  it('kitchen template: no prices, has order number and items', () => {
    const r = renderReceipt(order, DEFAULT_TEMPLATE);
    expect(r.text).toContain('PEDIDO #KF-123456');
    expect(r.text).toContain('1x Açaí King Tradicional Bowl');
    expect(r.text).toContain('+ Banana');
    expect(r.text).toContain('+ Morango');
    expect(r.text).not.toContain('$');
    expect(r.text).not.toContain('TOTAL');
  });

  it('customer template: shows prices, subtotal, tax, total', () => {
    const t = sanitizeTemplate({ type: 'CUSTOMER', showPrices: true, showSubtotal: true, showTax: true, showTotal: true, showFooter: true, footerText: 'Obrigado pela preferência!' });
    const r = renderReceipt(order, t);
    expect(r.text).toContain('$12.90');
    expect(r.text).toContain('Subtotal');
    expect(r.text).toContain('Tax');
    expect(r.text).toContain('TOTAL');
    expect(r.text).toContain('Obrigado pela preferência!');
  });

  it('delivery template: shows customer, phone, address', () => {
    const t = sanitizeTemplate({ type: 'DELIVERY', showCustomer: true, showCustomerPhone: true, showDeliveryAddress: true });
    const r = renderReceipt(order, t);
    expect(r.text).toContain('CLIENTE: Maria Silva');
    expect(r.text).toContain('TEL: (614) 555-0134');
    expect(r.text).toContain('END: 123 Main St, Columbus, OH');
  });

  it('discount and delivery fee render when enabled', () => {
    const t = sanitizeTemplate({ showDiscount: true, showDeliveryFee: true });
    const o = { ...order, discount: 2.0, deliveryFee: 3.5 };
    const r = renderReceipt(o, t);
    expect(r.text).toContain('Delivery');
    expect(r.text).toContain('Discount');
  });

  it('payment method renders when enabled', () => {
    const t = sanitizeTemplate({ showPaymentMethod: true });
    const r = renderReceipt(order, t);
    expect(r.text).toContain('PAGAMENTO: CARD');
  });

  it('notes render when enabled', () => {
    const t = sanitizeTemplate({ showNotes: true });
    const o = { ...order, comment: 'Sem cebola' };
    const r = renderReceipt(o, t);
    expect(r.text).toContain('OBS: Sem cebola');
  });

  it('80mm wrapping: no line exceeds characterWidth', () => {
    const r = renderReceipt(order, DEFAULT_TEMPLATE);
    for (const line of r.text.split('\n')) {
      expect(line.length).toBeLessThanOrEqual(DEFAULT_TEMPLATE.characterWidth + 1);
    }
  });

  it('58mm template wraps to 32 chars', () => {
    const t = sanitizeTemplate({ paperWidth: 58, characterWidth: 32 });
    const r = renderReceipt(order, t);
    for (const line of r.text.split('\n')) {
      expect(line.length).toBeLessThanOrEqual(33);
    }
  });

  it('invalid template falls back to default rendering', () => {
    const r = renderReceipt(order, { type: 'BOGUS', showTotal: 'nope' } as any);
    expect(r.usedDefault).toBe(false); // sanitized, not null
    expect(r.text).toContain('PEDIDO #KF-123456');
  });
});

describe('P15.3 logo-processor', () => {
  it('sniffs PNG magic bytes', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(sniffImageType(png)).toBe('png');
  });

  it('sniffs JPEG magic bytes', () => {
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
    expect(sniffImageType(jpg)).toBe('jpeg');
  });

  it('rejects unknown types', () => {
    expect(sniffImageType(Buffer.from('hello world'))).toBeNull();
  });

  it('rejects empty and oversized files', () => {
    expect(() => processLogo(Buffer.alloc(0))).toThrow(LogoError);
    expect(() => processLogo(Buffer.alloc(600 * 1024))).toThrow(LogoError);
  });

  it('rejects non-image content', () => {
    expect(() => processLogo(Buffer.from('not an image at all'))).toThrow(LogoError);
  });

  it('processes a real small PNG into 1-bit raster', () => {
    // Generate a valid 2x2 PNG (black) using pngjs itself
    const { PNG } = require('pngjs') as any;
    const png = new PNG({ width: 2, height: 2 });
    for (let i = 0; i < 4; i++) {
      png.data[i * 4] = 0; png.data[i * 4 + 1] = 0; png.data[i * 4 + 2] = 0; png.data[i * 4 + 3] = 255;
    }
    const buf = PNG.sync.write(png);
    const logo = processLogo(buf);
    expect(logo.width).toBe(2);
    expect(logo.height).toBe(2);
    expect(logo.bytes).toBe(2); // 2 rows × 1 byte per row
    const escpos = buildLogoEscpos(logo);
    expect(escpos[0]).toBe(0x1d); // GS
    expect(escpos[1]).toBe(0x76); // v
  });
});
