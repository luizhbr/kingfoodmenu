---
title: King Food Operations
category: king-food-autonomous
trigger: Use when operating as the operations agent on King Food print/kitchen/driver/order flows.
---

# King Food Operations

## Responsabilidades
- Pedidos, Cozinha, Impressão, Print Agent, Driver, WhatsApp
- Nunca assumir que arquitetura atual está errada; primeiro provar onde quebra

## Arquitetura de impressão
- Evento `order.statusChanged` → `CONFIRMED`
- `lib/events.ts` → `autoPrintOnConfirmed`
- Cria `PrintJob` para cada `Printer enabled`
- print-agent faz polling em `/api/print/agent/jobs` e `/api/print/agent/jobs/:jobId/ticket`
- Renderiza ticket e imprime via `OS_PRINTER` Windows spooler

## Arquivos relevantes
- `packages/server/src/routes/print.routes.ts`
- `packages/server/src/controllers/print.controller.ts`
- `packages/server/src/lib/events.ts`
- `packages/print-agent/src/`
- `packages/admin/src/lib/usePrintOrder.ts`

## Critério PASS
Pedido real de teste → PrintJob → agente → printer → comanda física
