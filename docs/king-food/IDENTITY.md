# King Food — Project Identity

**Platform:** King Food Private Ordering Platform  
**Foundation:** KitchenAsty (MIT License)  
**Branch:** `feature/king-food-foundation`  
**Date:** 2026-08-11

---

## Brand

| Item | Value |
|------|-------|
| Name | **King Food** |
| Tagline | Açaí BR da saudade · Columbus, OH |
| Market | Brazilian food delivery (açaí, burgers, combos) |
| Location focus | Columbus, Ohio, USA |
| Primary color | `#FFD100` (King yellow) |
| Accent / Red | `#E31818` |
| Dark base | `#000000` / `#171717` |

---

## Attribution

This platform is built on top of **KitchenAsty**, an open-source restaurant ordering system licensed under the MIT License.

- Upstream: https://github.com/mighty840/kitchenasty
- Fork: https://github.com/luizhbr/kitchenasty
- Original license and copyright must be preserved

King Food is a **private commercial project**. The MIT license permits this use.

---

## Product Direction

King Food will evolve into:

```
Customer → Storefront → Cart → Checkout → Order
                              ↓
                         King Food API
                              ↓
                    Admin · Kitchen · WhatsApp · Hermes · N8N
```

Current foundation already provides:

- Storefront
- Admin
- Kitchen Display
- Order Engine
- Modifiers
- Payments (Stripe / PayPal / Cash)
- Auth + Roles

---

## What Milestone 1 Changes

- Project identity (`king-food`)
- Documentation structure under `docs/king-food/`
- Branding defaults (this file + package metadata)

What Milestone 1 does **not** change yet:

- Menu/seed data (still demo Mediterranean data)
- Core order logic
- Admin feature set
- WhatsApp / Hermes integrations

Those belong to later milestones.
