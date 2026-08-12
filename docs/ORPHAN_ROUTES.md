# Rotas Órfãs — Review Required

> **Status:** NENHUMA foi deletada. Decisão pendente de revisão.
> **Data:** 2026-08-12 (auditoria)

## 1. attribution.routes.ts

| Item | Valor |
|------|-------|
| Endpoints | GET /customer/:id, GET /order/:orderId, GET /summary, GET /by-source |
| Montada no app.ts? | ❌ NÃO |
| Frontend usa? | ❌ NÃO |
| Controller usa? | ❌ NÃO (sem import em nenhum lugar) |
| Teste usa? | ❌ NÃO |
| Feature correspondente | Sales Attribution (P12) — mas a persistência é feita via order.controller + tracking.routes, NÃO via esta rota |
| Manter? | Sim, para consulta futura de atribuição |
| Implementar futuramente? | Sim — endpoints de consulta de atribuição por cliente/pedido |
| Pode remover? | Sim, sem impacto — mas manter por enquanto |

## 2. referral.routes.ts

| Item | Valor |
|------|-------|
| Endpoints | GET /, POST /, GET /:code |
| Montada no app.ts? | ❌ NÃO |
| Frontend usa? | ❌ NÃO |
| Controller usa? | ❌ NÃO |
| Teste usa? | ❌ NÃO |
| Feature correspondente | Programa de indicação (model Referral existe) |
| Manter? | Sim, para feature futura de indicação |
| Implementar futuramente? | Sim — programa de referência |
| Pode remover? | Sim, sem impacto — mas manter por enquanto |

## 3. webhook.routes.ts

| Item | Valor |
|------|-------|
| Endpoints | POST /n8n, GET /n8n/health |
| Montada no app.ts? | ❌ NÃO |
| Frontend usa? | ❌ NÃO |
| Controller usa? | ❌ NÃO |
| Teste usa? | ❌ NÃO |
| Feature correspondente | Integração n8n (automação) |
| Manter? | Sim, para integração futura com n8n |
| Implementar futuramente? | Sim — webhooks de automação externa |
| Pode remover? | Sim, sem impacto — mas manter por enquanto |

> **Nota:** o middleware `verifyWebhookSignature` existe e é usado em
> `/api/automation-rules/webhook` e `/api/payments/webhook` — mas o router
> `webhook.routes.ts` em si nunca foi montado.
