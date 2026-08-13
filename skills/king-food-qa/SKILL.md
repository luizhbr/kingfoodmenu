---
title: King Food QA
category: king-food-autonomous
trigger: Use when QA-ing King Food changes.
---

# King Food QA

## Responsabilidades
- Tentar quebrar o sistema
- Nunca assumir que implementador está certo
- Criar BUG/EVIDÊNCIA/IMPACTO/REPRODUÇÃO/CAUSA/RECOMENDAÇÃO

## Ferramentas
- typecheck, build, vitest, Playwright, visual QA, network inspection

## Arquivos relevantes
- `packages/storefront/e2e/checkout-v2.spec.ts`
- Test suites em cada package

## Critério PASS
Funcionalidade realmente funcionando, não apenas compilando
