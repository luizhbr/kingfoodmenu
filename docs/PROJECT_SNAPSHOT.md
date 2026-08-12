# Project Snapshot — King Food Foundation

> **Data da auditoria:** 2026-08-12
> **Commit HEAD:** `c3600a2` (feature/king-food-foundation)
> **Branch:** `feature/king-food-foundation`
> **Status git:** limpo (sem alterações pendentes)

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 22 (Vercel serverless) |
| Backend | Express 4 (TypeScript → CommonJS via tsc) |
| Frontend storefront | React + Vite |
| Frontend admin | React + Vite (deploy em `/admin/`) |
| ORM | Prisma 5.22 |
| Banco | Neon PostgreSQL (serverless) |
| Deploy | Vercel (monorepo, função única serverless) |
| Domínio | https://king-food-foundation-ui.vercel.app |

## Monorepo (packages)

| Package | Nome | Função |
|---------|------|--------|
| `packages/server` | @kitchenasty/server | API Express (compilada para dist/) |
| `packages/storefront` | @kitchenasty/storefront | Site público (React/Vite) |
| `packages/admin` | @kitchenasty/admin | Painel admin/POS (React/Vite) |
| `packages/shared` | @kitchenasty/shared | Tipos e constantes compartilhadas |
| `packages/mobile` | @kitchenasty/mobile | App mobile (não deployado) |
| `packages/docs` | @kitchenasty/docs | Documentação do package |

## Autenticação

- JWT Bearer para API (staff e customer)
- CSRF double-submit para rotas com cookie (SPA)
- OAuth Google/Facebook (passport) — configurado, não testado em produção
- RBAC: `SUPER_ADMIN`, `MANAGER`, `STAFF`, `CUSTOMER`, anônimo

## Testes

- 29/29 unit tests (server): auth.middleware (21) + email (8)
- Typecheck: PASS (tsc exit 0)
- Build completo: PASS (shared + server + admin + storefront)
- Testes de produção: tracking (7 requisições 201), dashboard (200 com auth)

## PWA

- Storefront: manifest + service worker (sw.js)
- Admin: não é PWA

## Limitações conhecidas

- Socket.IO não funciona em serverless → Kitchen usa polling (15s)
- Uploads de arquivo: disco efêmero no serverless
- Cron: sem timers em background no serverless
- Google Maps: BLOCKED (sem API key)
- 3 rotas órfãs (attribution, referral, webhook) — ver API.md
- 9 models Prisma sem uso direto — ver DATABASE.md
