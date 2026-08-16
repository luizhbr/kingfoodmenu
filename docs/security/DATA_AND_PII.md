# King Food Data & PII Inventory

**Project:** King Food  
**Classification:** CONFIDENTIAL

---

## Data Inventory by Model (Prisma Schema)

### Customer Data (`Customer` model)

| Field | Type | Sensitivity | Retention | Access Control |
|-------|------|-------------|-----------|----------------|
| `id` | String (cuid) | INTERNAL | Permanent | JWT subject |
| `email` | String @unique | CONFIDENTIAL | Permanent | Owner + Staff |
| `password` | String? (bcrypt) | RESTRICTED | Permanent | Never returned |
| `name` | String | CONFIDENTIAL | Permanent | Owner + Staff |
| `phone` | String? | CONFIDENTIAL | Permanent | Owner + Staff |
| `isGuest` | Boolean | INTERNAL | Permanent | Internal |
| `expoPushToken` | String? | CONFIDENTIAL | Session | Owner only |
| `createdAt` | DateTime | INTERNAL | Permanent | Staff |
| `updatedAt` | DateTime | INTERNAL | Permanent | Staff |
| `groupId` | String? | INTERNAL | Permanent | Staff |
| `loyaltyPoints` | Int | CONFIDENTIAL | Permanent | Owner + Staff |

**Related Models (Customer-owned):**
- `Address[]` — Delivery addresses (PII: line1, line2, city, postalCode, lat/lng)
- `Order[]` — Order history (CONFIDENTIAL)
- `Reservation[]` — Booking history (CONFIDENTIAL)
- `Review[]` — Reviews (PUBLIC when approved)
- `LoyaltyTransaction[]` — Points ledger (CONFIDENTIAL)
- `CookieConsent[]` — GDPR consent (CONFIDENTIAL)
- `Attribution` — Marketing attribution (INTERNAL)
- `TrackingEvent[]` — Analytics (INTERNAL)
- `Referral[]` — Referral codes (INTERNAL)
- `CouponUsage[]` — Coupon redemptions (CONFIDENTIAL)
- `CashbackWallet` — Balance (CONFIDENTIAL)
- `CashbackTransaction[]` — Ledger (RESTRICTED)

---

### Staff/Admin Data (`User` model)

| Field | Type | Sensitivity | Retention | Access Control |
|-------|------|-------------|-----------|----------------|
| `id` | String (cuid) | INTERNAL | Permanent | JWT subject |
| `email` | String @unique | CONFIDENTIAL | Permanent | SUPER_ADMIN/MANAGER |
| `password` | String (bcrypt) | RESTRICTED | Permanent | Never returned |
| `name` | String | CONFIDENTIAL | Permanent | Staff |
| `role` | Role enum | INTERNAL | Permanent | SUPER_ADMIN/MANAGER |
| `phone` | String? | CONFIDENTIAL | Permanent | SUPER_ADMIN/MANAGER |
| `avatar` | String? | PUBLIC | Permanent | Staff |
| `isActive` | Boolean | INTERNAL | Permanent | SUPER_ADMIN/MANAGER |
| `locationId` | String? | INTERNAL | Permanent | Staff |

**Related Models:**
- `assignedOrders` — Order[] (CONFIDENTIAL)
- `mediaAssets` — MediaAsset[] (INTERNAL)
- `printJobs` — PrintJob[] (INTERNAL)

---

### Order Data (`Order` model)

| Field | Type | Sensitivity | Retention | Access Control |
|-------|------|-------------|-----------|----------------|
| `id` | String (cuid) | INTERNAL | Permanent | Owner + Staff |
| `orderNumber` | String @unique | INTERNAL | Permanent | Owner + Staff |
| `idempotencyKey` | String? @unique | INTERNAL | Permanent | Internal |
| `customerId` | String? | CONFIDENTIAL | Permanent | Owner + Staff |
| `locationId` | String | INTERNAL | Permanent | Staff |
| `addressId` | String? | CONFIDENTIAL | Permanent | Owner + Staff |
| `orderType` | OrderType | INTERNAL | Permanent | Owner + Staff |
| `status` | OrderStatus | INTERNAL | Permanent | Owner + Staff + Driver* |
| `subtotal` | Float | CONFIDENTIAL | Permanent | Owner + Staff |
| `deliveryFee` | Float | CONFIDENTIAL | Permanent | Owner + Staff |
| `tax` | Float | CONFIDENTIAL | Permanent | Owner + Staff |
| `discount` | Float | CONFIDENTIAL | Permanent | Owner + Staff |
| `tip` | Float | CONFIDENTIAL | Permanent | Owner + Staff |
| `total` | Float | CONFIDENTIAL | Permanent | Owner + Staff |
| `scheduledAt` | DateTime? | INTERNAL | Permanent | Owner + Staff |
| `comment` | String? | CONFIDENTIAL | Permanent | Owner + Staff |
| `couponId` | String? | INTERNAL | Permanent | Owner + Staff |
| `assignedToId` | String? | INTERNAL | Permanent | Staff + Driver* |
| `guestName` | String? | CONFIDENTIAL | Permanent | Guest + Staff |
| `guestEmail` | String? | CONFIDENTIAL | Permanent | Guest + Staff |
| `guestPhone` | String? | CONFIDENTIAL | Permanent | Guest + Staff |
| `deliveryLine1` | String? | CONFIDENTIAL | Permanent | Owner + Staff |
| `deliveryLine2` | String? | CONFIDENTIAL | Permanent | Owner + Staff |
| `deliveryCity` | String? | CONFIDENTIAL | Permanent | Owner + Staff |
| `deliveryState` | String? | CONFIDENTIAL | Permanent | Owner + Staff |
| `deliveryPostalCode` | String? | CONFIDENTIAL | Permanent | Owner + Staff |
| `deliveryCountry` | String? | CONFIDENTIAL | Permanent | Owner + Staff |
| `deliveryLat` | Float? | CONFIDENTIAL | Permanent | Owner + Staff |
| `deliveryLng` | Float? | CONFIDENTIAL | Permanent | Owner + Staff |
| `deliveryPlaceId` | String? | CONFIDENTIAL | Permanent | Owner + Staff |
| `deliveryFormattedAddress` | String? | CONFIDENTIAL | Permanent | Owner + Staff |

*Driver sees assigned orders only

**Related Models:**
- `items` — OrderItem[] (CONFIDENTIAL)
- `payments` — Payment[] (RESTRICTED)
- `reviews` — Review[] (PUBLIC when approved)
- `loyaltyTransactions` — LoyaltyTransaction[] (CONFIDENTIAL)
- `orderAttribution` — OrderAttribution (INTERNAL)
- `couponUsage` — CouponUsage (CONFIDENTIAL)
- `cashbackTransactions` — CashbackTransaction[] (RESTRICTED)
- `trackingEvents` — TrackingEvent[] (INTERNAL)
- `printJobs` — PrintJob[] (INTERNAL)

---

### Payment Data (`Payment` model)

| Field | Type | Sensitivity | Retention | Access Control |
|-------|------|-------------|-----------|----------------|
| `id` | String (cuid) | INTERNAL | Permanent | Staff |
| `orderId` | String | CONFIDENTIAL | Permanent | Owner + Staff |
| `method` | PaymentMethod | INTERNAL | Permanent | Staff |
| `status` | PaymentStatus | INTERNAL | Permanent | Owner + Staff |
| `amount` | Float | RESTRICTED | Permanent | Staff |
| `transactionId` | String? | RESTRICTED | Permanent | Staff (Stripe/PayPal ID) |
| `metadata` | Json? | RESTRICTED | Permanent | Staff |

**Critical:** `transactionId` contains Stripe PaymentIntent ID or PayPal Order ID — treat as secret.

---

### Address Data (`Address` model)

| Field | Type | Sensitivity | Retention | Access Control |
|-------|------|-------------|-----------|----------------|
| `id` | String (cuid) | INTERNAL | Permanent | Owner + Staff |
| `customerId` | String? | CONFIDENTIAL | Permanent | Owner + Staff |
| `label` | String? | CONFIDENTIAL | Permanent | Owner |
| `line1` | String | CONFIDENTIAL | Permanent | Owner + Staff |
| `line2` | String? | CONFIDENTIAL | Permanent | Owner + Staff |
| `city` | String | CONFIDENTIAL | Permanent | Owner + Staff |
| `state` | String? | CONFIDENTIAL | Permanent | Owner + Staff |
| `postalCode` | String | CONFIDENTIAL | Permanent | Owner + Staff |
| `country` | String | INTERNAL | Permanent | Owner + Staff |
| `placeId` | String? | CONFIDENTIAL | Permanent | Owner + Staff |
| `formattedAddress` | String? | CONFIDENTIAL | Permanent | Owner + Staff |
| `lat` | Float? | CONFIDENTIAL | Permanent | Owner + Staff |
| `lng` | Float? | CONFIDENTIAL | Permanent | Owner + Staff |
| `isDefault` | Boolean | INTERNAL | Permanent | Owner |

**Note:** Guest addresses stored with `customerId = null` — linked to order via `Order.addressId` and denormalized snapshot on Order.

---

### Authentication Tokens

| Token Type | Storage | Lifetime | Rotation | Revocation |
|------------|---------|----------|----------|------------|
| JWT Access Token | Client (memory/localStorage) | 7d (config: `JWT_EXPIRES_IN`) | None | None ⚠️ |
| JWT Refresh Token | N/A | N/A | N/A | N/A ⚠️ |
| Stripe PaymentIntent client_secret | Client (memory) | ~24h | Per payment | Auto on confirm |
| PayPal approval token | Client (memory) | Session | N/A | N/A |
| Print Agent device token | File (`~/.king-print/credentials.json`) | Until revoked | Manual | Admin UI |
| Print Agent pairing code | DB (`Printer.pairingCode`) | 10 min | One-time | Auto-expiry |
| N8N Webhook secret | Env (`WEBHOOK_SECRET`) | Until rotated | Manual | Redeploy |
| CAPTCHA secret | Env (`CAPTCHA_SECRET_KEY`) | Until rotated | Manual | Redeploy |

**Critical Gap:** No refresh token mechanism — long-lived access tokens only.

---

### Marketing/Attribution Data

| Model | Sensitivity | Contains |
|-------|-------------|----------|
| `Campaign` | INTERNAL | Budget, ad spend, partner info |
| `Partner` | CONFIDENTIAL | Contact info, commission rates |
| `TrackingEvent` | INTERNAL | Session ID, IP, user agent, UTM params |
| `Attribution` | CONFIDENTIAL | First/last touch per customer |
| `OrderAttribution` | INTERNAL | Per-order attribution |
| `QRCode` | INTERNAL | Scan counts, revenue |
| `Referral` | CONFIDENTIAL | Referrer/customer links, codes |
| `Store` | PUBLIC | Business info, social links |
| `Promotion` | INTERNAL | Discount rules, schedules |

---

## PII Exposure Audit

### API Endpoints Returning PII

| Endpoint | Fields Returned | Auth Required | Owner Check |
|----------|----------------|---------------|-------------|
| `GET /api/auth/me` | id, email, name, role/phone | Bearer | Self |
| `GET /api/customer/profile` | id, email, name, phone | Bearer | Self |
| `GET /api/orders/:id` | customer (name, email, phone), guest (name, email, phone), delivery address | Optional | Owner/Staff |
| `GET /api/orders/my-orders` | location, items (no PII) | Bearer | Self |
| `GET /api/customer/orders` | location, items (no PII) | Bearer | Self |
| `GET /api/loyalty/balance` | points | Bearer | Self |
| `GET /api/cashback/wallet` | balance | Bearer | Self |
| `GET /api/staff/:id` | id, email, name, role, phone, avatar | Bearer (MANAGER+) | Staff |
| `GET /api/driver/profile` | id, email, name, role, phone, avatar | Bearer (DRIVER) | Self |

**Finding:** No excessive PII exposure — all endpoints require authentication and enforce ownership.

---

### Log Sanitization (from `logSanitizer.ts`)

**Redacted Fields:**
- `password`, `passwordHash`, `confirmPassword`, `newPassword`
- `token`, `accessToken`, `refreshToken`, `clientSecret`
- `creditCard`, `cardNumber`, `cvv`, `expiryDate`
- `apiKey`, `secret`, `smtpPass`, `smtpPassword`
- `TWILIO_AUTH_TOKEN`, `STRIPE_SECRET_KEY`, `JWT_SECRET`, `WEBHOOK_SECRET`, `CSRF_SECRET`

**Applied:** Before `httpLogger` middleware — all JSON request bodies sanitized.

**Gap:** Response bodies not sanitized (could leak PII in error responses).

---

### Database Encryption

| Layer | Status |
|-------|--------|
| **Transit (TLS)** | ✅ Neon enforces SSL (`sslmode=require`) |
| **At Rest** | ❓ Neon managed — not verified |
| **Column-level** | ❌ No field encryption (passwords hashed only) |
| **Backup Encryption** | ❓ Neon managed |

---

### Data Retention & Deletion

| Data Type | Retention Policy | Deletion Mechanism |
|-----------|------------------|-------------------|
| Customer accounts | Indefinite | Manual (no GDPR endpoint) ⚠️ |
| Orders | Indefinite (business record) | Soft delete not implemented |
| Payments | Indefinite (financial record) | Cannot delete |
| Addresses | Indefinite | Cascade on customer delete |
| Sessions (JWT) | 7d expiry | Stateless |
| ApiMetric | Indefinite | No cleanup job ⚠️ |
| AuditLog | Indefinite | No cleanup job |
| TrackingEvent | Indefinite | No cleanup job |
| Print jobs | Indefinite | No cleanup job |

**Critical Gaps:**
1. No GDPR data export/delete endpoint (`/api/customer/profile` only reads/updates)
2. `ApiMetric` writes every request — unbounded growth
3. `AuditLog` — unbounded growth
4. No automated retention policies

---

### Third-Party Data Sharing

| Service | Data Shared | Purpose | Agreement |
|---------|-------------|---------|-----------|
| **Stripe** | Payment amount, customer email, metadata (orderId) | Payment processing | Stripe DPA |
| **PayPal** | Payment amount, order number | Payment processing | PayPal DPA |
| **Cloudflare Turnstile** | IP address, token | CAPTCHA verification | Cloudflare DPA |
| **Google OAuth** | Email, profile | Social login | Google DPA |
| **Facebook OAuth** | Email | Social login | Meta DPA |
| **WhatsApp (Twilio/Gupshup)** | Phone, message template | Order notifications | Vendor DPA |
| **Email (Nodemailer/SMTP)** | Customer email, order details | Confirmations | Vendor DPA |
| **Expo Push** | Push token | Notifications | Expo DPA |
| **Neon (PostgreSQL)** | All application data | Database hosting | Neon DPA |
| **Vercel** | Build logs, env vars, analytics | Hosting | Vercel DPA |

---

## Compliance Checklist

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **Data Minimization** | ✅ | Only necessary fields collected |
| **Purpose Limitation** | ✅ | Fields used for stated purpose |
| **Storage Limitation** | ⚠️ | No automated retention |
| **Accuracy** | ✅ | Customer can update profile |
| **Integrity/Confidentiality** | ✅ | TLS, bcrypt, JWT, sanitization |
| **Accountability** | ✅ | AuditLog for staff actions |
| **Lawful Basis** | ✅ | Consent (cookie), Contract (orders), Legitimate Interest (analytics) |
| **Data Subject Rights** | ⚠️ | Access/rectify via profile; no export/delete |
| **DPA with Processors** | ✅ | Major vendors have DPAs |
| **Breach Notification** | ❓ | No documented procedure |

---

## Recommendations

1. **P0:** Implement GDPR data export/delete endpoint
2. **P0:** Add `ApiMetric` retention/cleanup job
3. **P1:** Add response body sanitization for error logging
4. **P1:** Document breach notification procedure
5. **P2:** Consider column-level encryption for PII (address, phone)
6. **P2:** Add data processing agreement inventory
7. **P3:** Implement customer data portability (JSON export)
