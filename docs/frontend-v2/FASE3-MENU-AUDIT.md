# FASE 3 — MENU V2 AUDIT

## Arquivos auditados
- `packages/storefront/src/pages/Menu.tsx` (289 LOC)
- `packages/storefront/src/components/MenuItemModal.tsx` (347 LOC)
- `packages/storefront/src/components/ProductImageCarousel.tsx`
- `packages/storefront/src/context/CartContext.tsx`

## Estado atual
O /cardápio já passou por uma revisão parcial anterior (V2 intermédia):
- Busca full-width
- Chips de categorias horizontais scrolláveis
- Grid 2 colunas mobile / 3 desktop
- Skeleton grid durante loading
- MenuItemModal com contador integrado no CTA dourado

## Problemas encontrados
### Menu.tsx
1. **Não usa Design System V2** — cores inline `#FFD100`, classes `primary-600`, `gray-*`, nenhum token compartilhado.
2. **Cards sem CTA rápido** — o card inteiro é um `<button>` que abre modal; não há ação imediata "+ Adicionar" como Home V2.
3. **Empty state genérico** — apenas `t('menu.noItems')` sem ícone/CTA.
4. **Error state genérico** — `t('common.error')` sem retry/CTA.
5. **Paginação em inglês** — `previous`/`next` strings.
6. **Sem integração com QuickSearch/CategoryPills compartilhados**.
7. **Não exibe badge de opções obrigatórias**.
8. **Falta header contextual do menu** (título + voltar).

### MenuItemModal.tsx
1. **Não usa shared-ui** — poderia usar `Badge`, `Price`, `QuantitySelector`, `Button`.
2. **CTA confuso** — mostra apenas `$XX.XX`, sem texto "Adicionar" ou ícone explícito.
3. **Select HTML nativo** — visual inconsistente com design system.
4. **Sem feedback pós-add** — modal fecha sem confirmação visual.
5. **Texto em inglês** — "Close".
6. **Modal usa z-[60] inline** — viola tokens V2.
7. **Opções obrigatórias não bloqueiam CTA** — usuário pode adicionar sem selecionar required options (validação existe no backend, mas UX fraca).

## Componentes a reutilizar/criar
- `QuickSearch` (já existe em Home)
- `CategoryPills` (já existe em Home)
- `ProductCard` (shared-ui)
- `Badge` (shared-ui)
- `Price` (shared-ui)
- `QuantitySelector` (shared-ui)
- `Button` (shared-ui)
- `Modal` (shared-ui) — substituir z-[60] custom
- `EmptyState` (shared-ui)
- `ErrorState` (shared-ui)

## Decisões de UX
1. Cardápio deve parecer continuação da Home: mesmas cores, mesma busca, mesmos chips, mesmos cards.
2. Card de produto deve ter duas ações: abrir detalhe (imagem/nome) e adicionar rápido (+) quando sem opções obrigatórias.
3. Modal de produto deve usar tokens V2, CTA com texto "Adicionar ao carrinho — $XX.XX", feedback pós-add.
4. Se opção obrigatória não selecionada: desabilitar CTA e mostrar mensagem clara.
5. Desktop: grid 4 colunas; tablet 3; mobile 2.

## APIs
- `GET /api/menu/categories` → chips
- `GET /api/menu/items?categoryId=&search=&page=&limit=12` → grid
- `GET /api/menu/items/:id` → modal

## Critérios de PASS
- [ ] Menu.tsx usa tokens V2
- [ ] Reutiliza QuickSearch, CategoryPills, ProductCard
- [ ] Cards com CTA de adicionar rápido
- [ ] MenuItemModal com shared-ui e CTA claro
- [ ] Estados loading/empty/error com shared-ui
- [ ] 7 viewports visual QA PASS
- [ ] E2E Home → Menu → produto → adicionar → carrinho PASS
- [ ] Regressão 9/9 PASS
- [ ] Bundle controlado
