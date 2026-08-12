# KING PRINT — Thermal Printing System

> **Status:** P15 = PASS (2026-08-12)

## O que é

Sistema próprio de impressão térmica do King Food. Quando um pedido é
confirmado, um PRINT JOB entra na fila, um agente local (bridge) busca
o job, imprime em impressora térmica e reporta o status.

## Arquitetura

```
KING FOOD CLOUD (Vercel)
       │ HTTPS
       ▼
PRINT JOB API (/api/print/*)
       │
       ▼
PRINT QUEUE (print_jobs no Neon)
       │
       ▼
LOCAL PRINT AGENT (packages/print-agent — futuro)
       │
       ├── USB / OS Printer
       └── ESC/POS
              ▼
        THERMAL PRINTER
```

O browser/PWA NÃO conhece USB/porta/IP da impressora — o agente cuida.

## Modelos (migration 20260812140000_add_king_print)

- **Printer**: name, type (USB/NETWORK/OS_PRINTER), paperWidth (58/80),
  status, enabled, lastSeenAt, deviceId (unique), pairingCode (unique)
- **PrintJob**: orderId, printerId, type (AUTO/REPRINT), status,
  attempts, idempotencyKey (unique), errorCode/Message, requestedById

## State machine

```
QUEUED → PRINTING → PRINTED
  │         │
  └──FAILED─┘
  FAILED → QUEUED (retry)
  QUEUED → CANCELLED
```

- PRINTED → qualquer coisa = INVÁLIDO (nunca imprime 2x)
- Retry só de FAILED → QUEUED

## Idempotência

- `@@unique([orderId, type, printerId])` — 1 job por pedido+impressora+tipo
- `idempotencyKey = orderId:type:printerId`
- Testado: 10 requests simultâneos → 1 job

## Segurança

- RBAC: printers = MANAGER+; jobs = STAFF+ (kitchen)
- Device token: `Authorization: Device <token>` (não é JWT de usuário)
- Pairing: código 8 hex, expira 10min, single-use (limpo no pair)
- CSRF: skip para /api/print/agent/ (agente local, sem cookies)
- Pedido cancelado → 400; printer desabilitado → 400
- Customer → 403; device sem token → 401

## Ticket (comanda)

- `buildKitchenTicket(orderId)` — dados normalizados (sem dados sensíveis)
- `renderTicketText(ticket, paperWidth)` — texto ESC/POS friendly
- Conteúdo: KING FOOD, #pedido, hora, itens+qty+opções, tipo,
  cliente, endereço, observação

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| GET/POST | /api/print | MANAGER+ |
| PUT/DELETE | /api/print/:id | MANAGER+ |
| POST | /api/print/:id/pairing | MANAGER+ |
| POST | /api/print/jobs | STAFF+ |
| GET | /api/print/jobs | STAFF+ |
| POST | /api/print/jobs/:id/retry | STAFF+ |
| POST | /api/print/jobs/:id/cancel | STAFF+ |
| POST | /api/print/agent/pair | público (código) |
| POST | /api/print/agent/heartbeat | Device |
| GET | /api/print/agent/jobs | Device |
| POST | /api/print/agent/status | Device |
| GET | /api/print/agent/jobs/:jobId/ticket | Device |

## Testes

- Unit: 19 novos (140/140 total)
- Local: 14/14 (fluxo completo, concorrência, RBAC, replay)
- Produção: P15-PROD-001..012 PASS
- Neon: printers=6, print_jobs=5 (3 QUEUED, 2 PRINTED)

## Print Agent (próximo passo)

`packages/print-agent` — CLI Node que: autentica com device token,
faz polling de jobs, imprime via escpos (MIT), reporta status,
heartbeat, retry com backoff. Não implementado ainda (backend pronto).
