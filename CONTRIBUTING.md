# Contributing — King Food Foundation

## Setup

```bash
# Requisitos: Node 22+, npm 10+
git clone https://github.com/luizhbr/kitchenasty.git
cd kitchenasty
npm install

# Banco (Neon)
cp .env.deploy .env   # contém DATABASE_URL
npx prisma generate
```

## Rodar local

```bash
# Server (API) — porta 3000
npm run dev:server

# Storefront — porta 5173
npm run dev:storefront

# Admin — porta 5174
npm run dev:admin
```

## Testes

```bash
npm run test:unit -w packages/server   # unit tests
npm run build -w packages/server      # typecheck
npm run build                          # build completo
npx playwright test                    # E2E
```

## Trabalhar no server

- Código em `packages/server/src/`
- Rotas em `src/routes/*.routes.ts`
- Controllers em `src/controllers/*.controller.ts`
- **Toda rota nova precisa ser montada no `src/app.ts`** (senão → 404)
- Build: `tsc` → `packages/server/dist/`

## Trabalhar no storefront

- Código em `packages/storefront/src/`
- API base: `VITE_API_URL` (vazio = mesmo domínio)
- CSRF: usar `withCsrf()` para POSTs

## Trabalhar no admin

- Código em `packages/admin/src/`
- Base path: `/admin/` (VITE_BASE_PATH)
- Build copia o dist para dentro do storefront

## Prisma

```bash
npx prisma generate    # regenerar client
npx prisma migrate dev --name <nome>   # criar migration
npx prisma studio      # visualizar banco
```

**Toda alteração de schema PRECISA de migration.**

## Deploy

```bash
vercel --prod --yes    # com token válido
# ou push no GitHub (CI da Vercel)
```

## Como NÃO quebrar produção

1. Nunca importar `src/*.ts` no serverless — usar `dist/`
2. Nunca confiar em dados do cliente (preços vêm do servidor)
3. Toda alteração de API precisa de teste
4. Toda alteração de produção precisa de build
5. Toda alteração crítica precisa de smoke test
6. Nunca declarar PASS sem evidência
7. Nunca declarar write concluído sem reler o arquivo
8. Nunca apagar código órfão sem decisão explícita

Ver [[DEVELOPMENT_RULES]] para as regras completas.
