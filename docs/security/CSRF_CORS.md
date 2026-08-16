# King Food CSRF & CORS Audit

**Project:** King Food  
**Scope:** Storefront SPA, Admin SPA, Server API

---

## CSRF Protection Architecture

### Implementation (from `middleware/csrf.ts`)

**Pattern:** Double-submit cookie
- Server generates HMAC-SHA256 token (secret + random)
- Sets `_csrf` cookie (`httpOnly: false`, `sameSite: 'lax'`, `secure: prod`)
- Returns token in `/api/csrf-token` response body
- Client reads cookie OR response body, sends `X-CSRF-Token` header
- Server validates: header === cookie

### CSRF Skip Conditions (from `csrfProtection` middleware)

```typescript
// 1. Safe methods
if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

// 2. JWT Bearer authenticated requests (API consumers)
if (authHeader?.startsWith('Bearer ')) return next();

// 3. Print agent device tokens
if (authHeader?.startsWith('Device ')) return next();

// 4. Print agent pairing endpoints
if (req.path.startsWith('/api/print/agent/')) return next();

// 5. Webhook endpoints (HMAC verified instead)
if (req.path.includes('/webhook')) return next();

// 6. Stripe webhook (raw body)
if (req.path === '/api/payments/webhook') return next();

// 7. Guest order creation (no auth mechanism)
if (req.path === '/api/orders' && req.method === 'POST') return next();

// 8. Staff order status update (Bearer required before this middleware)
if (req.path.match(/^\/api\/orders\/[^\/]+\/status$/) && req.method === 'PATCH') return next();
```

### Client Implementation

**Storefront (`packages/storefront/src/lib/csrf.ts`):**
- Fetches `/api/csrf-token` once, caches promise
- Attaches `X-CSRF-Token` header via `withCsrf()` helper
- Uses `credentials: 'include'` for cookie

**Admin (`packages/admin/src/lib/api.ts`):**
- Uses `Authorization: Bearer <token>` from localStorage
- No CSRF token handling (Bearer auth skips CSRF)

---

## CSRF Audit Results

| Endpoint | Method | Auth | CSRF Required? | Actual | Status |
|----------|--------|------|----------------|--------|--------|
| `/api/auth/*` | POST | None/Bearer | Skip (Bearer) | Skip | ✅ |
| `/api/orders` | POST | Optional | **Exception** | Skip | ⚠️ DOCUMENTED |
| `/api/orders/:id` | GET | Optional | Skip (GET) | Skip | ✅ |
| `/api/orders/:id/status` | PATCH | Bearer+Staff | Skip (Bearer) | Skip | ✅ |
| `/api/payments/*` | POST | Optional/Bearer | Skip (Bearer) | Skip | ✅ |
| `/api/payments/webhook` | POST | HMAC | Skip (webhook) | Skip | ✅ |
| `/api/customer/*` | * | Bearer | Skip (Bearer) | Skip | ✅ |
| `/api/staff/*` | * | Bearer+Staff | Skip (Bearer) | Skip | ✅ |
| `/api/driver/*` | * | Bearer+Driver | Skip (Bearer) | Skip | ✅ |
| `/api/print/*` | * | Bearer/Device | Skip (Bearer/Device) | Skip | ✅ |
| `/api/webhooks/*` | POST | HMAC | Skip (webhook) | Skip | ✅ |
| `/api/csrf-token` | GET | None | N/A (issues token) | N/A | ✅ |

### Documented Exception: Guest Order Creation

**Location:** `app.ts` ~line 140
```typescript
if (req.path === '/api/orders' && req.method === 'POST') return next();
```

**Reason:** Guest checkout has no session, no Bearer token, no cookie auth established yet. Double-submit requires a cookie to be set first.

**Risk:** CSRF on order creation — attacker could trick user into placing order.

**Mitigations in Place:**
1. Order requires valid menu items, address, pricing (server-validated)
2. Idempotency key required (attacker can't predict)
3. UUID order ID returned — attacker can't retrieve order
4. Email confirmation sent to guest email

**Residual Risk:** LOW — attacker can cause nuisance order but cannot extract value or PII.

**Recommendation:** Consider CAPTCHA on guest checkout (already have adaptive CAPTCHA infra).

---

## CORS Configuration

### Server (from `app.ts`)

```typescript
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
```

### Analysis

| Setting | Value | Security |
|---------|-------|----------|
| `origin` | Explicit array (not `*`) | ✅ Prevents wildcard |
| `credentials` | `true` | ✅ Allows cookies for CSRF |
| `methods` | Default (all) | ⚠️ Could restrict |
| `allowedHeaders` | Default (all) | ⚠️ Could restrict |
| `exposedHeaders` | Default (none) | ✅ |
| `maxAge` | Default (no cache) | ⚠️ Could cache preflight |

### Production Origins Required

`CORS_ORIGINS` must be set in Vercel environment:
```
https://king-food-foundation-ui.vercel.app,https://admin.king-food-foundation-ui.vercel.app
```

### Preflight Handling

- Express CORS handles `OPTIONS` automatically
- No custom preflight logic needed
- `credentials: true` requires explicit origin (not `*`) — enforced by browser

---

## CSRF Token Security

### Token Generation

```typescript
function generateCsrfToken(): string {
  return crypto.createHmac('sha256', CSRF_SECRET)
    .update(crypto.randomBytes(16).toString('hex'))
    .digest('hex');
}
```

- `CSRF_SECRET`: `process.env.CSRF_SECRET` or random on startup
- 16 bytes random + HMAC-SHA256 = 64 hex chars
- Cryptographically strong ✅

### Token Verification

```typescript
// Double-submit pattern
if (csrfToken !== cookieToken) return 403;
if (!verifyCsrfToken(csrfToken)) return 403;
```

- `verifyCsrfToken`: checks length >= 64 (weak — any 64-char string passes)
- **Gap:** Does not re-verify HMAC — only checks format
- **Impact:** If attacker can set cookie, can forge token
- **Mitigation:** Cookie is `sameSite: 'lax'` — CSRF from external site blocked

### Cookie Settings

```typescript
const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,  // Must be readable by client JS
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};
```

| Attribute | Value | Security |
|-----------|-------|----------|
| `httpOnly` | `false` | ⚠️ Required for SPA access |
| `sameSite` | `'lax'` | ✅ Blocks cross-site POST |
| `secure` | `production` only | ✅ HTTPS only in prod |
| `path` | `'/'` | ✅ |

**Note:** `httpOnly: false` is necessary for double-submit pattern (JS must read cookie). `sameSite: 'lax'` provides primary CSRF protection.

---

## Cross-Origin Attack Scenarios

### Scenario 1: Malicious Site → Guest Order
1. Victim visits attacker site
2. Attacker site submits form to `POST /api/orders`
3. Browser sends `_csrf` cookie (sameSite=lax → **BLOCKED** on cross-site)
4. Request fails CSRF check (no header) → 403

**Result:** BLOCKED by `sameSite: 'lax'` ✅

### Scenario 2: Malicious Site → Authenticated Customer Order
1. Victim logged in (has JWT in localStorage, not cookie)
2. Attacker site calls `fetch('/api/orders', {method: 'POST', credentials: 'include'})`
3. No `Authorization` header (localStorage not sent automatically)
4. No `X-CSRF-Token` header
5. CSRF middleware: no Bearer, no cookie → 403

**Result:** BLOCKED ✅

### Scenario 3: Malicious Site → Admin Action
1. Admin logged in (JWT in localStorage)
2. Attacker calls `fetch('/api/staff/invite', {method: 'POST'})`
3. No `Authorization` header sent (localStorage not automatic)
4. Request fails `authenticate` middleware → 401

**Result:** BLOCKED by auth ✅

### Scenario 4: Subdomain Takeover → CSRF
If attacker controls subdomain (e.g., `blog.kingfood.com`):
- `sameSite: 'lax'` treats subdomain as cross-site → **BLOCKED**
- `credentials: true` with explicit origin → **BLOCKED** (origin mismatch)

---

## Recommendations

1. **P1:** Strengthen `verifyCsrfToken` to re-verify HMAC
2. **P1:** Add `maxAge` to CORS for preflight caching
3. **P2:** Consider `sameSite: 'strict'` for CSRF cookie (breaks some UX)
4. **P2:** Add `allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']` explicit
5. **P3:** Implement CAPTCHA on guest checkout (reuse adaptive infra)
6. **P3:** Document CSRF exception in security docs (done)

---

## Testing Checklist

- [ ] `POST /api/orders` from external origin → 403 (sameSite lax)
- [ ] `POST /api/orders` with valid CSRF token → 201
- [ ] `POST /api/orders` with mismatched token → 403
- [ ] `POST /api/payments/create-intent` with Bearer → 200 (no CSRF)
- [ ] `POST /api/staff/invite` without Bearer → 401
- [ ] CORS preflight on production origin → 200 with credentials
- [ ] CORS preflight on unauthorized origin → 403/no CORS headers
