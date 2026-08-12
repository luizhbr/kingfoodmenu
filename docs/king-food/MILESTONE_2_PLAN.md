# MILESTONE 2 — Catalog / Menu Foundation

**Branch:** `feature/king-food-foundation`  
**Started:** 2026-08-11  
**Status:** IN PROGRESS

---

## Objective

Replace the KitchenAsty demo Mediterranean menu with a **King Food** product catalog foundation.

Scope is limited to:

- Categories
- Products (menu items)
- Core modifiers (sizes, toppings, extras)
- Seed data aligned to Columbus / BR delivery business

Out of scope:

- UI redesign
- WhatsApp / Hermes / N8N
- Order Engine changes
- Payments changes
- Production deploy

---

## Target Category Structure

| Sort | Category | Slug | Notes |
|------|----------|------|-------|
| 1 | Açaí | `acai` | Bowls + size modifiers |
| 2 | Burgers | `burgers` | Classic BR-style burgers |
| 3 | Combos | `combos` | Meal deals |
| 4 | Sides | `sides` | Fries, etc. |
| 5 | Sweets | `sweets` | Churros / desserts |
| 6 | Drinks | `drinks` | Soft drinks, juices |

---

## Modifier Patterns

### Açaí bowls
- Size: 300ml / 500ml / 700ml (RADIO, required)
- Toppings: granola, banana, morango, leite condensado, paçoca, etc. (CHECKBOX)

### Burgers
- Optional extras: bacon, cheddar, ovo, etc. (CHECKBOX)

### Combos
- Usually fixed price; optional drink upgrade later

---

## Execution Plan

### Step 1 — Plan & structure
- [x] This document

### Step 2 — Seed rewrite (catalog only)
- [ ] Replace categories
- [ ] Replace menu items
- [ ] Attach modifiers
- [ ] Keep location = King Food Columbus
- [ ] Keep SiteSettings branding
- [ ] Keep admin/customer users

### Step 3 — Documentation
- [ ] Update IDENTITY / README note about real catalog
- [ ] Decision log

### Step 4 — Checkpoint
- [ ] Report M2 status
- [ ] Stop for authorization before M3

---

## Success Criteria

- [ ] Seed creates King Food categories (not Mediterranean)
- [ ] At least one product per category
- [ ] Açaí has size + toppings modifiers
- [ ] Burgers have extras modifiers
- [ ] Location + branding from M1 preserved
- [ ] Order Engine untouched
- [ ] Docs updated

---

## Decision Log

### DECISION 004
**Context:** Menu content source  
**Chosen:** Curated King Food starter catalog in seed (not scraping OlaClick)  
**Reason:** Independence from OlaClick; private platform foundation  
**Date:** 2026-08-11
