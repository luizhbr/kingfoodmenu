[[00 - Home]]

# Customer

## P3 — Customer Profile (PASS 2026-08-12)

- **Endpoints:** GET/PATCH /api/customer/profile, GET /api/customer/orders
- **Identidade:** vem do JWT, nunca de customerId do cliente (IDOR-safe)
- **Checkout:** guest preservado; autenticado persiste customerId
- **Base para:** loyalty (P4), coupons, cashback, referrals

Ver [[03 - Database]] e [[04 - Orders]].
