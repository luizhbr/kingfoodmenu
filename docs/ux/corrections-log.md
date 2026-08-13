# Corrections Log — King Food


## 2026-08-13 — PRINT-V1: camada UI + device

- **Problema:** backend/print-agent completos, mas sem UI de impressoras, sem ações de impressão em pedidos, agent não rodando, "Imprimir teste" era só renderização.
- **Causa raiz:** camada de UI nunca foi construída (P15/P15.1 entregou backend+agent).
- **Impacto:** operador não conseguia imprimir comanda nem testar impressora.
- **Solução:** SettingsPrinters (CRUD+status+teste real+pairing), usePrintOrder hook, 🖨 em OrderCard/OrderDetail/KitchenDisplay, agent com credenciais do pairing, job TEST sem orderId.
- **Bugs reais corrigidos:** (1) `require('crypto')` em ESM no print-agent (ReferenceError); (2) `cmdStart` não carregava credenciais salvas do pairing.
- **Arquivos:** ver git diff.
- **Testes:** server 174/174, print-agent 26/26, builds 6/6 PASS.
- **Impressão física:** 4× RONGTA (429/757/757/429 bytes) — TEST, REPRINT, AUTO, UI test.
- **Risco:** baixo (migration aditiva, backend preservado).
- **Rollback:** git revert + `ALTER TABLE print_jobs ALTER COLUMN orderId SET NOT NULL` (após limpar jobs TEST).
