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
