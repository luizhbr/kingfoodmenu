[[KING_FOOD_MASTER_INDEX]]

# Stripe

## P15.6 — Stripe Hardening (PASS 2026-08-12)

- **Fail-fast:** sem fallback fake em produção; import lazy (não crasha app)
- **USD** (era EUR) — Columbus, Ohio
- **IDOR:** isOrderOwner (customer/staff/guestEmail) → 403
- **Idempotência:** PaymentIntent reutilizado em retry/concorrência
- **Webhook:** +charge.refunded; assinatura obrigatória; fail-closed
- **Refund:** MANAGER+ com AuditLog
- **TEST MODE:** CONFIGURATION PENDING (chaves ausentes — documentado)

Ver [[KING_FOOD_MASTER_INDEX]].
