# Security Brute-Force Test — King Food Foundation

> **Status:** P13.5 = PASS (2026-08-12)
> **Tipo:** teste autorizado defensivo contra o próprio sistema

## Objetivo

Validar resistência da autenticação contra brute-force, password
spraying, enumeração de contas, manipulação de JWT e abuso de
endpoints de auth.

## Escopo e limites

- 10 tentativas por janela (limite do strictLimiter)
- 1 senha errada × 3 contas de teste (spraying)
- Sem wordlists, sem concorrência, sem evasão de rate limit
- Produção: volume controlado, parado ao primeiro 429

## Ambiente

- URL: https://king-food-foundation-ui.vercel.app
- Commit base: d1a3d14
- Deploy: P13 (e50ba39)

## Metodologia

| Fase | Teste | Resultado |
|------|-------|-----------|
| Baseline | login válido | ✅ 200, rate remaining 9/10 |
| Brute-force | 10 senhas erradas staff/login | ✅ 9× 401 + 1× 429 (Retry-After 38s) |
| Enumeração | email inexistente vs existente+errada | ✅ 401 + "Invalid credentials" idênticos |
| JWT malformado | abc.def.ghi | ✅ 401 |
| JWT assinatura inválida | secret errado | ✅ 401 |
| JWT alg=none | sem assinatura | ✅ 401 |
| RBAC | customer→staff/reports/driver | ✅ 403 × 3 |
| Spraying | 1 senha × 3 contas | ✅ 401 × 3 |
| Pós-bloqueio | login válido após Retry-After | ✅ 200 (recuperou) |
| DoS protection | storefront/menu pós-testes | ✅ 200 (sem crash) |

## Findings

| # | Severidade | Descrição | Status |
|---|-----------|-----------|--------|
| 1 | INFO | staff/login tem strictLimiter (10/min) + authLimiter (100/15min) — dupla proteção | ✅ |
| 2 | INFO | customer/login só tem authLimiter (100/15min) — sem strict | ✅ aceitável (menor risco) |
| 3 | INFO | tempo de resposta difere ~300ms entre email existente/inexistente (bcrypt) | ✅ não explorável (status+msg idênticos) |

## Correções

Nenhuma necessária — todos os controles funcionaram.

## Testes pós-fix

N/A (sem fix).

## Commit / Deploy

N/A (teste apenas, sem alteração de código).

## Data

2026-08-12
