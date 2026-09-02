import { Request, Response } from 'express';
import { z } from 'zod';
import { getStripe } from '../lib/stripe.js';
import prisma from '../lib/db.js';

// ── Validation schemas ────────────────────────────────────────────────
const createPaymentIntentSchema = z.object({
  orderId: z.string().min(1),
});

const createCheckoutSessionSchema = z.object({
  orderId: z.string().min(1),
});

const markCashPaymentSchema = z.object({
  orderId: z.string().min(1),
});

// ── Ownership + idempotency helpers (P15.6) ────────────────────────────────

/**
 * Ownership check (IDOR protection). Returns true only when the caller
 * legitimately owns the order:
 *  - registered customer whose customerId matches the order, OR
 *  - staff/kitchen (admin payment flow), OR
 *  - guest checkout: the caller must prove the order's guest email
 *    (the same email the frontend used at checkout — the project's
 *    existing guest identity mechanism).
 */
function isOrderOwner(req: Request, order: { customerId: string | null; guestEmail?: string | null }): boolean {
  const user = (req as any).user;
  if (user?.type === 'customer' && user.id && order.customerId === user.id) {
    return true;
  }
  if (user?.type === 'staff') {
    return true; // staff/kitchen admin flow
  }
  // Guest checkout: prove knowledge of the guest email bound to the order
  const guestEmail = (req.body?.guestEmail as string) || '';
  if (order.guestEmail && guestEmail.length > 0 && guestEmail.toLowerCase() === order.guestEmail.toLowerCase()) {
    return true;
  }
  return false;
}

/**
 * Find an active (non-terminal) PaymentIntent for the order, or null.
 * A payment is reusable while it is PENDING.
 */
async function findActivePayment(orderId: string) {
  return prisma.payment.findFirst({
    where: { orderId, status: 'PENDING', method: 'STRIPE' },
    orderBy: { createdAt: 'desc' },
  });
}


export async function createPaymentIntent(req: Request, res: Response): Promise<void> {
  const parsed = createPaymentIntentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }
  const { orderId } = parsed.data;

  if (!orderId) {
    res.status(400).json({ success: false, error: 'orderId is required' });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: { select: { email: true, name: true } } },
  });
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  // IDOR protection: only the order owner can create a payment
  if (!isOrderOwner(req, order)) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }

  // Check if order already has a completed payment
  const completedPayment = await prisma.payment.findFirst({
    where: { orderId, status: 'COMPLETED' },
  });
  if (completedPayment) {
    res.status(409).json({ success: false, error: 'Order already paid' });
    return;
  }

  // Idempotency: reuse an existing active PaymentIntent instead of
  // creating duplicates on retry/concurrent requests.
  const activePayment = await findActivePayment(orderId);
  if (activePayment?.transactionId) {
    try {
      const stripe = await getStripe();
      const intent = await stripe.paymentIntents.retrieve(activePayment.transactionId);
      if (intent && intent.status === 'requires_payment_method') {
        res.json({
          success: true,
          data: { clientSecret: intent.client_secret, reused: true },
        });
        return;
      }
    } catch {
      // intent not retrievable — fall through and create a fresh one
    }
  }

  // Use the registered customer's email when present, fall back to the
  // guest-checkout email — both produce Stripe receipt emails + show up
  // attached to the PaymentIntent in the dashboard.
  const receiptEmail = order.customer?.email ?? order.guestEmail ?? undefined;

  try {
    const stripe = await getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100), // cents
      currency: 'usd', // King Food operates in Columbus, Ohio (USD)
      receipt_email: receiptEmail,
      // Let Stripe pick which payment methods to surface — covers cards,
      // Apple Pay and Google Pay on PaymentSheet without extra config.
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.name ?? order.guestName ?? '',
      },
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: 'STRIPE',
        status: 'PENDING',
        amount: order.total,
        transactionId: paymentIntent.id,
      },
    });

    res.json({
      success: true,
      data: { clientSecret: paymentIntent.client_secret },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Payment creation failed' });
  }
}

/// Creates a Stripe Checkout Session for the order. The customer is
/// redirected to Stripe's hosted page (cards + Apple Pay + Google Pay +
/// Klarna + SEPA come for free), and Stripe redirects back to the
/// order-confirmation page on success.
///
/// We attach `orderId` to BOTH the session metadata and the underlying
/// payment intent so the existing `payment_intent.succeeded` webhook
/// path still flips Order.status — the new `checkout.session.completed`
/// case below is just a belt-and-braces.
export async function createCheckoutSession(req: Request, res: Response): Promise<void> {
  const parsed = createCheckoutSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }
  const { orderId } = parsed.data;
  if (!orderId) {
    res.status(400).json({ success: false, error: 'orderId is required' });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { email: true } },
      items: true,
    },
  });
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  // IDOR protection: only the order owner can start checkout
  if (!isOrderOwner(req, order)) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }

  const existingPayment = await prisma.payment.findFirst({
    where: { orderId, status: 'COMPLETED' },
  });
  if (existingPayment) {
    res.status(409).json({ success: false, error: 'Order already paid' });
    return;
  }

  const publicUrl = process.env.PUBLIC_URL || process.env.STOREFRONT_URL || 'https://king-food-foundation-ui.vercel.app';
  const customerEmail = order.customer?.email ?? order.guestEmail ?? undefined;

  try {
    const stripe = await getStripe();

    const lineItems = order.items.map((it) => ({
      price_data: {
        currency: 'usd',
        product_data: { name: it.name },
        unit_amount: Math.round(it.unitPrice * 100),
      },
      quantity: it.quantity,
    }));

    if (order.deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Delivery fee' },
          unit_amount: Math.round(order.deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Only payment rails confirmed for this account's payouts.
      // Other methods (Klarna/Cash App/Amazon Pay/ACH) must be enabled
      // explicitly in the Stripe Dashboard AND here before being offered.
      payment_method_types: ['card', 'link'],
      line_items: lineItems,
      success_url: `${publicUrl}/order/${order.id}?paid=true`,
      cancel_url: `${publicUrl}/checkout`,
      customer_email: customerEmail,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
      payment_intent_data: {
        receipt_email: customerEmail,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
      },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: 'STRIPE',
        status: 'PENDING',
        amount: order.total,
        transactionId: session.id,
      },
    });

    res.json({
      success: true,
      data: { url: session.url, sessionId: session.id },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Checkout session creation failed' });
  }
}


/**
 * Deduplicate Stripe events by event.id (in-memory, bounded TTL).
 * Stripe re-delivers events with the SAME signature/timestamp on retries —
 * replay protection must be keyed on event.id, NOT on the t= timestamp.
 * In-memory is per-instance (serverless); the DB-level idempotency of the
 * handlers below (updateMany by transactionId) is the real guard.
 */
const stripeEventIds = new Set<string>();
const STRIPE_EVENT_TTL_MS = 15 * 60 * 1000; // 15 min retention

function pruneStripeEventIds() {
  if (stripeEventIds.size > 20000) {
    const arr = Array.from(stripeEventIds);
    stripeEventIds.clear();
    for (let i = Math.floor(arr.length / 2); i < arr.length; i++) {
      stripeEventIds.add(arr[i]);
    }
  }
}

function isStripeEventSeen(eventId: string): boolean {
  if (stripeEventIds.has(eventId)) return true;
  stripeEventIds.add(eventId);
  pruneStripeEventIds();
  return false;
}

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    res.status(500).json({ success: false, error: 'Webhook secret not configured' });
    return;
  }

  let event: any;
  try {
    const stripe = await getStripe();
    // constructEvent validates the signature AND the timestamp tolerance natively.
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    res.status(400).json({ success: false, error: `Webhook error: ${err.message}` });
    return;
  }

  // Replay protection: idempotent on event.id. A re-delivered event is a
  // no-op (200) — returning an error would make Stripe retry forever.
  if (isStripeEventSeen(event.id)) {
    res.json({ received: true, duplicate: true });
    return;
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;

      if (orderId) {
        // Update payment status
        await prisma.payment.updateMany({
          where: { transactionId: paymentIntent.id },
          data: { status: 'COMPLETED' },
        });

        // Payment confirmed — the order becomes visible to the admin
        // (PENDING). Acceptance (CONFIRMED) is a staff decision, not
        // something the payment webhook should make.
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'PENDING' },
        });
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      await prisma.payment.updateMany({
        where: { transactionId: paymentIntent.id },
        data: { status: 'FAILED' },
      });
      break;
    }

    case 'charge.refunded': {
      // Mark the payment REFUNDED (webhook is the trusted source)
      const charge = event.data.object as { payment_intent?: string };
      if (charge.payment_intent) {
        await prisma.payment.updateMany({
          where: { transactionId: charge.payment_intent },
          data: { status: 'REFUNDED' },
        });
      }
      break;
    }

    case 'checkout.session.completed': {
      // Stripe Checkout (hosted) finished. payment_intent.succeeded also
      // fires for the same flow, but the session event lets us mark the
      // Payment row (whose transactionId is the session.id) as completed
      // and gives us a second chance to flip Order.status.
      const session = event.data.object as { id: string; payment_status?: string; metadata?: { orderId?: string } };
      const orderId = session.metadata?.orderId;
      if (orderId && session.payment_status === 'paid') {
        await prisma.payment.updateMany({
          where: { transactionId: session.id },
          data: { status: 'COMPLETED' },
        });
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'PENDING' },
        });
      }
      break;
    }
  }

  res.json({ received: true });
}

export async function markCashPayment(req: Request, res: Response): Promise<void> {
  const parsed = markCashPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }
  const { orderId } = parsed.data;

  if (!orderId) {
    res.status(400).json({ success: false, error: 'orderId is required' });
    return;
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      method: 'CASH',
      status: 'PENDING',
      amount: order.total,
    },
  });

  res.status(201).json({ success: true, data: payment });
}

// ── Refund (MANAGER+) — P15.6 ───────────────────────────────────────────────

const refundSchema = z.object({
  paymentId: z.string().min(1),
});

export async function refundPayment(req: Request, res: Response): Promise<void> {
  const parsed = refundSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'paymentId is required' });
    return;
  }
  const { paymentId } = parsed.data;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });
  if (!payment) {
    res.status(404).json({ success: false, error: 'Payment not found' });
    return;
  }
  if (payment.status !== 'COMPLETED') {
    res.status(400).json({ success: false, error: 'Only completed payments can be refunded' });
    return;
  }
  if (payment.method !== 'STRIPE' || !payment.transactionId) {
    res.status(400).json({ success: false, error: 'Only Stripe payments with a transaction can be refunded' });
    return;
  }

  const stripe = await getStripe();
  // Refund the full amount captured (server-side, never client-declared)
  const refund = await stripe.refunds.create({
    payment_intent: payment.transactionId,
    amount: Math.round(payment.amount * 100),
  });

  if (refund.status === 'succeeded' || refund.status === 'pending') {
    // Optimistic update; the charge.refunded webhook is the final authority
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED' },
    });
    // Audit trail
    const refundingUser = (req.user as any) || {};
    await prisma.auditLog.create({
      data: {
        action: 'PAYMENT_REFUNDED',
        entity: 'Payment',
        entityId: payment.id,
        userId: refundingUser.id || 'system',
        userEmail: refundingUser.email || 'system',
        details: { refundId: refund.id, amount: payment.amount },
      },
    }).catch(() => {});
    res.json({ success: true, data: { refundId: refund.id, status: refund.status } });
    return;
  }

  res.status(400).json({ success: false, error: `Refund failed: ${refund.status}` });
}
