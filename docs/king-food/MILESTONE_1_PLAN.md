# MILESTONE 1 — King Food Foundation

**Branch:** `feature/king-food-foundation`  
**Started:** 2026-08-11  
**Status:** AWAITING SMOKE TEST (docs + branding complete)

---

## Objective

Transform the audited KitchenAsty codebase into the **King Food Foundation** without rewriting the system.

Focus: branding, default configuration, project identity, safe structural preparation.

---

## Execution Plan

### Step 1 — Identity & Branding
- [x] Update root README with King Food context (keep KitchenAsty attribution)
- [x] Update default SiteSettings values in seed (siteName, colors, location)
- [x] Update package.json descriptions
- [x] Add `docs/king-food/` foundation docs

### Step 2 — Configuration Foundation
- [x] Smoke test checklist documented (`docs/king-food/SMOKE_TEST.md`)
- [x] Multi-location model remains available (unchanged schema)
- [ ] Optional: expand `.env.example` comments (non-blocking)

### Step 3 — Smoke Validation
- [ ] User runs local bootstrap + checklist
- [ ] Confirm Admin + Storefront + Kitchen still boot

### Step 4 — Checkpoint
- [x] Changes committed on `feature/king-food-foundation`
- [ ] Formal MILESTONE 1 close after smoke test OK
- [ ] Authorization for Milestone 2

---

## Branding Defaults

| Setting | Value |
|---------|-------|
| Site Name | King Food |
| Primary | `#FFD100` |
| Accent | `#E31818` |
| Tagline | Açaí BR da saudade · Columbus, OH |
| Location | King Food Columbus (`columbus`) |

---

## Decision Log

### DECISION 001
Adapt KitchenAsty instead of rewrite.  
**Date:** 2026-08-11

### DECISION 002
Keep demo menu; only rebrand SiteSettings + Location in seed.  
**Date:** 2026-08-11

---

## Success Criteria

- [x] Branch exists
- [x] Project identified as King Food foundation
- [x] Default branding points to King Food
- [x] KitchenAsty MIT attribution preserved
- [ ] Core flows verified via smoke test
- [x] Documentation updated
- [ ] Ready for Milestone 2 after approval
