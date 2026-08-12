# HERMES PROJECT RECOVERY — King Food Foundation UI

> **Data:** 2026-08-12  
> **Auditor:** Hermes Agent  
> **Repo:** `luizhbr/kitchenasty` (fork de `mighty840/kitchenasty`)  
> **Deploy:** `king-food-foundation-ui.vercel.app`

---

## 1. ESTADO DO REPOSITÓRIO

| Campo | Valor |
|-------|-------|
| **Repository** | `luizhbr/kitchenasty` |
| **Branch ativo (Grok)** | `feature/king-food-foundation` |
| **Branch default** | `main` |
| **Local clone** | `C:\Users\elysi\Projects\king-food-foundation-ui` (branch `main`) |
| **Último commit (Grok)** | `cce745a` — "chore: preview-static core index + small assets (1/5)" |
| **Vercel** | `king-food-foundation-ui.vercel.app` — storefront estático sem backend |
| **Framework** | React 18 + Vite + Tailwind CSS + TypeScript |
| **Backend** | Node.js + Express + Prisma + PostgreSQL (NÃO deployado) |
| **Database** | PostgreSQL via Prisma (NÃO conectado ao deploy atual) |
| **ORM** | Prisma 5.22+ (34 models, 7 migrations) |
| **Authentication** | JWT (jsonwebtoken + bcrypt) + Google/Facebook OAuth |
| **Admin** | React 18 + Vite (NÃO deployado) |
| **Mobile** | React Native Expo (NÃO deployado) |
| **Pagamentos** | Stripe (PaymentIntent + Checkout) + PayPal + Cash |
| **Real-time** | Socket.IO |

---

## 2. VERCEL DEPLOY — ESTADO ATUAL

- **URL:** `https://king-food-foundation-ui.vercel.app`
- **Funciona:** `/` (home com branding King Food hardcoded)
- **Quebrado:** `/menu`, `/checkout`, `/api/*` → 404
- **Motivo:** Deploy é SOMENTE storefront SPA estático. Sem backend PostgreSQL.
- **Conclusão:** Landing page funcional. Fluxo completo requer backend.

---

## 3. PRISMA SCHEMA — 34 MODELS

✅ User, Customer, CustomerGroup, Address, Location, OperatingHour, DeliveryZone, Category, MenuItem, MenuOption, MenuOptionValue, Mealtime, MenuItemMealtime, Allergen, MenuItemAllergen, Order, OrderItem, OrderItemOption, Payment, Table, Reservation, Coupon, Review, LoyaltyTransaction, SiteSettings, GalleryImage, MediaAsset, LegalPage, CookieCategory, CookieConsent, InviteToken, AutomationRule, ApiMetric, AuditLog

---

## 4. API ROUTES — 17 GRUPOS, 70+ ENDPOINTS

✅ Auth, Locations, Menu (categories/items/allergens/mealtimes), Orders, Payments (Stripe/PayPal/Cash), Reservations, Coupons, Reviews, Dashboard, Automation, Loyalty, Legal, Consent, Settings, Staff, Developer, Gallery, Media

---

## 5. STOREFRONT — 15 PÁGINAS + 9 TEMPLATES

✅ Home, Menu, Checkout, OrderConfirmation, OrderStatus, OrderHistory, Login, Register, Account, Locations, Reservations, Gallery, PrivacyPolicy, Impressum, AuthCallback, NotFound

Componentes: Header, Footer, Layout, CartDrawer, MenuItemModal, LanguageSwitcher, CookieBanner
Contextos: AuthContext, CartContext, ThemeContext
i18n: 6 locales (en, de, es, fr, it, pt) — 205 keys cada, perfeitamente sincronizados

---

## 6. ADMIN — 46 PÁGINAS

Dashboard, Orders, KitchenDisplay, Menu (items+categories), Reservations (+Trends), Coupons, Reviews, Staff (+Invite), Locations, Tables, DeliveryZones, Settings (7 sub-páginas), Design (6 sub-páginas: Branding, Theme, Templates, Landing, Gallery, Media), Legal, CookieConsent, Automation, AuditLog, DeveloperMetrics, Loyalty, Login, AcceptInvite

---

## 7. BUGS ENCONTRADOS PELO AUDIT

🔴 **AuthContext.tsx — Template literal malformado** (em 5 arquivos):
- `context/AuthContext.tsx`, `pages/Account.tsx`, `pages/Reservations.tsx`, `pages/OrderHistory.tsx`, `pages/Checkout.tsx`
- O header Authorization usa backtick incorreto: `Authorization: ${token}`  → deve ser `Bearer ${token}`

⚠️ **CartContext — ID generation** usa `let nextId = 1` que reseta no reload

⚠️ **Mobile app** importa i18n com path relativo cross-package: `../../../storefront/src/i18n/locales/`

⚠️ **Sem paginação** em alguns list endpoints (gallery, mealtimes, categories)

---

## 8. CLASSIFICAÇÃO DE FEATURES

### ✅ IMPLEMENTED
| Feature | Detalhes |
|---------|----------|
| Customer Storefront | 15 páginas, 9 templates, i18n |
| Menu System | Categories, Items, Options, Allergens, Mealtimes, Images |
| Order Engine | CRUD + status flow completo |
| Payment Integration | Stripe + PayPal + Cash |
| Authentication | JWT + OAuth (Google/Facebook) + Guest |
| Admin Dashboard | 46 páginas, CRUD completo |
| Kitchen Display | Kanban + Socket.IO real-time |
| Reservations | CRUD + availability + analytics |
| Coupons | Percent, fixed, free delivery |
| Reviews | Customer + moderation |
| Loyalty | Points, redeem, adjust |
| Gallery + Media | Upload + CRUD |
| Cookie Consent | GDPR-style |
| Legal Pages | Privacy, Impressum, custom |
| Staff Management | Invite, roles (SUPER_ADMIN, MANAGER, STAFF) |
| Template System | 9 temas × 4 seções |
| i18n | 6 idiomas |
| API Docs | Swagger/OpenAPI |
| Logging | Pino structured + request IDs |
| API Metrics | Per-endpoint + dashboard |
| Audit Log | Staff actions |
| Automation Rules | Event-based engine |
| E2E Tests | Playwright |
| Docker Compose | Full-stack |

### ⚠️ PARTIALLY IMPLEMENTED
| Feature | Gap |
|---------|-----|
| PWA | Branch `feature/king-food-foundation` — NÃO mergeado no main |
| King Food Branding | ThemeContext com defaults KF no branch do Grok — NÃO mergeado |
| Mobile App | Expo criado mas nunca buildado/testado |
| Customer CRM | Model existe sem LTV, acquisition source, journey |

### ❌ MISSING (CRITICAL)
| Feature | Prioridade |
|---------|-----------|
| **Sales Attribution** | 🔴 CRITICAL — Sem campos source/UTM no Order |
| **UTM Capture Middleware** | 🔴 CRITICAL |
| **First/Last Touch** | 🔴 CRITICAL — Sem campos no Customer |
| **Multi-Touch Journey** | 🔴 CRITICAL — Sem TrackingEvent/TouchPoint models |
| **Campaign Manager** | 🔴 HIGH — Sem modelo Campaign |
| **QR Code Tracking** | 🔴 HIGH — Sem modelo QrCode |
| **Attribution Analytics** | 🔴 HIGH — Dashboard sem Sales by Source |
| **WhatsApp Integration** | 🟡 MEDIUM — Sem Z-API/Hermes |
| **N8N Integration** | 🟡 MEDIUM — Sem automação outbound |
| **Hermes Tools** | 🟡 MEDIUM — Sem getMenu, createOrder, etc. |
| **Push Notifications** | 🟡 MEDIUM — Model existe, envio não |
| **Email Templates** | 🟡 MEDIUM — Nodemailer sem templates |
| **SMS Service** | 🟡 MEDIUM — Sem provider |

---

## 9. SEGURANÇA

| Item | Status |
|------|--------|
| `.env` no gitignore | ✅ |
| Nenhum `.env` real no repo | ✅ |
| JWT Auth + roles | ✅ |
| Rate limiting (100/15min) | ✅ |
| Helmet security headers | ✅ |
| CORS configurável | ✅ |
| Stripe webhook raw body | ✅ |
| File upload filtering | ✅ |
| JWT secret fallback `dev-secret-change-me` | ⚠️ RISCO |
| Stripe keys em SiteSettings JSON | ⚠️ RISCO |

---

## 10. BRANCH DO GROK — MUDANÇAS

O branch `feature/king-food-foundation` (commits de ~1h atrás) contém:

- King Food branding no ThemeContext default
- Mobile bottom dock estilo King Food
- Header simplificado dark
- PWA install banner + splash
- v3 entry shell (king-food-webview)
- Preview-static build para Vercel

**Estas mudanças NÃO estão no branch `main`.**

---

## 11. DIAGNÓSTICO FINAL

### IMPLEMENTED (Funcional)
Storefront completo, Backend API com 34 models, Admin com 46 páginas, Auth JWT+OAuth, Stripe+PayPal, Kitchen Display real-time, Docker full-stack

### PARTIALLY IMPLEMENTED
PWA (branch Grok), Branding KF (branch Grok), Deploy Vercel (só storefront estático)

### BROKEN
`/menu`, `/checkout`, `/api/*` no deploy (404 — sem backend)

### MISSING (CRITICAL)
Sales Attribution, UTM Capture, Campaign Manager, QR Tracking, WhatsApp, Hermes Tools

---

## 12. PRÓXIMOS PASSOS RECOMENDADOS

1. **MERGE** `feature/king-food-foundation` → `main` (preservar trabalho Grok)
2. **FIX BUGS** — Auth header template literals em 5 arquivos
3. **DEPLOY BACKEND** — PostgreSQL (Neon/Supabase) + Express API (Vercel Serverless ou Railway)
4. **IMPLEMENTAR Sales Attribution** — campos UTM no Order + Customer + middleware
5. **CRIAR MODELS** Campaign, QrCode, Partner, TrackingEvent, TouchPoint
6. **CONECTAR WhatsApp** via Z-API MCP + Hermes Tools

> **REGRA DE PARADA:** Não iniciar refatoração ou nova milestone sem decisão do proprietário.

---

*Documento gerado por Hermes Agent em 2026-08-12.*
