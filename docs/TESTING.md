# Testing — King Food Foundation

## Níveis de teste

| Nível | Comando | Status |
|-------|---------|--------|
| Unit (server) | `npm run test:unit -w packages/server` | ✅ 29/29 PASS |
| Typecheck | `npm run build -w packages/server` (tsc) | ✅ PASS |
| Build completo | `npm run build` | ✅ PASS (4 pacotes) |
| API local | servidor + curl/fetch | ✅ PASS |
| API produção | fetch https://king-food-foundation-ui.vercel.app | ✅ PASS |
| E2E (Playwright) | `npx playwright test` | ⚠️ configurado, não executado nesta sessão |
| Smoke test | manual | ⚠️ P15 pendente |

## Unit tests (29/29)

- `auth.middleware.test.ts` — 21 testes
- `email.test.ts` — 8 testes

## Testes de produção realizados (2026-08-12)

### Tracking (P13) — 7 requisições, todas 201

| Cenário | Resultado |
|---------|-----------|
| campaignSlug válido + source minúsculo | 201, INSTAGRAM |
| campaignSlug inexistente | 201 |
| sem campaignSlug | 201 |
| customerId inexistente | 201 (anônimo) |
| eventType minúsculo | 201 (normalizado) |
| todos campos UTM (tiktok) | 201, TIKTOK |
| google_ads | 201, GOOGLE_ADS |
| payload repetido 2x | 2 eventos distintos |

### Dashboard (auditoria) — 200 com auth

- Login staff (CSRF + JWT) → 200
- GET /api/dashboard/stats → 200, pendingOrders: 9

### Segurança

- Anonymous → /api/dashboard/stats → 401
- POST sem CSRF → 403
- GET /api/dashboard (rota antiga) → 404 (corrigido)

## Como rodar

```bash
# Unit tests
npm run test:unit -w packages/server

# Typecheck
npm run build -w packages/server

# Build completo
npm run build

# E2E
npx playwright test
```
