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
| P5 Coupons | ✅ 2026-08-12 (server-side engine + ledger) |
| P6 Cashback | ✅ 2026-08-12 (wallet+ledger, credit on delivery) |
| P7 Driver App + PWA | ✅ 2026-08-12 (DRIVER role, state machine, mobile UI) |
| P8 Reports | ✅ 2026-08-12 (server-side metrics, timezone ET, RBAC MANAGER+) |
| P9 Excel Export | ✅ 2026-08-12 (9-sheet xlsx, same data layer, RBAC MANAGER+) |
| P13 Security Hardening | ✅ 2026-08-12 (JWT fail-fast, .claude untracked, catch logs) |
| P13.5 Auth Abuse Test | ✅ 2026-08-12 (brute-force/rate-limit/enumeration/JWT/RBAC — tudo PASS) |
| P13.6 Adaptive CAPTCHA | ✅ 2026-08-12 (Turnstile, fail-closed, risk-based, 17 unit) |
| P15 King Print | ✅ 2026-08-12 (backend: PrintJob+Printer, API, idempotência, pairing) |

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
| Coupons | ✅ P5 completo |
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

## KING PRINT — backend ✅ (P15) · agente CLI + UI = FUTURE

Solução própria de impressão térmica para o King Food (substituir
dependência externa tipo OlaClick). Investigar: PWA de impressão,
agente local, WebSocket/local bridge, ESC/POS, descoberta de
impressoras, fila+retry+idempotência, status da impressora,
arquitetura tipo QZ Tray, projetos open source compatíveis.
