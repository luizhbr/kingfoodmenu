# KING PRINT — Testing

> P15 (2026-08-12)

## Unit (19 novos — 140/140 total)

- State machine: QUEUED→PRINTING→PRINTED, PRINTED bloqueado, FAILED→QUEUED
- Idempotência: create duplicado retorna existente, key = orderId:type:printerId
- Validação: printer 404, disabled 400, cancelled order 400, transição inválida
- Pairing: code 8 hex, expira, wrong code 401, expired 401, single-use
- Ticket: build inclui itens/opções, render tem #pedido, 58mm mais estreito

## Local (14/14)

- Fluxo completo: printer → pairing → pair → job → ticket → PRINTED
- Concorrência: 10 requests simultâneos → 1 job
- RBAC: customer 403, device sem token 401, token inválido 401
- Replay PRINTED→PRINTING → 400
- Pedido cancelado → 400

## Produção (P15-PROD-001..012)

- Admin login, printer create, pairing, pair, job create, idempotência,
  ticket, PRINTING→PRINTED, RBAC, menu público, storefront, Neon
