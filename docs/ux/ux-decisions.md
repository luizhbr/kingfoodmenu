# UX Decisions — King Food

Registro de decisões permanentes de UX/UI (loop de evolução contínua).

---

## 2026-08-12 — OrderCard: preview expandido + ação rápida em 1 toque

### Contexto
Aceitar um pedido exigia: abrir lista → clicar "Ver" → página de detalhes → selecionar status → salvar (3-5 passos). Operadores mobile perdiam tempo procurando a ação.

### Opções Consideradas
- **Opção A: Tabela + link para detalhes** (estado atual) — Prós: densidade desktop. Contras: múltiplos passos, ruim no mobile.
- **Opção B: Cards expandíveis com ação contextual** (escolhida) — Prós: ação em 1 toque, preview legível, progressive disclosure. Contras: menos denso no desktop (mitigado com grid 2-3 colunas).
- **Opção C: Modal inline** — Prós: sem mudar layout. Contras: mais toques que o card expandido.

### Decisão
OrderCard reutilizável com preview + expansão lazy + ação primária contextual (PENDING→CONFIRMED→PREPARING→READY→OUT_FOR_DELIVERY) em 1 toque. Grid 1/2/3 colunas por breakpoint.

### Justificativa
- **Material 3 (Hero moment):** pedido PENDENTE é o momento mais importante — borda dourada pulsante.
- **Apple HIG (Progressive disclosure):** detalhes (itens, totais, endereço) expandem sob demanda via GET /orders/:id.
- **GNOME (Reduce effort):** aceitar em 1 toque direto na lista.
- **COSMIC (Modularity):** OrderCard reutilizável com props (order, token, onStatusChange).

### Impacto
Aceitar pedido: 4-5 passos → 1 toque. Preview legível em 3s. Zero mudança de backend (reusa GET/PATCH existentes).

### Arquivos Afetados
- packages/admin/src/components/OrderCard.tsx (novo)
- packages/admin/src/pages/OrderList.tsx
- packages/admin/src/index.css (animações + prefers-reduced-motion)

---

## 2026-08-12 — Product Media Gallery (UX-V5)

### Contexto
Produtos tinham 1 imagem (campo `image`). Necessário: múltiplas fotos, crop, principal, ordenação, carrossel no storefront.

### Decisão
- **Schema:** `MenuItem.images Json?` aditivo — `[{url, sortOrder, isPrimary}]`. `NULL` = produto antigo usa `image` (retrocompatível).
- **Admin:** ProductMediaManager com crop client-side (canvas, 4:3, zoom, drag), sem libs novas.
- **Storefront:** ProductImageCarousel reutilizável (card + modal), swipe + indicadores + autoplay 4.5s pausado na interação, aspect fixo 4:3 (zero layout shift).

### Princípios
Material 3 (motion suave), Apple HIG (clareza), GNOME (esforço reduzido), COSMIC (modularidade).

### Arquivos
- packages/admin/src/components/ProductMediaManager.tsx
- packages/storefront/src/components/ProductImageCarousel.tsx
- packages/storefront/src/lib/gallery.ts
- packages/server/src/controllers/menu-item.controller.ts (append + PUT)
- packages/server/src/routes/menu.routes.ts
- prisma/schema.prisma + migrations/20260812_v5_product_images

---

## 2026-08-13 — FeaturedItems: skeleton reserva espaço (zero CLS)

### Contexto
A Home e o Cardápio carregam produtos reais via `GET /api/menu/items` (com fallback estático). Durante o fetch, `FeaturedItems` retornava `null` — quando os produtos chegavam, a seção inteira surgia e empurrava o footer (layout shift medido: CLS 0.2175, fontes = FOOTER + SECTION).

### Opções Consideradas
- **Opção A: `return null` durante loading** (estado anterior) — Prós: simples. Contras: CLS 0.2175 (acima do limite Google de 0.1), footer "pula" ao carregar.
- **Opção B: Skeleton com espaço reservado** (escolhida) — Prós: zero shift, feedback de carregamento, `aria-busy`. Contras: +30 linhas, placeholders visíveis por ~300ms.
- **Opção C: SSR/estático dos produtos** — Prós: zero loading. Contras: mudança de arquitetura fora do escopo UX.

### Decisão
Skeleton com a MESMA estrutura do grid real (2/3/4 colunas, aspect 4:3, linhas de texto) enquanto `loading`; `aria-busy="true"` + `aria-label`.

### Justificativa
- **Apple HIG (Clarity):** o usuário vê que a seção está carregando, não um vazio.
- **Web Vitals:** CLS 0.2175 → 0.0000 (medido 2× com PerformanceObserver).
- **COSMIC (Modularity):** mesmo grid/classes do estado real — sem duplicação de layout.

### Impacto
Zero layout shift na Home/Cardápio; skeleton ~300ms; acessibilidade melhorada (aria-busy).

### Arquivos Afetados
- packages/storefront/src/components/FeaturedItems.tsx (+30/−1)

---

## 2026-08-13 — CartDrawer: footer fixo acima do bottom dock (Depth + Safe Area)

### Contexto
O drawer do carrinho (z-50) e o BottomDock (z-50) compartilhavam o mesmo z-index; o dock vinha depois no DOM e cobria o footer do carrinho (Subtotal + CTA Checkout) em mobile — o CTA ficava parcialmente atrás da navegação.

### Opções Consideradas
- **Opção A: Footer no fluxo do flex** (estado anterior) — Prós: simples. Contras: com o dock sobreposto, o CTA Checkout ficava atrás da nav (z-index igual, DOM posterior vence).
- **Opção B: Footer fixo acima do dock + padding no scroll** (escolhida) — Prós: CTA sempre visível e tocável, conteúdo rola sob o footer com padding reservado. Contras: footer precisa de sombra para separar do conteúdo.
- **Opção C: Subir z-index do drawer** — Prós: drawer cobre o dock. Contras: quebra a hierarquia visual (nav some durante o carrinho) e o usuário perde o contexto de navegação.

### Decisão
Footer do carrinho `absolute bottom-[calc(4.25rem+env(safe-area-inset-bottom))]` (altura do dock + safe-area) com sombra superior; container de itens com `pb-[calc(9.5rem+env(safe-area-inset-bottom))]` para o último item rolar acima do footer.

### Justificativa
- **Apple HIG (Depth):** camadas visuais separadas — conteúdo scrollável, footer fixo, nav fixa.
- **Apple HIG (Safe Area):** `env(safe-area-inset-bottom)` em ambos os paddings (dock e footer).
- **GNOME (Reduce effort):** CTA Checkout sempre visível, 1 toque, sem rolar.

### Impacto
CTA Checkout nunca mais coberto pela nav; último item do carrinho sempre acessível; safe-area respeitada em iPhones com notch.

### Arquivos Afetados
- packages/storefront/src/components/CartDrawer.tsx

---

## 2026-08-13 — Home: header sem logo + remoção de "Mais pedidos" (Hero Moment)

### Contexto
A home exibia o logo 3× (header, hero, splash) e a seção "Mais pedidos" duplicava o cardápio logo abaixo do CTA — redundância visual e desvio do foco (pedir).

### Opções Consideradas
- **Opção A: Manter tudo** — Prós: familiar. Contras: logo repetido 3×, conteúdo empurra o CTA para baixo.
- **Opção B: Header só texto + remover destaques da home** (escolhida) — Prós: 1 logo só (hero), CTA dominante na 1ª viewport, respiro visual. Contras: home mais curta (mitigado: produtos continuam no /cardapio com FeaturedItems).
- **Opção C: Remover o logo do hero** — Prós: menos repetição. Contras: perde identidade no momento principal.

### Decisão
Header com texto "King Food" apenas (sem img); hero mantém o logo grande (único); seção "Mais pedidos" removida da home (permanece no topo do /cardapio); paddings verticais aumentados.

### Justificativa
- **Material 3 (Hero moment):** CTA "Pedir agora →" dominante, sem competir com produtos.
- **Apple HIG (Clarity):** 1 logo por viewport; remover redundância.
- **GNOME (Make it simple):** foco em UMA tarefa — pedir.

### Impacto
Hero mobile 447→479px, desktop 519→551px; home mais curta e focada; zero overflow (5 viewports).

### Arquivos Afetados
- packages/storefront/src/pages/Home.tsx

---
