[[KING_FOOD_MASTER_INDEX]]

# King Print

## P15 — KING PRINT (PASS 2026-08-12)

- **Backend completo:** PrintJob + Printer (Neon), API /api/print/*,
  print-service (idempotência, state machine, pairing, ticket)
- **Arquitetura:** API REST + polling + agente local (escpos MIT)
- **Idempotência:** @@unique(orderId, type, printerId) — 10x concorrente → 1 job
- **Segurança:** RBAC MANAGER+/STAFF+, device token, pairing single-use
- **Testes:** 19 unit (140 total) + 14 local + 12 produção
- **Pendente:** print agent CLI, Admin UI, Kitchen integration

Ver [[KING_FOOD_MASTER_INDEX]] e [[12 - Roadmap]].
