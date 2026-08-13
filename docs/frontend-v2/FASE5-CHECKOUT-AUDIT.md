# FASE 5 — CHECKOUT V2 AUDIT

## Arquivos auditados
- `packages/storefront/src/pages/Checkout.tsx`
- `packages/storefront/src/pages/OrderConfirmation.tsx`
- `packages/server/src/controllers/order.controller.ts` (createOrder, getOrder)
- Commit `d102c6b` — checkout fix anterior
- `packages/storefront/src/context/CartContext.tsx`
- `packages/server/prisma/schema.prisma` (indireto via controller)

## Estado atual do Checkout.tsx
- **Guest info no topo** com inline validation (preservado do d102c6b)
- **Campos:** nome, email, telefone obrigatórios
- **Order type:** Delivery / Pickup cards
- **Endereço** só aparece para Delivery
- **Agendamento:** ASAP ou datetime-local
- **Observação:** textarea
- **Cupom:** input + aplicar, com preview local
- **Fidelidade:** pontos para usuários logados (inglês ainda)
- **Pagamento:** cash, stripe, paypal (PayPal exposto, mas backend aceita?)
- **Resumo sticky** com subtotal, taxa, entrega, desconto, total
- **CTA:** "Place Order — $XX.XX" (ainda em inglês)
- **Idempotência:** crypto.randomUUID por sessão
- **Busy mode:** /api/locations
- **Cálculo de taxa:** TAX_RATE 0.08 no frontend (cuidado: backend é autoridade)
- **Sem upsell**
- **Padding bottom** inline style `calc(5rem + env(safe-area-inset-bottom))`

## Problemas identificados
### UX
1. Título principal e labels em inglês (`checkout.title`, `checkout.placeOrder`, etc)
2. Placeholder do cupom em inglês (`e.g. SAVE10`)
3. Seção de fidelidade inteira em inglês ("Loyalty Points", "points to redeem")
4. Botão PayPal exposto sem evidência de implementação backend
5. Resumo mostra `tax` calculado no frontend (8%); backend pode calcular diferente
6. Total pode ficar desatualizado se cupom/entrega mudarem
7. CTA não é sticky no mobile; fica no resumo lateral
8. Sem validação inline de endereço
9. Campo de telefone sem máscara/formato
10. Sem upsell (oportunidade de conversão)

### Backend / Integridade
1. `paymentMethod` enviado como string; backend aceita 'cash', 'stripe', 'paypal'?
2. Stripe path redireciona para hosted checkout; webhook confirma pagamento
3. Idempotência implementada via `idempotencyKey` no banco
4. Guest fields obrigatórios no backend (preservado d102c6b)
5. Endereço obrigatório para Delivery
6. Busy mode já verificado
7. Auto-print ativado em CONFIRMED (não alterado)
8. Driver WhatsApp é admin-only (não exposto)

### OrderConfirmation.tsx
1. Usa formatação EUR (`de-DE`) em vez de USD/locale correto
2. Inglês
3. Não exibe itens, endereço ou status detalhado
4. Polling até CONFIRMED funciona

## Decisões
1. **NÃO alterar backend**: controller, schema, Stripe, webhook, Print, Driver, Kitchen permanecem intocados.
2. **Preservar d102c6b**: guest fields no topo, validação inline, telefone obrigatório, padding inferior.
3. **Refatorar Checkout.tsx** com Design System V2 e seções progressivas, mas manter payload exato enviado à API.
4. **Traduzir tudo para PT-BR** e adicionar i18n keys.
5. **Remover PayPal** do UI se backend não confirmar (ou mantê-lo se o controller aceita? Precisamos ver schema). Verificar schema de paymentMethod.
6. **Não confiar no cálculo de taxa frontend**: exibir estimativas claras, mas destacar que total final é confirmado no pedido.
7. **CTA sticky no mobile**: fixar na parte inferior acima do bottom dock.
8. **Upsell** após resumo mas antes do pagamento, com produtos reais, sem bloquear finalização.
9. **OrderConfirmation V2**: PT-BR, resumo de itens, total, tipo, endereço, status, número do pedido.
10. **E2E real**: criar pedido guest pickup/delivery no ambiente de teste local; Stripe test se configurado.



## FASE 5 — Final Report

Status: **PASS (com ressalva no server baseline)**

### E2E Checkout
- **17/17 PASS**
- Fluxos cobertos: Guest Pickup/Delivery, Authenticated Pickup/Delivery, validações (nome, email vazio, email inválido, telefone, endereço), cupom inválido/válido, fidelidade, stale cart, reload, duplo clique, mobile CTA.
- Pedidos reais criados nos fluxos positivos.

### Visual QA (7 viewports)
| Viewport | Topo | Base |
|---|---|---|
| 360x800 | PASS | PASS |
| 390x844 | PASS | PASS |
| 430x932 | PASS | PASS |
| 768x1024 | PASS | PASS |
| 834x1112 | PASS | PASS |
| 1024x768 | PASS | PASS |
| 1440x900 | PASS | PASS |

Ajustes aplicados:
- Desktop CTA oculto no mobile, mobile sticky CTA acima do bottom dock.
- `main` com padding top `pt-[72px]` para header sticky e padding bottom `pb-[calc(var(--kf-nav-h)+5rem)]` para CTA/dock.
- Conteúdo final acessível; footer visível sem conteúdo bloqueado.

### Regressão
| Suite | Status |
|---|---|
| Storefront typecheck | PASS |
| Storefront build | PASS |
| Shared UI tests | PASS |
| Admin build | PASS |
| Mobile typecheck | PASS |
| Print-agent tests | PASS |
| E2E Checkout | PASS (17/17) |
| Server tests | FAIL (15 failed, 13 passed) — baseline preexistente |

### Server Baseline
- Comando: `git diff 9779780 -- packages/server`
- Resultado: **nenhuma diferença** entre FASE 4 e FASE 5 no backend.
- Falhas de server (401 vs 403 em endpoints não checkout) são preexistentes e não introduzidas por esta fase.

### Bundle
- FASE 5: `index-Dqw-e8_a.js` = **492.638 bytes**
- Delta em relação à FASE 4 (~491 KB): **~1 KB** — dentro da variação esperada.

### Git
- `git diff --check`: PASS.
- Arquivos alterados:
  - `packages/shared-ui/src/components/Input.tsx`
  - `packages/shared-ui/src/components/ProductCard.tsx`
  - `packages/storefront/src/components/CartBar.tsx`
  - `packages/storefront/src/i18n/locales/{de,en,es,fr,it,pt}.json`
  - `packages/storefront/src/pages/Checkout.tsx`
  - `packages/storefront/src/pages/OrderConfirmation.tsx`
- Arquivos novos:
  - `docs/frontend-v2/FASE5-CHECKOUT-AUDIT.md`
  - `packages/storefront/e2e/checkout-v2.spec.ts`
- **Commit ainda NÃO realizado**.

### Problemas restantes
- Nenhum problema funcional/UX identificado.
- Server tests com falhas preexistentes não são regressão da FASE 5.

### Próximo passo
Autorização para commit `feat(storefront): finalize checkout v2`.
