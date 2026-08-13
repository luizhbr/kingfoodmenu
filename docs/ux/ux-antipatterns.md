# UX Antipatterns — King Food

## Tabela de pedidos como único layout mobile
- **Problema:** tabela de 8 colunas é ilegível em 360px; aceitar pedido exige 3-5 passos.
- **Por que é ruim:** operador perde tempo, erra status, desiste no mobile.
- **Alternativa:** cards expandíveis com ação primária em 1 toque (OrderCard).
- **Exemplo:** ver OrderList.tsx antes (tabela) vs. depois (grid de cards).

## Schema replace global
- **Problema:** `schema.replace('image String?', ...)` adicionou `images` em TODOS os modelos com padrão similar (MenuItem E Location).
- **Por que é ruim:** Prisma client regenerado passa a exigir coluna que a migration não criou → P2022 em runtime (createOrder quebrou).
- **Alternativa:** substituir com âncora única por modelo (ex: incluir nome do campo vizinho no old_string); validar migration vs. schema após cada alteração.
- **Exemplo:** correção no commit UX-V5 (Location.images removida).

## `return null` durante loading de seção assíncrona
- **Problema:** componente que retorna `null` enquanto busca dados faz a página "crescer" quando os dados chegam → layout shift (CLS 0.2175 no FeaturedItems).
- **Por que é ruim:** CLS acima de 0.1 penaliza Core Web Vitals; conteúdo abaixo (footer) pula visualmente; usuário perde referência de scroll.
- **Alternativa:** skeleton com a mesma estrutura do estado final (grid, aspect ratio, linhas) + `aria-busy`.
- **Exemplo:** FeaturedItems.tsx antes (`if (loading) return null`) vs. depois (skeleton 4 cards).


## Dois fixed com mesmo z-index (drawer vs. bottom nav)
- **Problema:** drawer (z-50) e bottom nav (z-50) — o que vem depois no DOM cobre o outro; CTA do drawer fica atrás da nav.
- **Por que é ruim:** botão crítico (Checkout) parcialmente oculto/inacessível em mobile.
- **Alternativa:** footer do drawer ancorado acima da nav (`bottom: nav-height + safe-area`) com padding reservado no scroll.
- **Exemplo:** CartDrawer.tsx antes (footer no fluxo, coberto) vs. depois (footer fixo acima do dock).

