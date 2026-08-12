# Staging E2E — King Food

**Milestone:** 5  
**Goal:** One complete order on a real running stack (local or hosted preview).

---

## 0. Prerequisites

- Node 22+, Docker, npm 10+
- Branch: `feature/king-food-foundation`

```bash
git checkout feature/king-food-foundation
npm install
docker compose up -d
cp packages/server/.env.example packages/server/.env
# Edit JWT_SECRET at minimum
```

---

## 1. Database

```bash
npx -w packages/server prisma migrate dev --schema ../../prisma/schema.prisma
npx -w packages/server prisma db seed
npx tsx scripts/cleanup-demo-catalog.ts
```

Expect seed log: King Food categories + Admin credentials.

---

## 2. Start stack

```bash
npm run dev:server      # :3000
npm run dev:storefront  # :5174
npm run dev:admin       # :5173
```

Optional env in `packages/server/.env`:

```env
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=stub
WHATSAPP_NOTIFY_NUMBER=13802695741
```

---

## 3. E2E steps

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Open storefront `/menu` | King Food categories visible |
| 2 | Open **Açaí King Tradicional** | Price ~$18.90 |
| 3 | Add Nutella (+$4) → Add to cart | Cart shows line |
| 4 | Refresh page | Cart still present (localStorage) |
| 5 | Checkout guest + **cash** + address (if delivery) | Submit OK |
| 6 | Confirmation page | Order number starts with **KF-** |
| 7 | Server terminal | `[whatsapp:stub]` log with order |
| 8 | Admin / Kitchen | Order appears (PENDING) |
| 9 | Advance status → PREPARING | Status updates |

---

## 4. Optional: webhook provider

```env
WHATSAPP_PROVIDER=webhook
WHATSAPP_WEBHOOK_URL=https://webhook.site/your-id
```

Place another order; confirm JSON POST received.

---

## 5. Optional: Twilio (real WhatsApp)

1. Twilio sandbox WhatsApp  
2. Set:

```env
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
WHATSAPP_NOTIFY_NUMBER=1XXXXXXXXXX
```

3. Join sandbox from your phone, place order, receive message.

---

## Failure notes

- Empty menu → re-seed + cleanup  
- CORS → check `CORS_ORIGINS` includes storefront origin  
- No WhatsApp log → `WHATSAPP_ENABLED` not false; NODE_ENV not test  
