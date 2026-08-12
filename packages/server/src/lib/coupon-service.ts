import prisma from './db.js';

// ── Coupon service ───────────────────────────────────────────────────────────
// All coupon math is SERVER-SIDE. The client only sends the code; the server
// fetches the coupon, validates every rule, recalculates the discount and
// records the usage. The client can never influence the discount amount.

export interface CouponEligibility {
  valid: boolean;
  error?: string;
  coupon?: {
    id: string;
    code: string;
    type: 'PERCENTAGE' | 'FIXED' | 'FREE_DELIVERY';
    value: number;
  };
}

export interface CouponDiscount {
  couponId: string;
  code: string;
  discountAmount: number;
  deliveryFree: boolean;
}

/**
 * Validate a coupon against server-side subtotal and (optional) customer.
 * Throws a CouponError with a friendly message when invalid.
 */
export class CouponError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function findActiveCoupon(code: string) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) throw new CouponError('Coupon code is required');

  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });
  if (!coupon) throw new CouponError('Invalid coupon code', 404);
  return coupon;
}

/**
 * Full validation: active, dates, usageLimit, perCustomerLimit, minOrder.
 * `subtotal` MUST come from the server (computed from DB prices).
 */
export async function validateCouponForOrder(
  code: string,
  subtotal: number,
  customerId?: string | null,
): Promise<{ coupon: any; discount: number; deliveryFree: boolean }> {
  const coupon = await findActiveCoupon(code);
  const now = new Date();

  if (!coupon.isActive) throw new CouponError('Coupon is not active');
  if (coupon.startsAt && now < coupon.startsAt) throw new CouponError('Coupon is not yet valid');
  if (coupon.expiresAt && now > coupon.expiresAt) throw new CouponError('Coupon has expired');

  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    throw new CouponError('Coupon usage limit reached');
  }

  if (subtotal < coupon.minOrder) {
    throw new CouponError(`Minimum order amount is $${coupon.minOrder.toFixed(2)}`);
  }

  // Per-customer limit (authenticated customers only; guests can't be tracked reliably)
  if (customerId && coupon.perCustomer > 0) {
    const used = await prisma.couponUsage.count({
      where: { couponId: coupon.id, customerId },
    });
    if (used >= coupon.perCustomer) {
      throw new CouponError('Coupon already used by this customer');
    }
  }

  // Discount math — never negative, never above subtotal, cap for percentage
  let discount = 0;
  let deliveryFree = false;

  if (coupon.type === 'PERCENTAGE') {
    const pct = Math.min(coupon.value, 100);
    discount = subtotal * (pct / 100);
    if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else if (coupon.type === 'FIXED') {
    discount = Math.min(coupon.value, subtotal);
  } else if (coupon.type === 'FREE_DELIVERY') {
    deliveryFree = true;
  }

  discount = Math.max(0, Math.min(discount, subtotal));

  return { coupon, discount, deliveryFree };
}

/**
 * Persist the coupon usage + increment usageCount atomically.
 * The unique (couponId, orderId) constraint makes this idempotent: a retried
 * checkout with the same order cannot double-record the usage.
 */
export async function recordCouponUsage(args: {
  couponId: string;
  orderId: string;
  customerId?: string | null;
  code: string;
  discountAmount: number;
}): Promise<void> {
  const { couponId, orderId, customerId, code, discountAmount } = args;

  // Idempotent: if already recorded for this order, do nothing
  const existing = await prisma.couponUsage.findUnique({ where: { orderId } });
  if (existing) return;

  await prisma.$transaction([
    prisma.couponUsage.create({
      data: { couponId, orderId, customerId: customerId || null, code, discountAmount },
    }),
    prisma.coupon.update({
      where: { id: couponId },
      data: { usageCount: { increment: 1 } },
    }),
  ]);
}
