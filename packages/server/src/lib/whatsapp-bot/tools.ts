// ============================================================
// WHATSAPP BOT — ferramentas controladas
// ============================================================
// A IA NUNCA acessa SQL/Prisma diretamente. Todas as consultas
// passam por estas ferramentas, que validam parâmetros e retornam
// apenas o contexto necessário (nunca o banco inteiro).

import prisma from '../db.js';
import type { CartItem, CartState, ToolResult } from './types.js';
import { addItem, cartSubtotal, emptyCart, formatCart } from './cart.js';

// ── Helpers ──────────────────────────────────────────────────────

function activeLocation() {
  return prisma.location.findFirst({
    where: { isActive: true, deliveryEnabled: true },
    orderBy: { name: 'asc' },
  });
}

function normalizeText(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ── Ferramentas ───────────────────────────────────────────────────

export async function searchMenu(query: string): Promise<ToolResult> {
  const q = normalizeText(query).trim();
  if (!q) return { ok: false, error: 'busca vazia' };
  const items = await prisma.menuItem.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    },
    include: { category: true },
    take: 5,
  });
  if (items.length === 0) return { ok: false, error: 'nenhum produto encontrado' };
  return {
    ok: true,
    data: items.map((it) => ({
      id: it.id,
      name: it.name,
      price: it.price,
      description: it.description,
      category: it.category.name,
      isActive: it.isActive,
    })),
  };
}

export async function getProduct(id: string): Promise<ToolResult> {
  const item = await prisma.menuItem.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!item || !item.isActive) return { ok: false, error: 'produto não encontrado ou indisponível' };
  return {
    ok: true,
    data: {
      id: item.id,
      name: item.name,
      price: item.price,
      description: item.description,
      category: item.category.name,
      orderType: item.orderType,
    },
  };
}

export async function getProductOptions(id: string): Promise<ToolResult> {
  const groups = await prisma.menuItemOptionGroup.findMany({
    where: { menuItemId: id },
    include: {
      optionGroup: {
        include: { values: { orderBy: { sortOrder: 'asc' } } },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });
  if (groups.length === 0) return { ok: true, data: [] };
  return {
    ok: true,
    data: groups.map((g) => ({
      groupId: g.optionGroup.id,
      name: g.optionGroup.name,
      displayType: g.optionGroup.displayType,
      isRequired: g.optionGroup.isRequired,
      minSelect: g.optionGroup.minSelect,
      maxSelect: g.optionGroup.maxSelect,
      values: g.optionGroup.values.map((v) => ({
        id: v.id,
        name: v.name,
        priceModifier: v.priceModifier,
        isDefault: v.isDefault,
      })),
    })),
  };
}

export async function getMenuByCategory(): Promise<ToolResult> {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: {
      menuItems: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        take: 8,
      },
    },
    orderBy: { sortOrder: 'asc' },
  });
  return {
    ok: true,
    data: categories
      .filter((c) => c.menuItems.length > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        items: c.menuItems.map((it) => ({ id: it.id, name: it.name, price: it.price })),
      })),
  };
}

export function addToCart(state: CartState, item: CartItem): ToolResult {
  addItem(state, item);
  return { ok: true, data: { items: state.items.length, subtotal: cartSubtotal(state.items) } };
}

export function getCart(state: CartState): ToolResult {
  return { ok: true, data: { items: state.items, subtotal: cartSubtotal(state.items) } };
}

export async function checkDelivery(address: { line1: string; city: string; state: string; zip: string; lat?: number; lng?: number }): Promise<ToolResult> {
  const location = await activeLocation();
  if (!location) return { ok: false, error: 'nenhuma localização ativa com delivery' };
  const zones = await prisma.deliveryZone.findMany({
    where: { locationId: location.id, isActive: true },
    orderBy: { charge: 'asc' },
  });
  if (zones.length === 0) return { ok: false, error: 'delivery indisponível' };

  let matched = zones[0];
  if (address.lat != null && address.lng != null) {
    const polygonZones = zones.filter((z) => z.boundaries && Array.isArray(z.boundaries));
    if (polygonZones.length > 0) {
      const { isPointInPolygon } = await import('../geo.js');
      const hit = polygonZones.find((z) => isPointInPolygon(address.lat!, address.lng!, z.boundaries as [number, number][]));
      if (!hit) return { ok: false, error: 'endereço fora da área de entrega' };
      matched = hit;
    }
  }
  return {
    ok: true,
    data: {
      eligible: true,
      fee: matched.charge,
      minOrder: matched.minOrder,
      zoneId: matched.id,
      zoneName: matched.name,
      locationId: location.id,
    },
  };
}

export async function getStoreInfo(): Promise<ToolResult> {
  const location = await prisma.location.findFirst({ where: { isActive: true } });
  if (!location) return { ok: false, error: 'loja não encontrada' };
  return {
    ok: true,
    data: {
      name: location.name,
      address: location.address,
      city: location.city,
      state: location.state,
      postalCode: location.postalCode,
      phone: location.phone,
      deliveryEnabled: location.deliveryEnabled,
      pickupEnabled: location.pickupEnabled,
    },
  };
}

export async function getStoreHours(): Promise<ToolResult> {
  const location = await prisma.location.findFirst({ where: { isActive: true } });
  if (!location) return { ok: false, error: 'loja não encontrada' };
  const hours = await prisma.operatingHour.findMany({
    where: { locationId: location.id },
    orderBy: { dayOfWeek: 'asc' },
  });
  return { ok: true, data: hours };
}

export async function validateCoupon(code: string, subtotal: number): Promise<ToolResult> {
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) return { ok: false, error: 'cupom inválido ou inativo' };
  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) return { ok: false, error: 'cupom ainda não válido' };
  if (coupon.expiresAt && now > coupon.expiresAt) return { ok: false, error: 'cupom expirado' };
  if (coupon.minOrder > 0 && subtotal < coupon.minOrder) {
    return { ok: false, error: `pedido mínimo de $${coupon.minOrder.toFixed(2)} para este cupom` };
  }
  let discount = 0;
  if (coupon.type === 'PERCENTAGE') discount = subtotal * (coupon.value / 100);
  else if (coupon.type === 'FIXED') discount = coupon.value;
  if (coupon.maxDiscount != null && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
  discount = Math.min(discount, subtotal);
  return { ok: true, data: { code: coupon.code, discount, type: coupon.type } };
}

export async function getCustomer(phone: string): Promise<ToolResult> {
  // Normaliza para dígitos e busca pelo sufixo (E.164: +1XXXXXXXXXX ou 55XXXXXXXXXXX)
  const digits = (phone || '').replace(/\D/g, '');
  const suffix = digits.slice(-10);
  if (suffix.length < 10) return { ok: false, error: 'telefone inválido' };
  const customer = await prisma.customer.findFirst({
    where: { phone: { endsWith: suffix } },
    select: { id: true, name: true, phone: true, loyaltyPoints: true },
  });
  if (!customer) return { ok: false, error: 'cliente não encontrado' };
  return { ok: true, data: customer };
}

export async function getOrder(orderId: string): Promise<ToolResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true, orderNumber: true, status: true, orderType: true,
      total: true, createdAt: true, guestPhone: true, customerId: true,
    },
  });
  if (!order) return { ok: false, error: 'pedido não encontrado' };
  return { ok: true, data: order };
}

export async function getOrderStatus(orderId: string): Promise<ToolResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true, status: true, orderType: true, updatedAt: true },
  });
  if (!order) return { ok: false, error: 'pedido não encontrado' };
  return { ok: true, data: order };
}

export async function getPreviousOrders(phone: string, limit = 3): Promise<ToolResult> {
  const orders = await prisma.order.findMany({
    where: { guestPhone: { contains: phone.slice(-10) } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true, orderNumber: true, status: true, total: true, createdAt: true,
      items: { select: { name: true, quantity: true, unitPrice: true, subtotal: true } },
    },
  });
  if (orders.length === 0) return { ok: false, error: 'nenhum pedido anterior encontrado' };
  return { ok: true, data: orders };
}

export async function createOrder(payload: {
  items: { menuItemId: string; quantity: number; options: Record<string, string> }[];
  orderType: 'DELIVERY' | 'PICKUP';
  address?: { line1: string; city: string; state: string; zip: string; lat?: number; lng?: number } | null;
  couponCode?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  idempotencyKey: string;
}): Promise<ToolResult> {
  // Validação mínima — o controller de pedidos recalcula TUDO server-side.
  if (!payload.items || payload.items.length === 0) return { ok: false, error: 'carrinho vazio' };
  if (payload.orderType === 'DELIVERY' && !payload.address) return { ok: false, error: 'endereço obrigatório para delivery' };
  if (!payload.idempotencyKey || payload.idempotencyKey.length < 8) return { ok: false, error: 'idempotencyKey inválida' };

  // O backend é a fonte da verdade: criação de pedido acontece via POST /api/orders
  // (mesmo fluxo do storefront), nunca direto do bot.
  return { ok: false, error: 'use POST /api/orders via HTTP (backend é a fonte da verdade)' };
}

export async function cancelOrder(orderId: string): Promise<ToolResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: 'pedido não encontrado' };
  const cancellable = ['PENDING', 'CONFIRMED'];
  if (!cancellable.includes(order.status)) {
    return { ok: false, error: `pedido ${order.status} não pode ser cancelado` };
  }
  return { ok: true, data: { id: order.id, orderNumber: order.orderNumber, status: order.status, cancellable: true } };
}

export function requestHuman(): ToolResult {
  return { ok: true, handoff: true, data: { mode: 'HUMAN' } };
}

// ── Registro de ferramentas (para o prompt da IA) ────────────────

export const TOOL_REGISTRY: Record<string, { description: string; run: (...args: any[]) => Promise<ToolResult> | ToolResult }> = {
  search_menu: { description: 'Busca produtos no cardápio real por nome/descrição. Retorna id, nome, preço.', run: (q: string) => searchMenu(q) },
  get_product: { description: 'Detalhes de um produto pelo id.', run: (id: string) => getProduct(id) },
  get_product_options: { description: 'Adicionais/grupos de opções de um produto pelo id.', run: (id: string) => getProductOptions(id) },
  get_menu_by_category: { description: 'Cardápio completo agrupado por categoria (produtos ativos).', run: () => getMenuByCategory() },
  add_to_cart: { description: 'Adiciona item ao carrinho (estado da conversa).', run: (state: CartState, item: CartItem) => addToCart(state, item) },
  get_cart: { description: 'Mostra o carrinho atual.', run: (state: CartState) => getCart(state) },
  check_delivery: { description: 'Verifica zona de entrega, taxa e pedido mínimo para um endereço.', run: (a: any) => checkDelivery(a) },
  get_store_info: { description: 'Informações da loja (endereço, telefone).', run: () => getStoreInfo() },
  get_store_hours: { description: 'Horários de funcionamento reais.', run: () => getStoreHours() },
  validate_coupon: { description: 'Valida cupom no backend (nunca inventar desconto).', run: (code: string, subtotal: number) => validateCoupon(code, subtotal) },
  get_customer: { description: 'Busca cliente pelo telefone.', run: (phone: string) => getCustomer(phone) },
  get_order: { description: 'Busca pedido pelo id.', run: (id: string) => getOrder(id) },
  get_order_status: { description: 'Status atual de um pedido.', run: (id: string) => getOrderStatus(id) },
  get_previous_orders: { description: 'Últimos pedidos do cliente (para reorder).', run: (phone: string) => getPreviousOrders(phone) },
  cancel_order: { description: 'Verifica se um pedido pode ser cancelado.', run: (id: string) => cancelOrder(id) },
  request_human: { description: 'Transfere para atendimento humano.', run: () => requestHuman() },
};

export function toolListForPrompt(): string {
  return Object.entries(TOOL_REGISTRY)
    .map(([name, t]) => `- ${name}: ${t.description}`)
    .join('\n');
}
