# King Food — Order Path (Storefront)

**Milestone:** 3  
**Branch:** `feature/king-food-foundation`

---

## Happy path

```
Home → /menu → Category → Product modal → Options → Cart → /checkout → POST /api/orders → /order/:id
```

Optional:

- Guest checkout (name + email)
- Logged-in customer
- Payment: cash | stripe | paypal
- Schedule (ASAP or datetime)
- Coupon code
- Loyalty points (if authenticated)

Kitchen receives order via existing Order Engine + Socket.IO (already in KitchenAsty).

---

## Frontend map

| Step | File |
|------|------|
| Routes | `packages/storefront/src/main.tsx` |
| Menu list | `pages/Menu.tsx` |
| Product + modifiers | `components/MenuItemModal.tsx` |
| Cart state | `context/CartContext.tsx` |
| Cart UI | `components/CartDrawer.tsx` |
| Checkout | `pages/Checkout.tsx` |
| Confirmation | `pages/OrderConfirmation.tsx` |
| Live status | `pages/OrderStatus.tsx` |
| Branding/colors | `context/ThemeContext.tsx` + SiteSettings |

---

## API map

| Action | Endpoint |
|--------|----------|
| Categories | `GET /api/menu/categories` |
| Items (filter) | `GET /api/menu/items?categoryId=&search=&page=` |
| Item detail + options | `GET /api/menu/items/:id` |
| Locations | `GET /api/locations` |
| Place order | `POST /api/orders` |
| Stripe session | `POST /api/payments/create-checkout-session` |

Routes defined in `packages/server/src/routes/menu.routes.ts` and `order.routes.ts`.

---

## Compatibility with M2 catalog

| Concern | Status |
|---------|--------|
| `Category.isActive` default `true` | Seed OK — storefront filters `isActive` |
| `MenuItem.isActive` default `true` | Seed OK |
| Options RADIO/CHECKBOX | Supported in MenuItemModal |
| priceModifier on option values | Supported in cart + checkout |
| Location slug `columbus` | Seeded; list endpoints work without location filter |
| SiteSettings colors | Theme pulls primary/secondary |

**No storefront code change required** for King Food catalog to appear after seed + migrate.

---

## Known limitations (not M3 blockers)

1. Cart is **in-memory only** (lost on refresh) — acceptable for foundation.
2. Runtime smoke not executed in agent sandbox (no Docker).
3. Stripe/PayPal need real keys in env for non-cash payments.
4. Old Mediterranean categories may remain in DB if a previous seed was applied without cleanup — fresh DB or admin deactivate recommended.
5. WhatsApp order notification is **out of scope** until a later milestone.

---

## Recommended local verification

See `docs/king-food/STOREFRONT_SMOKE.md`.
