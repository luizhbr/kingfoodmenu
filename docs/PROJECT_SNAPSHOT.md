# KING FOOD FOUNDATION UI — Engineering Snapshot

> **Data:** 2026-08-12 · **Commit:** `b208ca0` · **Branch:** feature/king-food-foundation
> **Produção:** https://king-food-foundation-ui.vercel.app

## Stack

- Monorepo pnpm: `packages/server` (Express+Prisma), `packages/admin` (React+Vite),
  `packages/storefront` (React+Vite), `packages/shared`, `packages/mobile`, `packages/docs`
- Banco: Neon PostgreSQL (Prisma ORM)
- Deploy: Vercel serverless (`api/index.ts` → `dist/app.js`)
- Node: `C:\Users\elysi\AppData\Local\hermes\node`

## Arquitetura

```
Frontend (storefront/admin/driver)
    ↓ HTTP + JWT + CSRF
API (Express)
    ↓
Controllers → Services (reports, excel, cashback, coupon, captcha)
    ↓
Prisma → Neon PostgreSQL
```

## Autenticação & Segurança

- JWT (HS256, expiração 7d, secret real em produção, fail-fast sem env)
- RBAC: SUPER_ADMIN / MANAGER / STAFF / DRIVER / CUSTOMER
- CSRF (cookie + X-CSRF-Token) · Helmet/CSP · CORS restrito
- Rate limiting: api 300/min, auth 100/15min, strict 10/min
- CAPTCHA adaptativo (Turnstile) — infra pronta, ativação pendente
- Preço 100% server-side · webhooks assinados · upload filtrado
- Enumeration protection (mensagens genéricas)

## Módulos (verificados no DISK)

| Módulo | Status |
|--------|--------|
| Storefront / Admin / Menu CRUD / Categories | ✅ |
| Orders / Checkout / Customer Profile | ✅ |
| Loyalty (ledger) / Coupons (ledger) / Cashback (wallet+ledger) | ✅ |
| Driver App + PWA (mobile-first) | ✅ |
| Kitchen Display / Reservations / Reviews | ✅ |
| Tracking / Attribution / QR Codes / Referrals / Campaigns | ✅ |
| Reports (server-side, timezone ET) | ✅ |
| Excel Export (10 abas, exceljs MIT) | ✅ |
| Security Hardening + Brute-Force Test + CAPTCHA | ✅ |
| King Print (backend) | ✅ PrintJob+Printer, API, idempotência |
| Google Maps | ⛔ BLOCKED (sem API key) |
| Push Notifications | ⏳ infra parcial (push-token) |

## Database

- 46 models, 15 enums, 13 migrations (todas aplicadas no Neon)
- Ledgers: CouponUsage, LoyaltyTransaction, CashbackTransaction
- Wallet: CashbackWallet (customerId UNIQUE, saldo nunca negativo)
- Driver: Order.assignedToId + role DRIVER (migration aditiva)

## Testes

- Unit: 121/121 (8 arquivos)
- Produção: P2-PROD..P13.6-PROD (todos PASS)
- Cross-check: Reports ↔ Excel ↔ API ↔ Neon (idênticos)

## Security (P13.x)

- P13: JWT fail-fast, .claude untracked, catch logs
- P13.5: brute-force 429+Retry-After, enumeração protegida, JWT 401
- P13.6: CAPTCHA adaptativo fail-closed, 17 unit tests

## Known Issues / Blocked

- Google Maps BLOCKED (sem API key)
- CAPTCHA produção: CONFIGURATION PENDING (chaves Cloudflare)
- Risk store in-memory (Redis futuro)
- Profit/CMV NÃO implementado
- Push notifications sem infra de envio
- Excel Orders limitado a 2000
- 3 rotas órfãs + 9 models sem uso (docs/ORPHAN_ROUTES.md)

## License & Provenance

- Original: KitchenAsty (mighty840/kitchenasty, Sharang Parnerkar) — MIT
- 358 herdados + 79 herdados-modificados + 90 novos King Food
- THIRD_PARTY_NOTICES.md + THIRD_PARTY_LICENSES.md + LICENSE_AUDIT.md
- Dependências novas: exceljs (MIT) — auditada
- **PDF de Licença/Proveniência: PENDING**

## Roadmap

- DONE: P1, P2, P2.5, P3, P4, P5, P6, P7, P8, P9, P13, P13.5, P13.6, P14
- FUTURE: KING PRINT, Push Notifications, Redis risk store, UX Final, Google Maps
