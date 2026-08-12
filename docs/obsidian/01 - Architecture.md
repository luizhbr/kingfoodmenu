[[00 - Home]]

# Architecture

Ver [[01 - Architecture]] no repositório.

- Express dentro do serverless
- Socket.IO removido (polling)
- Vercel routing
- build → dist
## Camada de segurança (P13.x)

- JWT + RBAC (roles: SUPER_ADMIN, MANAGER, STAFF, DRIVER, CUSTOMER)
- CSRF (cookie + header) · Helmet/CSP · CORS restrito
- Rate limiting: api 300/min, auth 100/15min, strict 10/min
- CAPTCHA adaptativo (Turnstile) — infra implementada, ativação pendente
- Preço 100% server-side · webhooks assinados · upload filtrado
