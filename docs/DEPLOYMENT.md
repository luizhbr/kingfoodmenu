# KING FOOD — Deployment Guide

## Architecture Overview

```
CUSTOMER → Storefront (Vercel) → API (Railway/Render) → PostgreSQL (Neon)
ADMIN    → Admin Panel (Vercel) → API (Railway/Render) → PostgreSQL (Neon)
KITCHEN  → Kitchen Display (same Admin) → Socket.IO → Real-time updates
```

## Current State (2026-08-12)

- **Storefront**: Live at `king-food-foundation-ui.vercel.app` (SPA with fallback data)
- **API**: NOT deployed — storefront uses hardcoded fallback
- **Admin**: NOT deployed
- **Database**: NOT connected

## Quick Start — Get Everything Running

### Step 1: Set up Neon PostgreSQL

1. Go to https://neon.tech and create a free database
2. Copy the connection string (starts with `postgresql://`)
3. Keep this — you'll need it for both API and migrations

### Step 2: Deploy Backend to Railway

1. Go to https://railway.app and create a new project
2. Connect your GitHub repo: `luizhbr/kitchenasty`
3. Set root directory to `/`
4. Add these environment variables:
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://kitchenasty:password@ep-xxx.neon.tech/kitchenasty?sslmode=require
   JWT_SECRET=<generate-a-random-64-char-string>
   CORS_ORIGINS=https://king-food-foundation-ui.vercel.app,https://king-food-admin.vercel.app
   STRIPE_SECRET_KEY=sk_test_xxx (optional, for payments)
   STRIPE_WEBHOOK_SECRET=whsec_xxx (optional)
   WHATSAPP_ENABLED=false
   WHATSAPP_PROVIDER=stub
   ```
5. Railway will auto-detect the Dockerfile and deploy

### Step 3: Run Database Migrations

```bash
# In Railway console or locally:
npx prisma migrate deploy
npx prisma db seed
```

### Step 4: Deploy Storefront to Vercel

The storefront is already deployed. Update the API URL:

1. In Vercel project settings, add environment variable:
   ```
   VITE_API_URL=https://your-railway-app.up.railway.app
   ```
2. Redeploy

### Step 5: Deploy Admin to Vercel

1. Create a new Vercel project
2. Root directory: `packages/admin`
3. Framework: Vite
4. Build command: `npm run build`
5. Output directory: `dist`
6. Environment variables:
   ```
   VITE_API_URL=https://your-railway-app.up.railway.app
   ```

### Step 6: Update Storefront API Configuration

The storefront uses relative `/api/*` paths in development (proxied by Vite)
and needs the backend URL in production. Update `useApi.ts` to use:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || '';
// Then prefix fetch URLs: `${API_BASE}/api/menu/categories`
```

## Kitchen Display (PDV)

The Kitchen Display is accessible at `/kitchen` in the Admin panel.

**Features:**
- Real-time order updates via Socket.IO
- Kanban board with columns: New → Confirmed → Preparing → Ready → Out for Delivery → Delivered
- One-click status progression
- Sound notification for new orders
- Filter by location

**Access:** Staff login required (SUPER_ADMIN or MANAGER role)

## Fallback Mode

When the backend API is unavailable, the storefront automatically uses
hardcoded menu data from `src/data/menuFallback.ts`. This ensures the
cardápio is always visible even without a database connection.

The checkout flow requires the backend (order creation, payments).
When the API is down, users can still browse the menu but won't be
able to place orders.

## Environment Variables Reference

### Server (.env)
```
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://king-food-foundation-ui.vercel.app
DATABASE_URL=postgresql://...
JWT_SECRET=<random-64-char-string>
JWT_EXPIRES_IN=7d

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# WhatsApp (optional)
WHATSAPP_ENABLED=false
WHATSAPP_PROVIDER=stub
WHATSAPP_NOTIFY_NUMBER=13802695741
WHATSAPP_WEBHOOK_URL=

# Email (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SENDER_EMAIL=
SENDER_NAME=King Food
```

### Storefront (Vercel env vars)
```
VITE_API_URL=https://your-api.railway.app
```

### Admin (Vercel env vars)
```
VITE_API_URL=https://your-api.railway.app
```

## Default Login (after seed)

- **Admin**: admin@kitchenasty.com / admin123
- **Customer**: customer@example.com / customer123

⚠️ Change these passwords in production!

## Branch Strategy

```
feature/xxx → preview (Vercel preview)
develop     → staging (Vercel staging)
main        → production (Vercel production)
```

## Next Steps

1. ✅ Storefront with fallback data
2. ⬜ Deploy backend (Railway)
3. ⬜ Deploy admin (Vercel)
4. ⬜ Set up Neon PostgreSQL
5. ⬜ Run migrations + seed
6. ⬜ Configure Stripe payments
7. ⬜ Implement Sales Attribution
8. ⬜ Connect WhatsApp (Z-API)
9. ⬜ Connect Hermes Tools
