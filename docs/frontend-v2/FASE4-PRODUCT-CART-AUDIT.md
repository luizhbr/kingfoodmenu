# FASE 4 — PRODUCT + CART V2 AUDIT

## Arquivos auditados
- `packages/storefront/src/components/MenuItemModal.tsx`
- `packages/storefront/src/components/CartDrawer.tsx`
- `packages/storefront/src/context/CartContext.tsx`
- `packages/shared-ui/src/components/ProductCard.tsx`
- `packages/storefront/src/components/Layout.tsx`
- `packages/storefront/src/components/BottomDock.tsx`
- `packages/storefront/src/pages/Menu.tsx`
- `packages/storefront/src/main.tsx`

## Findings

### MenuItemModal ✅ base bom
- Já usa shared-ui Modal, Badge, Price, QuantitySelector, Button, Skeleton
- Carrega item via API /api/menu/items/:id com fallback
- Calcula total em tempo real considerando opções e quantidade
- CTA já mostra preço total
- **Falta:**
  - CTA fixo no mobile (footer do modal)
  - Campo de observação/comentário
  - Agrupamento visual mais forte das opções
  - Animação de entrada/saída

### CartDrawer ❌ legado
- Ainda usa cores Tailwind antigas (`bg-white`, `gray-*`, `primary-600`)
- Não usa componentes shared-ui
- Footer absolute com posicionamento manual acima do dock (fragilidade)
- Layout de item básico (sem imagem, sem botão editar)
- Textos em inglês (`cart.title`, `cart.checkout`, etc)
- Não implementa undo de remoção
- Não trata stale item
- **Não existe página `/cart`** — carrinho é apenas drawer

### CartContext ✅ funcional
- `STORAGE_KEY = 'king-food-cart-v1'` com persistência localStorage
- `addItem`, `updateQuantity`, `removeItem`, `clear`, `subtotal`, `itemCount`
- Suporta `comment?: string` em CartItem
- **Falta:**
  - `editItem` para atualizar opções/quantidade/comment
  - Agrupar itens idênticos (não crítico)
  - Stale detection

### ProductCard ⚠️ touch target
- Botão "+" atualmente `min-h-[36px]` — abaixo do ideal 44px
- Não exibe nome de categoria
- Imagem fallback OK

### Layout ✅ parcial
- Aplica `pb-[calc(4.25rem+env(safe-area-inset-bottom))]` no `<main>`
- BottomDock usa `--kf-nav-h = calc(3.5rem + safe-area)`
- Valor hardcoded inconsistente — deve usar token

### BottomDock ✅
- Altura via CSS variable `--kf-nav-h`
- Safe-area respeitada
- Z-index adequado

## Decisões
1. Refatorar `CartDrawer` com shared-ui Drawer/BottomSheet, Button, Price, QuantitySelector, EmptyState, Badge.
2. Criar componente `CartBar` flutuante para Menu quando houver itens.
3. Refinar `MenuItemModal`: CTA fixo, campo de observação, melhor agrupamento.
4. Aumentar touch target do botão "+" no `ProductCard`.
5. Atualizar `Layout` para usar padding-bottom via token CSS.
6. Expandir i18n PT-BR para carrinho.
7. Implementar undo de remoção no drawer.
8. Edição de item no carrinho: permitir alterar quantidade e comentário; opções não editáveis (evita duplicar modal de produto).
9. Stale cart: detectar no drawer se produto ainda existe via API; se não, mostrar mensagem amigável e permitir remover.
