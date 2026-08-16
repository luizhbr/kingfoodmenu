# King Food Payment Security Audit

**Project:** King Food  
**Payment Providers:** Stripe (primary), PayPal (secondary), Cash (staff)

---

## Payment Flow Architecture

```
Customer/Guest
    │
    ├─► Cash on Delivery
    │       └─► Staff marks "CASH" payment (POST /api/payments/cash)
    │
    ├─► Stripe PaymentIntent (Mobile/SPA)
    │       ├─► POST /api/payments/create-intent → clientSecret
    │       ├─► Client confirms via Stripe.js / Flutter stripe
    │       └─► Stripe webhook: payment_intent.succeeded → CONFIRMED
    │
    ├─► Stripe Checkout Session (Web)
    │       ├─► POST /api/payments/create-checkout-session → session.url
    │       ├─► Redirect to Stripe hosted page
    │       ├─► Success → /order/:id?paid=true
    │       └─► Webhook: checkout.session.completed + payment_intent.succeeded
    │
    └─► PayPal
            ├─► POST /api/payments/paypal/create → approvalUrl
            ├─► Redirect to PayPal
            ├─► POST /api/payments/paypal/capture → COMPLETED
            └─► (No webhook — client-driven capture)
```

---

## Stripe Integration Security

### Configuration (from `lib/stripe.ts`)

```typescript
// Fail-fast in production
if (isProd) return null; // caller must fail closed

// Key resolution priority:
1. process.env.STRIPE_SECRET_KEY
2. SiteSettings.paymentSettings.stripeSecretKey (DB)
3. Dev placeholder (sk_tes...only) — NEVER reaches prod
```

**Good Practices:**
- Lazy initialization via Proxy — import never crashes ✅
- API version pinned: `2026-01-28.clover` ✅
- Key from DB allows runtime rotation without redeploy ✅

### PaymentIntent Creation (from `payment.controller.ts`)

**Server-Side Amount:**
```typescript
amount: Math.round(order.total * 100), // cents from DB
currency: 'usd', // Fixed for Columbus, Ohio
```

**Idempotency:**
```typescript
// Reuse existing PENDING PaymentIntent
const activePayment = await findActivePayment(orderId);
if (activePayment?.transactionId) {
  const intent = await stripe.paymentIntents.retrieve(activePayment.transactionId);
  if (intent.status === 'requires_payment_method') return reused;
}
```

**Metadata:**
```typescript
metadata: {
  orderId: order.id,
  orderNumber: order.orderNumber,
  customerName: order.customer?.name ?? order.guestName ?? '',
}
```

**Receipt Email:**
```typescript
receipt_email: order.customer?.email ?? order.guestEmail ?? undefined
```

### Webhook Handling (from `payment.controller.ts`)

```typescript
// Signature verification
const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

// Events handled:
- payment_intent.succeeded → Payment COMPLETED, Order CONFIRMED
- payment_intent.payment_failed → Payment FAILED
- charge.refunded → Payment REFUNDED
- checkout.session.completed → Belt-and-braces for Checkout flow
```

**Security Controls:**
- Raw body parsing: `express.raw({ type: 'application/json' })` ✅
- HMAC-SHA256 verification ✅
- Timing-safe comparison (Stripe SDK) ✅
- Idempotent: `updateMany` on transactionId ✅

### Refunds (MANAGER+ only)

```typescript
// Server-side amount (never client-declared)
const refund = await stripe.refunds.create({
  payment_intent: payment.transactionId,
  amount: Math.round(payment.amount * 100),
});

// Optimistic update; charge.refunded webhook is final authority
```

---

## PayPal Integration Security

### Current Implementation Gaps

1. **No Webhook Verification** ⚠️
   - Only client-initiated capture (`capturePayPalOrder`)
   - No `PAYMENT.CAPTURE.COMPLETED` webhook handler
   - Risk: Client could skip capture, order stays PENDING

2. **Amount Trust** ⚠️
   - Capture uses `order.total` from DB (server-side) ✅
   - But no secondary verification via webhook

3. **Refund Not Implemented** for PayPal

### Recommended: Add PayPal Webhook

```typescript
// Required events:
// - PAYMENT.CAPTURE.COMPLETED
// - PAYMENT.CAPTURE.DENIED
// - PAYMENT.CAPTURE.REFUNDED
// Verification: PayPal webhook signature (transmission_id, cert_url, auth_algo)
```

---

## Cash Payments

### Implementation (from `payment.controller.ts`)

```typescript
// Staff only (requireStaff)
const payment = await prisma.payment.create({
  data: { orderId: order.id, method: 'CASH', status: 'PENDING', amount: order.total }
});
```

**Risks:**
- No secondary authorization (single staff can mark paid)
- No audit trail beyond AuditLog
- Cash handling procedures not enforced by system

**Recommendations:**
- Require MANAGER+ for cash payment (currently STAFF)
- Add cash drawer reconciliation endpoint
- Print cash receipt automatically

---

## Payment Security Checklist (OWASP API Security Top 10)

| # | Category | King Food Status | Evidence |
|---|----------|------------------|----------|
| API1 | Broken Object Level Authorization | ✅ MITIGATED | `isOrderOwner()` on all payment endpoints |
| API2 | Broken Authentication | ✅ MITIGATED | JWT + adaptive CAPTCHA |
| API3 | Broken Object Property Level Authorization | ✅ MITIGATED | Zod schemas, server-side amount |
| API4 | Unrestricted Resource Consumption | ⚠️ PARTIAL | Rate limited, but no per-customer payment limit |
| API5 | Broken Function Level Authorization | ✅ MITIGATED | Role checks (MANAGER+ for refund) |
| API6 | Unrestricted Access to Sensitive Business Flows | ✅ MITIGATED | Idempotency, webhook verification |
| API7 | Server Side Request Forgery | ✅ MITIGATED | No outbound requests from payment flow |
| API8 | Security Misconfiguration | ✅ MITIGATED | Helmet, CSP, fail-fast secrets |
| API9 | Improper Inventory Management | ⚠️ PARTIAL | Stripe/PayPal versions pinned, but no SBOM |
| API10 | Unsafe Consumption of APIs | ✅ MITIGATED | Stripe SDK, PayPal SDK, no raw HTTP |

---

## PCI DSS Considerations

**SAQ A Eligibility:**
- ✅ No card data touches King Food servers
- ✅ Stripe Elements/Checkout — card fields hosted by Stripe
- ✅ PayPal — card fields hosted by PayPal
- ✅ No card storage, processing, or transmission

**Required for SAQ A:**
- ✅ Formal security policy
- ✅ Unique IDs for staff with payment access
- ✅ Encrypted transmission (TLS 1.2+)
- ✅ Regular vulnerability scans
- ⚠️ Annual penetration test (recommended)
- ⚠️ Incident response plan documented

---

## Payment Idempotency & Race Conditions

### Order Creation → Payment
- Client generates `idempotencyKey` (UUID)
- `Order.idempotencyKey` unique constraint
- Duplicate key returns existing order (200, duplicate: true)

### Payment Creation
- `findActivePayment()` checks for PENDING Stripe PaymentIntent
- Reuses if `requires_payment_method`
- Prevents duplicate PaymentIntents on retry

### Webhook Processing
- `updateMany` on `transactionId` (idempotent)
- `payment_intent.succeeded` → CONFIRMED
- Multiple deliveries of same event = same result

### Cashback Debit (from `order.controller.ts`)
```typescript
// Atomic DEBIT with FOR UPDATE via idempotencyKey
await debitCashback(customerId, cashbackUsed, `ck-${idempotencyKey}`);
// On order creation failure:
await reverseDebit(customerId, `ck-${idempotencyKey}`);
// On success, link to real orderId:
await linkDebitToOrder(customerId, `ck-${idempotencyKey}`, order.id);
```

**Race Condition Protection:**
- Unique constraint on `[type, referenceId]` in `CashbackTransaction`
- `debitCashback` uses row lock (implied by Prisma transaction)

---

## Fraud Prevention

### Current Controls
- Adaptive CAPTCHA on login/register (prevents account takeover)
- Rate limiting on auth endpoints
- Stripe Radar (automatic via Stripe)
- `isOrderOwner()` prevents payment on others' orders
- Server-side amount validation

### Recommended Enhancements
1. **Velocity checks** — max orders per customer/hour
2. **Address verification** — AVS via Stripe (already in metadata)
3. **3D Secure** — Stripe automatic via `automatic_payment_methods`
4. **Blocklist** — email/IP blocklist for repeat fraud
5. **Manual review queue** — high-value orders, new customers

---

## Testing Checklist

- [ ] Stripe webhook with invalid signature → 400
- [ ] Stripe webhook replay → idempotent (no double confirm)
- [ ] PaymentIntent amount manipulation → rejected (server-side)
- [ ] PayPal capture without approval → 400
- [ ] Refund by STAFF → 403
- [ ] Refund by MANAGER → 200
- [ ] Cash payment by STAFF → 200 (review if should be MANAGER+)
- [ ] Guest order with Stripe → webhook confirms
- [ ] Duplicate idempotencyKey → returns existing order
- [ ] Concurrent cashback debit → only one succeeds
- [ ] Stripe test mode in production → blocked (env check)
