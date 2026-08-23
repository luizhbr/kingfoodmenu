// ============================================================
// WHATSAPP BOT — tipos compartilhados
// ============================================================
// O backend King Food continua sendo a fonte da verdade.
// Este módulo define apenas o contrato do canal WhatsApp.

export type WhatsAppIntent =
  | 'START'
  | 'MENU'
  | 'BROWSE_MENU'
  | 'SEARCH_PRODUCT'
  | 'PRODUCT_INFO'
  | 'ADD_ITEM'
  | 'REMOVE_ITEM'
  | 'CHANGE_QUANTITY'
  | 'CHANGE_OPTIONS'
  | 'VIEW_CART'
  | 'CLEAR_CART'
  | 'CHECKOUT'
  | 'DELIVERY'
  | 'PICKUP'
  | 'ADDRESS'
  | 'DELIVERY_ZONE'
  | 'PAYMENT'
  | 'CONFIRM_ORDER'
  | 'ORDER_CREATED'
  | 'ORDER_STATUS'
  | 'CANCEL_ORDER'
  | 'REORDER'
  | 'COUPON'
  | 'LOYALTY'
  | 'STORE_HOURS'
  | 'STORE_LOCATION'
  | 'HUMAN_SUPPORT'
  | 'UNKNOWN';

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  /** optionGroupValueId -> valueId escolhido */
  options: Record<string, string>;
  /** snapshot legível dos adicionais escolhidos */
  optionLabels: string[];
  lineTotal: number;
}

export interface CartState {
  items: CartItem[];
  orderType: 'DELIVERY' | 'PICKUP' | null;
  address?: {
    line1: string;
    city: string;
    state: string;
    zip: string;
    lat?: number;
    lng?: number;
  } | null;
  deliveryZone?: {
    zoneId: string;
    zoneName: string;
    fee: number;
    minOrder: number;
  } | null;
  couponCode?: string | null;
  couponDiscount?: number;
  loyaltyPointsRedeem?: number;
  currentStep: string;
}

export interface BotContext {
  conversationId: string;
  integrationId: string;
  whatsappNumber: string;
  customerId?: string | null;
  customerName?: string | null;
  state: CartState;
  mode: 'BOT' | 'HUMAN' | 'WAITING' | 'CLOSED';
  currentIntent?: string | null;
  currentStep?: string | null;
}

export interface ToolResult {
  ok: boolean;
  reply?: string;
  data?: unknown;
  error?: string;
  /** quando true, o fluxo determinístico assume o controle */
  handoff?: boolean;
  /** quando true, pede confirmação explícita antes de prosseguir */
  needsConfirmation?: boolean;
}

export interface BotReply {
  text: string;
  /** true = resposta determinística (sem IA) */
  deterministic: boolean;
  intent: WhatsAppIntent;
  context: BotContext;
  /** true quando o bot pediu confirmação explícita */
  awaitingConfirmation?: boolean;
}

export interface InboundMessage {
  messageId: string;
  phone: string;
  name?: string;
  text: string;
  timestamp?: string;
  type?: string;
  raw?: unknown;
}

export const INTENTS: WhatsAppIntent[] = [
  'START', 'MENU', 'BROWSE_MENU', 'SEARCH_PRODUCT', 'PRODUCT_INFO',
  'ADD_ITEM', 'REMOVE_ITEM', 'CHANGE_QUANTITY', 'CHANGE_OPTIONS',
  'VIEW_CART', 'CLEAR_CART', 'CHECKOUT', 'DELIVERY', 'PICKUP',
  'ADDRESS', 'DELIVERY_ZONE', 'PAYMENT', 'CONFIRM_ORDER', 'ORDER_CREATED',
  'ORDER_STATUS', 'CANCEL_ORDER', 'REORDER', 'COUPON', 'LOYALTY',
  'STORE_HOURS', 'STORE_LOCATION', 'HUMAN_SUPPORT', 'UNKNOWN',
];

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h — sessões abandonadas expiram
