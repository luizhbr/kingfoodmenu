# Driver Delivery App — King Food Foundation

> **Status:** P7 = PASS (2026-08-12)

## Arquitetura

- **Drivers = Users com role DRIVER** (reutiliza User + JWT + staff login)
- **Atribuição = Order.assignedToId** (relação "AssignedStaff" já existia no schema)
- **State machine = OrderStatus existente** (sem segunda máquina de estados)

## State Machine

```
READY → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED
```

- Transições validadas SERVER-SIDE (DRIVER_TRANSITIONS no driver.controller)
- Status implícito por endpoint (pickup → PICKED_UP, etc.) — nunca do body
- Transições inválidas → 400 (ex: DELIVERED → PICKED_UP, READY → DELIVERED)

## APIs

| Method | Path | Descrição |
|--------|------|-----------|
| GET | /api/driver/profile | Perfil do driver |
| GET | /api/driver/orders | Dashboard (assigned + available) |
| GET | /api/driver/orders/history | Histórico (DELIVERED/CANCELLED) |
| GET | /api/driver/orders/:id | Detalhe (IDOR-safe) |
| POST | /api/driver/orders/:id/accept | Atribuir pedido READY |
| POST | /api/driver/orders/:id/pickup | READY → PICKED_UP |
| POST | /api/driver/orders/:id/out-for-delivery | PICKED_UP → OUT_FOR_DELIVERY |
| POST | /api/driver/orders/:id/delivered | OUT_FOR_DELIVERY → DELIVERED |

## Segurança

- `requireDriver`: JWT + type=staff + role=DRIVER
- IDOR: driver só vê/atualiza pedidos atribuídos a ele (ou available)
- Driver B tentando pedido do Driver A → 403
- Pedido inexistente → 404
- Customer → 403 | Anonymous → 401 | Staff (não driver) → 403
- Driver NUNCA altera preço/subtotal/tax/discount — endpoints só mudam status

## Frontend (PWA)

- `/driver/login` — login próprio (staff/login, token em driver_token)
- `/driver` — dashboard com polling 15s (padrão kitchen)
- `/driver/orders/:id` — detalhe + fluxo de entrega
- `/driver/history` — entregas concluídas
- `/driver/profile` — perfil
- Mobile-first, standalone (fora do Layout do storefront)
- Reutiliza manifest.json + sw.js existentes

## Testes

- Unit: 10 testes state machine (80/80 total)
- Local: ciclo completo (accept→pickup→OFD→delivered), IDOR, RBAC, replay — PASS
- Produção: P7-PROD-001..009 PASS
- Neon: assignedToId persistido + role DRIVER ✅
