# MILESTONE 4 — Hardening / Independence Prep

**Branch:** `feature/king-food-foundation`  
**Started:** 2026-08-11  
**Closed:** 2026-08-11  
**Status:** **CLOSED**

---

## Delivered (1–5)

| # | Item | Deliverable |
|---|------|-------------|
| 1 | DB cleanup strategy | `scripts/cleanup-demo-catalog.ts` (deactivate demo) |
| 2 | Cart persistence | `CartContext` → `localStorage` key `king-food-cart-v1` |
| 3 | WhatsApp stub | `packages/server/src/lib/whatsapp.ts` + call on order create |
| 4 | Deploy preview | `docs/king-food/DEPLOY_PREVIEW.md` |
| 5 | Admin ops guide | `docs/king-food/ADMIN_OPS.md` |

### Extra
- Order numbers prefix: **KF-** (was KA-)

---

## How to run cleanup

```bash
npx tsx scripts/cleanup-demo-catalog.ts
```

---

## WhatsApp env

```env
WHATSAPP_STUB_ENABLED=true
WHATSAPP_NOTIFY_NUMBER=13802695741
WHATSAPP_STUB_WEBHOOK_URL=   # optional
```

---

## Out of scope (still)

- Hermes / N8N full pipeline
- Production cutover from OlaClick
- Live Stripe keys

---

## Recommended Next

**MILESTONE 5** — Preview deploy on real host + first end-to-end order on staging  
or WhatsApp real sender (Meta Cloud API / Twilio) behind the same stub interface.
