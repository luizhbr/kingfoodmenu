# MILESTONE 1 — King Food Foundation

**Branch:** `feature/king-food-foundation`  
**Base:** `research/kitchenasty-audit` (`c2055fb07059484e47ee4e5acbea730a0d6a84b0`)  
**Started:** 2026-08-11  
**Status:** IN PROGRESS

---

## Objective

Transform the audited KitchenAsty codebase into the **King Food Foundation** without rewriting the system.

This milestone focuses only on:

- Branding
- Default configuration
- Project identity
- Safe structural preparation

It does **not** include:
- WhatsApp / Hermes / N8N
- New payment flows
- Full UI redesign
- Removal of major modules yet

---

## Scope (Allowed)

1. Rename project identity from KitchenAsty → King Food (where safe)
2. Update default SiteSettings (name, colors, title)
3. Update package names / descriptions where appropriate
4. Create King Food specific documentation folder
5. Prepare environment examples for King Food
6. Keep all existing features working

## Out of Scope (Forbidden in M1)

- Building custom storefront from scratch
- Removing Admin or Kitchen
- Changing Order Engine logic
- Integrating WhatsApp / Hermes / N8N
- Database destructive migrations
- Production deployment

---

## Execution Plan

### Step 1 — Identity & Branding (current)
- [ ] Update root README with King Food context (keep KitchenAsty attribution)
- [ ] Update default SiteSettings values in seed (siteName, colors)
- [ ] Update package.json descriptions
- [ ] Add `docs/king-food/` foundation docs

### Step 2 — Configuration Foundation
- [ ] Create `.env.example` notes for King Food
- [ ] Document required environment variables
- [ ] Confirm multi-location remains available

### Step 3 — Smoke Validation Checklist
- [ ] Document how to run locally as King Food foundation
- [ ] Confirm Admin + Storefront + Kitchen still boot (user-side)

### Step 4 — Checkpoint
- [ ] Commit all changes
- [ ] Report MILESTONE 1 status
- [ ] Wait for authorization before Milestone 2

---

## Branding Defaults (King Food)

| Setting | Value |
|---------|-------|
| Site Name | King Food |
| Primary Color | `#FFD100` (King yellow) |
| Secondary / Accent | `#E31818` (King red) |
| Tagline | Açaí BR da saudade · Columbus, OH |
| Default Currency | USD |

---

## Decision Log

### DECISION 001
**Context:** Start of Milestone 1  
**Options:** Rewrite vs Adapt KitchenAsty  
**Chosen:** Adapt  
**Reason:** KitchenAsty already contains Order Engine, Admin, Kitchen, Modifiers, Payments  
**Tradeoff:** Some unused features will remain temporarily  
**Date:** 2026-08-11

---

## Success Criteria for Milestone 1

- [ ] Branch `feature/king-food-foundation` exists
- [ ] Project clearly identified as King Food foundation
- [ ] Default branding points to King Food
- [ ] Original KitchenAsty license/attribution preserved
- [ ] No broken core flows introduced
- [ ] Documentation updated
- [ ] Ready for Milestone 2 (Storefront focus) after approval
