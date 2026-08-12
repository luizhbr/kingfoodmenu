# KING FOOD — HERMES ARCHITECTURE AUDIT

> **Data:** 2026-08-12  
> **Auditor:** Hermes Agent  
> **Repo:** `luizhbr/kitchenasty` (fork de `mighty840/kitchenasty`)  
> **Branch:** `feature/king-food-foundation` (commit `a95a2dd`)  
> **Deploy:** `king-food-foundation-ui.vercel.app` (storefront SPA only, no backend)

---

## STATUS: **NOT READY** 🚫

**OVERALL SCORE: 44/100**

---

## IMPLEMENTED ✅
- Storefront com branding King Food (home, PWA, bottom dock, splash)
- 34 database models cobrindo o core do restaurante
- 70+ API endpoints (auth, menu, orders, payments, reservations, etc.)
- Admin com 46 páginas (dashboard, orders, kitchen, products, etc.)
- Kitchen Display (PDV) com Kanban + Socket.IO
- JWT Auth + OAuth (Google/Facebook) + RBAC (4 roles)
- Fallback data quando API indisponível
- WhatsApp notification stub (stub/webhook/twilio)
- 19 integration + 19 unit + 19 e2e tests
- Docker Compose para dev

## PARTIAL [~]
- Storefront funcional (home funciona, /menu 404 sem backend)
- Analytics (dashboard básico, sem attribution)
- Automation (model existe, sem eventos de negócio)
- WhatsApp (stub, sem Z-API)

## MISSING ❌
- **Sales Attribution** (CRÍTICO) — ZERO implementação
- **8 Database Models** — Campaign, TrackingEvent, Attribution, QRCode, Referral, Partner, Store, Promotion
- **6 API Route Groups** — attribution, campaigns, qrcodes, referrals, customer-journey, n8n-webhooks
- Rate Limiting, CSRF, Webhook Signature, Idempotency
- UTM Parameter Capture, Customer Journey Events, Hermes Tools

## CRITICAL 🔴
1. **Sales Attribution = 0** — Impossível responder "de onde veio cada venda?"
2. **Backend não deployado** — Site é só SPA estático
3. **/menu retorna 404** — Vercel routing quebrado
4. **Sem rate limiting** — API vulnerável

## NEXT STEPS
1. FIX Vercel routing
2. DEPLOY Backend (Neon + Railway)
3. DEPLOY Admin (Vercel project)
4. IMPLEMENTAR Sales Attribution
5. IMPLEMENTAR Customer Journey

---

See full details below.


---

## SUBAGENT AUDIT DETAILS (4 parallel deep-dives)

### Server Audit (44+ endpoints, 34 models)

**Auth System**: JWT + bcrypt + OAuth (Google/Facebook) + RBAC (SUPER_ADMIN, MANAGER, STAFF, customer roles)
**Security Issues**:
- [!] metricsCollector writes every API request to DB (ApiMetric) — performance issue at scale, no retention/cleanup policy
- [!] customerLogin requires password field min(1) — social-only customers need workaround
- [!] inviteToken system has no rate limiting on accept-invite endpoint
- [!] Docker-compose credentials hardcoded (kitchenasty/kitchenasty)

### Storefront Audit (16 pages, complete UX flow)

**Pages**: Home, Menu, Locations, Login, Register, AuthCallback, Account, OrderHistory, OrderStatus, OrderConfirmation, Checkout, Reservations, Gallery, PrivacyPolicy, Impressum, NotFound
**Cart**: ✅ Fully implemented — localStorage persistence, add/update/remove/clear, CartDrawer
**Checkout**: ✅ Fully implemented — delivery/pickup, address, guest checkout, coupon, loyalty, Stripe/PayPal/Cash
**PWA**: ✅ manifest.json, sw.js, PwaInstall, BottomDock
**UTM Capture**: ❌ ZERO — No utm_source, utm_medium, utm_campaign, or similar parameter handling anywhere

### Admin Audit (46 pages)

**Present**: Dashboard (with Recharts), Orders, Reservations, Reviews, Kitchen Display, Locations, Menu Items, Categories, Coupons, Automation Rules, Loyalty, Delivery Zones, Tables, Design (6 sub-pages), Legal (4 sub-pages), Settings (7 sub-pages), Developer, Staff
**Missing**: Customers list (full CRM), Promotions management, Campaigns builder/tracking, Attribution tracking, QR code generation/management

### Shared + Build Audit

- **Shared package**: Only constants + generic types (ApiResponse, PaginatedResponse). NO Zod/Joi validation schemas — only TypeScript types without runtime enforcement
- **E2E**: 8 admin specs + 6 storefront specs via Playwright
- **Docker**: Compose with Postgres, server, admin, storefront, docs services. Demo compose + Caddy proxy available
- **Build**: Root build script runs shared first (correct dependency order)
- **No Dockerfile at root** — each package has its own
