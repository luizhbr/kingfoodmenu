# FRONTEND V2 — ARCHITECTURE MAP

> Auditoria completa do monorepo King Food — 2026-08-13
> Objetivo: mapear tudo antes de implementar. Fonte de verdade: código real.

## 1. MONOREPO

```
king-food-foundation-ui/
├── packages/
│   ├── storefront/   — React 18 + Vite + Tailwind (loja)
│   ├── admin/         — React 18 + Vite + Tailwind (painel)
│   ├── server/        — Express + Prisma + Zod + Stripe + Socket.IO
│   ├── print-agent/   — Node CLI (ESC/POS, RONGTA, Windows spooler)
│   ├── mobile/        — Expo 52 + React Native 0.76 (driver app)
│   ├── shared/        — tipos compartilhados (1 arquivo)
│   └── docs/          — Vitepress (documentação)
├── prisma/            — schema.prisma + migrations (Neon Postgres)
├── e2e/               — Playwright
└── vercel.json        — build: server + storefront + admin → storefront/dist
```

**Workspace:** npm workspaces (`packages/*`)
**Deploy:** Vercel (team luizztx-6366s-projects) → https://king-food-foundation-ui.vercel.app
**Build:** `npx prisma generate && build server && build storefront && build admin (VITE_BASE_PATH=/admin/) && cp admin/dist → storefront/dist/admin`

## 2. TECH STACK

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| UI | React | 18.3 |
| Roteamento | react-router-dom | 6.28 |
| CSS | Tailwind CSS | 3.4 |
| Build | Vite | 6.0 |
| TypeScript | 5.7 |
| Backend | Express | 4.21 |
| ORM | Prisma | 5.22 |
| Validação | Zod | 3.24 |
| Pagamentos | Stripe | 20.3 |
| Realtime | Socket.IO | 4.8 (server only; Vercel serverless = polling) |
| i18n | i18next + react-i18next | 25.8 / 16.5 |
| Mobile | Expo 52 + React Native 0.76 | — |
| Print | ESC/POS + winspool.drv | — |
| E2E | Playwright | 1.58 |
| Unit | Vitest | 4.x |

## 3. LOCA (linhas de código)

| Pacote | Arquivos | LOC |
|--------|----------|-----|
| storefront | 94 | 9.475 |
| admin | 63 | 13.236 |
| server | 99 | 12.152 |
| print-agent | 16 | 1.274 |
| mobile | 24 | 1.274 |
| shared | 1 | 57 |
| **Total** | **297** | **37.468** |

## 4. BUNDLE SIZES

| Pacote | JS total | Maior chunk |
|--------|----------|-------------|
| storefront | 502 KB | index-*.js 431 KB |
| admin | 895 KB | index-*.js 895 KB |

⚠️ Admin 895KB — sem code splitting dinâmico significativo.

## 5. DESIGN TOKENS

### Storefront (CSS variables + Tailwind extend)
```
primary-500: #FFD100 (gold)
primary-600: #eab308
--kf-nav-h: calc(3.5rem + env(safe-area-inset-bottom))
```
Cores customizadas: cream `#E2DDCF`, ink `#1A1A1A`, gold `#FFD100`, lavender `#7B6DA8`, lime `#B8C438`

### Admin (Tailwind extend)
```
cream: #E2DDCF
ink: #221D25
gold: #FFD100 (primary-500)
```

⚠️ Storefront usa `primary` (orange/gold via CSS var). Admin usa `cream`/`ink`/`gold` direto.
⚠️ Design tokens NÃO estão unificados entre storefront e admin.

## 6. ROTAS — STOREFRONT (21 páginas)

| Rota | Componente | Função |
|------|-----------|--------|
| `/` | Home | Landing + produtos em destaque |
| `/menu` | Menu | Cardápio com categorias |
| `/locations` | Locations | Seleção de local |
| `/checkout` | Checkout | Finalização de pedido |
| `/order/:id` | OrderConfirmation | Confirmação |
| `/orders/:id` | OrderStatus | Rastreamento |
| `/account` | Account | Conta do cliente |
| `/account/orders` | OrderHistory | Histórico |
| `/login` | Login | Auth |
| `/register` | Register | Cadastro |
| `/reservations` | Reservations | Reservas |
| `/gallery` | Gallery | Galeria |
| `/driver/*` | Driver* | App do entregador (5 páginas) |
| `/*` | NotFound | 404 |

## 7. ROTAS — ADMIN (49 páginas)

**Operacional:**
- `/` Dashboard · `/orders` OrderList · `/orders/:id` OrderDetail
- `/kitchen` KitchenDisplay · `/reservations` ReservationList

**Gerenciar:**
- `/locations` · `/menu/items` · `/menu/categories` · `/coupons` · `/automation` · `/loyalty`
- `/design/*` (6 páginas) · `/legal/*` (3 páginas) · `/staff` (3 páginas)

**Configurações:**
- `/settings/general` · `/settings/order` · `/settings/print` (templates)
- `/settings/printers` (CRUD impressoras + teste real + pairing) ← PRINT-V1
- `/settings/payment` · `/settings/mail` · `/settings/reservation` · `/settings/review` · `/settings/advanced`

**Developer:**
- `/developer/metrics` · `/developer/audit-log`

## 8. ESTADO (state management)

### Storefront
- `AuthContext` — login/token/user
- `CartContext` — items/qty/add/remove/subtotal/clear (localStorage)
- `ThemeContext` — dark/light

### Admin
- `AuthContext` — login/token/user/role

⚠️ Sem estado global tipo Redux/Zustand. Tudo via Context API + useState.
⚠️ Sem cache de API (React Query/SWR). Fetch direto em cada componente.

## 9. i18n

6 idiomas: `pt`, `en`, `de`, `es`, `fr`, `it` — 223 chaves cada.
Storefront usa `useTranslation()`. Admin NÃO usa i18n (strings hardcoded em EN/PT misturado).

## 10. TESTES

| Pacote | Test files | Status |
|--------|-----------|--------|
| server | 28 (17 integration + 11 unit) | 174/174 PASS |
| print-agent | 8 (2 integration + 6 unit) | 26/26 PASS |
| admin | 1 (formatDriverMessage) | 18/18 PASS |
| storefront | 0 | NENHUM |
| shared | 1 | — |
| E2E | Playwright config | /e2e dir |

⚠️ Storefront: ZERO testes. Maior risco de regressão.

## 11. API CLIENT

### Storefront
- `import.meta.env.VITE_API_URL || ''` (mesmo domínio em prod)
- Fetch direto + `withCsrf()` helper
- Sem client centralizado

### Admin
- `lib/api.ts` — wrapper simples (`api.get/post/patch/put/delete/upload`)
- Token: `localStorage.getItem('token')`
- Header: `Authorization: Bearer ${token}`

## 12. PROBLEMAS CONHECIDOS (já corrigidos nesta sessão)

| Problema | Status | Commit |
|----------|--------|--------|
| CLS 0.2175 home (FeaturedItems null) | ✅ fix | 31f2b28 |
| CLS 0.3649 menu (spinner) | ✅ fix | 4d5b8d1 |
| Cart drawer footer abaixo do dock | ✅ fix | 3012422 |
| Home com 2 logos | ✅ fix | 05f079e |
| Menu sem busca/chips | ✅ fix | 23a3175 |
| Modal CTA 80px | ✅ fix | 1c49855 |
| Print UI inexistente | ✅ fix | 60375ef |
| Print-agent require('crypto') ESM | ✅ fix | 577e712 |
| Print-agent cmdStart sem credentials | ✅ fix | 577e712 |
| Checkout guest fields buried | ✅ fix | d102c6b |
| WhatsApp entregador | ✅ new | c808a3e |

## 13. O QUE EXISTE E FUNCIONA (NÃO TOCAR)

- ✅ Backend completo: Orders, Stripe, Payments, Auth, RBAC, Prisma, Neon
- ✅ Print: print-service (idempotência, state machine, retry), print-agent (polling, queue, ESC/POS, RONGTA), auto-print (events.ts)
- ✅ Checkout: guest checkout, cupom, loyalty, Stripe, agendamento, idempotency
- ✅ Admin: 49 páginas, OrderCard com 🖨 + 🚗, KitchenDisplay, SettingsPrinters
- ✅ Storefront: Home V2, Menu V2, CartDrawer, MenuItemModal, BottomDock
- ✅ i18n: 6 idiomas
- ✅ Mobile: Expo driver app

## 14. GAPS PARA FRONTEND V2

1. **Design system unificado** — storefront e admin usam tokens diferentes
2. **Storefront sem testes** — zero cobertura
3. **Admin sem i18n** — strings EN/PT misturadas
4. **Bundle admin 895KB** — sem code splitting
5. **Checkout ainda em EN** — precisa 100% PT-BR
6. **Sem cache de API** — cada componente faz fetch próprio
7. **Estados vazios/error** — não padronizados
8. **Upsell** — não existe no checkout
9. **Admin mobile** — layout não otimizado (sidebar em mobile)

## 15. BUILD/DEPLOY

```
Vercel build:
  1. npx prisma generate
  2. npm run build -w server (tsc → dist)
  3. npm run build -w storefront (vite build → dist)
  4. VITE_BASE_PATH=/admin/ npm run build -w admin (vite build → dist)
  5. cp -r admin/dist → storefront/dist/admin
Output: packages/storefront/dist
Rewrites: /api/* → serverless, /admin/* → admin SPA
```

Produção: https://king-food-foundation-ui.vercel.app
Admin em: /admin/orders (BrowserRouter sem prefixo em dev)


## 16. MAPA FUNCIONAL RESUMIDO (FASE 1)

### Storefront — 21 páginas / 9.475 LOC
**Core de pedido (alto risco):**
- Home.tsx (565 LOC) → entry, featured items, location
- Menu.tsx (289 LOC) → categories, search, product cards
- Checkout.tsx (664 LOC) → guest fields, address, scheduling, payment
- OrderConfirmation.tsx (128 LOC) → success state
- OrderStatus.tsx (252 LOC) → tracking

**Suporte:**
- Account, Login, Register, OrderHistory, Locations, Gallery, Reservations
- Driver app (5 páginas) dentro do storefront

### Admin — 49 páginas / 13.236 LOC
**Core operacional:**
- Dashboard.tsx (474 LOC)
- OrderList.tsx + OrderDetail.tsx + OrderCard.tsx
- KitchenDisplay.tsx (303 LOC)
- SettingsPrinters.tsx (CRUD impressoras)

**Configurações extensas:**
- Design (6), Legal (3), Settings (8), Staff (3), Developer (2), Marketing (3)

### APIs mais utilizadas
- `/api/menu/*` — storefront menu
- `/api/orders/*` — orders
- `/api/locations/*` — locations
- `/api/auth/*` — login
- `/api/print/*` — impressão
- `/api/settings` — admin config
- `/api/gallery/*` — admin media
- `/api/legal/*` — legal pages

## 17. RISCO POR FASE

| Fase | Risco | Motivo |
|------|-------|--------|
| FASE 2 Home | Baixo | já parcialmente feito V2 |
| FASE 3 Menu | Baixo | já feito V2 |
| FASE 4 Product+Cart | Médio | lógica de adicionais e estado |
| FASE 5 Checkout | ALTO | pagamento + Stripe + validações |
| FASE 6 Confirmation | Baixo | popup WhatsApp já feito |
| FASE 7 Admin Mobile | Médio | layout complexo, 49 páginas |
| FASE 8 Admin Desktop | Baixo | já existe |
| FASE 9 Kitchen | Médio | operacional, não quebrar |
| FASE 10 Print | Baixo | PRINT-V1 completo |
| FASE 11 Driver | Médio | RN app |
| FASE 12 Responsive | Médio | 8 viewports |
| FASE 13 E2E | ALTO | depende de tudo |
| FASE 14 Regression | ALTO | depende de E2E |
