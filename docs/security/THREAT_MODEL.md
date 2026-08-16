# King Food Threat Model

**Project:** King Food  
**Methodology:** STRIDE + MITRE ATT&CK mapping  
**Scope:** Storefront, Admin, Server API, Database, External Integrations

---

## Actors

| Actor | Description | Trust Level | Access |
|-------|-------------|-------------|--------|
| **Anonymous Internet Attacker** | External, no credentials | UNTRUSTED | Public API endpoints, static assets |
| **Malicious Guest** | Places orders without account | LOW | `/api/orders` POST, `/api/orders/:id` GET |
| **Malicious Customer** | Registered account, valid JWT | MEDIUM | Own orders, profile, loyalty, addresses |
| **Compromised Customer Account** | Stolen credentials/token | MEDIUM | Same as customer + token replay |
| **Malicious Staff** | Valid staff JWT, role STAFF/MANAGER | HIGH | All orders, menu, locations, dashboard |
| **Compromised Staff Account** | Stolen staff credentials | HIGH | Same as staff + privilege escalation |
| **Compromised Admin Account** | SUPER_ADMIN credentials | CRITICAL | Full system, user management, settings |
| **Automated Bot** | Credential stuffing, scraping | UNTRUSTED | Auth endpoints, menu, checkout |
| **Third-Party Dependency Attacker** | Compromised npm package | SUPPLY CHAIN | Build-time, runtime if RCE |

---

## Assets & Impact

| Asset | Classification | CIA Impact | Threat Scenarios |
|-------|----------------|------------|------------------|
| Customer PII (name, email, phone, address) | CONFIDENTIAL | H/H/M | IDOR, auth bypass, DB breach |
| Order history & details | CONFIDENTIAL | H/H/M | IDOR, unauthorized access |
| Password hashes | RESTRICTED | H/H/H | DB breach, weak hashing |
| JWTs / session tokens | RESTRICTED | H/H/H | Token theft, replay, forgery |
| Stripe payment intents / webhooks | RESTRICTED | H/H/H | Payment manipulation, refund fraud |
| Admin/staff credentials | SECRET | H/H/H | Privilege escalation, account takeover |
| Database (Neon PostgreSQL) | SECRET | H/H/H | SQL injection, misconfig, backup leak |
| Environment variables | SECRET | H/H/H | Vercel exposure, build logs, repo leak |
| Print agent credentials | CONFIDENTIAL | M/M/L | Device theft, credential reuse |

---

## Attack Surfaces

### 1. Authentication Endpoints
```
/api/auth/staff/login
/api/auth/staff/register
/api/auth/customer/login
/api/auth/customer/register
/api/auth/google / /callback
/api/auth/facebook / /callback
/api/auth/me
```

**Threats:**
- **Spoofing:** Credential stuffing, password spraying → **MITRE: T1110**
- **Tampering:** JWT algorithm confusion, weak secret → **MITRE: T1606**
- **Repudiation:** No login audit trail for customers → **MITRE: T1562**
- **Info Disclosure:** User enumeration via timing/errors → **MITRE: T1590**
- **DoS:** Rate limit bypass, CAPTCHA farm → **MITRE: T1499**

**Controls in Place:**
- bcrypt cost 12 ✅
- Adaptive CAPTCHA (fail-closed) ✅
- Tiered rate limiting ✅
- Generic error messages ✅
- JWT secret validation (fail-fast in prod) ✅

**Gaps:**
- No refresh token rotation ⚠️
- No token revocation list ⚠️
- In-memory CAPTCHA store (not shared) ⚠️
- No MFA ⚠️

---

### 2. Order Management
```
/api/orders (POST - guest/customer)
/api/orders/:id (GET)
/api/orders/my-orders (GET - customer)
/api/orders (GET - staff)
/api/orders/:id/status (PATCH - staff)
```

**Threats:**
- **Spoofing:** Guest A accesses Guest B's order via UUID guess → **MITRE: T1589**
- **Tampering:** Customer modifies order after placement → **MITRE: T1565**
- **Repudiation:** No immutable order log for guests → **MITRE: T1562**
- **Info Disclosure:** Order PII exposed to unauthorized users → **MITRE: T1590**
- **Elevation:** Customer accesses staff order list → **MITRE: T1068**

**Controls in Place:**
- UUIDv7 (cuid) — unguessable ✅
- IDOR middleware (requireOwnership) ✅
- Server-side pricing (no client price trust) ✅
- Idempotency keys prevent duplicates ✅
- Guest orders require email for lookup ✅
- Staff endpoints require `requireStaff` ✅

**Gaps:**
- Guest order access by UUID only (no 2FA) ⚠️
- No order modification audit trail for guests ⚠️
- Status change emits event — potential race with auto-print ⚠️

---

### 3. Payment Processing
```
/api/payments/create-intent
/api/payments/create-checkout-session
/api/payments/webhook (Stripe)
/api/payments/paypal/create
/api/payments/paypal/capture
/api/payments/cash (staff)
/api/payments/refund (MANAGER+)
```

**Threats:**
- **Spoofing:** Fake webhook triggers order confirmation → **MITRE: T1190**
- **Tampering:** Client modifies amount/currency → **MITRE: T1565**
- **Repudiation:** Payment recorded but not verified → **MITRE: T1562**
- **Info Disclosure:** Payment intent client_secret leakage → **MITRE: T1552**
- **Elevation:** Customer initiates refund → **MITRE: T1068**
- **Fraud:** Stripe test keys in production → **MITRE: T1650**

**Controls in Place:**
- Stripe webhook HMAC-SHA256 + timing-safe compare ✅
- Server-side amount calculation (order.total from DB) ✅
- Idempotency via existing PENDING PaymentIntent reuse ✅
- `isOrderOwner` check on all payment endpoints ✅
- Refund requires MANAGER+ role ✅
- `charge.refunded` webhook is final authority ✅

**Gaps:**
- PayPal webhook not implemented (only client capture) ⚠️
- Cash payment no secondary verification ⚠️
- No payment method tokenization for repeat customers ⚠️

---

### 4. Admin/Staff Endpoints
```
/api/staff/* (SUPER_ADMIN/MANAGER)
/api/dashboard/* (staff)
/api/menu/* (staff)
/api/settings/* (staff)
/api/reports/* (staff)
/api/print/* (staff)
/api/driver/* (DRIVER role)
```

**Threats:**
- **Spoofing:** Staff token replay, session hijacking → **MITRE: T1556**
- **Tampering:** Menu price manipulation, category deletion → **MITRE: T1565**
- **Repudiation:** AuditLog exists but not immutable → **MITRE: T1562**
- **Info Disclosure:** All orders, customer PII in dashboard → **MITRE: T1590**
- **Elevation:** STAFF → MANAGER via IDOR → **MITRE: T1068**
- **DoS:** Bulk operations, export endpoints → **MITRE: T1499**

**Controls in Place:**
- Role hierarchy: SUPER_ADMIN > MANAGER > STAFF > DRIVER ✅
- `requireRole` middleware ✅
- AuditLog on all mutations ✅
- CSRF protection on state-changing ✅

**Gaps:**
- No session invalidation on role change ⚠️
- AuditLog mutable (no append-only) ⚠️
- No IP/device binding for admin sessions ⚠️
- Driver endpoints separate but same JWT type ⚠️

---

### 5. Customer Profile & Data
```
/api/customer/profile (GET/PATCH)
/api/customer/orders (GET)
/api/loyalty/balance (GET)
/api/cashback/* (GET/POST)
```

**Threats:**
- **Spoofing:** Customer IDOR on profile/orders → **MITRE: T1589**
- **Tampering:** Self-XSS via profile fields → **MITRE: T1059**
- **Info Disclosure:** Loyalty points, addresses exposed → **MITRE: T1590**
- **Elevation:** Customer modifies own role (not possible) ✅

**Controls in Place:**
- JWT `customerId` used, never client-supplied ID ✅
- Zod validation on profile update ✅
- Addresses linked to customer, not order-modifiable ✅

**Gaps:**
- No data export/deletion (GDPR) endpoint ⚠️
- Profile image upload — no validation shown ⚠️

---

### 6. External Integrations

| Integration | Auth Method | Threats |
|-------------|-------------|---------|
| **Stripe** | Secret key (env), webhook signature | Key leakage, webhook replay |
| **PayPal** | Client ID/Secret (env) | Key leakage, capture bypass |
| **Cloudflare Turnstile** | Secret key (env) | Bypass, provider outage |
| **Google/Facebook OAuth** | Client ID/Secret (env) | Token theft, account linking |
| **WhatsApp/Email/SMS** | API keys (env) | Key leakage, spam |
| **Print Agent** | Device token, pairing code | Device theft, token replay |
| **N8N Webhook** | HMAC-SHA256 | Signature bypass, replay |

**Controls in Place:**
- All secrets in environment variables ✅
- Webhook signature verification (Stripe, N8N, WhatsApp) ✅
- Timing-safe comparison ✅

**Gaps:**
- Webhook secret fallback in dev mode ⚠️
- No webhook replay protection (timestamp/nonce) ⚠️
- Print agent credentials in file (~/.king-print/credentials.json) ⚠️

---

### 7. Infrastructure & Deployment

**Vercel Serverless:**
- API routes: `/api/index.ts` → compiled `dist/app.js`
- Static assets: Storefront/Admin built to `dist/`
- Environment variables: Vercel dashboard + `.vercel/.env.production.local`

**Threats:**
- **Info Disclosure:** Build logs, source maps, env vars in preview → **MITRE: T1590**
- **Tampering:** Supply chain attack via npm dependencies → **MITRE: T1195**
- **Elevation:** Preview deployment accesses production DB → **MITRE: T1068**
- **DoS:** Vercel function timeout, cold start abuse → **MITRE: T1499**

**Controls in Place:**
- `vercel.json` rewrites configured ✅
- Production env separate from preview ✅
- Helmet security headers ✅
- CSP configured (but with unsafe-inline) ⚠️

**Gaps:**
- Source maps may be deployed ⚠️
- No Vercel WAF rules configured ⚠️
- Preview deployments may share DB ⚠️

---

### 8. Database (Prisma + Neon PostgreSQL)

**Threats:**
- **SQL Injection:** Prisma ORM parameterized queries ✅
- **Info Disclosure:** Over-fetching in includes/selects → **MITRE: T1590**
- **Tampering:** Mass assignment via JSON fields → **MITRE: T1565**
- **Elevation:** Migration privilege escalation → **MITRE: T1068**
- **DoS:** Unindexed queries, N+1 → **MITRE: T1499**

**Controls in Place:**
- Prisma ORM (parameterized) ✅
- Explicit select/include in controllers ✅
- Migration history tracked ✅

**Gaps:**
- JSON fields (SiteSettings.paymentSettings) — mass assignment risk ⚠️
- No row-level security (RLS) ⚠️
- ApiMetric writes every request — retention? ⚠️

---

## STRIDE Summary

| Component | Spoofing | Tampering | Repudiation | Info Disclosure | DoS | Elevation |
|-----------|----------|-----------|-------------|-----------------|-----|-----------|
| Auth | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ |
| Orders | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Payments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin/Staff | ⚠️ | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| Customer Data | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| External APIs | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| Infrastructure | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| Database | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ |

Legend: ✅ Mitigated | ⚠️ Partial/Residual Risk | ❌ Not Mitigated

---

## Attack Trees (High-Value Targets)

### Target: Order Confirmation Without Payment
```
Order Confirmed Without Payment
├── Stripe webhook spoofed
│   ├── WEBHOOK_SECRET leaked
│   ├── HMAC verification bypassed (timing attack)
│   └── Dev mode: no secret required
├── Payment intent manipulated
│   ├── Client sends fake client_secret
│   └── Amount modified client-side (server validates ✅)
├── Cash payment marked by staff
│   ├── Staff account compromised
│   └── No secondary approval
└── Database direct write
    ├── SQL injection (Prisma prevents ✅)
    └── Prisma bypass (unlikely)
```

### Target: Customer PII Exfiltration
```
PII Exfiltration
├── IDOR on /api/orders/:id
│   ├── UUID brute force (cuid = 25 chars, unguessable ✅)
│   └── Guest order lookup by email only
├── IDOR on /api/customer/profile
│   └── JWT customerId enforced ✅
├── Admin dashboard access
│   ├── Staff credential theft
│   └── Session hijacking (no IP binding ⚠️)
├── Database breach
│   ├── Neon credentials leaked
│   └── Backup exposure
└── Log leakage
    └── Sanitizer misses field (tested ✅)
```

### Target: Privilege Escalation to SUPER_ADMIN
```
SUPER_ADMIN Escalation
├── Staff register endpoint
│   ├── Requires SUPER_ADMIN ✅
│   └── No MFA on registration ⚠️
├── JWT forgery
│   ├── Weak secret (fail-fast in prod ✅)
│   ├── Algorithm confusion (RS256/HS256 — HS256 only ✅)
│   └── Token replay (no revocation ⚠️)
├── Database direct role update
│   └── Migration/API access required
└── Invite token abuse
    ├── Token enumeration (cuid ✅)
    └── Token reuse (usedAt tracked ✅)
```

---

## Mitigation Priorities

| Priority | Finding | Effort | Risk Reduction |
|----------|---------|--------|----------------|
| P0 | Refresh token rotation + revocation list | Medium | High (token theft) |
| P0 | Webhook replay protection (timestamp/nonce) | Low | High (payment fraud) |
| P0 | CAPTCHA risk store → Redis/shared | Medium | Medium (bot abuse) |
| P1 | CSP nonce/hash instead of unsafe-inline | Low | Medium (XSS) |
| P1 | Guest order 2FA (email code) | Medium | Medium (PII) |
| P1 | Session invalidation on role change | Low | Medium (priv esc) |
| P1 | AuditLog append-only / immutable | Medium | Medium (repudiation) |
| P2 | MFA for admin/staff | Medium | High (account takeover) |
| P2 | Vercel WAF / bot protection | Low | Medium (DoS/scraping) |
| P2 | Print agent credential encryption | Low | Low (device theft) |
| P3 | GDPR data export/delete | Medium | Compliance |
| P3 | Payment method tokenization | High | Low (convenience) |

---

## Testing Recommendations

1. **Automated:** OWASP ZAP scan on staging
2. **Manual:** IDOR testing on all `/api/orders/:id`, `/api/customer/*`
3. **Load:** Rate limit bypass via distributed IPs
4. **Webhook:** Replay captured Stripe events
5. **Auth:** Credential stuffing simulation
6. **Dependency:** `npm audit` + Snyk/Dependabot
7. **Penetration:** Annual third-party test on payment flows
