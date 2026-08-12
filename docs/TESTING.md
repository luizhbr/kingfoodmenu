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


## P15 Final Smoke Test (2026-08-12)

| Fase | Resultado |
|------|-----------|
| Storefront (categorias/produtos) | ✅ 6 categorias, 20 itens |
| Checkout (pedido PICKUP) | ✅ 201, total $15.012 |
| Server-side pricing (ataque $0.01) | ✅ servidor usou $13.9 |
| Idempotency (mesma chave 2x) | ✅ mesmo pedido, duplicate: true |
| Admin login sem CSRF | ✅ 403 |
| Admin login com CSRF | ✅ 200 |
| Dashboard | ✅ 200, pendingOrders |
| RBAC anonymous | ✅ 401 |
| RBAC customer → staff | ✅ 403 |
| IDOR (customer vê pedido alheio) | ✅ 403 |
| Order status cycle | ✅ PENDING→DELIVERED (5 transições) |
| Tracking 6 canais | ✅ todos 201, normalizados |
| Sales Attribution | ✅ INSTAGRAM→WHATSAPP persistido (após fix 44d9005) |
| CORS | ✅ origem permitida 200, estranha bloqueada |
| Rate limit | ✅ 429 após ~9 req |
| Kitchen polling | ✅ 15s confirmado no código |
| PWA | ✅ manifest + sw.js + HTTPS |
| Neon integridade | ✅ 17 pedidos, 0 duplicados idempotency |

**Bug encontrado e corrigido no P15:** OrderAttribution falhava silenciosamente
com source minúsculo (catch {} engolia o erro). Fix: normalização de enums
(commit 44d9005).

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
