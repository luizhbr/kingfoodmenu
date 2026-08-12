[[00 - Home]]

# Reports

## P8 — Reports/Analytics (PASS 2026-08-12)

- **Métricas server-side** (SQL aggregation, nada do cliente)
- **Timezone:** America/New_York (dia comercial do restaurante)
- **Períodos:** today/yesterday/7d/30d/month/prevMonth/custom
- **RBAC:** MANAGER+ (requireRole, NÃO requireStaff — driver bloqueado)
- **Endpoints:** /api/reports/{overview,sales,products,marketing,loyalty,delivery}
- **Profit:** NÃO implementado (sem CMV confiável — documentado)
- **Fontes:** orders, order_items, coupon_usages, loyalty_transactions,
  cashback_transactions, order_attributions, orders.assignedToId

Ver [[Coupon]], [[Cashback]], [[Driver]], [[04 - Orders]].
