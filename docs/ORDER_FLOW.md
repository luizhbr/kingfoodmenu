# Order Flow — Ciclo de Vida do Pedido

## Fluxo completo

```
MENU (storefront)
   │
   ▼
CART (client-side)
   │
   ▼
CHECKOUT (guest ou customer autenticado)
   │
   ├── Address (com placeId se Google Maps ativo)
   ├── Delivery Zone (check via /api/locations/:id/delivery-zones/check)
   ├── Delivery fee (vem do servidor)
   ├── Minimum order (validado no servidor)
   │
   ▼
CREATE ORDER (POST /api/orders)
   │
   ├── idempotencyKey (evita duplicação)
   ├── CSRF token (browser) ou Bearer (API)
   ├── Preços calculados NO SERVIDOR (nunca confiar no cliente)
   ├── OrderAttribution (first/last touch persistido)
   │
   ▼
NEON (persistência)
   │
   ▼
ADMIN (lista de pedidos)
   │
   ▼
KITCHEN (polling 15s)
   │
   ▼
STATUS UPDATE (PATCH /api/orders/:id/status)
   │
   ▼
DELIVERY / PICKUP
   │
   ▼
DELIVERED / PICKED_UP
```

## Ciclo de status

```
PENDING
   │
   ▼
CONFIRMED
   │
   ▼
PREPARING
   │
   ▼
READY
   │
   ├──► OUT_FOR_DELIVERY ──► DELIVERED
   │
   └──► PICKED_UP
```

- **DELIVERED** — pedido de entrega concluído
- **PICKED_UP** — pedido retirado no balcão
- **CANCELLED** — cancelado (excluído da receita)

## Idempotency (commit ca7ef02)

- `Order.idempotencyKey` — chave única por tentativa de checkout
- Duplo submit retorna o MESMO pedido (sem duplicação)
- Verificado: 2 POSTs com mesma chave → 1 pedido

## Segurança do pedido

| Regra | Implementação |
|-------|---------------|
| Preço do servidor | Controller recalcula total a partir do banco |
| Delivery fee | Vem da DeliveryZone (servidor) |
| Minimum order | Validado no servidor |
| CSRF | Obrigatório para POST sem Bearer |
| Auth | Guest checkout permitido; customer autenticado via JWT |
| IDOR | `requireOwnership('order')` — cliente só vê pedidos próprios |

## OrderAttribution

- Persistido no `createOrder` (commit b43e166)
- Captura first/last touch do cliente no momento do pedido
- Campos: source, medium, campaign, content, term, landingPage, referrer, conversionPath
