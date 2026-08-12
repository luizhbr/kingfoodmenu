# Admin / POS — King Food Foundation

> **URL:** https://king-food-foundation-ui.vercel.app/admin/
> **Stack:** React + Vite (base path `/admin/`)

## Funcionalidades

| Área | Status |
|------|--------|
| Login (staff) | ✅ IMPLEMENTADO (CSRF + JWT) |
| Dashboard (stats) | ✅ IMPLEMENTADO (corrigido c3600a2 — pendingOrders) |
| Lista de pedidos | ✅ IMPLEMENTADO |
| Detalhe do pedido | ✅ IMPLEMENTADO |
| Alteração de status | ✅ IMPLEMENTADO (PATCH /api/orders/:id/status) |
| Menu CRUD (categorias, itens, alérgenos, mealtimes) | ✅ IMPLEMENTADO |
| Kitchen Display | ✅ IMPLEMENTADO (polling 15s) |
| Reservas | ✅ IMPLEMENTADO |
| Cupons | ✅ IMPLEMENTADO |
| Reviews (moderação) | ✅ IMPLEMENTADO |
| Settings (geral, pedido, reserva, mail, pagamento, review, avançado) | ✅ IMPLEMENTADO |
| Staff (convite, CRUD) | ✅ IMPLEMENTADO |
| Galeria | ✅ IMPLEMENTADO |
| Mídia (uploads) | ✅ IMPLEMENTADO |
| Loyalty (ajuste de pontos) | ✅ IMPLEMENTADO |
| Automation rules | ✅ IMPLEMENTADO |
| Developer (métricas, audit logs) | ✅ IMPLEMENTADO |
| Analytics | ✅ IMPLEMENTADO |
| **Customers (CRM completo)** | ⚠️ PARCIAL — lista básica |
| **Promotions management** | ❌ PENDENTE |
| **Campaigns builder/tracking** | ❌ PENDENTE |
| **QR code generation** | ❌ PENDENTE |
| **Attribution reports** | ❌ PENDENTE |

## Roles no admin

- SUPER_ADMIN: tudo
- MANAGER: menu, pedidos, analytics, staff parcial
- STAFF: pedidos, kitchen, reservas

## Kitchen

Ver [KITCHEN.md](./KITCHEN.md)
