# Storefront Smoke Checklist — Milestone 3

**Branch:** `feature/king-food-foundation`

Run after `npm install`, Docker Postgres, migrate, and `prisma db seed`.

```bash
npm run dev:server      # :3000
npm run dev:storefront  # :5174
```

| # | Check | Expected | Pass? |
|---|-------|----------|-------|
| 1 | Open http://localhost:5174 | Home loads | |
| 2 | Site branding | Name/colors reflect King Food (yellow/red) | |
| 3 | Open /menu | Categories: Açaí do King, Premium, Tropical, Combos, Hambúrgueres, Bebidas | |
| 4 | See products | e.g. Açaí King Tradicional $18.90, Tropical no Abacaxi $27 | |
| 5 | Open product modal | Description + size/addons if applicable | |
| 6 | Select tamanho + Nutella | Price updates | |
| 7 | Add to cart | Cart drawer opens with line item | |
| 8 | Go to /checkout | Summary matches cart | |
| 9 | Guest checkout + cash | Order created; redirect to confirmation | |
| 10 | Admin kitchen (optional) | Order appears in kitchen board | |

## Notes

- Prefer **fresh database** so only M2 catalog exists.
- Cash payment does not require Stripe keys.
- Report failures with browser console + API status code.
