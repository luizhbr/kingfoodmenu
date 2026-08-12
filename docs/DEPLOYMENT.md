# Deployment — King Food Foundation

## Pipeline

```
GitHub (luizhbr/kitchenasty)
   │
   ▼
Vercel (import do repo)
   │
   ▼
buildCommand (vercel.json)
   │
   ├── npx prisma generate
   ├── npm run build -w packages/server (tsc → dist/)
   ├── npm run build -w packages/storefront (vite)
   ├── MSYS_NO_PATHCONV=1 VITE_BASE_PATH=/admin/ npm run build -w packages/admin
   └── cp -r packages/admin/dist packages/storefront/dist/admin
   │
   ▼
outputDirectory: packages/storefront/dist
   │
   ▼
Deploy (produção)
   │
   ▼
https://king-food-foundation-ui.vercel.app
```

## Routing (vercel.json rewrites)

| Source | Destination |
|--------|-------------|
| /api/:path* | /api (função serverless) |
| /admin/:path* | /admin/index.html |
| /(resto) | /index.html (SPA fallback) |

## Serverless function

- `api/index.ts` — função única para TODAS as rotas /api/*
- Importa `packages/server/dist/app.js` (COMPILADO, nunca src TS)
- `functions.api/index.ts.maxDuration: 30`

## Problema histórico resolvido

**Sintoma:** `FUNCTION_INVOCATION_FAILED` em produção

**Causa:** importar `src/app.ts` (TypeScript) diretamente no serverless

**Solução:** compilar com tsc → `packages/server/dist/app.js` e importar o
artefato compilado (commits 0f8da82, 3c2e0ad, 980170e)

## Deploys recentes

| Commit | Deploy | Conteúdo |
|--------|--------|----------|
| 86a0570 | — | fix tracking enums (P13) |
| c3600a2 | — | fix admin dashboard pendingOrders |

## Como deployar

```bash
# Local (precisa token Vercel válido)
vercel --prod --yes

# Ou via git push (CI da Vercel)
git push origin feature/king-food-foundation
```
