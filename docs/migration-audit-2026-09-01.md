# AUDITORIA DE MIGRAÇÃO KING FOOD — 01/09/2026
## REGRA ZERO: Diagnóstico completo (A–S) — NENHUM código alterado

---

## A) ESTRUTURA DE DIRETÓRIOS
```
kf-inspect/ (monorepo npm workspaces "packages/*", repo luizhbr/kingfoodmenu)
├── api/                      # Vercel serverless function (wrapper do Express compilado)
├── vercel.json               # build + rewrites Vercel
├── prisma/schema.prisma      # 61 models — fonte da verdade do banco
├── packages/
│   ├── shared/               # tipos/validação compartilhados (zod)
│   ├── shared-ui/            # componentes React compartilhados
│   ├── server/               # BACKEND Express (TypeScript, ~25.645 LOC)
│   │   └── src/
│   │       ├── controllers/  # 34 controllers
│   │       ├── routes/       # 33 arquivos de rotas (~130 endpoints)
│   │       ├── middleware/   # auth, upload, rate-limit
│   │       ├── lib/          # stripe, paypal, socket, whatsapp*, king-agent, services
│   │       └── __tests__/    # vitest unit + integration
│   ├── storefront/           # FRONTEND cardápio (Vite + React SPA)
│   ├── admin/                # FRONTEND painel (Vite + React, build → dist/admin via publish-admin.mjs)
│   ├── mobile/               # APP Expo/React Native (canal futuro)
│   ├── print-agent/          # impressora térmica (escpos/usb)
│   └── docs/                 # vitepress
```

## B) FRAMEWORK FRONTEND
- **Storefront**: Vite + React 18 + react-router-dom + i18next/intlayer (i18n pt/en) + tailwind
- **Admin**: Vite + React + recharts + tailwind (build separado injetado em dist/admin)
- **Mobile**: Expo/React Native (canal futuro — usa mesma API)

## C) FRAMEWORK/BACKEND ATUAL
- **Express 4** (TypeScript, ESM build via tsc → dist/) + socket.io (server) + Prisma + Passport (Google/Facebook OAuth)
- **NÃO é serverless puro**: existe `api/index.ts` que importa o Express compilado para rodar na Vercel (com limitações documentadas: sem socket real, sem timers)

## D) ROTAS (33 arquivos → montadas em /api/*)
auth, rewards, locations, delivery, menu, orders, payments, reservations, coupons, reviews, dashboard, automation-rules, loyalty, legal, consent, settings, staff, developer, gallery, media, option-groups, tracking, customer, cashback, driver, reports, campaigns, qrcodes, print, whatsapp, admin/print/templates, webhooks (n8n), attribution, health

## E) CONTROLLERS (34)
allergen, auth, automation, cashback, category, consent, coupon, customer, dashboard, delivery-zone, developer, driver, gallery, legal, location, loyalty, mealtime, media, menu-item, option-group, order, password-reset, payment, print-template, print, push-token, reports, reservation, review, rewards, settings, social-auth, staff, table, whatsapp

## F) INTEGRAÇÕES EXTERNAS
| Integração | Uso |
|---|---|
| **Stripe** | Pagamentos (PaymentIntent + CheckoutSession + webhooks + refunds) |
| **PayPal** | Pagamento alternativo (API REST sandbox/live) |
| **Supabase (Postgres)** | Banco único via Prisma (DATABASE_URL, porta 5432) |
| **WhatsApp (Meta Cloud API + Baileys + n8n)** | Notificações, bot, atendimento |
| **Ollama/IA** | king-agent (chatbot IA) |
| **SMTP (nodemailer)** | E-mails pedido/reset |
| **Expo Push (expo-server-sdk)** | Push notifications |
| **Twilio** | Provider alternativo WhatsApp |

## G) VARIÁVEIS DE AMBIENTE (server)
PORT, NODE_ENV, CORS_ORIGINS, DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, WEBHOOK_SECRET, CSRF_SECRET, API_METRIC_RETENTION_DAYS, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_SANDBOX, WHATSAPP_* (ENABLED, PROVIDER, NOTIFY_NUMBER, WEBHOOK_URL, ADAPTER, SESSION_DIR, SESSION_ENCRYPTION_KEY, STUB_*), META_* (ACCESS_TOKEN, APP_SECRET, GRAPH_VERSION, PHONE_NUMBER_ID, VERIFY_TOKEN), TWILIO_* (ACCOUNT_SID, AUTH_TOKEN, FROM_NUMBER, WHATSAPP_FROM), SMTP_* (HOST, PORT, USER, PASS), EMAIL_FROM, GOOGLE_CLIENT_ID/SECRET, FACEBOOK_APP_ID/SECRET, PUBLIC_URL, STOREFRONT_URL, ADMIN_URL, BASE_URL, CAPTCHA_* (ENABLED, SITE_KEY, SECRET_KEY), LOG_LEVEL, AI_* (API_KEY, BASE_URL, MODEL, ACTIVE_HOURS, AFTER_HOURS_MESSAGE), OLLAMA_* (API_KEY, BASE_URL, MODEL), KINGFOOD_API_URL, KINGFOOD_SITE

## H) DEPENDÊNCIAS NODE (server)
express, @prisma/client, bcryptjs, jsonwebtoken, passport(+google/facebook), cors, helmet, zod, stripe, socket.io, multer, nodemailer, exceljs, expo-server-sdk, express-rate-limit, cookie-parser, pino/pino-http, swagger-ui-express, @upstash/redis(instalada, **sem uso no código**), @whiskeysockets/baileys, qrcode, dotenv

## I) DEPENDÊNCIAS ESPECÍFICAS VERCEL
| DEPENDÊNCIA | ONDE ESTÁ | FUNÇÃO | SUBSTITUTO | RISCO |
|---|---|---|---|---|
| vercel.json (buildCommand, rewrites) | raiz | build + roteamento /api/*, /admin | Cloudflare Pages (SPA fallback + redirect) + Render (start) | Baixo |
| api/index.ts (serverless wrapper) | api/ | expor Express na Vercel | **Render `npm start` direto (node dist/index.js)** | Baixo |
| publish-admin.mjs (scripts/) | scripts/ | injetar admin em dist/admin | script de build mantido local | Baixo |
| **NÃO usa**: Vercel KV, Blob, Edge, Cron, env Vercel | — | — | Supabase + setInterval do próprio server | — |

## J) PayPal (para remoção — Fase 5)
- lib/paypal.ts (86 LOC), payment.controller.ts (2 funções: createPayPalPayment, capturePayPalPayment), payment.routes.ts, settings (paymentSettings.paypal*), schema: enum PAYPAL
- **Compartilha**: Payment model (method enum) — remoção NÃO apaga tabelas (payments continua via Stripe/cash)
- Env: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_SANDBOX

## K) WhatsApp (para remoção/desativação — Fase 6)
- lib/whatsapp.ts, lib/whatsapp-adapter/ (7 arquivos: meta, mock, session, baileys web), lib/whatsapp-bot/ (2.736 LOC: ai, cart, tools, index, types), lib/king-agent/ (4 arquivos — IA), controllers/whatsapp, routes/whatsapp (12 rotas), webhook.routes (n8n)
- schema: WhatsAppConversation, WhatsAppMessage, WhatsAppIntegration
- Env: WHATSAPP_*, META_*, TWILIO_*, WHATSAPP_SESSION_*
- **Compartilhado**: king-agent (usa OLLAMA/AI envs — reaproveitável no chat), push-token, schema Customer.whatsappNumber, n8n webhooks
- Notificações de pedido usam whatsapp.ts — desativar sem quebrar Orders (isolamento total)

## L) SOCKET.IO (auditoria Fase 7)
- **Server**: lib/socket.ts — join:order, join:kitchen, emitOrderStatusUpdate, emitNewOrder, push notification em cada update
- **Clientes**: storefront/admin **NÃO usam socket.io-client** (grep vazio) — OrderStatus.tsx e KitchenDisplay.tsx usam **polling setInterval (5s)**, com pausa quando aba oculta
- **Veredito**: socket.io server-side quase ocioso (emite para ninguém via socket). **Pode simplificar** — manter servidor Express normal no Render já roda socket; clientes já operam por polling. Chat interno pode usar polling (5s) sem necessidade de socket.

## M) SUPABASE
- Só DATABASE_URL via Prisma (conexão direta porta 5432). **Sem supabase-js, sem RLS ativo, sem Storage** (upload de mídia = base64 no Postgres)
- Auth = JWT próprio (não Supabase Auth). 61 models, migrations Prisma existentes
- **Banco NÃO muda** — permanece Supabase. Backup lógico antes de qualquer migration

## N) STRIPE
- lib/stripe.ts (68 LOC), payment.controller: createPaymentIntent, createCheckoutSession, handleWebhook, markCashPayment, refundPayment
- Webhook trata: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded, checkout.session.completed
- Idempotência: schema tem chaves únicas (idempotencyKey, referenceId, messageId) em modelos de recompensa/transação; webhook atualiza Payment por transactionId e Order por metadata.orderId

## O) FLUXO DE CRIAÇÃO DE PEDIDO
createOrder (order.controller:163) → validação zod (items, customer, coupon, loyaltyPointsRedeem, cashbackUse, delivery) → verifica coupon + pontos + cashback (server-authoritative) → desconto único com cap (pool coupon+points+cashback) → cria Order (AWAITING_PAYMENT/PENDING) + Payment → envia para fila do admin (emitNewOrder) + push

## P) FLUXO DE PAGAMENTO
Cliente → POST /api/payments/intent (Stripe PaymentIntent, metadata.orderId) → confirma no Stripe → webhook payment_intent.succeeded → server valida evento (constructEvent) → Payment COMPLETED + Order CONFIRMED → cashback/loyalty creditados em estado terminal (com guard anti-duplo-credito, Fase 4 ok)

## Q) WEBHOOK STRIPE
express.raw → constructEvent (valida assinatura) → switch por tipo → atualiza Payment/Order por transactionId/orderId → 200 sempre (retry) — idempotência da atualização depende de transição de status

## R) LOYALTY/CASHBACK
- Order cria: pointsEarned (floor(subtotal × pointsPerDollar)) incrementado no Customer; resgate decrementa pontos
- Cashback: creditCashbackForOrder em estado terminal, reverseCashbackForOrder em cancelamento, guard anti-duplo
- Rewards: chave única (customerId, type) idempotente

## S) FLUXO DE AUTENTICAÇÃO
- Cliente: register/login JWT (bcrypt cost 12) + Google/Facebook OAuth (passport) → JWT 7d
- Staff: login/register (SUPER_ADMIN), invite/accept, roles + permissions finas
- Middleware: authenticate (JWT), requireRole, requirePermission, rate-limit por rota, CSRF double-submit, Turnstile captcha

---

## ARQUITETURA NOVA (modular monolith — SEM microservices)

```
CLOUDFLARE (DNS + SSL + CDN + Frontend)
├── kingfood.online (zone + NS)
├── www/raiz → Cloudflare Pages (storefront + admin build)
└── api.kingfood.online → CNAME → Render

RENDER (1 deploy — Express existente, Node compatível)
├── npm start → node dist/index.js (socket + timers + tudo)
├── GET /api/health (já existe: {status, timestamp, database})
├── Orders, Customers, Coupons, Loyalty, Cashback, Reservations,
│   Delivery, Chat, Webhooks Stripe
└── Realtime: polling (já é o comportamento real dos clientes)

SUPABASE (PostgreSQL — INALTERADO)
└── Prisma + DATABASE_URL (backup lógico antes de migrations novas)

STRIPE (único pagamento — PayPal removido)
```

## FASEAMENTO (cada fase: typecheck + build + testes + registro)
1. Audit (ESTA) ✔
2. Frontend → Cloudflare Pages (build preservado, admin incluso) — v3 já provou o caminho
3. Backend → Render (build tsc + start node, env vars, health) — Vercel continua fallback
4. Stripe único (remover rotas/fluxos PayPal, manter Payment compartilhado)
5. WhatsApp desativado (não apagar compartilhados: king-agent, push, customer.whatsappNumber)
6. Chat interno (2 models novos: ChatConversation, ChatMessage; rotas cliente + admin; polling 5s)
7. DNS → Cloudflare (registrar continua Vercel registrar? verificar; NS → Cloudflare; api.* → Render)
8. Monitor + testes checklist obrigatório + só então desligar Vercel

## RISCOS PRINCIPAIS
1. **Stripe webhook em produção durante troca de DNS** — manter Vercel fallback até validar
2. **Cold start Render free** (~50s no primeiro acesso após inatividade) — aceitável; opcional: ping periódico
3. **Mídia em base64 no Postgres** — cresce banco; não migrar agora (fora do escopo)
4. **@upstash/redis instalada sem uso** — limpar no npm audit
5. **i18n/SEO** — SPA puro (sem SSR): SEO atual já é limitado; preservar rotas e redirects
6. **Chat novo exige migrations aditivas** — backup antes

## CHECKLIST DE ROLLBACK
- DNS: reverter NS para Vercel registrar (48h propagação) OU manter CNAME antigo
- Vercel: deploys continuam no ar (nunca deletar projeto até 2 semanas de estabilidade)
- Banco: backup lógico pré-migração (pg_dump via Supabase dashboard)
- Frontend: pages.dev antigo versionado (wrangler rollback)

---

## ANEXO — VERIFICAÇÕES FINAIS (Fase 0 consolidada)

### Socket.io — DECISÃO: MANTER (uso real confirmado)
| ARQUIVO | USO | CRÍTICO? | AÇÃO |
|---|---|---|---|
| server/src/lib/socket.ts | Server + emit order:statusUpdate/order:new | Sim (base) | MANTER |
| index.ts | initSocket(httpServer) | Sim | MANTER |
| order.controller.ts (741, 1016) | emitNewOrder + emitOrderStatusUpdate | Sim | MANTER |
| driver.controller.ts (192) | emitOrderStatusUpdate | Sim | MANTER |
| **mobile/src/hooks/useOrderSocket.ts** | **socket.io-client (io(API_BASE_URL))** | **Sim — app móvel depende** | MANTER |
| storefront/admin | **NENHUM** (polling 5s) | — | já não usa |

**Conclusão**: socket.io tem cliente REAL no mobile. NÃO remover. No Render o socket funciona nativamente (Node normal, ao contrário da Vercel).

### Redis/Upstash — DECISÃO: REMOVER
- `@upstash/redis@^1.24.0` no package.json
- **ZERO imports no código** (grep completo: só comentários "in production use Redis")
- Sem env vars, sem configuração → **remoção segura** (package.json apenas)

### PayPal — DECISÃO: DESATIVAR (não migration destrutiva)
| Local | Situação |
|---|---|
| lib/paypal.ts (86 LOC) | remover do runtime |
| payment.controller (2 funções) | remover |
| payment.routes (2 rotas) | remover |
| SettingsPayments.tsx (admin) | remover UI PayPal |
| GlobalSearch.tsx | só keyword — limpar |
| storefront Checkout.tsx | **não usa PayPal** (zero refs) ✓ |
| schema: enum PAYPAL + paymentSettings.paypal* | **MANTER** (histórico no banco; sem migration destrutiva) |
| Payment model | **MANTER** (compartilhado com Stripe) |

### Render readiness — 100% PRONTO (nenhuma mudança necessária)
- ✅ Express puro, build tsc → dist/
- ✅ `process.env.PORT || 3000` + httpServer.listen(PORT) (Node escuta 0.0.0.0 por padrão)
- ✅ `start`: `node dist/index.js`
- ✅ `/api/health` já existe: `{success, data: {status:'ok', timestamp, version}}`
- ✅ Socket + timers (metricCleanup) funcionam em Node normal
- ❌ Nada impede startup sem Vercel (api/index.ts é wrapper só da Vercel)

### Dependências — TABELA FINAL
| DEPENDÊNCIA | USO REAL | CRÍTICA? | REMOVER? | MOTIVO |
|---|---|---|---|---|
| stripe | sim | SIM | não | único pagamento |
| PayPal (lib/paypal, 2 rotas, UI admin) | sim | não | **sim (desativar)** | Stripe único |
| @upstash/redis | **não** | não | **sim** | zero imports |
| socket.io | sim (mobile) | sim | **não** | app móvel usa |
| whatsapp-adapter/bot/king-agent (2.736 LOC) | sim | não (operação atual) | **desativar** (Fase 1) | isolado de Orders |
| Twilio (envs) | provider alternativo WA | não | remover envs | junto WhatsApp |
| n8n (webhooks/routes) | sim | parcial | desativar junto WA | n8n é canal WA |
| baileys + qrcode | WA session web | não | remover | junto WhatsApp |
| Ollama (king-agent) | sim | não | **desativar junto WA** | king-agent é do WA; reusável no chat futuro |
| nodemailer/SMTP | sim | sim | manter | e-mails pedido/reset |
| expo-server-sdk | sim | sim (push) | manter | push orders |
| multer (base64) | sim | sim | manter | documentar risco |
| passport google/facebook | sim | sim | manter | social login |

