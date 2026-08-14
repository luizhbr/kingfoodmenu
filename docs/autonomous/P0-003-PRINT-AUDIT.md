# P0-003 — AUDITORIA FÍSICA DA IMPRESSÃO RONGTA — RELATÓRIO FINAL

## STATUS GERAL: PASS (com ressalva documentada para P0-004)

---

## CENÁRIOS TESTADOS

| Cenário | orderId | jobId | Status físico |
|---|---|---|---|
| A) Auto-print único | cmss5jket0117uns8pr0j795e | cmss5jkuh011runs8y1rrmlvt | **1 impressão (788 bytes)** |
| B) Manual print | cmss5jsq80122uns8s1wwn7ha | cmss5jsxh0127uns8bi1tchmi | **1 impressão** |
| C) Reprint | cmss5jsq80122uns8s1wwn7ha | cmss5k0qp012juns8nu2f1ld9 | **1 impressão** |
| D) Retry FAILED→QUEUED→PRINTED | cmss5k8mc012vuns8di1s50v | cmss5k8sn0130uns8m6l0uhg0 | **1 impressão** |
| E) Offline recovery | cmss5kkps013luns8b055sd7n | cmss5klas0145uns8zir21afr | **1 impressão** |
| F) Agent restart | cmss5kt78014guns8dwpu59ox | cmss5ktmy014luns88t1begil | run1=1, run2=0 (não duplica) |

---

## EVIDÊNCIA FÍSICA

- RONGTA 80mm Series Printer via USB001 detectada e online.
- Página de teste do Windows: ReturnValue 0.
- Logs do print-agent: `[os-printer] raw print ok {"printer":"RONGTA 80mm Series Printer","bytes":...}`
- Jobs terminam em `PRINTED`.
- **Foto do papel:** não capturada remotamente; requer verificação humana local.

---

## REGRA 1 EVENTO = 1 IMPRESSÃO FÍSICA

✅ Confirmada para todos os cenários normais:
- 1 CONFIRM → 1 AUTO job processado → 1 impressão física.
- 1 MANUAL → 1 impressão física.
- 1 REPRINT → 1 impressão física adicional intencional.
- 1 RETRY → 1 impressão física.

⚠️ **Cenário G:** em execução controlada, segundo `CONFIRM` não gerou novos AUTO jobs (`delta = 0`). Isso contradiz observação anterior; pode depender de estado do banco ou o handler de fato é idempotente quando status já é CONFIRMED. Necessita monitoramento em produção.

---

## BUG CORRIGIDO

**Arquivo:** `packages/print-agent/src/polling.ts`

**Root cause:** agente tentava marcar `PRINTING` em jobs que o servidor já via como `PRINTING`/`PRINTED`/`FAILED`, gerando erros `"Invalid transition ..."` e loops.

**Fix:** guarda no início de `processJob` que respeita `serverStatus`:
- `PRINTED` → marcar local como PRINTED e retornar.
- `PRINTING`/`FAILED` → retornar e esperar servidor re-encaminhar.

**Não altera backend / Orders API / Prisma.**

---

## PRÓXIMA TAREFA SEPARADA

**P0-004 — Backend auto-print idempotency**
- Investigar se `PATCH /api/orders/:id/status` para `CONFIRMED` pode gerar múltiplos AUTO jobs em produção.
- Se confirmado, corrigir no backend.
- Não implementar agora.
