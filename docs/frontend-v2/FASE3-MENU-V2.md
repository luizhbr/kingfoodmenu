# FASE 3 — MENU V2

## Status: ✅ PASS

---

## Objetivo
Reconstruir o /cardapio do storefront usando o Design System V2, coeso com a Home V2.

## Mudanças
### Arquivos alterados
- `packages/storefront/src/pages/Menu.tsx`
- `packages/storefront/src/components/MenuItemModal.tsx`
- `packages/storefront/src/components/CategoryPills.tsx`
- `packages/storefront/src/components/QuickSearch.tsx`
- `packages/storefront/src/i18n/index.ts`
- `packages/storefront/src/i18n/locales/*.json` (en, es, fr, de, it, pt)

### Componentes reutilizados (shared-ui)
- `QuickSearch`
- `CategoryPills`
- `ProductCard`
- `EmptyState`
- `ErrorState`
- `Skeleton`
- `Modal`
- `Badge`
- `Price`
- `QuantitySelector`
- `Button`

### UX
- Header compacto com título e subtítulo em PT-BR
- Busca full-width no topo
- Categorias em chips horizontais scrolláveis com estado ativo
- Grid de produtos: 2 col mobile / 3 tablet / 4 desktop
- Cards com imagem, nome, descrição, preço, badge "Opções" e botão "+"
- Quick-add: itens sem opções adicionam diretamente; itens com opções abrem modal
- Modal de produto com carrossel, descrição, alergenos, opções, quantidade, CTA "Adicionar $XX.XX"
- Feedback "Adicionado ✓" e fechamento automático do modal
- Estados loading/empty/error com componentes compartilhados
- Paginação em português (Anterior / Próximo)
- Padding inferior seguro para bottom dock

## i18n
- Idioma padrão alterado de `en` para `pt`
- Fallback para `pt`
- Chaves `common.previous`, `common.next`, `common.retry`, `common.close`, `common.required`, `menu.*` adicionadas a todos os locales

## Visual QA
Screenshots em 360/390/430/768/834/1024/1440.

- Header, busca e categorias visíveis ✅
- Grid de cards renderizado ✅
- Bottom dock não cobre conteúdo ao scrollar ✅
- Sem overflow horizontal ✅
- Título e badges em PT-BR ✅

## E2E
Fluxo testado com backend real:
1. `/menu` carrega
2. Clica no botão "+" de item com opções → abre modal
3. Seleciona opções obrigatórias
4. Clica "Adicionar" → modal fecha
5. Cart drawer abre automaticamente com subtotal
6. Item sem opções adiciona diretamente

**E2E PASS**

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
| storefront | 548 KB | 549 KB | +1 KB |
| admin | 895 KB | 895 KB | 0 KB |

## Commit
`fe3972b feat(menu): redesign storefront menu with design system v2`

## Deploy
- URL: https://king-food-foundation-ui.vercel.app
- Smoke produção: HTTP 200, JS markers confirmados (Nosso Cardápio, Escolha seus favoritos, Opções, Adicionar, Anterior, Próximo)

## Documentos
- `docs/frontend-v2/FASE3-MENU-AUDIT.md`
- `docs/frontend-v2/FASE2-HOME-AUDIT.md`
- `docs/frontend-v2/FASE2-HOME-V2.md`

## Próxima fase
**FASE 4 — PRODUCT + CART V2**
Refinar experiência do modal de produto e do carrinho/drawer com Design System V2.
