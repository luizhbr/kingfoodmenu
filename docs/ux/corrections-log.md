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

## 2026-08-19 — Bottom nav cobre conteúdo no admin (desktop/tablet) + touch targets

### Problema
A bottom nav fixa (62px) cobria conteúdo no admin em desktop/tablet: /manage (Registro de auditoria), /menu/items (Editar/Excluir), /orders (Próximo). O padding do main era 40px desktop / 24px tablet < 62px da nav.

### Causa raiz
AdminLayout usava `pb-28 lg:pb-10` (112px mobile / 40px desktop), mas a MobileBottomNav é `fixed bottom-0` em TODAS as larguras (arquitetura navegação única). Desktop/tablet ficavam com padding insuficiente.

### Correção
1. `.main-safe-bottom` em `packages/admin/src/index.css`: `padding-bottom: calc(4.75rem + env(safe-area-inset-bottom)) !important`
2. AdminLayout.tsx: `<main>` usa `main-safe-bottom` (76px + safe-area em todas larguras)

### Touch targets
QuantitySelector (shared-ui): botões −/+ de 40px → 44px (h-11 w-11) — WCAG.

### Validação
- Playwright 3 viewports × 3 páginas: crossing = 0 (antes: 1-2 elementos escondidos)
- Typecheck admin PASS, build admin PASS, build storefront PASS
- Produção: asset-hash convergiu (storefront index-lvVKRX-B.js, admin index-DR5b1z5z.js)
- Produção admin: mainPad 76px, crossing 0
- Produção touch: 44×44 allOk
- Checkout guest prod: campos visíveis, zero page errors

### Arquivos
- packages/admin/src/components/AdminLayout.tsx
- packages/admin/src/index.css
- packages/shared-ui/src/components/QuantitySelector.tsx

### Commits
- 07664f3 fix(admin): reserve space for fixed bottom nav on all widths
- 8e38b98 fix(shared-ui): QuantitySelector touch targets 44px min (WCAG)

### Deploy
- Produção: king-food-foundation-ui.vercel.app (2 deploys, ambos convergidos e validados)
