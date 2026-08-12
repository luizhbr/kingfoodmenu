# Admin Ops — King Food Catalog

**Audience:** Owner / manager editing menu without code.  
**Panel:** `packages/admin` → http://localhost:5173 (dev)

---

## Login

- Email: `admin@kitchenasty.com`
- Password: `admin123` (change after first real deploy)

---

## Edit catalog

### Categories
1. Admin → Menu / Categories  
2. Keep King Food structure:
   - Açaí do King  
   - Açaí Premium  
   - Açaí Tropical  
   - Açaí Combos  
   - Hambúrgueres  
   - Bebidas  
3. Use **isActive = false** to hide without deleting.

### Products
1. Create/edit item: name, description, price (USD), category, image URL  
2. **Options (modifiers):**
   - `Tamanho` → displayType **RADIO**, required  
   - `Adicionais` → displayType **CHECKBOX**, not required  
3. Option values use **priceModifier** (e.g. Nutella +4.00).

### Prices aligned to live OlaClick (reference)
See `docs/king-food/CATALOG_FROM_OLACLICK.md`.

---

## After bulk seed / mixed DB

```bash
npx tsx scripts/cleanup-demo-catalog.ts
```

Deactivates Mediterranean demo items (does not delete order history).

---

## Orders

- Kitchen board updates in real time (Socket.IO)
- Order numbers: `KF-...`
- Status flow: PENDING → CONFIRMED → PREPARING → READY → …

---

## Site branding

Admin Settings / SiteSettings:

| Field | King Food value |
|-------|-----------------|
| siteName | King Food |
| colorPrimary | `#FFD100` |
| colorSecondary | `#E31818` |

---

## WhatsApp stub

On each new order, server logs `[whatsapp-stub]` with message preview.  
Optional: set `WHATSAPP_STUB_WEBHOOK_URL` to POST JSON to n8n later.

---

## Do not

- Delete categories that still have items (move items first)
- Rely on OlaClick for private platform truth — edit **this** catalog
