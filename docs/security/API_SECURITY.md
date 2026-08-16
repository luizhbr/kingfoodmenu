# King Food API Security Audit

**Project:** King Food  
**Base URL:** `/api` (Vercel serverless)  
**Framework:** Express 4.x / TypeScript / Prisma / PostgreSQL

---

## Endpoint Inventory

### Authentication (`/api/auth`)

| Method | Path | Auth | AuthZ | Validation | CSRF | Rate Limit | Risk |
|--------|------|------|-------|------------|------|------------|------|
| POST | `/staff/login` | None | None | Zod (email, password) | ✅ Skip (Bearer) | 100/15min | LOW |
| POST | `/staff/register` | Bearer | SUPER_ADMIN | Zod | ✅ Skip | 10/min | LOW |
| GET | `/captcha-status` | None | None | None | ✅ Skip (GET) | 300/min | INFO |
| POST | `/customer/register` | None | None | Zod | ✅ Skip | 100/15min | LOW |
| POST | `/customer/login` | None | None | Zod | ✅ Skip | 100/15min | LOW |
| GET | `/google` | None | None | Passport | ❌ N/A | 300/min | LOW |
| GET | `/google/callback` | None | None | Passport | ❌ N/A | 300/min | LOW |
| GET | `/facebook` | None | None | Passport | ❌ N/A | 300/min | LOW |
| GET | `/facebook/callback` | None | None | Passport | ❌ N/A | 300/min | LOW |
| POST | `/push-token` | Bearer | Customer/Staff | None | ✅ Skip | 300/min | LOW |
| GET | `/me` | Bearer | Any | None | ✅ Skip | 300/min | LOW |

**Findings:**
- All auth endpoints use Zod validation ✅
- Rate limiting appropriate ✅
- CSRF correctly skipped for Bearer auth ✅
- Social login uses Passport (standard) ✅
- CAPTCHA adaptive gate on login/register ✅

---

### Orders (`/api/orders`)

| Method | Path | Auth | AuthZ | Validation | CSRF | Rate Limit | Risk |
|--------|------|------|-------|------------|------|------------|------|
| POST | `/` | Optional | Customer/Guest | Zod (createOrderSchema) | ⚠️ Skip (guest) | 300/min | MEDIUM |
| GET | `/my-orders` | Bearer | Customer (own) | Query params | ✅ Skip | 300/min | LOW |
| GET | `/` | Bearer | Staff | Query params | ✅ Skip | 300/min | LOW |
| GET | `/:id` | Optional | Owner/Staff | None | ⚠️ Skip (guest) | 300/min | MEDIUM |
| PATCH | `/:id/status` | Bearer | Staff | Zod (status enum) | ⚠️ Skip (staff) | 300/min | LOW |

**Critical Findings:**

1. **POST `/api/orders` — CSRF Skip for Guest Checkout (CONFIRMED)**
   - Location: `app.ts` line ~140
   - Code: `if (req.path === '/api/orders' && req.method === 'POST') return next();`
   - **Risk:** Guest checkout has no Bearer token, no cookie auth — CSRF cannot be enforced
   - **Mitigation:** Double-submit pattern impossible without session; UUID unguessable; idempotency key required
   - **Status:** ACCEPTED RISK — documented exception

2. **GET `/api/orders/:id` — OptionalAuth + Guest UUID Access (CONFIRMED)**
   - Controller: `order.controller.ts` `getOrder()`
   - Allows unauthenticated access if UUID known
   - **Risk:** UUID enumeration (cuid = ~25 chars, cryptographically random)
   - **Mitigation:** UUID v7/cuid — 128-bit entropy, unguessable
   - **Status:** ACCEPTED RISK — but consider email verification for guest lookup

3. **IDOR Protection (CONFIRMED GOOD)**
   - `requireOwnership('order')` middleware on customer endpoints
   - Staff bypass via role check in middleware
   - Controller double-checks: `if (user.type !== 'staff' && order.customerId !== user.id) 403`

4. **Server-Side Pricing (CONFIRMED GOOD)**
   - `createOrder()`: unit prices from `menuItem.price` in DB
   - Client sends only `menuItemId` + `quantity`
   - Options price modifiers from DB

5. **Idempotency (CONFIRMED GOOD)**
   - Client-generated `idempotencyKey` (UUID)
   - Unique constraint on `Order.idempotencyKey`
   - Returns existing order on duplicate key

---

### Payments (`/api/payments`)

| Method | Path | Auth | AuthZ | Validation | CSRF | Rate Limit | Risk |
|--------|------|------|-------|------------|------|------------|------|
| POST | `/webhook` | None (HMAC) | Stripe | Raw body | ❌ Skip | 300/min | HIGH |
| POST | `/create-intent` | Optional | Owner/Staff | Zod | ✅ Skip | 300/min | LOW |
| POST | `/create-checkout-session` | Optional | Owner/Staff | Zod | ✅ Skip | 300/min | LOW |
| POST | `/cash` | Bearer | Staff | Zod | ✅ Skip | 300/min | LOW |
| POST | `/refund` | Bearer | MANAGER+ | Zod | ✅ Skip | 300/min | LOW |
| POST | `/paypal/create` | Optional | Owner/Staff | Zod | ✅ Skip | 300/min | LOW |
| POST | `/paypal/capture` | Optional | Owner/Staff | Zod | ✅ Skip | 300/min | LOW |

**Critical Findings:**

1. **Stripe Webhook — HMAC Verification (CONFIRMED GOOD)**
   - `app.ts`: `express.raw({ type: 'application/json' })` before webhook
   - `stripe.webhooks.constructEvent(req.body, sig, secret)`
   - Handles `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `checkout.session.completed`

2. **Payment Ownership Check (CONFIRMED GOOD)**
   - `isOrderOwner()` function in `payment.controller.ts`
   - Checks: customer owns order OR staff OR guest knows email
   - Applied to ALL payment endpoints

3. **Server-Side Amount (CONFIRMED GOOD)**
   - Amount from `order.total` in DB
   - Line items built from `order.items` with `unitPrice` from DB
   - Client never sends amount

4. **Idempotency (CONFIRMED GOOD)**
   - Reuses existing `PENDING` PaymentIntent for same order
   - Prevents duplicate charges on retry

5. **Refund Authorization (CONFIRMED GOOD)**
   - Requires `SUPER_ADMIN` or `MANAGER` role
   - Only Stripe payments with transactionId
   - Full amount refunded (server-side)
   - `charge.refunded` webhook is final authority

6. **PayPal Capture (LIKELY RISK)**
   - No PayPal webhook verification implemented
   - Relies on client-initiated capture
   - **Recommendation:** Implement PayPal webhook for `PAYMENT.CAPTURE.COMPLETED`

---

### Customers (`/api/customer`)

| Method | Path | Auth | AuthZ | Validation | CSRF | Rate Limit | Risk |
|--------|------|------|-------|------------|------|------------|------|
| GET | `/profile` | Bearer | Customer (self) | None | ✅ Skip | 300/min | LOW |
| PATCH | `/profile` | Bearer | Customer (self) | Zod | ✅ Skip | 300/min | LOW |
| GET | `/orders` | Bearer | Customer (self) | Query | ✅ Skip | 300/min | LOW |

**Findings:**
- JWT `customerId` used internally — never client-supplied ID ✅
- No IDOR possible — profile tied to JWT subject ✅

---

### Staff/Admin (`/api/staff`, `/api/dashboard`, `/api/menu`, `/api/settings`, `/api/reports`)

| Method | Path | Auth | AuthZ | Validation | CSRF | Rate Limit | Risk |
|--------|------|------|-------|------------|------|------------|------|
| GET | `/staff` | Bearer | SUPER_ADMIN/MANAGER | Query | ✅ Skip | 300/min | LOW |
| POST | `/staff/invite` | Bearer | SUPER_ADMIN | Zod | ✅ Skip | 300/min | LOW |
| PATCH | `/staff/:id` | Bearer | SUPER_ADMIN | Zod | ✅ Skip | 300/min | LOW |
| DELETE | `/staff/:id` | Bearer | SUPER_ADMIN | Zod | ✅ Skip | 300/min | LOW |
| * | `/dashboard/*` | Bearer | Staff | Various | ✅ Skip | 300/min | LOW |
| * | `/menu/*` | Bearer | Staff | Various | ✅ Skip | 300/min | LOW |
| * | `/settings/*` | Bearer | Staff | Various | ✅ Skip | 300/min | LOW |
| * | `/reports/*` | Bearer | Staff | Various | ✅ Skip | 300/min | LOW |

**Findings:**
- Role hierarchy enforced: `SUPER_ADMIN` > `MANAGER` > `STAFF` > `DRIVER` ✅
- `requireRole()` middleware used correctly ✅
- Staff registration requires `SUPER_ADMIN` ✅
- AuditLog on mutations ✅

---

### Driver (`/api/driver`)

| Method | Path | Auth | AuthZ | Validation | CSRF | Rate Limit | Risk |
|--------|------|------|-------|------------|------|------------|------|
| GET | `/profile` | Bearer | DRIVER | None | ✅ Skip | 300/min | LOW |
| GET | `/orders` | Bearer | DRIVER | Query | ✅ Skip | 300/min | LOW |
| POST | `/orders/:id/accept` | Bearer | DRIVER | None | ✅ Skip | 300/min | LOW |
| POST | `/orders/:id/pickup` | Bearer | DRIVER | None | ✅ Skip | 300/min | LOW |
| POST | `/orders/:id/out-for-delivery` | Bearer | DRIVER | None | ✅ Skip | 300/min | LOW |
| POST | `/orders/:id/delivered` | Bearer | DRIVER | None | ✅ Skip | 300/min | LOW |

**Findings:**
- Separate `requireDriver` middleware (role === DRIVER) ✅
- Driver can only access assigned orders (controller logic) ✅

---

### Webhooks (`/api/webhooks`, `/api/automation-rules/webhook`)

| Method | Path | Auth | AuthZ | Validation | CSRF | Rate Limit | Risk |
|--------|------|------|-------|------------|------|------------|------|
| POST | `/webhooks/n8n` | HMAC | N8N | JSON | ❌ Skip | 300/min | MEDIUM |
| POST | `/automation-rules/webhook` | HMAC | WhatsApp | JSON | ❌ Skip | 300/min | MEDIUM |

**Findings:**
1. **N8N Webhook — HMAC Verification (CONFIRMED GOOD)**
   - `verifySignature()` in `webhook.routes.ts`
   - Timing-safe comparison ✅
   - Dev mode fallback: `if (!WEBHOOK_SECRET) return true` ⚠️

2. **WhatsApp Webhook — Reuses Middleware (CONFIRMED GOOD)**
   - `verifyWebhookSignature` middleware in `app.ts`
   - Same HMAC-SHA256 + timing-safe

3. **Replay Protection (MISSING — LIKELY RISK)**
   - No timestamp/nonce validation
   - Captured webhooks can be replayed
   - **Impact:** Order status manipulation, attribution pollution

---

### Print (`/api/print`, `/api/admin/print/templates`)

| Method | Path | Auth | AuthZ | Validation | CSRF | Rate Limit | Risk |
|--------|------|------|-------|------------|------|------------|------|
| * | `/print/*` | Bearer/Device | Staff/Device | Various | ⚠️ Skip (device) | 300/min | LOW |
| * | `/admin/print/templates` | Bearer | Staff | Various | ✅ Skip | 300/min | LOW |

**Findings:**
- Print agent uses `Device <token>` header (not Bearer) ✅
- CSRF skipped for `/api/print/agent/*` and Device auth ✅
- Pairing code flow: 10-min expiry, one-time use ✅

---

## IDOR/BOLA Testing Matrix

| Attacker | Target | Endpoint | Expected | Actual |
|----------|--------|----------|----------|--------|
| Guest A | Order A | GET `/api/orders/:idA` | 200 | 200 ✅ |
| Guest A | Order B | GET `/api/orders/:idB` | 404/403 | 200 ⚠️ (UUID only) |
| Customer A | Order A | GET `/api/orders/:idA` | 200 | 200 ✅ |
| Customer A | Order B | GET `/api/orders/:idB` | 403 | 403 ✅ |
| Customer A | Order B | GET `/api/orders/my-orders` | 403 | 403 ✅ (scoped) |
| Staff | Order A | GET `/api/orders/:idA` | 200 | 200 ✅ |
| Staff | Order B | GET `/api/orders/:idB` | 200 | 200 ✅ |
| Staff | Order A | PATCH `/api/orders/:idA/status` | 200 | 200 ✅ |
| Customer A | Order A | POST `/api/payments/create-intent` | 200 | 200 ✅ |
| Customer A | Order B | POST `/api/payments/create-intent` | 403 | 403 ✅ |

**Conclusion:** IDOR protection works for authenticated users. Guest order access by UUID is the only gap.

---

## Security Header Audit

| Header | Configured | Value | Notes |
|--------|------------|-------|-------|
| Content-Security-Policy | ✅ | `default-src 'self'; script-src 'self' 'unsafe-inline'; ...` | unsafe-inline present ⚠️ |
| Strict-Transport-Security | ✅ | `max-age=31536000; includeSubDomains; preload` (prod only) | Good |
| X-Content-Type-Options | ✅ | `nosniff` | Helmet default |
| Referrer-Policy | ✅ | `strict-origin-when-cross-origin` | Good |
| X-Frame-Options | ✅ | `SAMEORIGIN` | Helmet default |
| Permissions-Policy | ❌ | Not set | Consider adding |

---

## CORS Configuration

```typescript
// app.ts
cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
})
```

**Findings:**
- Explicit origins (not wildcard) ✅
- `credentials: true` for cookie-based CSRF ✅
- Production origins must be set in `CORS_ORIGINS` env var ✅

---

## Rate Limiting Summary

| Tier | Window | Max | Endpoints |
|------|--------|-----|-----------|
| General | 1 min | 300 | `/api/*` |
| Auth | 15 min | 100 | `/api/auth/*` |
| Strict | 1 min | 10 | `/api/auth/staff/register`, `/api/auth/staff/login` |

**Findings:**
- Tiered appropriately ✅
- No per-IP/user bucket for auth (uses express-rate-limit default) ⚠️
- No distributed rate limit (per-instance in serverless) ⚠️

---

## Error Handling

```typescript
// app.ts error handler
app.use((err, _req, res, _next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
});
```

**Findings:**
- Production: generic message, no stack trace ✅
- Development: full error for debugging ✅
- Log sanitization middleware runs before logger ✅
- Pino structured logging ✅

---

## Summary

| Category | Status | Critical Issues |
|----------|--------|-----------------|
| Authentication | GOOD | No refresh token rotation |
| Authorization | GOOD | Guest UUID access |
| Input Validation | GOOD | None |
| CSRF | GOOD | Guest checkout exception (documented) |
| Payments | GOOD | PayPal webhook missing |
| Rate Limiting | GOOD | Per-instance only |
| Headers | GOOD | CSP unsafe-inline |
| CORS | GOOD | None |
| Error Handling | GOOD | None |
| Webhooks | PARTIAL | Replay protection missing |

**Overall API Security Rating: B+** — Strong fundamentals, few residual risks
