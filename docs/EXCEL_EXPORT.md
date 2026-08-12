# Excel Export — King Food Foundation

> **Status:** P9 = PASS (2026-08-12)

## Arquitetura

**«Reports calcula. Excel exporta.»**

- `reports-service.ts` — única fonte de verdade (cálculos)
- `excel-service.ts` — consome as MESMAS funções (zero duplicação)
- `GET /api/reports/export` — gera workbook em memória, retorna buffer

```
Reports Service → Normalized Report Data → Excel Export
```

## Biblioteca

- **exceljs** ^4.4.0 (MIT) — instalado em packages/server

## Endpoint

```
GET /api/reports/export?period=30d&tz=America/New_York&start=&end=
```

- RBAC: MANAGER/SUPER_ADMIN (requireRole — driver/staff/customer bloqueados)
- Resposta: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Filename: `king-food-report-YYYY-MM-DD.xlsx`
- Período inválido → 400 (zod), nunca crash

## Abas (9)

| Aba | Conteúdo |
|-----|----------|
| Summary | período, timezone, orders, gross/net, discounts, AOV, coupons, loyalty, cashback, delivery |
| Sales | daily trend: date, orders, gross, discounts, net, AOV |
| Orders | ordem detalhada: #, data, status, type, customer, subtotal, discount, fee, tax, total, coupon, attribution, driver |
| Products | top 50: product, qty, sales, orders |
| Categories | top 50: category, qty, sales |
| Marketing | attribution by source + coupon usage |
| Loyalty | earned/redeemed/adjusted |
| Cashback | credited/used/reversed/adjusted (ledger) |
| Delivery | delivery metrics + driver performance |

## Permissões

| Papel | Acesso |
|-------|--------|
| Anonymous | 401 |
| Customer | 403 |
| Driver | 403 |
| Staff | 403 |
| Manager | 200 |
| SUPER_ADMIN | 200 |

## Timezone

- America/New_York fixo (fallback)
- Dia comercial do restaurante — Vercel roda UTC
- Testado: today/yesterday/7d/30d/month/prevMonth/custom

## Frontend

- Botão "Export Excel" no Reports.tsx (admin)
- Estados: idle/exporting/success/error
- Bloqueia múltiplos cliques, baixa automaticamente

## Cross-check

XLSX (produção) == API (produção) == Neon — verificado:
orders=45, gross=712.11, net=680.94, AOV=15.84, coupons=12, loyalty=147, cashback=2.8

## Testes

- Unit: 10 novos (104/104 total)
- Local: RBAC + XLSX real (17173 bytes) + period inválido 400
- Produção: P9-PROD-001..008 PASS

## Limitações

- Orders: até 2000 registros por export (paginável no futuro)
- **PROFIT/CMV NÃO FAZ PARTE DO P9** — sem CMV confiável no sistema
- Sem filtros de status/tipo no export (usar período)

## Produção

- URL: https://king-food-foundation-ui.vercel.app
- Commit: d056078 (feat) + [docs commit]
