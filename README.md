# King Food — Private Ordering Platform

**Foundation branch:** `feature/king-food-foundation`  
**Status:** Milestone 1 (Foundation) in progress

Private online ordering platform for **King Food** (Açaí BR da saudade · Columbus, OH).

Built on top of **[KitchenAsty](https://github.com/mighty840/kitchenasty)** (MIT License).

---

## What this is

King Food is evolving into a private ordering stack:

```
Customer → Storefront → Cart → Checkout → Order
                              ↓
                         King Food API
                              ↓
              Admin · Kitchen · WhatsApp · Hermes · N8N
```

This repository is the **technical foundation**. Core capabilities already present from KitchenAsty:

- Customer storefront
- Admin panel
- Kitchen display (real-time Kanban)
- Order engine (full lifecycle)
- Menu + modifiers
- Payments (Stripe / PayPal / Cash)
- Auth + roles

---

## Branding defaults (seed)

| Setting | Value |
|---------|-------|
| Site name | King Food |
| Tagline | Açaí BR da saudade · Columbus, OH |
| Location | King Food Columbus (`columbus`) |
| Primary | `#FFD100` |
| Accent | `#E31818` |

> Demo menu items are still the original KitchenAsty sample data. Real King Food catalog comes in a later milestone.

---

## Quick start (local)

### Prerequisites

- Node.js 22+
- Docker (PostgreSQL)
- npm 10+

### Setup

```bash
git clone https://github.com/luizhbr/kitchenasty.git
cd kitchenasty
git checkout feature/king-food-foundation

npm install
docker compose up -d

cp packages/server/.env.example packages/server/.env
# Edit DATABASE_URL if needed

npx -w packages/server prisma migrate dev --schema ../../prisma/schema.prisma
npx -w packages/server prisma db seed

npm run dev:server      # http://localhost:3000
npm run dev:admin       # http://localhost:5173
npm run dev:storefront  # http://localhost:5174
```

### Demo credentials

- Admin: `admin@kitchenasty.com` / `admin123`
- Customer: `customer@example.com` / `customer123`

Upstream live demo (original KitchenAsty):
- https://demo.kitchenasty.com
- https://demo.kitchenasty.com/admin

---

## Project structure

```
king-food (foundation)/
├── docs/
│   ├── audit/              # Milestone 0 audits
│   └── king-food/          # King Food project docs
├── packages/
│   ├── admin/              # Admin panel
│   ├── server/             # Express API
│   ├── shared/             # Shared types
│   ├── storefront/         # Customer storefront
│   ├── mobile/             # Expo app (secondary)
│   └── docs/               # VitePress docs
├── prisma/
│   ├── schema.prisma
│   └── seed.ts            # King Food branding defaults
└── package.json            # name: king-food
```

---

## Documentation

| Doc | Path |
|-----|------|
| Milestone 0 audits | [`docs/audit/`](docs/audit/) |
| Milestone 1 plan | [`docs/king-food/MILESTONE_1_PLAN.md`](docs/king-food/MILESTONE_1_PLAN.md) |
| Identity / branding | [`docs/king-food/IDENTITY.md`](docs/king-food/IDENTITY.md) |
| Upstream KitchenAsty docs | https://mighty840.github.io/kitchenasty/ |

---

## Attribution & license

This project is based on **KitchenAsty**, Copyright (c) 2025 KitchenAsty Contributors, licensed under the [MIT License](LICENSE).

- Upstream: https://github.com/mighty840/kitchenasty
- Fork: https://github.com/luizhbr/kitchenasty

King Food is a **private commercial platform**. The MIT license permits commercial use, modification, and private distribution, provided the original copyright notice is preserved.

---

## Development rules (orchestrator)

Work is done by **milestones**. Do not implement the entire platform at once.

- **Milestone 0** — Audit → CLOSED
- **Milestone 1** — Foundation (current)
- Later: catalog, storefront focus, WhatsApp, Hermes, N8N, production hardening

See `docs/king-food/MILESTONE_1_PLAN.md` for scope and success criteria.
