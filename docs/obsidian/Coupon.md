[[00 - Home]]

# Coupon

## P5 — Coupon Engine (PASS 2026-08-12)

- **Tipos:** PERCENTAGE, FIXED, FREE_DELIVERY
- **Validação 100% server-side** (cliente só envia o código)
- **Ledger:** coupon_usages (idempotente por orderId)
- **Limites:** usageLimit, perCustomerLimit, minOrder, maxDiscount, datas
- **Stacking:** 1 cupom por pedido
- **Coupon + Loyalty:** permitidos juntos (total nunca negativo)
- **Segurança:** RBAC staff, IDOR-safe, discountAmount falso ignorado

Ver [[04 - Orders]] e [[03 - Database]].
