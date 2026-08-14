
# FASE 5 — PRODUCTION SMOKE

## Deploy
- **PASS**
- URL: https://king-food-foundation-ui.vercel.app
- Commit deployed: a5545a448d9273933f2d3c1ddfac40959d67612d
- Build: storefront 492.64 kB (gzip 145.87 kB)

## Push
- **PASS**
- Branch: feature/king-food-foundation
- Commit a5545a4 pushed to origin

## Home
- **PASS**
- Title: King Food — Açaí brasileiro de verdade · Columbus, OH
- 6 product cards visible

## Menu
- **PASS**
- 12 product cards visible
- Search "Guaraná" returns results
- Quick-add works
- CartBar appears

## Cart / Checkout CTA
- **PASS**
- Direct navigation to /checkout works

## Checkout PT-BR
- **MOSTLY PASS**
- Present: Seus dados, Nome, Email, Telefone, Entrega, Retirada, Endereço, Cupom, Pagamento, Resumo, Finalizar pedido
- Labels differ from exact checklist but convey the same meaning:
  - "Como receber?" instead of "Tipo de pedido"
  - "Quando receber?" instead of "Agendamento"
  - "Alguma observação?" instead of "Observações"
  - "Fidelidade" not visible for guest user (expected, requires login)

## Guest
- **PASS**
- Guest checkout form rendered

## Validation
- Empty name inline error: **PASS**
- Invalid email inline error: **PASS**
- Delivery without address: **FAIL** — no inline per-field errors; only a global error banner is set (and may not be visible in screenshot). Submission is blocked, but the user experience does not match the requirement for inline field errors.

## Pickup
- **PASS (with critical data bug)**
- Order created successfully
- Order ID: cmss2dt95001xoekfwvidipxk
- Redirect to /order/:id
- OrderConfirmation rendered
- **CRITICAL: Item price displayed as $NaN**
- Subtotal/total values correct ($4.32)

## Delivery validation
- **PARTIAL/FAIL**
- Delivery option shows address fields
- Submit without address is blocked
- No inline per-field error messages under address inputs
- Expected: red inline errors under Endereço Linha 1, Cidade, Estado, CEP

## Upsell
- **PASS**
- Real products shown at bottom of checkout
- Does not block checkout
- User can submit without interacting with upsell

## Mobile 360
- **PASS**
- Checkout loaded with item
- Sticky CTA visible above bottom dock
- Bottom dock visible

## Mobile 390
- **PASS**
- Checkout loaded with item

## Mobile 430
- **PASS**
- Checkout loaded with item

## Desktop 1440
- **PASS**
- Two-column layout visible
- Summary sidebar correct
- CTA visible

## OrderConfirmation
- **FAIL due to $NaN item price**
- Page renders, order ID present
- Item line shows "1x Guaraná 350 ml $NaN"
- Total $4.32 correct

## Console / Network
- Console errors: 1 (401 from an auth/session endpoint — non-critical)
- Network errors: 0
- POST /api/orders returned 201
- Order ID received

## Overall Status
**PRODUCTION SMOKE = FAIL**

## Blockers
1. **OrderConfirmation item price shows $NaN** — frontend reads `item.price` but backend returns `unitPrice`.
2. **Delivery address validation lacks inline per-field errors** — only a global error is set.

## Recommendation
Fix `OrderConfirmation.tsx` to use `item.unitPrice ?? item.price` (or backend field name) before declaring FASE 5 production PASS. Re-run smoke after fix (will require a new commit, but user explicitly asked no changes now; schedule follow-up).
