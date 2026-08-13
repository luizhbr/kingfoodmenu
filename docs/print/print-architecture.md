# Print Architecture — King Food (PRINT-V1)

## Fluxo completo

```
ADMIN UI (SettingsPrinters / OrderCard / OrderDetail / KitchenDisplay)
    ↓  POST /api/print/jobs  (Bearer, STAFF+)
API (print.controller.ts)
    ↓  createPrintJob (print-service.ts)
PRINT SERVICE
    ↓  idempotência @@unique(orderId, type, printerId)
PRINT JOB (Prisma: print_jobs)
    ↓  GET /api/print/agent/jobs  (Device token)
PRINT-AGENT (packages/print-agent, polling 2-3s)
    ↓  buildEscposBuffer → driver
DRIVER (OS_PRINTER winspool | USB escpos | NETWORK TCP 9100)
    ↓  raw bytes
IMPRESSORA (RONGTA 80mm USB001)
```

## State machine (print-service.ts — preservada)

```
QUEUED → PRINTING → PRINTED (terminal)
QUEUED → CANCELLED
QUEUED → FAILED
PRINTING → FAILED
FAILED → QUEUED (retry) | CANCELLED
```

## Idempotência (preservada)

- `@@unique([orderId, type, printerId])` + `idempotencyKey = orderId:type:printerId`
- Evento CONFIRMED duplicado → P2002 → job existente retornado (nunca duplica)
- Agent local: job PRINTED nunca reimprime

## Auto-print (preservada — events.ts)

- `order.statusChanged` → status CONFIRMED → job AUTO em TODAS impressoras enabled
- Nunca imprime antes da persistência (evento dispara pós-PATCH)

## Tipos de job

| type | orderId | Uso |
|------|---------|-----|
| AUTO | obrigatório | impressão automática ao confirmar |
| REPRINT | obrigatório | impressão manual / reimpressão |
| TEST | opcional (null) | teste real de impressora (renderiza buildPreviewOrder) |

## Print-agent (packages/print-agent)

- CLI: `king-print start|status|pair|test|config|unpair`
- Credenciais: `~/.king-print/credentials.json` (pairing, 0600)
- Config: env `KING_PRINT_*` (API_URL, PRINTER_TYPE, PRINTER_NAME, PAPER_WIDTH)
- `start` carrega credenciais salvas do pairing automaticamente
- Polling: fetch QUEUED/FAILED → PRINTING → ticket → print → PRINTED/FAILED
- Retry: servidor re-enfileira FAILED → QUEUED (máx 5 tentativas no agent)

## UI (nova camada PRINT-V1)

- `SettingsPrinters.tsx`: CRUD impressoras + status real + teste real + pairing + jobs recentes
- `usePrintOrder.ts`: hook compartilhado (OrderCard, OrderDetail, KitchenDisplay)
- Botões: 🖨 Imprimir (REPRINT) em pedidos; "Imprimir teste" cria job TEST real
- Feedback: Testando... → Teste enviado → Teste impresso ✓ / Falha ✕ / Timeout

## Endpoints

| Método | Path | Auth | Uso |
|--------|------|------|-----|
| GET/POST | /api/print | MANAGER+ | listar/criar impressoras |
| PUT/DELETE | /api/print/:id | MANAGER+ | editar/excluir |
| POST | /api/print/:id/pairing | MANAGER+ | gerar código de pareamento |
| POST | /api/print/jobs | STAFF+ | criar job (AUTO/REPRINT/TEST) |
| GET | /api/print/jobs | STAFF+ | listar jobs |
| POST | /api/print/jobs/:id/retry | STAFF+ | retry FAILED → QUEUED |
| POST | /api/print/agent/pair | — | trocar código por device token |
| POST | /api/print/agent/heartbeat | Device | manter ONLINE |
| GET | /api/print/agent/jobs | Device | buscar jobs |
| POST | /api/print/agent/status | Device | reportar PRINTING/PRINTED/FAILED |
| GET | /api/print/agent/jobs/:id/ticket | Device | baixar comanda |

## Migration (PRINT-V1)

- `20260813_print_test_jobs`: `ALTER TABLE print_jobs ALTER COLUMN orderId DROP NOT NULL`
- Aditiva — jobs existentes intocados; TEST jobs têm orderId null
