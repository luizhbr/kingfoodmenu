# Render Deploy — King Food Backend

> Baseado no projeto REAL (kf-inspect, monorepo npm workspaces).
> Fase 2 da migração Vercel → Render. Vercel permanece como fallback até validação completa.

## Arquitetura alvo

```
Cloudflare Pages (storefront + admin) → HTTPS → Render (Express API) → Supabase PostgreSQL
```

## Repositório

- GitHub: `luizhbr/kingfoodmenu` (branch `main`)
- Monorepo npm workspaces: `packages/*`
- Backend: `packages/server` (Express + TypeScript + Prisma)

## Criar o Web Service no Render

1. **Dashboard Render** → **New** → **Web Service**
2. Conectar o repositório GitHub `luizhbr/kingfoodmenu`
3. Configurar:

| Campo | Valor |
|---|---|
| **Name** | `king-food-api` |
| **Root Directory** | `packages/server` |
| **Environment** | `Node` |
| **Region** | `Ohio (US East)` — mesma região do Supabase (us-east-1) |
| **Build Command** | `npm install --include=dev && npx prisma generate && npm run build` |
| **Start Command** | `npm start` (executa `node dist/index.js`) |
| **Instance Type** | Free (ou Starter se precisar de mais RAM) |

> **Nota Root Directory**: o monorepo tem workspaces. Se o Render reclamar de dependências
> do workspace (`@kitchenasty/shared`), use Root Directory vazio (raiz) com:
> - Build: `npm install --include=dev && npx prisma generate -w packages/server && npm run build -w packages/server`
> - Start: `npm run start -w packages/server`
> - Health Check Path: `/api/health`

## Environment Variables (obrigatórias)

| Variável | Valor | Obrigatória? |
|---|---|---|
| `DATABASE_URL` | Connection string Supabase (porta 5432, direta) | ✅ |
| `JWT_SECRET` | `openssl rand -base64 32` | ✅ (fail-fast em production) |
| `NODE_ENV` | `production` | ✅ |
| `CORS_ORIGINS` | URLs do frontend Cloudflare (ex: `https://king-food-v3.pages.dev,https://kingfood.online`) | ✅ |
| `STRIPE_SECRET_KEY` | `sk_live_...` | ✅ |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | ✅ |
| `PUBLIC_URL` | URL pública da API (ex: `https://king-food-api.onrender.com`) | ✅ (OAuth callbacks) |
| `STOREFRONT_URL` | URL do storefront Cloudflare | ✅ |
| `ADMIN_URL` | URL do admin Cloudflare | opcional |
| `WEBHOOK_SECRET` | HMAC para webhooks de automação | opcional |
| `CSRF_SECRET` | Secret CSRF | opcional |
| `WHATSAPP_ENABLED` | `false` (desativado — NÃO reativar nesta fase) | opcional |
| `SMTP_HOST/PORT/USER/PASS` | E-mails de pedido/reset | opcional |
| `GOOGLE_CLIENT_ID/SECRET` | Login social Google | opcional |
| `FACEBOOK_APP_ID/SECRET` | Login social Facebook | opcional |
| `CAPTCHA_ENABLED/SITE_KEY/SECRET_KEY` | Turnstile | opcional |

> **NUNCA** colocar secrets no repositório. Usar o painel de Environment do Render.

## Health Check

- Path: `/api/health`
- Resposta: `{"success":true,"data":{"status":"ok","timestamp":"...","version":"1.0.0"}}`
- **Não consulta o banco** (funciona mesmo se o banco estiver fora) — o Render usa para
  decidir se o serviço está "Live". Para monitorar o banco, usar logs.

## Migrations

O projeto usa Prisma (`prisma/schema.prisma`, 61 models). As migrations existentes
estão em `prisma/migrations/`.

**NÃO executar migrations destrutivas.** Para aplicar migrations pendentes em produção:

```bash
npx prisma migrate deploy
```

(no Render: adicionar ao Build Command ou executar manualmente via Render Shell)

## Stripe Webhook

Após o deploy, atualizar o endpoint do webhook no painel Stripe:

- URL: `https://king-food-api.onrender.com/api/payments/webhook`
- Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `checkout.session.completed`
- Copiar o novo `whsec_...` para `STRIPE_WEBHOOK_SECRET`

## Verificação pós-deploy

```bash
curl https://king-food-api.onrender.com/api/health
# {"success":true,"data":{"status":"ok",...}}

curl https://king-food-api.onrender.com/api/menu
# {"success":true,"data":{"categories":"/api/menu/categories",...}}
```

## Rollback

- Render: **Deploy** → **Rollback** para o deploy anterior (1 clique)
- Vercel: continua no ar como fallback (não deletar até 2 semanas de estabilidade)
- DNS: reverter para Vercel se necessário (48h propagação)

## Observações

- **Cold start**: instância Free dorme após ~15min de inatividade; primeiro request
  pode levar ~50s. Opcional: ping periódico (cron) para manter acordado.
- **Socket.io**: funciona nativamente no Render (Node normal). O app mobile usa
  socket.io-client; storefront/admin usam polling 5s.
- **Mídia**: uploads ficam em base64 no Postgres (não migrar para S3 nesta fase).
- **Metrics**: `metricsCollector` grava `apiMetric` a cada request (exceto /api/health).
  No Render com banco funciona; monitorar crescimento da tabela.
