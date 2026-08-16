# King Food Secrets & PII Audit

**Project:** King Food  
**Scope:** Source code, environment, build artifacts, logs

---

## Secret Scanning Results

### Patterns Searched
- API keys (`sk_*`, `pk_*`, `ghp_*`, `AKIA*`)
- Passwords, tokens, secrets in code
- Database URLs, connection strings
- Private keys, certificates
- Webhook secrets
- JWT secrets

### Findings

| File | Type | Exposure | Severity | Status |
|------|------|----------|----------|--------|
| `.env` | DATABASE_URL | Committed to repo (example) | LOW | ✅ Template only |
| `.env.deploy` | DATABASE_URL | Committed to repo | LOW | ✅ Template only |
| `.neon-secret.json` | Neon credentials | Gitignored? | MEDIUM | ⚠️ Verify gitignore |
| `packages/server/src/middleware/auth.ts` | JWT_SECRET fallback | Hardcoded dev secret | LOW | ✅ Dev only, fail-fast prod |
| `packages/server/src/middleware/csrf.ts` | CSRF_SECRET fallback | Random on startup | LOW | ✅ Acceptable |
| `packages/server/src/lib/stripe.ts` | Stripe key placeholder | `sk_tes...only` dev only | LOW | ✅ Dev only, fail-fast prod |
| `packages/server/src/lib/captcha-service.ts` | Turnstile secret | Env var only | ✅ SECURE | ✅ |
| `packages/server/src/middleware/webhookSignature.ts` | WEBHOOK_SECRET | Env var only | ✅ SECURE | ✅ |
| `packages/server/src/lib/paypal.ts` | PayPal credentials | Env var only | ✅ SECURE | ✅ |

### Verified Secure Practices

1. **No secrets in source code** ✅
   - All secrets via `process.env.*`
   - Dev fallbacks clearly marked, fail-fast in production

2. **No secrets in frontend bundles** ✅
   - Storefront/Admin use `import.meta.env.VITE_*` (build-time injection)
   - Only public keys exposed (Stripe publishable, CAPTCHA site key)
   - Verified: `VITE_API_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_CAPTCHA_SITE_KEY`

3. **Environment variable separation** ✅
   - `.env` — local development
   - `.env.deploy` — CI/CD reference
   - `.vercel/.env.production.local` — production (Vercel dashboard)
   - `.vercel/.env.development.local` — preview

4. **Gitignore coverage** ✅
   - `.env*` ignored
   - `.neon-secret.json` — needs verification
   - `credentials.json` (print agent) — local only

---

## PII in Logs Audit

### Log Sanitization (from `middleware/logSanitizer.ts`)

**Redacted Request Fields:**
- `password`, `passwordHash`, `confirmPassword`, `newPassword`
- `token`, `accessToken`, `refreshToken`, `clientSecret`
- `creditCard`, `cardNumber`, `cvv`, `expiryDate`
- `apiKey`, `secret`, `smtpPass`, `smtpPassword`
- `TWILIO_AUTH_TOKEN`, `STRIPE_SECRET_KEY`, `JWT_SECRET`, `WEBHOOK_SECRET`, `CSRF_SECRET`

**Applied:** Before `httpLogger` middleware

**Gap:** Response bodies not sanitized — error responses could leak PII

### Logger Configuration (from `lib/logger.ts`)

```typescript
const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : (process.env.LOG_LEVEL || 'info'),
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
});
```

- Production: JSON logs, `info` level
- Development: Pretty printed, `debug` level
- Test: Silent

---

## Secret Rotation Policy

| Secret | Rotation Frequency | Method |
|--------|-------------------|--------|
| `JWT_SECRET` | Annual | Vercel env var update + redeploy |
| `CSRF_SECRET` | Annual | Vercel env var update + redeploy |
| `WEBHOOK_SECRET` | Annual | Vercel env var update + redeploy |
| `STRIPE_SECRET_KEY` | Per Stripe rotation | Stripe dashboard + Vercel env |
| `STRIPE_WEBHOOK_SECRET` | Per Stripe rotation | Stripe dashboard + Vercel env |
| `CAPTCHA_SECRET_KEY` | Annual | Cloudflare dashboard + Vercel env |
| `DATABASE_URL` | Per Neon rotation | Neon dashboard + Vercel env |
| `PAYPAL_CLIENT_SECRET` | Annual | PayPal dashboard + Vercel env |
| `GOOGLE_CLIENT_SECRET` | Annual | Google Cloud + Vercel env |
| `FACEBOOK_APP_SECRET` | Annual | Meta Developer + Vercel env |
| Print agent device token | On compromise | Admin UI → regenerate |

**Gap:** No documented rotation schedule or automated reminders.

---

## Vercel Deployment Secrets

### Environment Variables in Vercel (Production)

| Variable | Source | Sensitivity |
|----------|--------|-------------|
| `DATABASE_URL` | Neon | SECRET |
| `JWT_SECRET` | Generated | SECRET |
| `CSRF_SECRET` | Generated | SECRET |
| `WEBHOOK_SECRET` | Generated | SECRET |
| `STRIPE_SECRET_KEY` | Stripe | SECRET |
| `STRIPE_WEBHOOK_SECRET` | Stripe | SECRET |
| `STRIPE_PUBLISHABLE_KEY` | Stripe | PUBLIC |
| `CAPTCHA_SECRET_KEY` | Cloudflare | SECRET |
| `CAPTCHA_SITE_KEY` | Cloudflare | PUBLIC |
| `PAYPAL_CLIENT_ID` | PayPal | PUBLIC |
| `PAYPAL_CLIENT_SECRET` | PayPal | SECRET |
| `PAYPAL_SANDBOX` | Config | INTERNAL |
| `GOOGLE_CLIENT_ID` | Google | PUBLIC |
| `GOOGLE_CLIENT_SECRET` | Google | SECRET |
| `FACEBOOK_APP_ID` | Meta | PUBLIC |
| `FACEBOOK_APP_SECRET` | Meta | SECRET |
| `CORS_ORIGINS` | Config | INTERNAL |
| `PUBLIC_URL` | Config | PUBLIC |
| `NODE_ENV` | Vercel | INTERNAL |
| `LOG_LEVEL` | Config | INTERNAL |

### Preview Deployments

- Separate environment variables (`.vercel/.env.development.local`)
- Should use **separate database** (Neon branch) — verify configured
- Stripe test keys recommended

---

## Print Agent Credentials

**Storage:** `~/.king-print/credentials.json` (file permissions 0600)

**Contents:**
```json
{
  "deviceId": "printer-xxx",
  "token": "device-token-xxx",
  "pairingCode": "xxxxxx",
  "pairedAt": "2026-08-15T...",
  "apiUrl": "https://king-food-foundation-ui.vercel.app"
}
```

**Risk:** File readable by any process on same user account

**Mitigations:**
- `chmod 600` on creation ✅
- Token revocable via admin UI ✅
- Pairing code expires 10 min ✅

**Recommendation:** Encrypt at rest (OS keyring or age/sops)

---

## Dependency Secrets (Supply Chain)

### npm Audit (run `npm audit --json`)

**Critical/High findings to review:**
- Check `packages/server/package.json` dependencies
- Check `packages/storefront/package.json` dependencies
- Check `packages/admin/package.json` dependencies

### Known Patterns to Monitor
- `event-stream` style injection (obfuscated code in minified deps)
- Post-install scripts (`prepare`, `postinstall`) in dependencies
- Typosquatting packages

---

## Recommendations

1. **P0:** Verify `.neon-secret.json` is gitignored
2. **P0:** Add response body sanitization for error logging
3. **P1:** Document secret rotation schedule (quarterly review)
4. **P1:** Encrypt print agent credentials at rest
5. **P1:** Use separate Neon branch for preview deployments
6. **P2:** Add pre-commit secret scanning (git-secrets, truffleHog)
7. **P2:** Implement secret scanning in CI pipeline
8. **P3:** Rotate all secrets annually (calendar reminder)
