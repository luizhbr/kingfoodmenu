import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import type { AttributionSource } from '@prisma/client';
import { emitNewOrder, emitOrderStatusUpdate } from '../lib/socket.js';
import { isPointInPolygon, haversineMiles, deliveryFeeForDistance, DELIVERY_MAX_MILES } from '../lib/geo.js';
import { sendEmail, orderConfirmationEmail, orderStatusEmail } from '../lib/email.js';
import { auditLog } from '../lib/audit.js';
import { notifyOrderWhatsApp } from '../lib/whatsapp.js';
import { validateCouponForOrder, recordCouponUsage, CouponError } from '../lib/coupon-service.js';
import { debitCashback, creditCashbackForOrder, reverseCashbackForOrder, reverseDebit, linkDebitToOrder } from '../lib/cashback-service.js';
import { getLoyaltySettingsValue } from './loyalty.controller.js';
const crypto = require('crypto');

// ── Attribution source normalization ────────────────────────────────────────
// Prisma enums are UPPERCASE. The storefront sends raw UTM values (lowercase),
// so normalize before persisting to avoid 500 "Invalid value for argument".
// The silent catch below would otherwise hide this failure.

const SOURCE_ALIASES: Record<string, string> = {
  google: "GOOGLE",
  googleads: "GOOGLE_ADS",
  google_ads: "GOOGLE_ADS",
  instagram: "INSTAGRAM",
  facebook: "FACEBOOK",
  meta: "META_ADS",
  metaads: "META_ADS",
  meta_ads: "META_ADS",
  tiktok: "TIKTOK",
  tiktokads: "TIKTOK_ADS",
  tiktok_ads: "TIKTOK_ADS",
  whatsapp: "WHATSAPP",
  qr: "QR_CODE",
  qrcode: "QR_CODE",
  email: "EMAIL",
  referral: "REFERRAL",
  influencer: "INFLUENCER",
  organic: "ORGANIC",
  custom: "CUSTOM",
  direct: "DIRECT",
};

function normalizeAttributionSource(value: unknown): AttributionSource {
  if (typeof value !== "string" || !value.trim()) return "UNKNOWN";
  const raw = value.trim().toLowerCase();
  return (SOURCE_ALIASES[raw] || raw.toUpperCase()) as AttributionSource;
}


const orderItemOptionSchema = z.object({
  menuOptionValueId: z.string().min(1),
  name: z.string().min(1),
  value: z.string().min(1),
  priceModifier: z.number(),
});

const orderItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1),
  comment: z.string().optional(),
  options: z.array(orderItemOptionSchema).optional(),
});

const createOrderSchema = z.object({
  orderType: z.enum(['DELIVERY', 'PICKUP']),
  paymentMethod: z.enum(['cash', 'stripe', 'paypal']).optional().default('cash'),
  // PDV/admin only: payment already collected at the counter (cash or card
  // machine) — order is born PENDING with a COMPLETED payment record,
  // skipping the Stripe AWAITING_PAYMENT gate (no online charge).
  paymentCollected: z.boolean().optional().default(false),
  items: z.array(orderItemSchema).min(1),
  comment: z.string().optional(),
  scheduledAt: z.string().optional(),
  couponCode: z.string().optional(),
  cashbackUse: z.number().min(0).optional(),
  address: z
    .object({
      line1: z.string().min(1),
      line2: z.string().optional(),
      city: z.string().min(1),
      state: z.string().min(1),
      zip: z.string().min(1),
      country: z.string().default('US'),
      // Coordinates are OPTIONAL and nullable: geocoding via Places Autocomplete
      // may not have run (manual address typing). Without coordinates the
      // server falls back to the flat/polygon-zone delivery fee.
      lat: z.number().nullable().optional(),
      lng: z.number().nullable().optional(),
      placeId: z.string().nullable().optional(),
      formattedAddress: z.string().nullable().optional(),
    })
    .optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().optional(),
  // Staff-only: link this order to an existing customer (manual/phone order).
  // Ignored for customer-authenticated requests (identity comes from the JWT).
  customerId: z.string().optional(),
  loyaltyPointsRedeem: z.number().int().min(0).optional(),
  // Welcome-credit toggle: apply the customer's AVAILABLE welcome reward
  // (e.g. google_signup_bonus $3) to this order. Server owns the amount.
  rewardUse: z.boolean().optional(),
  // Client-generated key so a retried/double-submitted request returns the
  // SAME order instead of creating a duplicate (idempotency).
  idempotencyKey: z.string().min(8).max(128).optional(),
  // Sales attribution (first/last touch) captured by the storefront session
  attribution: z
    .object({
      source: z.string().optional(),
      medium: z.string().nullable().optional(),
      campaign: z.string().nullable().optional(),
      content: z.string().nullable().optional(),
      term: z.string().nullable().optional(),
      landingPage: z.string().nullable().optional(),
      referrer: z.string().nullable().optional(),
      lastSource: z.string().nullable().optional(),
      lastMedium: z.string().nullable().optional(),
      lastCampaign: z.string().nullable().optional(),
    })
    .optional(),
  sessionId: z.string().optional(),
});

function generateOrderNumber(): string {
  const prefix = 'KF';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ── SECURE TRACKING TOKEN GENERATION ────────────────────────────────────────
// Uses cryptographically secure random bytes (128 bits of entropy)
function generateTrackingToken(): string {
  const prefix = 'KF';
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `${prefix}-${randomBytes}`;
}

// ── GUEST TRACKING RESPONSE DTO ─────────────────────────────────────────────
// Minimal public response containing ONLY what the tracking UI needs
interface GuestTrackingResponse {
  orderNumber: string;
  status: string;
  timeline: Array<{ status: string; label: string; completed: boolean }>;
}

function buildGuestTrackingResponse(order: { orderNumber: string; status: string; orderType: string }): GuestTrackingResponse {
  const timeline = [
    { status: 'PENDING', label: 'Pedido recebido', completed: order.status !== 'PENDING' },
    { status: 'CONFIRMED', label: 'Pedido aceito', completed: ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP'].includes(order.status) },
    { status: 'PREPARING', label: 'Em preparo', completed: ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP'].includes(order.status) },
    { status: 'READY', label: 'Pronto', completed: ['READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP'].includes(order.status) },
    ...(order.orderType === 'DELIVERY' ? [
      { status: 'OUT_FOR_DELIVERY', label: 'Saiu para entrega', completed: ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) },
      { status: 'DELIVERED', label: 'Entregue', completed: order.status === 'DELIVERED' }
    ] : [
      { status: 'PICKED_UP', label: 'Retirado', completed: order.status === 'PICKED_UP' }
    ])
  ];
  return { orderNumber: order.orderNumber, status: order.status, timeline };
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const {
    orderType,
    paymentMethod,
    paymentCollected,
    items,
    comment,
    scheduledAt,
    address,
    guestName,
    guestEmail,
    guestPhone,
    customerId: staffCustomerId,
    loyaltyPointsRedeem,
    rewardUse,
    couponCode,
    cashbackUse,
    idempotencyKey,
    attribution,
    sessionId,
  } = parsed.data;

  if (orderType === 'DELIVERY' && !address) {
    res.status(400).json({ success: false, error: 'Delivery address is required' });
    return;
  }

  // Idempotency: if the client retries with the same key, return the
  // existing order instead of creating a duplicate.
  if (parsed.data.idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey: parsed.data.idempotencyKey },
    });
    if (existing) {
      res.status(200).json({ success: true, data: existing, duplicate: true });
      return;
    }
  }

  const userType = (req as any).user?.type;
  // Customer-authenticated: identity ALWAYS comes from the JWT (IDOR-safe).
  // Staff: may link to an existing customer via staffCustomerId (manual order).
  let customerId: string | null = userType === 'customer' ? (req as any).user.id : null;

  if (userType === 'staff' && staffCustomerId) {
    const target = await prisma.customer.findUnique({ where: { id: staffCustomerId } });
    if (!target) {
      res.status(400).json({ success: false, error: 'Customer not found' });
      return;
    }
    customerId = target.id;
  }

  if (!customerId) {
    if (!guestName || !guestEmail) {
      res
        .status(400)
        .json({ success: false, error: 'Guest name and email are required for guest checkout' });
      return;
    }
  }

  if (scheduledAt) {
    const scheduled = new Date(scheduledAt);
    const now = new Date();
    const minTime = new Date(now.getTime() + 30 * 60 * 1000);
    const maxTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (isNaN(scheduled.getTime())) {
      res.status(400).json({ success: false, error: 'Invalid scheduledAt date' });
      return;
    }
    if (scheduled < minTime) {
      res
        .status(400)
        .json({ success: false, error: 'Scheduled time must be at least 30 minutes in the future' });
      return;
    }
    if (scheduled > maxTime) {
      res
        .status(400)
        .json({ success: false, error: 'Scheduled time cannot be more than 7 days in the future' });
      return;
    }
  }

  const location = await prisma.location.findFirst({
    where: { isActive: true },
    include: { operatingHours: true },
  });
  if (!location) {
    res.status(400).json({ success: false, error: 'No active location found' });
    return;
  }

  if (location.isBusy) {
    res.status(400).json({
      success: false,
      error:
        location.busyMessage ||
        'This location is currently not accepting orders. Please try again later.',
    });
    return;
  }

  if (scheduledAt && location.operatingHours.length > 0) {
    const scheduled = new Date(scheduledAt);
    const dayOfWeek = scheduled.getDay();
    const timeStr = `${String(scheduled.getHours()).padStart(2, '0')}:${String(scheduled.getMinutes()).padStart(2, '0')}`;
    const dayHours = location.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!dayHours || dayHours.isClosed) {
      res.status(400).json({ success: false, error: 'Location is closed on the scheduled day' });
      return;
    }
    if (timeStr < dayHours.openTime || timeStr >= dayHours.closeTime) {
      res.status(400).json({
        success: false,
        error: `Scheduled time must be within operating hours (${dayHours.openTime} - ${dayHours.closeTime})`,
      });
      return;
    }
  }

  let deliveryFee = 0;
  let savedAddressId: string | null = null;
  let addressSnapshot: {
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
    lat: number | null;
    lng: number | null;
    placeId: string | null;
    formattedAddress: string | null;
  } | null = null;

  if (orderType === 'DELIVERY') {
    // Build snapshot from the submitted address (always, even without lat/lng)
    addressSnapshot = {
      line1: address!.line1,
      line2: address!.line2 ?? null,
      city: address!.city,
      state: address!.state,
      postalCode: address!.zip,
      country: address!.country ?? 'US',
      lat: address!.lat ?? null,
      lng: address!.lng ?? null,
      placeId: address!.placeId ?? null,
      formattedAddress: address!.formattedAddress ?? null,
    };

    if (address?.lat != null && address?.lng != null && location.lat != null && location.lng != null) {
      // Distance-based pricing (authoritative): Haversine from the store
      // coordinates to the delivery address. The client never sends the fee.
      const distanceMiles =
        Math.round(haversineMiles(location.lat, location.lng, address.lat, address.lng) * 100) / 100;
      const tierFee = deliveryFeeForDistance(distanceMiles);
      if (tierFee == null) {
        res.status(400).json({
          success: false,
          error: `Seu endereço está fora da nossa área de entrega (até ${DELIVERY_MAX_MILES} milhas). Considere a opção de retirada.`,
          data: { distanceMiles, maxMiles: DELIVERY_MAX_MILES },
        });
        return;
      }
      deliveryFee = tierFee;
    } else if (address?.lat != null && address?.lng != null) {
      // No store origin configured — fall back to polygon zones.
      const zones = await prisma.deliveryZone.findMany({
        where: { locationId: location.id, isActive: true },
      });

      let matchedZone = null;
      for (const zone of zones) {
        if (zone.boundaries && Array.isArray(zone.boundaries)) {
          if (isPointInPolygon(address.lat, address.lng, zone.boundaries as [number, number][])) {
            matchedZone = zone;
            break;
          }
        }
      }

      if (zones.length > 0 && !matchedZone) {
        res
          .status(400)
          .json({ success: false, error: 'Delivery address is outside our delivery zones' });
        return;
      }

      if (matchedZone) {
        deliveryFee = matchedZone.charge;
      } else {
        deliveryFee = 4.99;
      }
    } else {
      const defaultZone = await prisma.deliveryZone.findFirst({
        where: { locationId: location.id, isActive: true },
        orderBy: { charge: 'asc' },
      });
      deliveryFee = defaultZone ? defaultZone.charge : 4.99;
    }

    // Persist the address row (customer-linked when logged in, orphan-safe for guests).
    // Guest addresses are stored too: they document the delivery point and are
    // reusable later if the guest creates an account.
    if (addressSnapshot) {
      const saved = await prisma.address.create({
        data: {
          customerId,
          line1: addressSnapshot.line1,
          line2: addressSnapshot.line2,
          city: addressSnapshot.city,
          state: addressSnapshot.state,
          postalCode: addressSnapshot.postalCode,
          country: addressSnapshot.country,
          lat: addressSnapshot.lat,
          lng: addressSnapshot.lng,
          placeId: addressSnapshot.placeId,
          formattedAddress: addressSnapshot.formattedAddress,
        },
      });
      savedAddressId = saved.id;
    }
  }

  const menuItemIds = items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    include: {
      options: { include: { values: true } },
    },
  });

  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  for (const item of items) {
    const menuItem = menuItemMap.get(item.menuItemId);
    if (!menuItem) {
      res.status(400).json({ success: false, error: `Menu item not found: ${item.menuItemId}` });
      return;
    }
    if (!menuItem.isActive) {
      res.status(400).json({ success: false, error: `Menu item is not available: ${menuItem.name}` });
      return;
    }
    if (menuItem.trackStock && menuItem.stockQty < item.quantity) {
      res.status(400).json({ success: false, error: `Insufficient stock for: ${menuItem.name}` });
      return;
    }
  }

  // Server-side pricing: unit prices come from the DB (menuItem.price),
  // never from the client. The client only sends menuItemId + quantity.
  let subtotal = 0;
  const orderItemsData = items.map((item) => {
    const menuItem = menuItemMap.get(item.menuItemId)!;
    let unitPrice = menuItem.price;

    const optionsData = (item.options || []).map((opt) => {
      unitPrice += opt.priceModifier;
      return {
        menuOptionValueId: opt.menuOptionValueId,
        name: opt.name,
        value: opt.value,
        priceModifier: opt.priceModifier,
      };
    });

    const itemSubtotal = unitPrice * item.quantity;
    subtotal += itemSubtotal;

    return {
      menuItemId: item.menuItemId,
      name: menuItem.name,
      quantity: item.quantity,
      unitPrice,
      subtotal: itemSubtotal,
      comment: item.comment,
      options: { create: optionsData },
    };
  });

  let loyaltyDiscount = 0;
  if (loyaltyPointsRedeem && loyaltyPointsRedeem > 0 && customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || customer.loyaltyPoints < loyaltyPointsRedeem) {
      res.status(400).json({ success: false, error: 'Insufficient loyalty points' });
      return;
    }
    const loyaltyConfig = await getLoyaltySettingsValue();
    loyaltyDiscount = Math.round(loyaltyPointsRedeem * loyaltyConfig.pointsValue * 100) / 100;
  }

  if (orderType === 'DELIVERY' && address?.lat != null && address?.lng != null) {
    const zones = await prisma.deliveryZone.findMany({
      where: { locationId: location.id, isActive: true },
    });
    for (const zone of zones) {
      if (zone.boundaries && Array.isArray(zone.boundaries)) {
        if (isPointInPolygon(address.lat, address.lng, zone.boundaries as [number, number][])) {
          if (subtotal < zone.minOrder) {
            res.status(400).json({
              success: false,
              error: `Minimum order for this delivery zone: $${zone.minOrder.toFixed(2)}`,
            });
            return;
          }
          break;
        }
      }
    }
  }

  // ── Coupon (server-side) ────────────────────────────────────────────────────
  // The client only sends couponCode. The server fetches the coupon, validates
  // every rule against the SERVER-computed subtotal and calculates the discount.
  // Never trust a discountAmount/finalTotal sent by the client.
  let couponId: string | null = null;
  let couponDiscount = 0;
  let couponDeliveryFree = false;
  if (couponCode) {
    try {
      const result = await validateCouponForOrder(couponCode, subtotal, customerId);
      couponId = result.coupon.id;
      couponDiscount = result.discount;
      couponDeliveryFree = result.deliveryFree;
      if (couponDeliveryFree) deliveryFee = 0;
    } catch (err) {
      if (err instanceof CouponError) {
        res.status(err.status).json({ success: false, error: err.message });
        return;
      }
      throw err;
    }
  }

  // ── Welcome reward credit (server-side) ─────────────────────────────────────
  // If the authenticated customer opts in (rewardUse), apply their AVAILABLE
  // welcome reward (google_signup_bonus). The SERVER owns the amount — capped
  // by the benefit cap (same pool as coupon + points + cashback) and never
  // below $0. The reward is debited (status REDEEMED) only AFTER the order is
  // created, linked to the real orderId.
  let rewardUsed = 0;
  let rewardRecord: { id: string; amount: number } | null = null;
  if (rewardUse && customerId) {
    const reward = await prisma.customerReward.findFirst({
      where: {
        customerId,
        type: 'google_signup_bonus',
        status: 'AVAILABLE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'asc' },
    });
    if (reward) {
      const cfg = await getLoyaltySettingsValue();
      const capRemaining = Math.max(0, subtotal * cfg.benefitCapPercent - (loyaltyDiscount + couponDiscount));
      rewardUsed = Math.round(Math.min(reward.amount, capRemaining) * 100) / 100;
      if (rewardUsed > 0) rewardRecord = { id: reward.id, amount: reward.amount };
    }
  }

  // ── Cashback (server-side) ──────────────────────────────────────────────────
  // The client only sends the amount they want to use. The server caps it at
  // the eligible subtotal (subtotal - coupon discount), and the actual DEBIT
  // (with balance check) is executed atomically AFTER the order is created,
  // using the real orderId as idempotency guard.
  let cashbackUsed = 0;
  if (cashbackUse && cashbackUse > 0 && customerId) {
    const benefitCap = await getLoyaltySettingsValue().then((v) => v.benefitCapPercent);
    // Teto de benefício: cupom + pontos + cashback juntos não passam de X% do subtotal.
    const alreadyUsed = loyaltyDiscount + couponDiscount + rewardUsed;
    const capRemaining = Math.max(0, subtotal * benefitCap - alreadyUsed);
    const eligibleBase = Math.min(Math.max(0, subtotal - couponDiscount), capRemaining);
    cashbackUsed = Math.min(cashbackUse, eligibleBase);
    // DEBIT executes ATOMICALLY here (with FOR UPDATE row lock) against the
    // idempotencyKey. Concurrent checkouts can never both spend the same
    // balance. If the order creation fails afterwards, reverseDebit restores it.
    try {
      await debitCashback(customerId, cashbackUsed, `ck-${idempotencyKey}`);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Cashback debit failed' });
      return;
    }
  }

  const TAX_RATE = 0.08;
  const tax = subtotal * TAX_RATE;
  // tax base stays on full subtotal (existing rule); discounts subtract from total
  const total = Math.max(0, subtotal + tax + deliveryFee - loyaltyDiscount - couponDiscount - cashbackUsed - rewardUsed);

  let order;
  try {
    order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        idempotencyKey: parsed.data.idempotencyKey,
        customerId,
        locationId: location.id,
        orderType,
        // Payment gate: an order only becomes visible to the admin
        // (PENDING) once payment is confirmed. Stripe orders start
        // AWAITING_PAYMENT and are flipped to PENDING by the webhook
        // (payment_intent.succeeded). Cash/pickup orders are PENDING
        // immediately with an explicit CASH payment record.
        // Online gate only when the payment was NOT already collected at the counter.
        // PDV: cartão coletado na loja → pedido nasce PENDING (visível ao admin)
        // e ganha registro STRIPE COMPLETED abaixo, igual ao fluxo cash.
        status: (paymentMethod === 'stripe' || paymentMethod === 'paypal') && !paymentCollected
          ? 'AWAITING_PAYMENT'
          : 'PENDING',
        subtotal,
        tax,
        deliveryFee,
        discount: loyaltyDiscount + couponDiscount + rewardUsed,
        couponId,
        total,
        comment,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        addressId: savedAddressId,
        deliveryLine1: addressSnapshot?.line1 ?? null,
        deliveryLine2: addressSnapshot?.line2 ?? null,
        deliveryCity: addressSnapshot?.city ?? null,
        deliveryState: addressSnapshot?.state ?? null,
        deliveryPostalCode: addressSnapshot?.postalCode ?? null,
        deliveryCountry: addressSnapshot?.country ?? null,
        deliveryLat: addressSnapshot?.lat ?? null,
        deliveryLng: addressSnapshot?.lng ?? null,
        deliveryPlaceId: addressSnapshot?.placeId ?? null,
        deliveryFormattedAddress: addressSnapshot?.formattedAddress ?? null,
        trackingToken: customerId ? undefined : generateTrackingToken(),
        guestName: customerId ? undefined : guestName,
        guestEmail: customerId ? undefined : guestEmail,
        guestPhone: customerId ? undefined : guestPhone,
        items: { create: orderItemsData },
      },
      include: {
        items: { include: { options: true } },
        customer: { select: { id: true, name: true, email: true } },
        location: { select: { id: true, name: true, address: true, city: true, state: true, postalCode: true } },
      },
    });
  } catch (err) {
    // Order creation failed — restore any pre-paid cashback DEBIT
    if (cashbackUsed > 0 && customerId) {
      try {
        await reverseDebit(customerId, `ck-${idempotencyKey}`);
      } catch (revErr) {
        console.error('[cashback] rollback failed', revErr);
      }
    }
    console.error('[order] create failed:', err);
    res.status(500).json({ success: false, error: 'Failed to create order' });
    return;
  }

  // Cash on delivery/pickup: record the explicit payment immediately.
  // The order is already PENDING (visible to admin) — this row is the
  // "pago_na_entrega" marker the kitchen/driver sees.
  // Cash on delivery/pickup OR card collected at the counter (PDV):
  // explicit COMPLETED payment record — the "pago" marker the kitchen sees.
  const collectedAtCounter = paymentMethod === 'cash' ||
    ((paymentMethod === 'stripe' || paymentMethod === 'paypal') && paymentCollected);
  if (collectedAtCounter) {
    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: paymentMethod === 'stripe' ? 'STRIPE' : paymentMethod === 'paypal' ? 'PAYPAL' : 'CASH',
        status: 'COMPLETED',
        amount: order.total,
      },
    }).catch((err) => {
      console.error('[order] cash payment record failed', order.id, err.message);
    });
  }

  for (const item of items) {
    const menuItem = menuItemMap.get(item.menuItemId)!;
    if (menuItem.trackStock) {
      await prisma.menuItem.update({
        where: { id: item.menuItemId },
        data: { stockQty: { decrement: item.quantity } },
      });
    }
  }

    // Record coupon usage (idempotent: unique couponId+orderId constraint)
  if (couponId && couponCode) {
    await recordCouponUsage({
      couponId,
      orderId: order.id,
      customerId,
      code: couponCode.trim().toUpperCase(),
      discountAmount: couponDiscount,
    });
  }

  // Link the pre-paid DEBIT to the real order (idempotency reference → orderId)
  if (cashbackUsed > 0 && customerId) {
    try {
      await linkDebitToOrder(customerId, `ck-${idempotencyKey}`, order.id);
    } catch (err: any) {
      console.error('[cashback] link failed', order.id, err.message);
    }
  }

  // Debit the welcome reward ONLY after the order exists (links the real orderId).
  if (rewardRecord && rewardUsed > 0) {
    try {
      await prisma.customerReward.update({
        where: { id: rewardRecord.id },
        data: {
          status: 'REDEEMED',
          redeemedAt: new Date(),
          orderId: order.id,
        },
      });
    } catch (err: any) {
      // Não deve falhar o pedido por isso — o total já foi calculado com o crédito.
      console.error('[rewards] redeem failed', order.id, err.message);
    }
  }

if (customerId) {
    const loyaltyCfg = await getLoyaltySettingsValue();
    const pointsEarned = Math.floor(subtotal * loyaltyCfg.pointsPerDollar);
    if (pointsEarned > 0) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: { increment: pointsEarned } },
      });
      await prisma.loyaltyTransaction.create({
        data: {
          customerId,
          type: 'EARN',
          points: pointsEarned,
          description: `Earned from order #${order.orderNumber}`,
          orderId: order.id,
        },
      });
    }

    if (loyaltyPointsRedeem && loyaltyPointsRedeem > 0) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: { decrement: loyaltyPointsRedeem } },
      });
      await prisma.loyaltyTransaction.create({
        data: {
          customerId,
          type: 'REDEEM',
          points: -loyaltyPointsRedeem,
          description: `Redeemed on order #${order.orderNumber}`,
          orderId: order.id,
        },
      });
    }
  }

  const recipientEmail = order.customer?.email || guestEmail;
  if (recipientEmail) {
    const emailContent = orderConfirmationEmail({
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      total: order.total,
      items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, subtotal: i.subtotal })),
    });
    sendEmail({ to: recipientEmail, ...emailContent }).catch(() => {});
  }

  emitNewOrder({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    orderType: order.orderType,
  });

  // WhatsApp stub (non-blocking)
  notifyOrderWhatsApp({
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    total: order.total,
    guestName: order.guestName,
    guestPhone: order.guestPhone,
    customerName: order.customer?.name,
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      subtotal: i.subtotal,
    })),
  }).catch(() => {});

  try {
    const { appEvents } = await import('../lib/events.js');
    appEvents.emit('order.created', { order });
  } catch (err) {
    console.error('[order] appEvents emit failed:', err);
  }

  // Sales attribution: persist first/last touch linked to this order
  if (attribution) {
    try {
      await prisma.orderAttribution.create({
        data: {
          orderId: order.id,
          source: normalizeAttributionSource(attribution.source),
          medium: attribution.medium ?? null,
          campaign: attribution.campaign ?? null,
          content: attribution.content ?? null,
          term: attribution.term ?? null,
          firstTouchSource: normalizeAttributionSource(attribution.source),
          firstTouchMedium: attribution.medium ?? null,
          firstTouchCampaign: attribution.campaign ?? null,
          lastTouchSource: normalizeAttributionSource(attribution.lastSource || attribution.source),
          lastTouchMedium: attribution.lastMedium ?? null,
          lastTouchCampaign: attribution.lastCampaign ?? null,
          landingPage: attribution.landingPage ?? null,
          referrer: attribution.referrer ?? null,
        },
      });
    } catch (err) {
      // Attribution must never block order creation, but the failure
      // must be visible in logs (was silently swallowed before).
      console.error("[order] Failed to persist OrderAttribution:", err);
    }
  }

  res.status(201).json({
    success: true,
    data: order,
    // Info for the storefront confirmation screen.
    rewardApplied: rewardUsed > 0 ? { amount: rewardUsed } : null,
  });
}

export async function listOrders(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;
  const orderType = req.query.orderType as string | undefined;

  const includeItems = req.query.includeItems === 'true';

  const where: Record<string, unknown> = {};
  if (status) {
    const statuses = status
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
  } else {
    // Unpaid orders (AWAITING_PAYMENT) never surface in the admin list.
    // They only become visible (PENDING) after the Stripe webhook
    // confirms payment. An explicit status filter still shows them.
    where.status = { not: 'AWAITING_PAYMENT' };
  }
  if (orderType) where.orderType = orderType;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        location: { select: { id: true, name: true, address: true, city: true, state: true, postalCode: true } },
        _count: { select: { items: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        ...(includeItems ? { items: { include: { options: true } } } : {}),
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function getOrder(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  // If the user is authenticated, check if they are staff or the customer
  if (req.user) {
    const user = req.user;
    // First try to find by ID (for staff/customer accessing their own order)
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        location: { select: { id: true, name: true, address: true, city: true, state: true, postalCode: true } },
        items: {
          include: {
            menuItem: { select: { id: true, name: true, slug: true } },
            options: true,
          }
        },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    // If the user is authenticated, check if they are staff or the customer
    if (user.type !== 'staff' && order.customerId !== user.id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    res.json({ success: true, data: order });
    return;
  }

  // ── GUEST TRACKING PATH ───────────────────────────────────────────────────
  // Guest must provide valid tracking token in the URL path
  const order = await prisma.order.findUnique({
    where: { trackingToken: id },
    include: {
      items: {
        include: {
          menuItem: { select: { id: true, name: true, slug: true } },
          options: true,
        }
      },
    }
  });

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  // Return MINIMAL guest tracking DTO - NO PII, NO payment data
  const guestResponse = buildGuestTrackingResponse({
    orderNumber: order.orderNumber,
    status: order.status,
    orderType: order.orderType,
  });

  res.json({ success: true, data: guestResponse });
}
export async function listCustomerOrders(req: Request, res: Response): Promise<void> {
  const customerId = req.user?.id;
  if (!customerId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const where = { customerId };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        location: { select: { id: true, name: true, address: true, city: true, state: true, postalCode: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function updateOrderStatus(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = [
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'PICKED_UP',
    'CANCELLED',
  ];
  if (!validStatuses.includes(status)) {
    res
      .status(400)
      .json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: { select: { email: true } } },
  });
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status },
    include: {
      items: { include: { options: true } },
      customer: { select: { email: true, name: true } },
    },
  });

  // ── Cashback lifecycle ─────────────────────────────────────────────────────
  // Credit cashback when the order reaches an eligible terminal state
  // (DELIVERED / PICKED_UP) and the customer is authenticated. Idempotent via
  // the unique [CREDIT, orderId] constraint — repeated status updates can
  // never double-credit. Cancelled orders reverse any credited cashback.
  if (updated.customerId) {
    try {
      if (status === 'DELIVERED' || status === 'PICKED_UP') {
        await creditCashbackForOrder(updated.customerId, id, Math.max(0, updated.subtotal - (updated.discount || 0)));
      } else if (status === 'CANCELLED') {
        await reverseCashbackForOrder(updated.customerId, id);
      }
    } catch (err: any) {
      console.error('[cashback] lifecycle error for order', id, err.message);
    }
  }

  auditLog(req, {
    action: 'update',
    entity: 'Order',
    entityId: id,
    details: { status, previousStatus: order.status },
  });

  emitOrderStatusUpdate({
    id: updated.id,
    orderNumber: updated.orderNumber,
    status: updated.status,
    orderType: updated.orderType,
    customerId: updated.customerId,
  });

  const recipientEmail = order.customer?.email || order.guestEmail;
  if (recipientEmail) {
    const emailContent = orderStatusEmail({ orderNumber: order.orderNumber, status });
    sendEmail({ to: recipientEmail, ...emailContent }).catch(() => {});
  }

  try {
    const { appEvents, autoPrintOnConfirmed } = await import('../lib/events.js');
    appEvents.emit('order.statusChanged', { order: updated, previousStatus: order.status });
    // Await auto-print so it completes before the HTTP response in serverless environments
    if (status === 'CONFIRMED' && order.status !== 'CONFIRMED') {
      await autoPrintOnConfirmed({ order: updated, previousStatus: order.status });
    }
  } catch (err) {
    console.error('[order] appEvents statusChanged failed:', err);
  }

  res.json({ success: true, data: updated });
}

// ── Exclusão de pedidos (individual + lote) ─────────────────────────────────
// Remove o pedido de vez, limpando em cascata todas as relações.
// Pedidos são dados operacionais; a exclusão é intencional (staff).

async function deleteOrderRelations(orderId: string) {
  await prisma.$transaction([
    prisma.orderItemOption.deleteMany({ where: { orderItem: { orderId } } }),
    prisma.orderItem.deleteMany({ where: { orderId } }),
    prisma.payment.deleteMany({ where: { orderId } }),
    prisma.trackingEvent.deleteMany({ where: { orderId } }),
    prisma.review.deleteMany({ where: { orderId } }),
    prisma.loyaltyTransaction.deleteMany({ where: { orderId } }),
    prisma.cashbackTransaction.deleteMany({ where: { orderId } }),
    prisma.printJob.deleteMany({ where: { orderId } }),
    prisma.orderAttribution.deleteMany({ where: { orderId } }),
    prisma.couponUsage.deleteMany({ where: { orderId } }),
    prisma.order.delete({ where: { id: orderId } }),
  ]);
}


// ── Staff: edit order items (manual/phone order) ────────────────────────────
// Replaces the order's items and recalculates subtotal/tax/total SERVER-SIDE
// (prices always come from the DB, never the client). Only allowed while the
// order is still editable (not DELIVERED / PICKED_UP / CANCELLED).
const updateOrderItemsSchema = z.object({
  items: z.array(orderItemSchema).min(1),
});

export async function updateOrderItems(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = updateOrderItemsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  const terminal = ['DELIVERED', 'PICKED_UP', 'CANCELLED'];
  if (terminal.includes(order.status)) {
    res.status(400).json({ success: false, error: 'Pedido finalizado não pode ser editado' });
    return;
  }

  const items = parsed.data.items;
  const menuItemIds = items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    include: { options: { include: { values: true } } },
  });
  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  let subtotal = 0;
  const orderItemsData = items.map((item) => {
    const menuItem = menuItemMap.get(item.menuItemId);
    if (!menuItem) {
      throw new Error(`Menu item not found: ${item.menuItemId}`);
    }
    let unitPrice = menuItem.price;
    const optionsData = (item.options || []).map((opt) => {
      unitPrice += opt.priceModifier;
      return {
        menuOptionValueId: opt.menuOptionValueId,
        name: opt.name,
        value: opt.value,
        priceModifier: opt.priceModifier,
      };
    });
    const itemSubtotal = unitPrice * item.quantity;
    subtotal += itemSubtotal;
    return {
      menuItemId: item.menuItemId,
      name: menuItem.name,
      quantity: item.quantity,
      unitPrice,
      subtotal: itemSubtotal,
      comment: item.comment,
      options: { create: optionsData },
    };
  });

  const TAX_RATE = 0.08;
  const tax = subtotal * TAX_RATE;
  const total = Math.max(0, subtotal + tax + order.deliveryFee - (order.discount || 0));

  // Replace items atomically: delete existing, create new, update totals.
  const updated = await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: id } });
    return tx.order.update({
      where: { id },
      data: {
        subtotal,
        tax,
        total,
        items: { create: orderItemsData },
      },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        location: { select: { id: true, name: true, address: true, city: true, state: true, postalCode: true } },
        items: {
          include: {
            menuItem: { select: { id: true, name: true, slug: true } },
            options: true,
          }
        },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 }
      },
    });
  });

  auditLog(req, {
    action: 'update',
    entity: 'Order',
    entityId: id,
    details: { editedItems: true, previousSubtotal: order.subtotal, newSubtotal: subtotal },
  });

  res.json({ success: true, data: updated });
}

export async function deleteOrder(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  await deleteOrderRelations(id);
  auditLog(req, { action: 'delete', entity: 'Order', entityId: id, details: { orderNumber: existing.orderNumber } });
  res.json({ success: true, message: 'Order deleted' });
}

export async function deleteOrdersBatch(req: Request, res: Response): Promise<void> {
  const { ids } = req.body as { ids?: string[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ success: false, error: 'ids array required' });
    return;
  }
  if (ids.length > 100) {
    res.status(400).json({ success: false, error: 'Max 100 orders per batch' });
    return;
  }

  const existing = await prisma.order.findMany({ where: { id: { in: ids } }, select: { id: true, orderNumber: true } });
  const foundIds = existing.map((o) => o.id);
  const missing = ids.filter((i) => !foundIds.includes(i));

  for (const oid of foundIds) {
    await deleteOrderRelations(oid);
  }

  auditLog(req, { action: 'delete', entity: 'Order', entityId: foundIds.join(','), details: { count: foundIds.length, orderNumbers: existing.map((o) => o.orderNumber) } });
  res.json({ success: true, message: `${foundIds.length} order(s) deleted`, deleted: foundIds.length, missing });
}
