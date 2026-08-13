# FASE 1 — DESIGN SYSTEM V2

## Objetivo
Construir a fundação visual e de componentes para Storefront, Admin, Mobile, Checkout, Kitchen e Driver, sem redesenhar páginas ainda.

## Status: ✅ PASS

---

## Auditoria (FASE 0 → 1.1)
- 6 packages, ~37.468 LOC
- Storefront: 21 rotas, 9.475 LOC, bundle ~502KB
- Admin: 49 rotas, 13.236 LOC, bundle ~895KB
- Mobile: Expo 52 + React Native
- Tokens NÃO unificados entre storefront (`primary` gold) e admin (`gold`/`ink`/`cream`) e mobile (orange)
- Z-index caótico: `z-[60/70/80/90/100]` no storefront, `z-[70/90]` no admin
- Shadows inline com `[3px_3px_...]`
- Radius inconsistente
- Storefront: ZERO testes
- Admin: 1 teste (formatDriverMessage)

## Tokens V2 Criados
Arquivos:
- `packages/shared/src/tokens.ts` — tipos TypeScript
- `packages/shared/src/tokens.css` — CSS variables (light/dark/reduced-motion)
- `packages/shared/tailwind-preset.js` — Tailwind preset compartilhado
- `packages/shared/package.json` — exports para `tokens.css` e `tailwind-preset`

Paleta:
```
--kf-bg: #F5F3EF
--kf-surface: #FFFFFF
--kf-foreground: #221D25 (ink)
--kf-muted: #6B6570
--kf-border: #E8E4DC
--kf-primary: #FFD100 (gold)
--kf-secondary: #7B6DA8 (lavender)
--kf-accent: #B8C438 (lime)
--kf-success/warning/danger/info
```

Escala:
- spacing: 0-24 com semântica
- radius: sm/md/lg/pill
- shadows: none/subtle/card/elevated/modal
- motion: fast/normal/slow + prefers-reduced-motion
- z-index controlada: content/sticky/header/bottom-nav/drawer/dropdown/modal/toast
- breakpoints: mobile/tablet/desktop/large

## Integração
- Tailwind configs de storefront, admin e mobile agora usam `@kitchenasty/shared/tailwind-preset`
- `tokens.css` importado em `storefront/src/index.css`, `admin/src/index.css`, `mobile/global.css`
- `@kitchenasty/shared` adicionado como dependency das três aplicações

## Shared-UI
Novo package `packages/shared-ui/` com componentes reutilizáveis:

**Base:**
Button, IconButton, Input, Badge, Card, CardHeader, CardBody, CardFooter, Spinner, Skeleton, Modal, Drawer, BottomSheet, Toast, Alert, EmptyState, ErrorState, PageHeader, SectionHeader, Tabs, Switch

**King Food específicos:**
Price, QuantitySelector, ProductCard, CartItem, CheckoutSection, OrderStatus, PrintStatus, DriverStatus

Tecnologia:
- React 18 + TypeScript
- `class-variance-authority` + `clsx` + `tailwind-merge`
- Tailwind com preset compartilhado
- `cn()` utilitário

## Página /design-system
- Rota interna no storefront (lazy-loaded via React.Suspense)
- Catálogo visual: cores, tipografia, botões, inputs, badges, cards, modais, status, preço, quantidade
- 5 abas: Cores, Tipografia, Componentes, Cards, Status

## Testes
Shared-ui: 4 arquivos, 10 testes — **10/10 PASS**
- Button, Input, ProductCard, CartItem
- `@testing-library/react` + `fireEvent` + `@testing-library/jest-dom/vitest` + happy-dom

Outros testes: server 174/174, print-agent 26/26, shared OK.

## Visual Regression
Screenshots da página `/design-system` em 5 viewports:
- 360px, 390px, 430px, 768px, 1440px
- Sem overflow horizontal
- Componentes renderizados corretamente

## Regressão
| Pacote | Resultado |
|--------|-----------|
| shared build | ✅ PASS |
| shared-ui build | ✅ PASS |
| shared-ui tests | ✅ PASS (10/10) |
| server unit | ✅ PASS (174/174) |
| print-agent unit | ✅ PASS (26/26) |
| admin build | ✅ PASS |
| storefront build | ✅ PASS |
| mobile typecheck | ✅ PASS |

## Bundle Sizes
| Pacote | Antes | Depois | Δ |
|--------|-------|--------|---|
| storefront | 502 KB | 545 KB | +43 KB |
| admin | 895 KB | 895 KB | 0 KB |

Aumento do storefront justificado pela página `/design-system` (lazy-loaded) e novos componentes compartilhados. Admin não teve alteração de código ainda, então bundle inalterado.

## Arquivos Criados/Alterados
**Criados:**
- `packages/shared/src/tokens.ts`
- `packages/shared/src/tokens.css`
- `packages/shared/tailwind-preset.js`
- `packages/shared-ui/*` (package completo)
- `packages/storefront/src/pages/DesignSystem.tsx`
- `docs/frontend-v2/ARCHITECTURE.md`
- `docs/frontend-v2/FASE1-DESIGN-SYSTEM.md`

**Alterados:**
- `packages/shared/package.json`
- `packages/shared/src/index.ts`
- `packages/storefront/src/index.css`
- `packages/storefront/src/main.tsx`
- `packages/storefront/tailwind.config.js`
- `packages/admin/src/index.css`
- `packages/admin/tailwind.config.js`
- `packages/mobile/global.css`
- `packages/mobile/tailwind.config.js`
- `package-lock.json`

## Riscos
- `/design-system` é rota pública (mas não linkada em nenhum menu). Baixo risco.
- Tokens V2 coexistem com tokens legados — nenhum código legado foi quebrado.
- Shared-ui ainda não foi integrado em páginas reais; apenas usado na página de catálogo.

## Próxima fase recomendada
**FASE 2 — STOREFRONT HOME V2**
Reaplicar os componentes compartilhados na Home, Menu, Product, Cart e depois Checkout.
