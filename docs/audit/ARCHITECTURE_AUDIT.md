# ARCHITECTURE AUDIT — KitchenAsty

**Repository:** https://github.com/luizhbr/kitchenasty  
**Upstream:** https://github.com/mighty840/kitchenasty  
**Branch:** `research/kitchenasty-audit`  
**Base Commit:** `e0359f7376ddebdffeae36216ab719c8ea59c589`  
**Audit Date:** 2026-08-11  
**Auditor:** King Food Master Development Orchestrator (Grok)

---

## 1. High-Level Architecture

KitchenAsty is a **TypeScript monorepo** designed as a self-hosted restaurant ordering and management platform.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Storefront    │     │     Admin       │     │     Mobile      │
│  (React + Vite) │     │  (React + Vite) │     │     (Expo)      │
│   port 5174     │     │   port 5173     │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      Express API        │
                    │      (port 3000)        │
                    │  + Socket.IO (realtime) │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   PostgreSQL + Prisma   │
                    └─────────────────────────┘
```

### Packages

| Package              | Responsibility                              |
|----------------------|---------------------------------------------|
| `packages/server`    | Express API, business logic, Prisma client  |
| `packages/admin`     | Admin dashboard (React + Vite)              |
| `packages/storefront`| Customer-facing ordering UI                 |
| `packages/mobile`    | React Native / Expo mobile app              |
| `packages/shared`    | Shared types and constants                  |
| `packages/docs`      | VitePress documentation site                |

---

## 2. Backend Architecture

- **Framework:** Express 4
- **Language:** TypeScript (strict)
- **ORM:** Prisma 5
- **Database:** PostgreSQL
- **Auth:** JWT + bcrypt, role-based (`SUPER_ADMIN`, `MANAGER`, `STAFF`)
- **Validation:** Zod
- **Realtime:** Socket.IO
- **File uploads:** Multer
- **Logging:** Pino
- **Payments:** Stripe + PayPal + Cash

### Core Domain Models (from Prisma schema)

- **Users / Staff** — role-based admin users
- **Customers** — registered + guest checkout support
- **Locations** — multi-location support
- **Categories + MenuItems + MenuOptions + MenuOptionValues** (modifiers)
- **Orders + OrderItems + OrderItemOptions**
- **Payments**
- **Reservations + Tables**
- **Coupons**
- **Reviews**
- **Loyalty**
- **AutomationRules**
- **SiteSettings** (central configuration)
- **AuditLog + ApiMetric** (observability)

### Order Lifecycle

```
PENDING → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED
                                           ↘ PICKED_UP
                                           ↘ CANCELLED
```

This matches the Order Engine required for King Food.

---

## 3. Frontend Architecture

### Storefront
- React 18 + Vite + Tailwind
- Cart context
- Auth context
- Theme / template system (10 templates)
- i18n (en, es, fr, de, it, pt)
- Mobile-first design

### Admin
- React 18 + Vite + Tailwind
- Role-based navigation
- Kitchen Display (Kanban)
- Full CRUD for menu, orders, staff, coupons, settings, etc.

### Mobile
- Expo / React Native
- Same API as storefront
- Push notifications support

---

## 4. API Design

- REST API
- OpenAPI / Swagger available at `/api/docs`
- Clear separation of concerns (controllers → services pattern is partially present)
- Real-time events via Socket.IO for order status updates

---

## 5. Strengths for King Food

| Requirement                  | KitchenAsty Status      |
|-----------------------------|-------------------------|
| Storefront                  | ✅ Strong               |
| Product Catalog + Modifiers | ✅ Excellent            |
| Cart + Checkout             | ✅ Present              |
| Order Engine                | ✅ Full lifecycle       |
| Admin                       | ✅ Mature               |
| Kitchen Display             | ✅ Real-time Kanban     |
| Payments                    | ✅ Stripe / PayPal / Cash |
| Multi-location              | ✅ Supported            |
| Real-time                   | ✅ Socket.IO            |
| Auth + Roles                | ✅ Present              |
| Tests                       | ✅ Vitest + Playwright  |
| License                     | ✅ MIT                  |

---

## 6. Architectural Risks & Gaps

1. **Monolith API** — All logic lives in one Express app. Acceptable for now, but King Food may want clearer domain boundaries later.
2. **Tight coupling** between frontend packages and server types (mitigated by `packages/shared`).
3. **Template system** is powerful but complex — may be overkill for the first King Food version.
4. **Mobile app** exists but is secondary for the current King Food priority (web + PWA first).
5. **No built-in WhatsApp / Hermes / N8N integration** (expected — these are King Food specific layers).

---

## 7. Recommendation

KitchenAsty is an **excellent foundation** for the King Food private platform.

Recommended approach:

1. Keep the monorepo structure.
2. Create a `feature/king-food-foundation` branch after audit approval.
3. Rebrand and strip non-essential features gradually.
4. Add King Food specific layers (WhatsApp → Hermes → API) later, as defined in the orchestrator.

**Do not rewrite from scratch.** Adapt.
