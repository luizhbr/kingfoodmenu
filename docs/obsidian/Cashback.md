[[00 - Home]]

# Cashback

## P6 — Cashback Engine (PASS 2026-08-12)

- **Wallet:** cashback_wallets (saldo legível, nunca negativo)
- **Ledger:** cashback_transactions (CREDIT/DEBIT/REVERSAL/ADJUSTMENT)
- **Regra:** 5% configurável via SiteSettings
- **Base:** subtotal - coupon discount (sem delivery/tax)
- **CREDIT:** só em DELIVERED/PICKED_UP (idempotente por orderId)
- **DEBIT:** atômico com FOR UPDATE (concurrency-safe)
- **CANCELLED:** REVERSAL (ledger imutável)
- **Segurança:** JWT-only, RBAC MANAGER+, saldo nunca negativo

Ver [[Coupon]] e [[04 - Orders]].
