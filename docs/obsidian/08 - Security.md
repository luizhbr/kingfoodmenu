[[KING_FOOD_MASTER_INDEX]]

# Security

## Camadas (todas verificadas em produção)

| Camada | Status |
|--------|--------|
| JWT (HS256, expiração 7d, secret real em prod) | ✅ |
| RBAC (SUPER_ADMIN/MANAGER/STAFF/DRIVER/CUSTOMER) | ✅ |
| CSRF (cookie + X-CSRF-Token) | ✅ |
| Helmet + CSP | ✅ |
| CORS restrito (CORS_ORIGINS) | ✅ |
| Rate limiting (api/auth/strict) | ✅ |
| Preço server-side (menuItemMap do banco) | ✅ |
| Webhook signatures | ✅ |
| Upload filtrado (MIME + 5MB + UUID) | ✅ |
| Enumeration protection (mensagens genéricas) | ✅ |
| CAPTCHA adaptativo (Turnstile) | ⏳ CONFIG PENDING |

## Testes de segurança executados

- [[Security Hardening]] — P13: JWT fail-fast, .claude untracked, catch logs
- [[Security Brute-Force Test]] — P13.5: 429+Retry-After, enumeração, JWT 401
- [[Security Adaptive CAPTCHA]] — P13.6: fail-closed, risk levels, 17 unit

## Secrets

- Nenhum secret no repo/docs/frontend (secret scan PASS)
- JWT_SECRET: fail-fast em produção (sem fallback forjável)
- CAPTCHA_SECRET_KEY: somente server-side (Vercel env)
