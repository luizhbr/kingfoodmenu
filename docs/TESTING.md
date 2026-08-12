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


## P2 Admin Menu CRUD (2026-08-12)

| Teste | Resultado |
|-------|-----------|
| Criar categoria | ✅ 201 |
| Criar produto com SKU + cost | ✅ 201, persistido |
| Editar produto | ✅ 200 |
| Desativar produto | ✅ some do storefront |
| Admin vê desativados (includeInactive) | ✅ |
| Categoria desativada some | ✅ |
| Anônimo → criar item | ✅ 401 |
| Customer → criar item | ✅ 403 |
| Neon persistência | ✅ sku/cost confirmados |
| Typecheck | ✅ |
| Build | ✅ |
| Unit tests | ✅ 29/29 |

**Bugs corrigidos:** (1) sku/cost não persistiam (patch não escrito — FILE_MUTATION_FAILED detectado e corrigido); (2) produtos/categorias desativados apareciam no storefront (filtro isActive + includeInactive).


## P3 Customer Profile (2026-08-12)

| Teste | Resultado |
|-------|-----------|
| Anonymous → profile | ✅ 401 |
| Customer → próprio profile | ✅ 200 |
| PATCH profile (nome/telefone) | ✅ 200 |
| Customer → order history | ✅ 200 |
| IDOR (customerId de outro) | ✅ isolado |
| Staff → customer profile | ✅ 401 |
| Checkout autenticado | ✅ 201 + customerId |
| Neon relação customer↔order | ✅ |
| Typecheck | ✅ |
| Build | ✅ |
| Unit tests | ✅ 29/29 |


## P5 Coupons (2026-08-12)

| Teste | Resultado |
|-------|-----------|
| Unit (coupon-service) | ✅ 22 testes novos (51/51 total) |
| Criar PERCENTAGE/FIXED/FREE_DELIVERY | ✅ 201 |
| Aplicar cupom válido | ✅ discount correto |
| Expired | ✅ 400 |
| Min subtotal | ✅ 400 |
| Max discount | ✅ cap aplicado |
| Usage limit | ✅ bloqueia após limite |
| Per customer limit | ✅ bloqueia 2º uso |
| Idempotência | ✅ mesmo pedido |
| discountAmount falso | ✅ servidor ignora |
| IDOR | ✅ 403 |
| RBAC customer → cupom | ✅ 403 |
| Neon (usage, usageCount, order.discount) | ✅ |


## P6 Cashback (2026-08-12)

| Teste | Resultado |
|-------|-----------|
| Unit (cashback-service) | ✅ 20 novos (70/70 total) |
| CREDIT após PICKED_UP | ✅ $0.70 (5% de 13.9) |
| Saldo inicial 0 | ✅ |
| DEBIT no checkout | ✅ -$0.50, saldo 0.20 |
| Idempotência credit (2x status) | ✅ 1 crédito |
| CANCELLED → REVERSAL | ✅ -0.70 limitado ao saldo |
| Saldo nunca negativo | ✅ |
| Concurrency (2x mesmo saldo) | ✅ 1 vence, outro 400 |
| amount falso ($9999) | ✅ 400 |
| IDOR | ✅ 403 |
| RBAC customer → adjust | ✅ 403 |
| Anonymous → balance | ✅ 401 |


## P7 Driver App (2026-08-12)

| Teste | Resultado |
|-------|-----------|
| Unit (state machine) | ✅ 10 novos (80/80 total) |
| Criar driver (role DRIVER) | ✅ 201 |
| Driver login | ✅ |
| Profile | ✅ 200 role=DRIVER |
| Dashboard (assigned+available) | ✅ |
| Accept | ✅ 200 |
| Pickup → OFD → Delivered | ✅ 200 |
| Transição inválida (replay) | ✅ 400 |
| IDOR driver B → pedido A | ✅ 403 |
| Pedido inexistente | ✅ 404 |
| Customer → driver | ✅ 403 |
| Anonymous → driver | ✅ 401 |
| Staff → driver | ✅ 403 |
| Neon (assignedToId) | ✅ |
| PWA (manifest + sw) | ✅ |


## P8 Reports (2026-08-12)

| Teste | Resultado |
|-------|-----------|
| Unit (timezone/períodos/fórmulas) | ✅ 14 novos (94/94 total) |
| Anonymous → reports | ✅ 401 |
| Customer → reports | ✅ 403 |
| Driver → reports | ✅ 403 |
| Staff → reports | ✅ 403 |
| Manager → reports | ✅ 200 |
| Admin → reports | ✅ 200 |
| period inválido | ✅ 400 |
| Endpoints 6/6 | ✅ 200 |
| Neon cross-check | ✅ números batem |


## P9 Excel Export (2026-08-12)

| Teste | Resultado |
|-------|-----------|
| Unit (workbook 10 abas, buffer PK, períodos) | ✅ 10 novos (104/104 total) |
| custom sem start/end | ✅ 400 |
| data inválida | ✅ 400 |
| range invertido | ✅ 400 |
| formatação (moeda/percentual/autofilter/freeze) | ✅ verificado no XLSX |
| Export admin | ✅ 200, XLSX 17173 bytes |
| Anonymous → export | ✅ 401 |
| Customer → export | ✅ 403 |
| Driver → export | ✅ 403 |
| Staff → export | ✅ 403 |
| period inválido | ✅ 400 |
| 7 períodos em produção | ✅ todos 200 |
| Cross-check XLSX == API == Neon | ✅ idênticos |


## P13 Security Hardening (2026-08-12)

| Teste | Resultado |
|-------|-----------|
| Token forjado (fallback dev) → produção | ✅ 401 rejeitado |
| Admin login pós-fix | ✅ 200 |
| Reports autenticado | ✅ 200 |
| .claude untracked | ✅ |
| Unit (104) | ✅ todos passam |


## P13.5 Brute-Force Test (2026-08-12)

| Teste | Resultado |
|-------|-----------|
| Brute-force 10 tentativas | ✅ 9× 401 + 429 (Retry-After 38s) |
| Account enumeration | ✅ indistinguível |
| JWT malformado/inválido/alg=none | ✅ 401 × 3 |
| RBAC customer→staff/reports/driver | ✅ 403 × 3 |
| Password spraying 3 contas | ✅ 401 × 3 |
| Login válido pós-bloqueio | ✅ 200 |
| Sem 5xx / sem crash | ✅ |

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
