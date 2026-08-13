# FASE 2 — STOREFRONT HOME V2

## Status: ✅ PASS

---

## Objetivo
Reconstruir a Home do storefront usando o Design System V2, priorizando produtos acima da dobra e navegação rápida.

## Mudanças
### Novos componentes
- `CategoryPills.tsx` — chips horizontais scrolláveis com link para `/menu?category=...`
- `QuickSearch.tsx` — busca que leva para `/menu?search=...`
- `PromoBanner.tsx` — banner de promoção com CTA
- `FeaturedProductGrid.tsx` — grid de produtos em destaque com skeleton e fallbacks

### Refatoração
- `Home.tsx`: hero mais compacto, busca, categorias, promo e destaques acima da dobra
- Padding inferior reservado para o bottom dock: `pb-[calc(var(--kf-nav-h)+2rem)]`
- Removeu seção “Sobre rápido” genérica; manteve status box

## APIs
- `GET /api/menu/categories` → chips
- `GET /api/menu/items` → destaques (primeiros 6)

## Visual QA
Screenshots em 360/390/430/768/1440 + smoke com backend real.

- Hero compacto ✅
- Busca visível ✅
- Categorias horizontais ✅
- Promo banner ✅
- Cards de destaque ✅
- Bottom dock não cobre conteúdo ao scrollar ✅
- Footer visível ✅
- Sem overflow horizontal ✅

## Regressão
| Pacote | Resultado |
|--------|-----------|
| shared build | ✅ PASS |
| shared-ui build | ✅ PASS |
| shared-ui tests | ✅ PASS (10/10) |
| server unit | ✅ PASS (174/174) |
| print-agent unit | ✅ PASS (26/26) |
| admin build | ✅ PASS |
| storefront tsc | ✅ PASS |
| storefront build | ✅ PASS |
| mobile typecheck | ✅ PASS |

**9/9 PASS**

## Bundle
| Pacote | Antes | Depois | Δ |
|--------|-------|--------|---|
| storefront | 545 KB | 548 KB | +3 KB |
| admin | 895 KB | 895 KB | 0 KB |

## Commit
`6477417 feat(home): rebuild storefront home with design system v2`

## Deploy
- URL: https://king-food-foundation-ui.vercel.app
- Smoke produção: JS markers confirmados (Categorias, Destaques, Buscar, Açaí do King, Ver tudo, Aproveitar)
- HTTP 200 em Home, Admin e /design-system

## Arquivos alterados
- `packages/storefront/src/pages/Home.tsx`
- `packages/storefront/src/components/CategoryPills.tsx` (novo)
- `packages/storefront/src/components/QuickSearch.tsx` (novo)
- `packages/storefront/src/components/PromoBanner.tsx` (novo)
- `packages/storefront/src/components/FeaturedProductGrid.tsx` (novo)
- `docs/frontend-v2/FASE2-HOME-AUDIT.md` (novo)

## Próxima fase
**FASE 3 — MENU V2**
Reaplicar Design System na tela de cardápio: busca full-width, chips de categoria, grid de produtos, modal de produto.
