# Database — Prisma + Neon PostgreSQL

> **Provider:** Neon (serverless PostgreSQL)
> **ORM:** Prisma 5.22
> **Migrations:** 9 aplicadas (todas com migration.sql)
> **Drift:** ZERO — 43 models no schema = 43 tabelas no banco (verificado 2026-08-12)

## Models

| Model | Uso | Relações | Propósito | Status |
|-------|-----|----------|-----------|--------|
| User | ✅ | — | Staff (admin/manager/staff) | USED |
| Customer | ✅ | Address, Order, Attribution, TrackingEvent | Cliente | USED |
| CustomerGroup | ❌ | — | Segmentação de clientes | UNUSED / FUTURE |
| Address | ✅ | Customer, Order | Endereço (com placeId) | USED |
| Location | ✅ | OperatingHour, DeliveryZone, Table | Unidade/restaurante | USED |
| OperatingHour | ❌ | Location | Horário de funcionamento | UNUSED / REVIEW |
| DeliveryZone | ✅ | Location | Zona de entrega + fee | USED |
| Category | ✅ | MenuItem | Categoria do menu | USED |
| MenuItem | ✅ | Category, OrderItem | Item do menu | USED |
| MenuOption | ❌ | MenuItem | Opções de item | UNUSED / REVIEW |
| MenuOptionValue | ❌ | MenuOption | Valores de opção | UNUSED / REVIEW |
| Mealtime | ✅ | MenuItemMealtime | Horário de disponibilidade | USED |
| MenuItemMealtime | ❌ | Mealtime, MenuItem | Relação N:N | UNUSED / REVIEW |
| Allergen | ✅ | MenuItemAllergen | Alérgenos | USED |
| MenuItemAllergen | ❌ | Allergen, MenuItem | Relação N:N | UNUSED / REVIEW |
| Order | ✅ | Customer, Address, OrderItem, Payment, TrackingEvent, OrderAttribution | Pedido | USED |
| OrderItem | ✅ | Order, MenuItem | Item do pedido | USED |
| OrderItemOption | ❌ | OrderItem | Opções escolhidas | UNUSED / REVIEW |
| Payment | ✅ | Order | Pagamento | USED |
| Table | ✅ | Location | Mesa (reserva) | USED |
| Reservation | ✅ | Customer, Table | Reserva | USED |
| Coupon | ✅ | — | Cupom | USED |
| Review | ✅ | Customer, Location | Avaliação | USED |
| LoyaltyTransaction | ✅ | Customer | Pontos de fidelidade | USED |
| SiteSettings | ✅ | — | Configurações do site | USED |
| GalleryImage | ✅ | — | Galeria pública | USED |
| MediaAsset | ✅ | — | Mídia (uploads) | USED |
| LegalPage | ✅ | — | Páginas legais | USED |
| CookieCategory | ✅ | — | Categorias de cookie | USED |
| CookieConsent | ✅ | — | Consentimento | USED |
| InviteToken | ✅ | User | Convite de staff | USED |
| AutomationRule | ✅ | — | Regras de automação | USED |
| ApiMetric | ✅ | — | Métricas de API | USED |
| AuditLog | ✅ | User | Log de auditoria | USED |
| Campaign | ✅ | — | Campanha de marketing | USED |
| Partner | ✅ | — | Parceiro (via include) | USED (include) |
| TrackingEvent | ✅ | Customer, Order, Campaign, QRCode | Evento de tracking | USED + PRODUCTION |
| Attribution | ✅ | Customer, Campaign | First/last touch | USED |
| OrderAttribution | ✅ | Order | Atribuição do pedido | USED |
| QRCode | ✅ | — | QR code | USED |
| Referral | ❌ | — | Indicação | UNUSED / FUTURE |
| Store | ❌ | — | Loja (multi-tenant) | UNUSED / FUTURE |
| Promotion | ❌ | — | Promoção | UNUSED / FUTURE |

## Models sem uso direto (9)

`CustomerGroup`, `OperatingHour`, `MenuOption`, `MenuOptionValue`,
`MenuItemMealtime`, `MenuItemAllergen`, `OrderItemOption`, `Store`, `Promotion`

> **Decisão:** NÃO remover. São candidatos a features futuras (opções de menu,
> segmentação, multi-tenant, promoções). Revisar quando a feature for planejada.

## Enums

| Enum | Valores |
|------|---------|
| Role | SUPER_ADMIN, MANAGER, STAFF |
| OrderType | DELIVERY, PICKUP |
| OrderStatus | PENDING, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, PICKED_UP, CANCELLED |
| PaymentMethod | CASH, STRIPE, PAYPAL |
| PaymentStatus | PENDING, COMPLETED, FAILED, REFUNDED |
| ReservationStatus | PENDING, CONFIRMED, SEATED, COMPLETED, CANCELLED |
| CouponType | PERCENTAGE, FIXED, FREE_DELIVERY |
| LoyaltyTransactionType | EARN, REDEEM, ADJUST |
| GalleryCategory | FOOD, INTERIOR, GARDEN, EVENTS |
| AttributionSource | DIRECT, GOOGLE, GOOGLE_ADS, INSTAGRAM, FACEBOOK, META_ADS, TIKTOK, TIKTOK_ADS, WHATSAPP, QR_CODE, EMAIL, REFERRAL, INFLUENCER, ORGANIC, CUSTOM, UNKNOWN |
| TrackingEventType | SESSION_STARTED, PAGE_VIEW, PRODUCT_VIEW, PRODUCT_ADDED, CART_CREATED, CHECKOUT_STARTED, CHECKOUT_COMPLETED, ORDER_CREATED, ORDER_CONFIRMED, ORDER_DELIVERED, COUPON_USED, WHATSAPP_CLICKED |
| PartnerType | INFLUENCER, AFFILIATE, REFERRER, AGENCY, INTERNAL |
| PromotionType | PERCENTAGE, FIXED_AMOUNT, FREE_DELIVERY, FREE_ITEM |

## Campos importantes

- `Order.idempotencyKey` — chave de idempotência (commit ca7ef02)
- `Address.placeId` — Google Maps place ID (migration 20260812062524)
- `Order.snapshot` — snapshot do pedido (migration 20260812062524)
- `TrackingEvent.campaignSlug` — slug da campanha (P13)
- `Attribution.firstSource/lastSource` — first/last touch

## Migrations

| Migration | Data | Conteúdo |
|-----------|------|----------|
| 20260218103330_init | 2026-02-18 | Schema inicial |
| 20260220120000_add_busy_mode_loyalty_automation | 2026-02-20 | Loyalty + automation |
| 20260224120000_add_settings_legal_invites | 2026-02-24 | Settings + legal + invites |
| 20260302120000_add_storefront_template | 2026-03-02 | Template storefront |
| 20260302130000_add_observability | 2026-03-02 | ApiMetric + AuditLog |
| 20260514100737_add_gallery_images | 2026-05-14 | Galeria |
| 20260514101500_add_media_assets | 2026-05-14 | Media assets |
| 20260812062524_add_address_placeid_and_order_snapshot | 2026-08-12 | placeId + snapshot |
| 20260812081000_add_order_idempotency_key | 2026-08-12 | idempotencyKey |
