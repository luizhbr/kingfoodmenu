# Security — King Food Foundation

> **Evidências de teste:** 2026-08-12 (local + produção)

## CSRF

- Middleware: `middleware/csrf.ts`
- Padrão: double-submit (cookie `_csrf` + header `X-CSRF-Token`)
- **Skip:** GET/HEAD/OPTIONS, requests com `Authorization: Bearer`, webhooks
- Endpoint de token: `GET /api/csrf-token`
- **Evidência:** POST sem token → 403 `CSRF token missing`; POST com token → 201/200

## Autenticação

- JWT Bearer (staff e customer)
- OAuth Google/Facebook via passport (configurado, não testado em produção)
- Cookies: `_csrf` (httpOnly: false, sameSite: lax, secure em produção)

## RBAC

| Role | Acesso |
|------|--------|
| SUPER_ADMIN | Tudo (staff, settings avançadas, audit logs) |
| MANAGER | Staff CRUD parcial, menu, locations, analytics |
| STAFF | Pedidos, reservas, reviews, kitchen |
| CUSTOMER | Próprios pedidos/reservas, loyalty |
| Anonymous | Menu público, tracking, csrf-token |

**Evidências:**
- Anonymous → `/api/dashboard/stats` = **401** `Authentication required`
- Customer → endpoint staff = **403** (requireStaff)
- SUPER_ADMIN → `/api/dashboard/stats` = **200** (com Bearer)

## CORS

- `CORS_ORIGINS` configurado no Vercel
- Produção: `https://king-food-foundation-ui.vercel.app` permitida (200)

## Rate limiting

- `/api/` — limite global (apiLimiter)
- `/api/auth/` — 100 req/15min (authLimiter)
- `/api/auth/staff/register` e `/login` — strictLimiter

## IDOR protection

- `requireOwnership('order')` / `requireOwnership('reservation')`
- **Evidência:** usuário tentando acessar pedido de outro → **403** `You do not have permission`

## Server-side pricing

- Preços calculados no servidor (controller)
- **Evidência:** valor manipulado no cliente ($0.01) ignorado em favor do banco ($4.00)

## Secrets

- **NUNCA** registrar valores reais em documentação
- Vars sensíveis: JWT_SECRET, WEBHOOK_SECRET, STRIPE_SECRET_KEY, DATABASE_URL, etc.
- Armazenadas em: `.vercel/.env.production.local` (Vercel) e `.env` (local)

## Environment variables

Ver [ENVIRONMENT.md](./ENVIRONMENT.md) — apenas nomes, nunca valores.
