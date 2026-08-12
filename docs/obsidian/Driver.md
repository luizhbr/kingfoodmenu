[[00 - Home]]

# Driver

## P7 — Driver Delivery App (PASS 2026-08-12)

- **Role:** DRIVER (User-based, JWT)
- **Atribuição:** Order.assignedToId (reutilizado)
- **State machine:** READY → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED
- **IDOR-safe:** driver só vê/atualiza pedidos próprios
- **UI:** mobile-first PWA em /driver/* (polling 15s)
- **Segurança:** requireDriver, transições server-side, status implícito

Ver [[04 - Orders]] e [[PWA]].
