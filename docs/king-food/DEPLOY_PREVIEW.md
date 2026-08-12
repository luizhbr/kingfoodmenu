# Deploy Preview — King Food Foundation

**Branch:** `feature/king-food-foundation`  
**Milestone:** 4

This is a **preview / staging** guide, not production cutover from OlaClick.

---

## Architecture to deploy

| Service | Package | Notes |
|---------|---------|-------|
| API | `packages/server` | Express + Prisma + Socket.IO |
| Storefront | `packages/storefront` | Vite static build |
| Admin | `packages/admin` | Vite static build |
| DB | PostgreSQL 16 | Required |

Monorepo does **not** fit a single static Vercel project without adapters. Recommended previews:

1. **Railway / Render / Fly.io** — API + Postgres  
2. **Vercel / Netlify** — storefront + admin static  
3. **Docker Compose** — full stack on a VPS

---

## Local Docker (fastest full stack)

```bash
git checkout feature/king-food-foundation
npm install
docker compose up -d
cp packages/server/.env.example packages/server/.env
# set DATABASE_URL, JWT_SECRET
npx -w packages/server prisma migrate dev --schema ../../prisma/schema.prisma
npx -w packages/server prisma db seed
npx tsx scripts/cleanup-demo-catalog.ts   # optional
npm run dev:server
npm run dev:storefront
npm run dev:admin
```

---

## Env (preview)

```env
DATABASE_URL=postgresql://...
JWT_SECRET=change-me
WHATSAPP_STUB_ENABLED=true
WHATSAPP_NOTIFY_NUMBER=13802695741
# Optional webhook for future n8n/Hermes:
# WHATSAPP_STUB_WEBHOOK_URL=https://...
```

---

## Preview checklist

- [ ] Migrate + seed on empty DB
- [ ] Cleanup demo catalog if re-seeded mixed data
- [ ] Storefront `/menu` shows King Food categories
- [ ] Place cash order → order number `KF-...`
- [ ] Server log shows `[whatsapp-stub]`
- [ ] Admin login works
- [ ] Kitchen board receives order (Socket.IO)

---

## Not in this milestone

- Custom domain cutover from kingfood.online
- Removing OlaClick from production shell
- Stripe live keys
