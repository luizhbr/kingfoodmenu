# Environment Variables — King Food Foundation

> **Apenas nomes e propósito. NUNCA valores.**

## LOCAL (`.env`)

| Variável | Propósito |
|----------|-----------|
| DATABASE_URL | Conexão Neon PostgreSQL |

## VERCEL (`.vercel/.env.production.local`)

| Variável | Propósito |
|----------|-----------|
| DATABASE_URL | Conexão Neon PostgreSQL |
| CORS_ORIGINS | Origens permitidas no CORS |
| JWT_SECRET | Assinatura de tokens JWT |
| WEBHOOK_SECRET | Verificação de assinatura de webhooks |
| NODE_ENV | Ambiente (production) |
| VITE_API_URL | URL da API para o storefront |

## PRODUCTION (Vercel dashboard)

As mesmas do VERCEL acima, gerenciadas no dashboard da Vercel.

## Usadas no código (com default local)

| Variável | Default | Propósito |
|----------|---------|-----------|
| PORT | 3000 | Porta do servidor local |
| JWT_EXPIRES_IN | 7d | Expiração do JWT |
| CSRF_SECRET | random | Segredo do CSRF |
| BASE_URL | http://localhost:3000 | URL base da API |
| PUBLIC_URL | https://inka.kitchenasty.com | URL pública |
| ADMIN_URL | http://localhost:5173 | URL do admin |
| STOREFRONT_URL | http://localhost:5173 | URL do storefront |
| LOG_LEVEL | — | Nível de log |
| API_METRIC_RETENTION_DAYS | 90 | Retenção de métricas |
| SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / EMAIL_FROM | localhost/1025 | Email |
| STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET | — | Stripe |
| PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_SANDBOX | — | PayPal |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | — | OAuth Google |
| FACEBOOK_APP_ID / FACEBOOK_APP_SECRET | — | OAuth Facebook |
| TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER / TWILIO_WHATSAPP_FROM | — | Twilio/SMS |
| WHATSAPP_ENABLED / WHATSAPP_PROVIDER / WHATSAPP_NOTIFY_NUMBER / WHATSAPP_WEBHOOK_URL / WHATSAPP_STUB_ENABLED / WHATSAPP_STUB_WEBHOOK_URL | stub | WhatsApp |

> **Nota:** o `.env.deploy` na raiz contém apenas DATABASE_URL. As vars reais
> de produção vivem no `.vercel/.env.production.local` e no dashboard Vercel.
