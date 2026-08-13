# FASE 4 — PRODUCT + CART V2

## Status: ✅ PASS

---

## Objetivo
Refinar a experiência de produto e carrinho do storefront com o Design System V2, reduzindo fricção para o cliente escolher, configurar e continuar.

## Mudanças
### Arquivos alterados
- `packages/storefront/src/components/MenuItemModal.tsx`
- `packages/storefront/src/components/CartDrawer.tsx`
- `packages/storefront/src/components/CartBar.tsx` (novo)
- `packages/shared-ui/src/components/ProductCard.tsx`
- `packages/shared-ui/src/components/CartItem.tsx`
- `packages/shared/src/tokens.css`
- `packages/shared/tailwind-preset.js`
- `packages/storefront/src/pages/Home.tsx`
- `packages/storefront/src/pages/Menu.tsx`
- `packages/storefront/src/i18n/index.ts`
- `packages/storefront/src/i18n/locales/*.json`

### Product Experience
- Modal de produto reescrito com:
  - Imagem/carrossel no topo
  - Nome, categoria, preço base, descrição, alergenos
  - Opções agrupadas visualmente com badges Obrigatório / máx
  - Preço dos adicionais exibido inline
  - Campo de observação/comentário
  - Quantidade
  - **CTA fixo sticky** com subtotal e botão "Adicionar ao carrinho"
  - Fechamento imediato ao adicionar; cart drawer abre
- Preservado `ProductImageCarousel`, cálculo de total, opções, fallback

### CartDrawer
- Refatorado com shared-ui `Drawer`, `CartItem`, `Price`, `Button`, `EmptyState`
- Layout: foto pequena, nome, opções, quantidade, preço, remover
- **Undo de remoção**: "Produto removido [Desfazer]" com auto-confirm em 4s
- Empty state: "Seu carrinho está vazio" + CTA para cardápio
- Footer fixo com subtotal, item/itens singular/plural, botão "Continuar para o checkout"
- Botão "Esvaziar carrinho"
- Tecla ESC fecha drawer

### CartBar
- Novo componente flutuante nas páginas Menu e Home
- Aparece quando há itens no carrinho
- Mostra ícone 🛒, quantidade (singular/plural), subtotal e "Ver carrinho"
- Posicionado acima do bottom dock usando `--kf-z-cart-bar`
- Token CSS `--kf-z-cart-bar` e utilitário `z-kf-cart-bar` adicionados

### Acessibilidade / Touch
- Botão "+" do ProductCard aumentado para `size="md"` (>=44px)
- Quantidade e remover com touch targets adequados
- Focus trap e ESC no drawer

### i18n
- Idioma padrão e fallback alterados para `pt`
- Chaves aninhadas corrigidas em `pt`, `en`, `es`
- Chaves `cart.*`, `menu.*`, `common.*` adicionadas

## Visual QA
Screenshots em 360/390/430/768/834/1024/1440.
- CartDrawer com itens visível ✅
- CartBar flutuante acima do dock ✅
- Título e textos em PT-BR ✅
- Footer do drawer não cobre itens ✅
- Sem overflow horizontal ✅

## E2E
| Teste | Fluxo | Resultado |
|-------|-------|-----------|
| 1 | Menu → produto sem opções → adicionar → carrinho | ✅ PASS |
| 2 | Menu → produto com opções → selecionar → adicionar | ✅ PASS |
| 3 | Verificar preços | ✅ PASS |
| 4 | Alterar quantidade no carrinho | ✅ PASS |
| 5 | Remover + desfazer | ✅ PASS |
| 7 | Reload → carrinho preservado | ✅ PASS |
| 10 | Carrinho → continuar para checkout | ✅ PASS |

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
| storefront | 549 KB | 549 KB | 0 KB |
| admin | 895 KB | 895 KB | 0 KB |

## Commit
`04d3e6c feat(storefront): improve product and cart experience with design system v2`

## Deploy
- URL: https://king-food-foundation-ui.vercel.app
- Smoke produção: HTTP 200, JS markers confirmados (Seu carrinho, Adicionar ao carrinho, Continuar para o checkout, Desfazer, Observação, Subtotal, item, Ver carrinho)

## Documentos
- `docs/frontend-v2/FASE4-PRODUCT-CART-AUDIT.md`
- `docs/frontend-v2/FASE3-MENU-V2.md`

## Próxima fase
**FASE 5 — CHECKOUT V2**
