// ============================================================
// WHATSAPP BOT — carrinho (determinístico, sem IA)
// ============================================================
// O carrinho é recalculado pelo backend antes da confirmação.
// A IA nunca define preços ou totais.

import type { CartItem, CartState } from './types.js';

export function emptyCart(): CartState {
  return {
    items: [],
    orderType: null,
    address: null,
    deliveryZone: null,
    couponCode: null,
    couponDiscount: 0,
    loyaltyPointsRedeem: 0,
    currentStep: 'IDLE',
  };
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, it) => sum + it.lineTotal, 0);
}

export function cartTotal(state: CartState, deliveryFee: number, taxRate: number): number {
  const subtotal = cartSubtotal(state.items);
  const discount = state.couponDiscount || 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = taxable * taxRate;
  return Math.max(0, taxable + tax + deliveryFee);
}

export function formatCart(state: CartState): string {
  if (state.items.length === 0) return 'Seu carrinho está vazio. 🛒';
  const lines = state.items.map((it, i) => {
    const opts = it.optionLabels.length > 0 ? ` (${it.optionLabels.join(', ')})` : '';
    return `${i + 1}. ${it.quantity}x ${it.name}${opts} — $${it.lineTotal.toFixed(2)}`;
  });
  return lines.join('\n');
}

export function addItem(state: CartState, item: CartItem): CartState {
  const existing = state.items.find(
    (it) => it.menuItemId === item.menuItemId && JSON.stringify(it.options) === JSON.stringify(item.options)
  );
  if (existing) {
    existing.quantity += item.quantity;
    existing.lineTotal = existing.quantity * existing.price;
  } else {
    state.items.push(item);
  }
  return state;
}

export function removeItem(state: CartState, index: number): CartState {
  if (index >= 0 && index < state.items.length) {
    state.items.splice(index, 1);
  }
  return state;
}

export function updateQuantity(state: CartState, index: number, quantity: number): CartState {
  if (index >= 0 && index < state.items.length && quantity > 0) {
    state.items[index].quantity = quantity;
    state.items[index].lineTotal = quantity * state.items[index].price;
  }
  return state;
}

export function clearCart(state: CartState): CartState {
  state.items = [];
  state.couponCode = null;
  state.couponDiscount = 0;
  state.loyaltyPointsRedeem = 0;
  state.currentStep = 'IDLE';
  return state;
}
