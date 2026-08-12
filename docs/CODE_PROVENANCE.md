# Code Provenance — King Food Foundation

> **Data:** 2026-08-12
> **Fonte da verdade:** git (merge-base e0359f7 vs HEAD)

## Classificação por área

| Área | Classe | Detalhe |
|------|--------|---------|
| packages/server/src | B — MODIFIED_SOURCE | 27 arquivos herdados modificados + novos (tracking, dashboard, attribution, menu sku/cost) |
| packages/storefront/src | B — MODIFIED_SOURCE | 26 herdados modificados (checkout, CSRF, i18n rebrand) |
| packages/admin/src | B — MODIFIED_SOURCE | 8 modificados (dashboard, menu, layout, login, branding) |
| api/ | C — KING_FOOD_NEW | serverless handler criado pelo King Food (0f8da82) |
| docs/ | C — KING_FOOD_NEW | documentação completa P14 |
| prisma/migrations/*20260812* | C — KING_FOOD_NEW | 3 migrations novas (placeId+snapshot, idempotency, sku+cost) |
| prisma/schema.prisma | B — MODIFIED_SOURCE | schema herdado + enums/campos novos |
| packages/server/src/routes/*.routes.ts | B — MODIFIED_SOURCE | routers herdados; tracking/campaign/qrcode montados pelo King Food |
| packages/shared | A — ORIGINAL_SOURCE | herdado, sem modificações |
| packages/docs | A — ORIGINAL_SOURCE | herdado (referencia mighty840 — docs antigas) |
| packages/mobile | A — ORIGINAL_SOURCE | herdado, não deployado |
| assets/logo.svg | A — ORIGINAL_SOURCE | herdado, NÃO usado em produção |

## Herdado sem modificação

- **358 arquivos** em packages/ idênticos ao merge-base (código original KitchenAsty)
- packages/shared, packages/mobile, packages/docs, Dockerfiles, nginx.conf

## Criado pelo King Food (90 arquivos novos)

- api/ (serverless), docs/ completo, migrations novas, tracking/campaign/qrcode routers,
  attribution persist, idempotency, kitchen polling, dashboard fix, menu sku/cost,
  DEVELOPMENT_RULES.md, CONTRIBUTING.md

## Modificado pelo King Food (79 arquivos)

- 27 server, 26 storefront, 8 admin, schema.prisma, seed, vercel.json, package.json

## Removidos

- Nenhum arquivo removido do merge-base.

## Rebranding aplicado (P2.5)

| Arquivo | Antes | Depois |
|---------|-------|--------|
| admin/index.html | KitchenAsty Admin | King Food Admin |
| AdminLayout.tsx | KitchenAsty (h1) | King Food |
| Login.tsx | KitchenAsty (h1) | King Food |
| AcceptInvite.tsx | KitchenAsty (h1) | King Food |
| DesignBranding.tsx | placeholder KitchenAsty | King Food |
| SettingsMail.tsx | KitchenAsty | King Food |
| i18n (6 idiomas) | KitchenAsty | King Food |

> package.json names (@kitchenasty/*) mantidos como identificadores internos —
> sem impacto no produto visível.

## Dependências adicionadas (P9–P13.6)

| Pacote | Versão | Licença | Copyleft? | Uso |
|--------|--------|---------|-----------|-----|
| exceljs | ^4.4.0 | MIT | Não | Geração XLSX (P9) |
| Cloudflare Turnstile | — (API externa) | ToS Cloudflare | Não | CAPTCHA adaptativo (P13.6) — sem lib npm, chamada siteverify direta |

Nenhuma dependência com copyleft ou restrição comercial adicionada.
Attribution MIT preservada (THIRD_PARTY_NOTICES.md).
