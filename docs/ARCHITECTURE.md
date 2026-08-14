# Architecture — King Food Foundation

## Visão geral

```
CLIENTE (browser)
   │
   ▼
STOREFRONT (React/Vite) ──► /admin (React/Vite)
   │                              │
   ▼                              ▼
Vercel (CDN + routing)      Vercel (CDN + routing)
   │                              │
   ▼                              ▼
/api/* ──► api/index.ts (função serverless única)
              │
              ▼
        Express app (packages/server/dist/app.js)
              │
              ▼
        Controllers (packages/server/src/controllers)
              │
              ▼
        Prisma Client
              │
              ▼
        Neon PostgreSQL
```

## Por que Express dentro do serverless?

O Vercel não mantém um processo Node persistente. Cada requisição `/api/*` é
roteada (via `vercel.json` rewrites) para **uma única função serverless**
(`api/index.ts`), que importa o app Express **compilado**:

```ts
import { createApp } from '../packages/server/dist/app.js';
```

O `dist/` é produzido por `tsc` no buildCommand do Vercel. **Nunca** importar
`src/*.ts` diretamente — quebra no runtime serverless
(`MODULE_NOT_FOUND` → `FUNCTION_INVOCATION_FAILED`).

## Por que Socket.IO NÃO é usado?

Socket.IO exige conexão persistente (WebSocket). O runtime serverless do Vercel
não mantém conexões abertas entre requisições. Por isso:

- **Kitchen Display** usa **polling** (`setInterval` 15s) em vez de Socket.IO
- O código de socket existe (`lib/socket.ts`) mas não é funcional em produção

## Como o polling funciona

`packages/admin/src/pages/KitchenDisplay.tsx`:

1. `fetchOrders()` busca pedidos PENDING/CONFIRMED
2. `setInterval(fetchOrders, 15000)` — atualiza a cada 15s
3. Mudança de status: POST `/api/orders/:id/status` + atualização otimista
4. O polling reconcilia com o servidor

## Como o Vercel routing funciona

`vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/admin", "destination": "/admin/index.html" },
    { "source": "/admin/:path*", "destination": "/admin/index.html" },
    { "source": "/((?!assets/|admin/|sw\\.js|manifest\\.json|api/).*)", "destination": "/index.html" }
  ]
}
```

- `/api/*` → função serverless (Express)
- `/admin/*` → SPA do admin
- qualquer outra rota → SPA do storefront (fallback)

## Como o build gera packages/server/dist

`buildCommand` (vercel.json):

```bash
npx prisma generate && npm run build -w packages/shared && npm run build -w packages/server && npm run build -w packages/storefront && node scripts/publish-admin.mjs
```

1. `prisma generate` — gera o Prisma Client
2. `tsc` no shared — gera `@kitchenasty/shared` em `packages/shared/dist/`
3. `tsc` no server — compila TS → CommonJS em `packages/server/dist/`
4. Vite no storefront — gera `packages/storefront/dist/`
5. `scripts/publish-admin.mjs` — builda o admin com `VITE_BASE_PATH=/admin/` e publica em `packages/storefront/dist/admin`

`outputDirectory: packages/storefront/dist`

## Como o frontend conversa com a API

- Storefront: `fetch(\`${API_BASE}/api/...\`)` onde `API_BASE = import.meta.env.VITE_API_URL || ''`
- Admin: `fetch('/api/...')` (mesmo domínio)
- CSRF: `withCsrf()` busca token em `/api/csrf-token` antes de POSTs
- Auth: `Authorization: Bearer <JWT>` para rotas autenticadas
