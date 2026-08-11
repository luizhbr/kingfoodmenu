# Smoke Test Checklist — King Food Foundation

**Branch:** `feature/king-food-foundation`  
**Purpose:** Validate that Admin, Storefront and Kitchen still boot after Milestone 1 branding changes.

Run this on a machine with Docker + Node 22+.

---

## 1. Bootstrap

```bash
git clone https://github.com/luizhbr/kitchenasty.git
cd kitchenasty
git checkout feature/king-food-foundation
npm install
docker compose up -d
cp packages/server/.env.example packages/server/.env
npx -w packages/server prisma migrate dev --schema ../../prisma/schema.prisma
npx -w packages/server prisma db seed
```

Expected seed output includes:
- `King Food foundation`
- `Location: King Food Columbus`
- Admin: `admin@kitchenasty.com` / `admin123`

---

## 2. Start services

```bash
npm run dev:server      # :3000
npm run dev:admin       # :5173
npm run dev:storefront  # :5174
```

---

## 3. Checks

| # | Check | Expected | Pass? |
|---|-------|----------|-------|
| 1 | API health / docs | `http://localhost:3000/api/docs` loads | |
| 2 | Admin login | Login with admin credentials works | |
| 3 | Admin dashboard | Metrics / navigation load | |
| 4 | Site settings | siteName shows **King Food** (or colors #FFD100 / #E31818) | |
| 5 | Location | **King Food Columbus** present | |
| 6 | Kitchen display | Kitchen page opens (Kanban) | |
| 7 | Storefront home | Loads without crash | |
| 8 | Storefront menu | Menu items list | |
| 9 | Add to cart | Item can be added | |
| 10 | Order flow (optional) | Place a test order if time allows | |

---

## 4. Report

After running, note:

- Pass / Fail per row
- Any error messages
- Node / OS version if something fails

Send results back so Milestone 1 can be formally closed.
