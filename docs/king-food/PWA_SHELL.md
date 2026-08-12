# PWA Shell — King Food Storefront

**Milestone:** 6  
**Aligned to:** production `kingfood.online` (Next shell) — without OlaClick iframe.

---

## What was added

| File | Role |
|------|------|
| `packages/storefront/public/manifest.json` | Name, theme `#FFD100`, standalone |
| `packages/storefront/public/sw.js` | Shell cache; **never** caches `/api` |
| `packages/storefront/index.html` | pt-BR, apple meta, early BIP capture |
| `packages/storefront/src/components/PwaInstall.tsx` | Soft install banner + SW register |
| Theme defaults | King Food name + yellow/red |

Icons currently load from `https://kingfood.online/icons/...` so we do not duplicate binary assets in this milestone.

---

## Local verify

```bash
npm run dev:storefront
# Chrome → Application → Manifest / Service Workers
```

Production install prompt needs **HTTPS** (or localhost).

---

## Still different from kingfood.online

| Production shell | This storefront |
|------------------|-----------------|
| Next.js 15 + OlaClick iframe | React/Vite + native menu API |
| OneSignal push | Not included |
| Dark home + bottom dock | KitchenAsty layout + install banner |
| Splash açaí animation | Not ported |

Full visual parity of the Next home is a later UI milestone if desired.

---

## Next icons step (optional)

Copy into `packages/storefront/public/icons/` from production and point manifest to local paths for offline install icons.
