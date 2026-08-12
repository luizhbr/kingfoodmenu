# Stripe Security — King Food Foundation

> **Status:** P15.6 (2026-08-12) — TEST MODE only, nunca LIVE

## Fail-fast (sem fallback inseguro)

- `lib/stripe.ts` — `resolveStripeSecretKey()`:
  - env `STRIPE_SECRET_KEY` tem prioridade
  - produção + chave ausente → `null` → `getStripe()` lança erro claro
  - dev/test: placeholder SOMENTE para testes unitários (nunca alcança produção)
- Default export lazy (Proxy) — importar o módulo NÃO crasha o app quando
  Stripe não está configurado; falha apenas quando Stripe é usado
- Placeholder antigo `sk_tes...lder` ELIMINADO (teste de fonte garante)

## Currency

- **USD** (Columbus, Ohio) — corrigido de EUR
- Sempre server-side; cliente nunca envia currency

## IDOR (ownership)

- `isOrderOwner(req, order)`:
  - customer autenticado cujo customerId == order.customerId ✅
  - staff/kitchen (admin flow) ✅
  - guest checkout: guestEmail do pedido (mecanismo existente) ✅
- Non-owner → 403 (testado em produção)
- Pedido inexistente → 404

## Idempotência do PaymentIntent

- `findActivePayment(orderId)` — reutiliza Payment PENDING existente
- Retry/concurrent → mesmo intent (`reused: true`)
- COMPLETED → 409 "Order already paid"
- Proteção de concorrência via unique + lookup

## Webhook

- `constructEvent` com `STRIPE_WEBHOOK_SECRET` (assinatura obrigatória)
- Raw body (`express.raw`)
- Eventos: payment_intent.succeeded, payment_intent.payment_failed,
  checkout.session.completed, charge.refunded (novo)
- Sem assinatura válida → 400/500 fail-closed, NENHUMA alteração no banco
- Atualizações por updateMany(transactionId) — idempotente por natureza

## Refund (MANAGER+)

- POST /api/payments/refund — RBAC requireRole(SUPER_ADMIN, MANAGER)
- Valida: payment existe (404), COMPLETED (400), STRIPE + transactionId
- Amount server-side (payment.amount, nunca do cliente)
- Registra AuditLog (action=PAYMENT_REFUNDED, entity=Payment)
- charge.refunded webhook confirma o estado final

## NUNCA aceitar do cliente

- `paid=true`, `status=PAID`, `paymentStatus=PAID` → ignorados
- A confirmação vem SOMENTE do webhook assinado
- Amount/currency sempre do servidor/banco

## Testes

- 12 unit (fail-fast, USD, IDOR, idempotência, refund, webhook, secrets)
- Local: IDOR 403, refund 403, pedido inexistente 404, webhook fail-closed
- Produção: fail-fast msg limpa, IDOR 403, refund RBAC 403, storefront 200
