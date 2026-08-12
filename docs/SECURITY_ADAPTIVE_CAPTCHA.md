# Adaptive CAPTCHA — Detalhes Técnicos

> P13.6 (2026-08-12)

## captcha-service.ts

- `isCaptchaEnabled()` — exige CAPTCHA_ENABLED + SITE_KEY + SECRET_KEY
- `recordAuthFailure(email, ip)` — incrementa risco (níveis 1/2/3)
- `recordAuthSuccess(email, ip)` — limpa risco
- `getRiskLevel(email, ip)` — nível atual (0-3)
- `verifyCaptchaToken(token, ip)` — siteverify server-side (5s timeout)
- `captchaPolicy(level)` — required/lockedOut

## Risk store

- In-memory Map (email+IP), TTL 15min, lockout 30min
- Suficiente para o footprint serverless atual (auth limiter já limita)
- Swap futuro: Redis/DB sem mudar a interface

## Testes (17 unit)

- disabled default, enabled com env, níveis 0/1/2/3, sucesso limpa,
  escopo por email+IP, policy, token vazio, no-op disabled,
  reused/expired, provider unreachable (fail-closed), token válido,
  nunca confia em captchaPassed

## Testes locais (CAPTCHA habilitado)

- nível 0 → login normal ✅
- 3 falhas → nível 1 → login sem token rejeitado ✅
- token forjado + provider unreachable → 401 (fail-closed) ✅
- captchaPassed=true sem token → 401 ✅

## Produção (camada inativa — sem chaves)

- P13.6-PROD-001..009 PASS (nada quebrado)
