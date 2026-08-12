# CAPTCHA Security — King Food Foundation

> **Status:** P13.6 = PASS (2026-08-12)

## Provider selecionado: Cloudflare Turnstile

| Critério | Turnstile | reCAPTCHA | hCaptcha |
|----------|-----------|-----------|----------|
| Segurança anti-automação | ✅ forte | ✅ forte | ✅ forte |
| UX (managed/invisible) | ✅ melhor | ⚠️ v2 visível | ⚠️ |
| Mobile/PWA | ✅ | ✅ | ✅ |
| Privacidade (sem cookies/tracking) | ✅ | ❌ Google tracking | ⚠️ |
| Validação server-side | ✅ siteverify | ✅ | ✅ |
| Custo | ✅ grátis | ✅ grátis | ⚠️ pago |
| Integração | ✅ simples | ⚠️ | ⚠️ |

**CAPTCHA_PROVIDER_SELECTED:** Cloudflare Turnstile
**CAPTCHA_PROVIDER_REASON:** melhor UX (managed mode), sem cookies/tracking
(privacidade), grátis, siteverify server-side, compatível Vercel/mobile/PWA
**ALTERNATIVES_REJECTED:** reCAPTCHA (tracking Google + UX pior),
hCaptcha (managed mode inferior, custo)
**INTEGRATION_RISKS:** chaves exigem conta Cloudflare (credencial externa);
camada fica `CAPTCHA_ENABLED=false` até o operador prover as chaves

## Arquitetura

```
Frontend (login)
   |  consulta /api/auth/captcha-status
   v
Login Controller
   |--> Risk Assessment (falhas por email+IP)
   |--> Rate Limiter (preservado: strictLimiter/authLimiter)
   |--> CAPTCHA Service (verifyCaptchaToken → Cloudflare siteverify)
   |--> Password Verification (bcrypt)
   |--> JWT
   v
Authenticated User
```

## Estratégia adaptativa

| Nível | Condição | Comportamento |
|-------|----------|---------------|
| 0 | sem falhas | login normal (sem CAPTCHA) |
| 1 | ≥3 falhas | CAPTCHA obrigatório |
| 2 | ≥6 falhas | CAPTCHA obrigatório |
| 3 | ≥10 falhas | lockout 30min + CAPTCHA |

- Escopo por `email+IP` (anti-spraying distribuído)
- Sucesso limpa o contador
- Mensagens genéricas ("Unable to authenticate.") — sem enumeration

## Server-side verification (crítico)

- Frontend envia apenas o token do provider (`captchaToken`)
- Backend valida com Cloudflare `siteverify` (nunca confia em boolean)
- `captchaPassed=true` do cliente é IGNORADO (testado)
- Token: single-use, expira, associado ao domínio (validação do provider)

## Fail-safe (fail-closed)

- Provider inalcançável → login rejeitado (401) — NUNCA libera por padrão
- Testado: token forjado + provider unreachable → 401

## Secrets

- `CAPTCHA_SITE_KEY` (pública) → frontend via /captcha-status
- `CAPTCHA_SECRET_KEY` → SOMENTE server-side (Vercel env)
- Nenhum secret no repo/bundle/logs (secret scan PASS)

## Env vars

```
CAPTCHA_ENABLED=true|false (default false)
CAPTCHA_SITE_KEY=...
CAPTCHA_SECRET_KEY=...
```

## Endpoints protegidos

- POST /api/auth/staff/login (prioridade máxima)
- POST /api/auth/customer/login
- GET /api/auth/captcha-status (público — só enabled/siteKey/required)

## Não quebrado (verificado)

- Guest checkout ✅ | storefront ✅ | admin ✅ | RBAC ✅ | rate limit ✅
- Enumeration protection ✅ | JWT ✅ | driver/reports/excel ✅
