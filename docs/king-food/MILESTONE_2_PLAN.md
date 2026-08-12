# MILESTONE 2 — Catalog / Menu Foundation

**Branch:** `feature/king-food-foundation`  
**Started:** 2026-08-11  
**Closed:** 2026-08-11  
**Status:** **CLOSED**

---

## Objective

Replace the KitchenAsty demo Mediterranean menu with the **real King Food catalog** (from live OlaClick data), without depending on OlaClick at runtime.

---

## Final Deliverables

| Item | Status |
|------|--------|
| Categories aligned to live menu | ✅ Açaí do King, Premium, Tropical, Combos, Hambúrgueres, Bebidas |
| Products + real USD prices | ✅ From OlaClick API snapshot |
| Size variants (12oz / 16oz / abacaxi) | ✅ |
| Açaí adicionais (Nutella, paçoca, frutas…) | ✅ Real modifier prices |
| Burgers + drinks from inventory | ✅ |
| Catalog snapshot doc | ✅ `docs/king-food/CATALOG_FROM_OLACLICK.md` |
| Order Engine | ✅ Untouched |
| Location + branding (M1) | ✅ Preserved / refined |

### Source

- API: `ms-products/public/companies/bbd99239-41c5-4a62-9bf0-151d7224b7f3/categories`
- Shell: https://kingfood.online/
- Menu UI: https://kingfood.fe-v2.ola.click/products

---

## Decision Log

### DECISION 004 (updated)
Import real King Food menu from OlaClick public API into seed (not invented prices).  
**Date:** 2026-08-11

### DECISION 005
Include currently *hidden* OlaClick items selectively (burgers/drinks) so private platform has fuller inventory; skip caldos/frango/performance for now.  
**Date:** 2026-08-11

### DECISION 006
Close M2 after catalog seed + snapshot doc; runtime validation remains user-side.  
**Date:** 2026-08-11

---

## Recommended Next Milestone

**MILESTONE 3 — Storefront / Order path**

Suggested focus (needs authorization):

- Validate storefront menu rendering with new catalog
- Cart + checkout path smoke
- Optional: hide/show flags matching OlaClick visibility
- Optional: product images cleanup

Do not start until explicitly authorized.
