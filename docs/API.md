# API — Mapa de Rotas

> **Base:** `https://king-food-foundation-ui.vercel.app`
> **Formato:** JSON. CSRF obrigatório para POST/PUT/PATCH/DELETE sem Bearer.
> **Auth:** `Authorization: Bearer <JWT>`

## Convenções

- `PUBLIC` — sem auth
- `AUTH` — qualquer usuário autenticado (customer ou staff)
- `STAFF` — qualquer staff (SUPER_ADMIN, MANAGER, STAFF)
- `SUPER_ADMIN` / `MANAGER` — role específica
- `CSRF` — sim = exige X-CSRF-Token + cookie _csrf (sem Bearer)

---

## ACTIVE ROUTES

### Auth (`/api/auth`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| POST | /staff/login | PUBLIC | sim | staffLogin | IMPLEMENTED |
| POST | /staff/register | SUPER_ADMIN | sim | staffRegister | IMPLEMENTED |
| POST | /customer/register | PUBLIC | sim | customerRegister | IMPLEMENTED |
| POST | /customer/login | PUBLIC | sim | customerLogin | IMPLEMENTED |
| GET | /google | PUBLIC | não | passport | IMPLEMENTED (não testado prod) |
| GET | /google/callback | PUBLIC | não | passport | IMPLEMENTED (não testado prod) |
| GET | /facebook | PUBLIC | não | passport | IMPLEMENTED (não testado prod) |
| GET | /facebook/callback | PUBLIC | não | passport | IMPLEMENTED (não testado prod) |
| POST | /push-token | AUTH | sim | savePushToken | IMPLEMENTED |
| GET | /me | AUTH | não | getMe | IMPLEMENTED |

### Menu (`/api/menu`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| GET | / | PUBLIC | não | — | IMPLEMENTED |
| GET | /categories | PUBLIC | não | listCategories | IMPLEMENTED |
| GET | /categories/:id | PUBLIC | não | getCategory | IMPLEMENTED |
| POST | /categories | STAFF (MANAGER+) | sim | createCategory | IMPLEMENTED |
| PATCH | /categories/:id | STAFF (MANAGER+) | sim | updateCategory | IMPLEMENTED |
| DELETE | /categories/:id | SUPER_ADMIN | sim | deleteCategory | IMPLEMENTED |
| GET | /items | PUBLIC | não | listMenuItems | IMPLEMENTED |
| GET | /items/:id | PUBLIC | não | getMenuItem | IMPLEMENTED |
| POST | /items | STAFF (MANAGER+) | sim | createMenuItem | IMPLEMENTED |
| PATCH | /items/:id | STAFF (MANAGER+) | sim | updateMenuItem | IMPLEMENTED |
| DELETE | /items/:id | SUPER_ADMIN | sim | deleteMenuItem | IMPLEMENTED |
| POST | /items/:id/image | STAFF (MANAGER+) | sim | uploadItemImage | IMPLEMENTED |
| DELETE | /items/:id/image | STAFF (MANAGER+) | sim | deleteItemImage | IMPLEMENTED |
| GET | /allergens | PUBLIC | não | listAllergens | IMPLEMENTED |
| POST | /allergens | STAFF (MANAGER+) | sim | createAllergen | IMPLEMENTED |
| DELETE | /allergens/:id | SUPER_ADMIN | sim | deleteAllergen | IMPLEMENTED |
| GET | /mealtimes | PUBLIC | não | listMealtimes | IMPLEMENTED |
| POST | /mealtimes | STAFF (MANAGER+) | sim | createMealtime | IMPLEMENTED |
| PATCH | /mealtimes/:id | STAFF (MANAGER+) | sim | updateMealtime | IMPLEMENTED |
| DELETE | /mealtimes/:id | SUPER_ADMIN | sim | deleteMealtime | IMPLEMENTED |

### Orders (`/api/orders`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| POST | / | PUBLIC (guest) / AUTH | sim | createOrder | IMPLEMENTED + PRODUCTION |
| GET | /my-orders | AUTH | não | listCustomerOrders | IMPLEMENTED |
| GET | / | STAFF | não | listOrders | IMPLEMENTED |
| GET | /:id | AUTH (owner) | não | getOrder | IMPLEMENTED |
| PATCH | /:id/status | STAFF | sim | updateOrderStatus | IMPLEMENTED |

### Payments (`/api/payments`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| POST | /webhook | PUBLIC (signature) | não | handleWebhook | IMPLEMENTED |
| POST | /create-intent | AUTH | sim | createPaymentIntent | IMPLEMENTED |
| POST | /create-checkout-session | AUTH | sim | createCheckoutSession | IMPLEMENTED |
| POST | /cash | STAFF | sim | markCashPayment | IMPLEMENTED |
| POST | /paypal/create | AUTH | sim | createPayPalPayment | IMPLEMENTED |
| POST | /paypal/capture | AUTH | sim | capturePayPalPayment | IMPLEMENTED |

### Locations (`/api/locations`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| GET | / | PUBLIC | não | listLocations | IMPLEMENTED |
| GET | /:id | PUBLIC | não | getLocation | IMPLEMENTED |
| POST | / | STAFF (MANAGER+) | sim | createLocation | IMPLEMENTED |
| PATCH | /:id | STAFF (MANAGER+) | sim | updateLocation | IMPLEMENTED |
| DELETE | /:id | SUPER_ADMIN | sim | deleteLocation | IMPLEMENTED |
| GET | /:locationId/delivery-zones/check | PUBLIC | não | checkDeliveryZone | IMPLEMENTED |
| GET | /:locationId/delivery-zones | PUBLIC | não | listDeliveryZones | IMPLEMENTED |
| POST | /:locationId/delivery-zones | STAFF (MANAGER+) | sim | createDeliveryZone | IMPLEMENTED |
| PATCH | /:locationId/delivery-zones/:zoneId | STAFF (MANAGER+) | sim | updateDeliveryZone | IMPLEMENTED |
| DELETE | /:locationId/delivery-zones/:zoneId | SUPER_ADMIN | sim | deleteDeliveryZone | IMPLEMENTED |
| GET | /:locationId/tables | PUBLIC | não | listTables | IMPLEMENTED |
| GET | /:locationId/tables/:tableId | PUBLIC | não | getTable | IMPLEMENTED |
| POST | /:locationId/tables | STAFF (MANAGER+) | sim | createTable | IMPLEMENTED |
| PATCH | /:locationId/tables/:tableId | STAFF (MANAGER+) | sim | updateTable | IMPLEMENTED |
| DELETE | /:locationId/tables/:tableId | SUPER_ADMIN | sim | deleteTable | IMPLEMENTED |

### Reservations (`/api/reservations`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| GET | /availability | PUBLIC | não | checkAvailability | IMPLEMENTED |
| GET | /my-reservations | AUTH | não | listCustomerReservations | IMPLEMENTED |
| GET | /analytics | STAFF | não | getReservationAnalytics | IMPLEMENTED |
| POST | / | AUTH | sim | createReservation | IMPLEMENTED |
| GET | / | STAFF | não | listReservations | IMPLEMENTED |
| GET | /:id | AUTH (owner) | não | getReservation | IMPLEMENTED |
| PATCH | /:id | STAFF | sim | updateReservation | IMPLEMENTED |
| DELETE | /:id | STAFF | sim | deleteReservation | IMPLEMENTED |

### Coupons (`/api/coupons`)

> Ledger: `coupon_usages` (CouponUsage) — idempotente por (couponId, orderId)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| POST | /validate | PUBLIC | sim | validateCoupon | IMPLEMENTED |
| GET | / | STAFF | não | listCoupons | IMPLEMENTED |
| GET | /:id | STAFF | não | getCoupon | IMPLEMENTED |
| POST | / | STAFF | sim | createCoupon | IMPLEMENTED |
| PATCH | /:id | STAFF | sim | updateCoupon | IMPLEMENTED |
| DELETE | /:id | SUPER_ADMIN/MANAGER | sim | deleteCoupon | IMPLEMENTED |

### Reviews (`/api/reviews`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| GET | /location/:locationId | PUBLIC | não | getLocationReviews | IMPLEMENTED |
| POST | / | AUTH | sim | createReview | IMPLEMENTED |
| GET | / | STAFF | não | listReviews | IMPLEMENTED |
| PATCH | /:id | STAFF | sim | moderateReview | IMPLEMENTED |
| DELETE | /:id | SUPER_ADMIN/MANAGER | sim | deleteReview | IMPLEMENTED |

### Dashboard (`/api/dashboard`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| GET | /stats | STAFF | não | getDashboardStats | IMPLEMENTED + PRODUCTION |
| GET | /analytics | STAFF | não | getAnalytics | IMPLEMENTED |

> `GET /api/dashboard` (sem sufixo) NÃO existe — o admin foi corrigido para `/stats` (commit c3600a2).

### Tracking (`/api/tracking`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| POST | /events | PUBLIC | sim | inline (routes) | IMPLEMENTED + PRODUCTION |

### Campaigns (`/api/campaigns`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| GET | / | MANAGER+ | não | — | IMPLEMENTED |
| POST | / | MANAGER+ | sim | — | IMPLEMENTED |
| GET | /:id | MANAGER+ | não | — | IMPLEMENTED |
| PATCH | /:id | MANAGER+ | sim | — | IMPLEMENTED |
| DELETE | /:id | MANAGER+ | sim | — | IMPLEMENTED |

### QR Codes (`/api/qrcodes`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| GET | / | MANAGER+ | não | — | IMPLEMENTED |
| POST | / | MANAGER+ | sim | — | IMPLEMENTED |
| GET | /:code | PUBLIC | não | — | IMPLEMENTED |

### Settings (`/api/settings`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| GET | / | STAFF | não | getSettings | IMPLEMENTED |
| PUT | / | STAFF | sim | updateSettings | IMPLEMENTED |
| POST | /logo | STAFF | sim | uploadLogo | IMPLEMENTED |
| POST | /favicon | STAFF | sim | uploadFavicon | IMPLEMENTED |
| GET | /general | MANAGER+ | não | getGeneralSettings | IMPLEMENTED |
| PUT | /general | MANAGER+ | sim | updateGeneralSettings | IMPLEMENTED |
| GET | /order | MANAGER+ | não | getOrderSettings | IMPLEMENTED |
| PUT | /order | MANAGER+ | sim | updateOrderSettings | IMPLEMENTED |
| GET | /reservation | MANAGER+ | não | getReservationSettings | IMPLEMENTED |
| PUT | /reservation | MANAGER+ | sim | updateReservationSettings | IMPLEMENTED |
| GET | /mail | SUPER_ADMIN | não | getMailSettings | IMPLEMENTED |
| PUT | /mail | SUPER_ADMIN | sim | updateMailSettings | IMPLEMENTED |
| POST | /mail/test | SUPER_ADMIN | sim | testMailSettings | IMPLEMENTED |
| GET | /payment | SUPER_ADMIN | não | getPaymentSettings | IMPLEMENTED |
| PUT | /payment | SUPER_ADMIN | sim | updatePaymentSettings | IMPLEMENTED |
| GET | /review | MANAGER+ | não | getReviewSettings | IMPLEMENTED |
| PUT | /review | MANAGER+ | sim | updateReviewSettings | IMPLEMENTED |
| GET | /advanced | SUPER_ADMIN | não | getAdvancedSettings | IMPLEMENTED |
| PUT | /advanced | SUPER_ADMIN | sim | updateAdvancedSettings | IMPLEMENTED |

### Staff (`/api/staff`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| GET | /invite/:token | PUBLIC | não | validateInviteToken | IMPLEMENTED |
| POST | /accept-invite | PUBLIC | sim | acceptInvite | IMPLEMENTED |
| GET | / | MANAGER+ | não | listStaff | IMPLEMENTED |
| POST | /invite | SUPER_ADMIN | sim | inviteStaff | IMPLEMENTED |
| GET | /:id | MANAGER+ | não | getStaff | IMPLEMENTED |
| PATCH | /:id | SUPER_ADMIN | sim | updateStaff | IMPLEMENTED |
| DELETE | /:id | SUPER_ADMIN | sim | deactivateStaff | IMPLEMENTED |

### Loyalty (`/api/loyalty`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| GET | /balance | AUTH | não | getBalance | IMPLEMENTED |
| POST | /redeem | AUTH | sim | redeemPoints | IMPLEMENTED |
| POST | /customers/:id/adjust | MANAGER+ | sim | adjustPoints | IMPLEMENTED |

### Automation (`/api/automation-rules`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| POST | /webhook | PUBLIC (signature) | não | handleWebhook | IMPLEMENTED |
| GET | / | MANAGER+ | não | listAutomationRules | IMPLEMENTED |
| GET | /:id | MANAGER+ | não | getAutomationRule | IMPLEMENTED |
| POST | / | MANAGER+ | sim | createAutomationRule | IMPLEMENTED |
| PATCH | /:id | MANAGER+ | sim | updateAutomationRule | IMPLEMENTED |
| DELETE | /:id | SUPER_ADMIN | sim | deleteAutomationRule | IMPLEMENTED |

### Consent (`/api/consent`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| POST | / | PUBLIC | sim | recordConsent | IMPLEMENTED |
| GET | / | STAFF | não | listConsents | IMPLEMENTED |
| GET | /stats | STAFF | não | consentStats | IMPLEMENTED |

### Legal (`/api/legal`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| GET | /cookie-categories | PUBLIC | não | listCookieCategories | IMPLEMENTED |
| POST | /cookie-categories | STAFF | sim | createCookieCategory | IMPLEMENTED |
| PATCH | /cookie-categories/:id | STAFF | sim | updateCookieCategory | IMPLEMENTED |
| DELETE | /cookie-categories/:id | STAFF | sim | deleteCookieCategory | IMPLEMENTED |
| GET | / | PUBLIC | não | listLegalPages | IMPLEMENTED |
| GET | /:slug | PUBLIC | não | getLegalPage | IMPLEMENTED |
| PUT | /:slug | STAFF | sim | upsertLegalPage | IMPLEMENTED |

### Gallery (`/api/gallery`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| GET | / | PUBLIC | não | listPublicGallery | IMPLEMENTED |
| GET | /admin | STAFF | não | listAllGallery | IMPLEMENTED |
| POST | / | STAFF | sim | createGalleryImage | IMPLEMENTED |
| PATCH | /:id | STAFF | sim | updateGalleryImage | IMPLEMENTED |
| DELETE | /:id | STAFF | sim | deleteGalleryImage | IMPLEMENTED |

### Media (`/api/media`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| GET | / | STAFF | não | listMedia | IMPLEMENTED |
| POST | /upload | STAFF | sim | uploadMedia | IMPLEMENTED |
| DELETE | /:id | STAFF | sim | deleteMedia | IMPLEMENTED |

### Developer (`/api/developer`)

| Method | Path | Auth | CSRF | Controller | Status |
|--------|------|------|------|-----------|--------|
| GET | /metrics | MANAGER+ | não | getMetrics | IMPLEMENTED |
| GET | /metrics/endpoints | MANAGER+ | não | getEndpointMetrics | IMPLEMENTED |
| GET | /audit-logs | SUPER_ADMIN | não | getAuditLogs | IMPLEMENTED |

### Outros

| Method | Path | Auth | CSRF | Status |
|--------|------|------|------|--------|
| GET | /api/csrf-token | PUBLIC | não | IMPLEMENTED |
| GET | /api/docs | PUBLIC | não | IMPLEMENTED (Swagger) |
| GET | /api/health | PUBLIC | não | IMPLEMENTED |

---

## ORPHAN ROUTES (definidas, NÃO montadas)

| Arquivo | Endpoints | Montada? | Frontend usa? | Status |
|---------|-----------|----------|---------------|--------|
| attribution.routes.ts | GET /customer/:id, GET /order/:orderId, GET /summary, GET /by-source | ❌ | ❌ | ORPHAN — REVIEW REQUIRED |
| referral.routes.ts | GET /, POST /, GET /:code | ❌ | ❌ | ORPHAN — REVIEW REQUIRED |
| webhook.routes.ts | POST /n8n, GET /n8n/health | ❌ | ❌ | ORPHAN — REVIEW REQUIRED |

> Nenhuma foi deletada. Decisão de manter/remover fica para revisão futura.

## PLANNED ROUTES

Nenhuma rota planejada além das órfãs acima.
