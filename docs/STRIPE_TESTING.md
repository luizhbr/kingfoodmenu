# Stripe Testing — King Food Foundation

> P15.6 (2026-08-12) — STRIPE TEST MODE

## Estado

- Stripe TEST MODE: **CONFIGURATION PENDING** (nenhuma env presente)
- Vars necessárias (nomes reais usados pelo código):
  - `STRIPE_SECRET_KEY` (produção Vercel + opcional SiteSettings)
  - `STRIPE_WEBHOOK_SECRET` (produção Vercel)
- `STRIPE_PUBLISHABLE_KEY` NÃO é usada pelo código (hosted checkout/PaymentSheet
  não a requerem no servidor)

## Como ativar TEST MODE

1. Stripe Dashboard → Developers → API keys → copiar `sk_test_...`
2. Vercel → Project → Settings → Environment Variables:
   - `STRIPE_SECRET_KEY` = sk_test_...
3. Stripe → Webhooks → Add endpoint:
   - URL: `https://king-food-foundation-ui.vercel.app/api/payments/webhook`
   - Eventos: payment_intent.succeeded, payment_intent.payment_failed,
     checkout.session.completed, charge.refunded
   - Copiar `whsec_...` → `STRIPE_WEBHOOK_SECRET` na Vercel
4. Redeploy (ou esperar env refresh)
5. Alternativa: configurar via Admin → Settings → paymentSettings
   (chaves mascaradas na API)

## Testes manuais (test mode)

- Cartão de teste Stripe: 4242 4242 4242 4242 (qualquer CVV/data futura)
- Recusado: 4000 0000 0000 0002
- 3DS: 4000 0025 0000 3155

## Validação end-to-end

1. Checkout → Stripe hosted page → cartão 4242 → sucesso
2. Webhook payment_intent.succeeded → Payment COMPLETED
3. Order → CONFIRMED
4. Admin → refund → webhook charge.refunded → Payment REFUNDED
5. Cartão recusado → payment_intent.payment_failed → Payment FAILED

## Testes automatizados (152 unit total)

- 12 novos stripe-security: fail-fast, USD, IDOR ×2 paths, idempotência,
  refund endpoint+rota, charge.refunded, constructEvent, maskSecret
