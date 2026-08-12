# MILESTONE 3 — Storefront / Order Path

**Branch:** `feature/king-food-foundation`  
**Started:** 2026-08-11  
**Status:** IN PROGRESS

---

## Objective

Ensure the customer storefront works with the King Food catalog from Milestone 2 and that the core order path is coherent:

```
Menu → Product → Modifiers → Cart → Checkout → Order
```

This milestone is **validation + minimal fixes**, not a full UI redesign.

---

## In Scope

1. Inspect storefront menu/cart/checkout code paths
2. Confirm categories/products from seed are consumable by API/storefront
3. Document order path (happy path)
4. Minimal branding/copy fixes if blocking (King Food name)
5. Smoke checklist for storefront

## Out of Scope

- WhatsApp / Hermes / N8N
- Full visual redesign (Uber Eats clone etc.)
- Payment provider changes
- Production deploy
- Rewriting Order Engine

---

## Execution Plan

### Step 1 — Inspect
- [ ] Storefront routes / menu pages
- [ ] API endpoints for menu, cart, orders
- [ ] How modifiers are rendered

### Step 2 — Align (only if needed)
- [ ] Fix blockers for King Food catalog display
- [ ] Ensure location slug `columbus` is usable

### Step 3 — Document
- [ ] Order path notes
- [ ] Storefront smoke checklist

### Step 4 — Checkpoint
- [ ] Report and stop for authorization before M4

---

## Success Criteria

- [ ] Storefront architecture understood and documented
- [ ] Menu data path clear (API → storefront)
- [ ] No known blocker for King Food categories/products
- [ ] Order path documented
- [ ] M3 closed with explicit next recommendation
