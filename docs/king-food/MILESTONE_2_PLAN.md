# MILESTONE 2 — Catalog / Menu Foundation

**Branch:** `feature/king-food-foundation`  
**Started:** 2026-08-11  
**Status:** CATALOG SEED DELIVERED — awaiting checkpoint approval

---

## Objective

Replace the KitchenAsty demo Mediterranean menu with a **King Food** product catalog foundation.

---

## Delivered Catalog

### Categories

| Sort | Category | Slug |
|------|----------|------|
| 1 | Açaí | `acai` |
| 2 | Burgers | `burgers` |
| 3 | Combos | `combos` |
| 4 | Sides | `sides` |
| 5 | Sweets | `sweets` |
| 6 | Drinks | `drinks` |

### Products

| Product | Category | Base price | Modifiers |
|---------|----------|------------|-----------|
| Açaí Clássico | Açaí | $9.99 | Tamanho 300/500/700 + Complementos |
| Açaí Bowl Especial | Açaí | $12.99 | Tamanho 500/700 |
| X-Burger | Burgers | $11.99 | Adicionais |
| X-Bacon | Burgers | $13.99 | Adicionais |
| X-Tudo | Burgers | $15.99 | Adicionais |
| Combo Burger + Fries + Drink | Combos | $16.99 | — |
| Combo X-Tudo | Combos | $19.99 | — |
| Batata Frita | Sides | $4.99 | Tamanho M/G |
| Mini Churros (16oz) | Sweets | $7.99 | — |
| Refrigerante Lata | Drinks | $2.99 | Sabor |
| Água | Drinks | $1.99 | — |

---

## Execution Plan

### Step 1 — Plan & structure
- [x] Plan document

### Step 2 — Seed rewrite (catalog)
- [x] Categories
- [x] Menu items
- [x] Modifiers (açaí sizes/toppings, burger extras, fries size, drink flavor)
- [x] Location + SiteSettings preserved from M1
- [x] Admin/customer users preserved

### Step 3 — Documentation
- [x] This progress update

### Step 4 — Checkpoint
- [ ] Formal M2 close after your OK
- [ ] Authorization for Milestone 3

---

## Success Criteria

- [x] Seed creates King Food categories
- [x] At least one product per category
- [x] Açaí has size + toppings modifiers
- [x] Burgers have extras modifiers
- [x] Location + branding from M1 preserved
- [x] Order Engine untouched
- [x] Docs updated

---

## Decision Log

### DECISION 004
Curated King Food starter catalog in seed (not OlaClick scrape).  
**Date:** 2026-08-11

### DECISION 005
Prices are starter USD estimates for Columbus delivery; refine later with real cost sheet.  
**Date:** 2026-08-11

---

## Recommended Next Milestone (after approval)

**MILESTONE 3** — Storefront polish / checkout path validation  
or refine catalog prices/photos from real King Food menu.
