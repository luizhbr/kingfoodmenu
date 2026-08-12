// ── KING PRINT P15.3 — Receipt template model + validation ───────────────────
// The DB stores CONFIGURATION (booleans/strings/numbers), never ESC/POS bytes.
// The renderer transforms configuration into ticket text; the escpos builder
// turns text into printer bytes. Fail-safe: any invalid/missing template
// falls back to DEFAULT_TEMPLATE so printing is never blocked by config.

export type TemplateType = 'KITCHEN' | 'CUSTOMER' | 'DELIVERY';
export type Alignment = 'left' | 'center' | 'right';
export type SeparatorStyle = 'dashes' | 'equals' | 'none';
export type FontSize = 'small' | 'medium' | 'large';

export interface ReceiptTemplate {
  id?: string;
  name: string;
  type: TemplateType;
  isDefault: boolean;
  enabled: boolean;

  // header
  showLogo: boolean;
  logoUrl: string | null;
  logoAlignment: Alignment;
  logoWidth: number;
  showBusinessName: boolean;
  businessName: string;
  showPhone: boolean;
  phone: string | null;
  showAddress: boolean;
  address: string | null;
  showInstagram: boolean;
  instagram: string | null;

  // order
  showOrderNumber: boolean;
  showDateTime: boolean;
  showOrderType: boolean;
  showCustomer: boolean;
  showCustomerPhone: boolean;
  showDeliveryAddress: boolean;
  showNotes: boolean;

  // items
  showQuantity: boolean;
  showItemName: boolean;
  showModifiers: boolean;
  showPrices: boolean;

  // financial
  showSubtotal: boolean;
  showDeliveryFee: boolean;
  showDiscount: boolean;
  showTax: boolean;
  showTotal: boolean;
  showPaymentMethod: boolean;

  // footer
  showFooter: boolean;
  footerText: string | null;
  footerAlignment: Alignment;

  // layout
  separatorStyle: SeparatorStyle;
  fontSize: FontSize;
  boldBusinessName: boolean;
  boldOrderNumber: boolean;
  boldTotal: boolean;
  lineWidth: number;

  // printer
  paperWidth: number;
  characterWidth: number;
}

/** Visual equivalent of the pre-P15.3 ticket — the safe default. */
export const DEFAULT_TEMPLATE: ReceiptTemplate = {
  name: 'Default',
  type: 'KITCHEN',
  isDefault: true,
  enabled: true,

  showLogo: false,
  logoUrl: null,
  logoAlignment: 'center',
  logoWidth: 48,
  showBusinessName: true,
  businessName: 'KING FOOD',
  showPhone: false,
  phone: null,
  showAddress: false,
  address: null,
  showInstagram: false,
  instagram: null,

  showOrderNumber: true,
  showDateTime: true,
  showOrderType: true,
  showCustomer: false,
  showCustomerPhone: false,
  showDeliveryAddress: false,
  showNotes: true,

  showQuantity: true,
  showItemName: true,
  showModifiers: true,
  showPrices: false,

  showSubtotal: false,
  showDeliveryFee: false,
  showDiscount: false,
  showTax: false,
  showTotal: false, // legacy kitchen ticket has no financial values
  showPaymentMethod: false,

  showFooter: false,
  footerText: null,
  footerAlignment: 'center',

  separatorStyle: 'dashes',
  fontSize: 'medium',
  boldBusinessName: true,
  boldOrderNumber: true,
  boldTotal: true,
  lineWidth: 42,

  paperWidth: 80,
  characterWidth: 48,
};

const BOOL_FIELDS = [
  'enabled', 'showLogo', 'showBusinessName', 'showPhone', 'showAddress',
  'showInstagram', 'showOrderNumber', 'showDateTime', 'showOrderType',
  'showCustomer', 'showCustomerPhone', 'showDeliveryAddress', 'showNotes',
  'showQuantity', 'showItemName', 'showModifiers', 'showPrices',
  'showSubtotal', 'showDeliveryFee', 'showDiscount', 'showTax', 'showTotal',
  'showPaymentMethod', 'showFooter', 'boldBusinessName', 'boldOrderNumber',
  'boldTotal', 'isDefault',
] as const;

const STRING_FIELDS = [
  'name', 'businessName',
] as const;

const NULLABLE_STRING_FIELDS = [
  'logoUrl', 'phone', 'address', 'instagram', 'footerText',
] as const;

const INT_FIELDS = ['logoWidth', 'lineWidth', 'paperWidth', 'characterWidth'] as const;

const MAX_STRING_LEN = 200;
const MAX_TEXT_LEN = 500;

/** Remove ESC/POS control bytes (0x00-0x1F, 0x7F) — config never carries raw commands. */
function stripControlChars(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x1f\x7f]/g, '');
}

/**
 * Sanitize + validate an unknown payload into a safe ReceiptTemplate.
 * Unknown/invalid values fall back to DEFAULT_TEMPLATE fields. Never throws.
 */
export function sanitizeTemplate(input: unknown): ReceiptTemplate {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const t: ReceiptTemplate = { ...DEFAULT_TEMPLATE };

  if (typeof src.name === 'string' && src.name.trim()) t.name = stripControlChars(src.name.trim()).slice(0, 60);
  if (src.type === 'KITCHEN' || src.type === 'CUSTOMER' || src.type === 'DELIVERY') t.type = src.type;
  if (src.logoAlignment === 'left' || src.logoAlignment === 'center' || src.logoAlignment === 'right') t.logoAlignment = src.logoAlignment;
  if (src.footerAlignment === 'left' || src.footerAlignment === 'center' || src.footerAlignment === 'right') t.footerAlignment = src.footerAlignment;
  if (src.separatorStyle === 'dashes' || src.separatorStyle === 'equals' || src.separatorStyle === 'none') t.separatorStyle = src.separatorStyle;
  if (src.fontSize === 'small' || src.fontSize === 'medium' || src.fontSize === 'large') t.fontSize = src.fontSize;

  for (const f of BOOL_FIELDS) {
    if (typeof src[f] === 'boolean') (t as any)[f] = src[f];
  }
  for (const f of STRING_FIELDS) {
    if (typeof src[f] === 'string') (t as any)[f] = stripControlChars(src[f] as string).slice(0, MAX_STRING_LEN);
  }
  for (const f of NULLABLE_STRING_FIELDS) {
    if (src[f] === null || src[f] === undefined) (t as any)[f] = null;
    else if (typeof src[f] === 'string') (t as any)[f] = stripControlChars(src[f] as string).slice(0, MAX_TEXT_LEN);
  }
  for (const f of INT_FIELDS) {
    if (typeof src[f] === 'number' && Number.isFinite(src[f])) {
      const v = Math.max(0, Math.min(200, Math.round(src[f] as number)));
      (t as any)[f] = v;
    }
  }

  // paperWidth must be 58 or 80
  if (t.paperWidth !== 58 && t.paperWidth !== 80) t.paperWidth = 80;
  // characterWidth sane range
  if (t.characterWidth < 20 || t.characterWidth > 64) t.characterWidth = t.paperWidth === 58 ? 32 : 48;
  if (t.lineWidth < 20 || t.lineWidth > 64) t.lineWidth = t.characterWidth - 6;

  return t;
}

/** Pick the effective template: DB row if valid, else DEFAULT_TEMPLATE. */
export function effectiveTemplate(row: Partial<ReceiptTemplate> | null | undefined): ReceiptTemplate {
  if (!row) return DEFAULT_TEMPLATE;
  return sanitizeTemplate(row);
}
