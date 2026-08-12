# Roadmap — King Food Foundation

> **Atualizado:** 2026-08-12

## DONE

| Item | Evidência |
|------|-----------|
| P7 Admin/POS | ✅ |
| P8 Kitchen (polling) | ✅ commit c9f5f63 |
| P10 Security | ✅ 401/403/200 testado |
| P12 Sales Attribution | ✅ commit b43e166 + produção |
| P13 Customer Journey | ✅ commit 86a0570 + produção + Neon |
| P14 Documentation | ✅ esta documentação |
| P15 Final Smoke Test | ✅ 2026-08-12 (1 bug corrigido: OrderAttribution) |
| P2 Admin Menu CRUD | ✅ 2026-08-12 (sku+cost, isActive filtering) |
| P2.5 License + Provenance | ✅ 2026-08-12 (MIT verified, rebranding) |
| P3 Customer Profile | ✅ 2026-08-12 (profile + order history IDOR-safe) |

## IN PROGRESS

| Item | Status |
|------|--------|
| P15 Final Smoke Test | ✅ concluído |

## NEXT

| Item | Detalhe |
|------|---------|
| P2 Admin Menu CRUD | ✅ concluído |
| Auditoria de consistência | rotas/models/frontend (parcialmente feita) |

## FUTURE

| Item | Detalhe |
|------|---------|
| Coupons | avançado (já existe CRUD básico) |
| Cashback | — |
| Loyalty | avançado (já existe básico) |
| Driver PWA | app de entregador |
| Reports | relatórios |
| Excel/CSV export | exportação |
| Campaigns | builder/tracking no admin |
| QR code generation | no admin |
| UX PRO | redesign (NÃO agora) |
| SaaS Architecture | multi-tenant (model Store existe) |

## BLOCKED

| Item | Motivo |
|------|--------|
| P11 Google Maps | sem API key |

## Regra

IMPLEMENTED ≠ PASS. PASS exige: CODE + TYPECHECK + BUILD + TEST + DEPLOY +
PRODUCTION TEST + DATABASE VERIFY (quando aplicável).
