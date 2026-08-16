# King Food Security Overview

**Project:** King Food (king-food-foundation-ui)  
**Audit Date:** 2026-08-15  
**Auditor:** Hermes Agent (Security Engineer)  
**Status:** AUDIT COMPLETE — Evidence-based findings only

---

## Executive Summary

King Food is a multi-tenant restaurant ordering platform with three primary applications:
- **Storefront** — Customer-facing ordering (React/Vite SPA)
- **Admin** — Staff/management dashboard (React/Vite SPA)
- **Server** — Vercel serverless API (Express/TypeScript/Prisma/PostgreSQL)

The platform handles sensitive data: customer PII, order details, payment information, authentication credentials, and staff/admin access.

### Overall Security Posture

| Area | Status | Notes |
|------|--------|-------|
| **Authentication** | CONFIRMED GOOD | JWT with bcrypt (cost 12), adaptive CAPTCHA, role-based access |
| **Authorization** | CONFIRMED GOOD | IDOR middleware, ownership checks, staff role hierarchy |
| **Input Validation** | CONFIRMED GOOD | Zod schemas on all endpoints |
| **CSRF Protection** | CONFIRMED GOOD | Double-submit pattern with Bearer token bypass |
| **Rate Limiting** | CONFIRMED GOOD | Tiered: 300/min general, 100/15min auth, 10/min strict |
| **Secrets Management** | CONFIRMED GOOD | Environment variables, no secrets in code |
| **Payment Security** | CONFIRMED GOOD | Stripe webhook signature verification, idempotency |
| **CORS** | CONFIRMED GOOD | Explicit origins, credentials=true |
| **Security Headers** | CONFIRMED GOOD | Helmet with CSP, HSTS, referrer policy |
| **Error Handling** | CONFIRMED GOOD | Sanitized logs, no stack traces in production |
| **Dependencies** | KNOWN VULNERABILITIES | See DEPENDENCIES.md |

### Key Strengths
1. **Server-side pricing** — Client never sends prices; unit prices from DB
2. **Idempotency keys** — Prevents duplicate orders/payments
3. **Adaptive CAPTCHA** — Risk-based challenge, fail-closed design
4. **CSRF double-submit** — Proper cookie/header pattern with API bypass
5. **IDOR protection** — Middleware enforces ownership on all resources
6. **Log sanitization** — PII/secrets redacted before logging
7. **Stripe webhook verification** — HMAC signature + timing-safe compare

### Critical Gaps (Confirmed)
1. **No refresh token rotation** — Long-lived JWTs (7d default), no revocation list
2. **Webhook secret fallback** — Dev mode allows unverified webhooks
3. **In-memory CAPTCHA risk store** — Not shared across serverless instances
4. **Missing CSP nonce/hash** — 'unsafe-inline' in script/style sources
5. **Guest order access by UUID only** — No additional verification for guest order lookup

### Likely Risks
1. **Session fixation possible** — No token rotation on privilege change
2. **Race conditions in cashback** — DB-level locking used but needs verification
3. **Print agent auth** — Device tokens vs Bearer tokens, different paths

### Unknown Areas (Require Runtime Verification)
1. **Vercel deployment headers** — Actual CSP/HSTS in production
2. **Database encryption at rest** — Neon managed, not verified
3. **Print agent credential storage** — File permissions on device
4. **Rate limit bypass via IP rotation** — Not tested

---

## Architecture Summary

```
+-----------------+     +-----------------+     +---------------------+
|  Storefront     |     |    Admin        |     |   Mobile App        |
|  (React)        |     |   (React)       |     |  (Expo/React)       |
+-------+---------+     +-------+---------+     +----------+----------+
        |                   |                      |
        +-------------------+----------------------+
                            |
                     +------v------+
                     |  Vercel     |
                     |  Serverless |
                     |  (Express)  |
                     +------+------+
                            |
             +--------------+--------------+
             |              |              |
       +-----v------+ +-----v-------+ +----v------+
       | PostgreSQL | |  Stripe     | | Cloudflare|
       |  (Neon)    | |  Payments   | |  Turnstile|
       +------------+ +-------------+ +-----------+
```

---

## Trust Boundaries

| Boundary | Controls |
|----------|----------|
| **Internet -> API** | Helmet, CORS, Rate Limit, CSRF, Input Validation |
| **Storefront -> API** | JWT Bearer, CSRF token, Origin check |
| **Admin -> API** | JWT Bearer, Staff role, CSRF token |
| **Mobile -> API** | JWT Bearer only (no cookies) |
| **Stripe Webhook -> API** | HMAC-SHA256 signature, raw body |
| **Print Agent -> API** | Device token header, pairing code |
| **External Webhook -> API** | HMAC-SHA256 signature |

---

## Data Classification

| Classification | Examples | Protection |
|----------------|----------|------------|
| **PUBLIC** | Menu items, locations, gallery images | Standard caching |
| **INTERNAL** | Order counts, analytics, aggregated metrics | Auth required |
| **CONFIDENTIAL** | Customer PII, order details, addresses | Auth + ownership |
| **RESTRICTED** | Password hashes, JWT secrets, Stripe keys, payment tokens | Never logged, env only |
| **SECRET** | Database URL, webhook secrets, CAPTCHA secret | Env only, rotation policy |

---

## Compliance Notes

- **PCI DSS** — Stripe handles card data (SAQ A eligible)
- **GDPR/LGPD** — Customer data access/deletion via /api/customer/profile
- **No SOC2** — Not currently certified
- **Cookie consent** — Implemented via CookieConsent model

---

## Next Steps

1. Review detailed findings in SECURITY_FINDINGS.md
2. Prioritize P0/P1 items in SECURITY_TEST_PLAN.md
3. Implement hardening per SECURITY_HARDENING.md (separate task)
4. Schedule penetration test for payment flows
