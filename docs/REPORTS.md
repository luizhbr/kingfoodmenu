# Reports / Analytics — King Food Foundation

> **Status:** P8 = PASS (2026-08-12)

## Arquitetura

- `reports-service.ts` — métricas SERVER-SIDE via SQL aggregation (COUNT/SUM/GROUP BY)
- `reports.controller.ts` — validação de período (zod) + timezone fixa
- `reports.routes.ts` — RBAC MANAGER/SUPER_ADMIN
- `Reports.tsx` (admin) — dashboard visual com filtro de período

## Timezone

- **America/New_York** (Columbus, OH — dia comercial do restaurante)
- Vercel roda UTC → "today" seria errado sem conversão
- `computeRange()` calcula instantes UTC a partir do fuso alvo
- Testado: midnight, mudança de dia/mês, custom range

## Períodos

`today | yesterday | 7d | 30d | month | prevMonth | custom(start,end)`

## Métricas e fórmulas (fonte no banco)

| Métrica | Fórmula | Fonte |
|---------|---------|-------|
| Orders | COUNT(orders no período) | orders.createdAt |
| Revenue (Net) | SUM(total) status≠CANCELLED | orders.total |
| Gross Sales | SUM(subtotal+tax+deliveryFee) | orders |
| Discounts | SUM(discount) | orders.discount |
| AOV | revenue / orders não-cancelados | — |
| Customers | COUNT(customers) | customers |
| New Customers | COUNT(customers criados no período) | customers.createdAt |
| Repeat Customers | ≥2 pedidos lifetime, ativos no período | orders |
| Items Sold | SUM(quantity) | order_items |
| Top Products | GROUP BY name, SUM(quantity+subtotal) | order_items |
| Top Categories | JOIN categories, SUM(subtotal) | order_items→menu_items→categories |
| Coupons | COUNT + SUM(discountAmount) | coupon_usages (ledger) |
| Loyalty | GROUP BY type (EARN/REDEEM/ADJUST) | loyalty_transactions |
| Cashback | GROUP BY type (CREDIT/DEBIT/REVERSAL/ADJUSTMENT) | cashback_transactions |
| Delivery | COUNT por orderType DELIVERY + status | orders |
| Driver perf | assigned/delivered/completionRate | orders.assignedToId |
| Attribution | GROUP BY source | order_attributions |

**PROFIT: NÃO implementado** — sem CMV/cost confiável (documentado, não inventado).

## APIs

| Method | Path | RBAC |
|--------|------|------|
| GET | /api/reports/overview | MANAGER+ |
| GET | /api/reports/sales | MANAGER+ |
| GET | /api/reports/products | MANAGER+ |
| GET | /api/reports/marketing | MANAGER+ |
| GET | /api/reports/loyalty | MANAGER+ |
| GET | /api/reports/delivery | MANAGER+ |

## Segurança

- Anonymous → 401 | Customer → 403 | Driver → 403 | Staff → 403
- Manager/Admin → 200
- **requireRole (NÃO requireStaff)** — DRIVER não vaza para reports
- Nenhum valor financeiro vem do cliente (tudo server-side)
- Filtros validados com zod (period inválido → 400)

## P9 — Excel Export

- `GET /api/reports/export` (MANAGER+) — XLSX com 9 abas
- Mesma camada de dados (reports-service) — sem duplicação
- Ver EXCEL_EXPORT.md

## Testes

- Unit: 14 novos (94/94 total) — timezone, períodos, AOV, gross/net, completion rate
- Local: RBAC 5 papéis, endpoints 6/6, período inválido 400
- Produção: P8-PROD-001..014 PASS
- Neon: orders=45/revenue=680.94, coupons=12, cashback 4CR/4DB/2RV, loyalty 147 — batem com API
