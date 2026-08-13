# UX Changelog — King Food

## 2026-08-12 — UX Loop: OrderCard + Product Media

### FASE UX-V5 — Product Media Gallery (commit e380d29)
- ProductMediaManager (admin): crop client-side 4:3, zoom, drag, compressão JPEG, upload append, reorder, principal, remoção protegida
- ProductImageCarousel (storefront): swipe, indicadores, autoplay 4.5s, aspect fixo
- Backend: MenuItem.images Json aditivo (retrocompatível), PUT /items/:id/images
- Motivo: produtos precisavam de múltiplas fotos + galeria profissional
- Impacto: gerência completa de mídia no admin + carrossel no card/detalhe
- Breaking: nenhum (coluna aditiva, contratos preservados)

### UX Loop — OrderCard (commit dc5a9da)
- OrderList vira grade de cards expandíveis (era tabela)
- Aceitar pedido em 1 toque (era 3-5 passos)
- PENDING com pulso dourado (hero moment)
- Motivo: reduzir fricção operacional no mobile
- Impacto: ação primária em 1 toque, preview em 3s
- Breaking: nenhum (backend intocado)

### Corrigido durante validação
- `locations.images` no schema (adicionada por acidente no replace) — removida do commit UX-V5; coluna só existe em menu_items (consistente com a migration)

## 2026-08-13 — CLS fix: FeaturedItems skeleton

### Mudanças
- FeaturedItems: skeleton com espaço reservado durante fetch (era `return null`)
- CLS medido: 0.2175 → 0.0000 (PerformanceObserver, 2 runs)

### Motivo
Seção de produtos surgia após o fetch e empurrava o footer (layout shift acima do limite Google de 0.1).

### Impacto
Zero layout shift na Home/Cardápio; feedback de carregamento visível; aria-busy.

### Breaking Changes
Nenhum (componente interno, sem contrato de API).


## 2026-08-13 — CartDrawer footer fixo (Depth + Safe Area)

### Mudanças
- Footer do carrinho (Subtotal + Checkout + Delete) fixo acima do bottom dock
- Container de itens com padding-bottom reservado (último item rola acima do footer)
- Safe-area aplicada em footer e dock

### Motivo
BottomDock (z-50, DOM posterior) cobria o CTA Checkout do drawer (z-50) em mobile.

### Impacto
CTA sempre visível/tocável; zero sobreposição (medido: footer bottom 776 ≤ dock top 781); último item visível após scroll.

### Breaking Changes
Nenhum (classes Tailwind, sem contrato de API).


## 2026-08-13 — Home v2: header sem logo + home focada no CTA

### Mudanças
- Header: logo removido, texto "King Food" apenas (status à esquerda, botão Pedir à direita)
- "Mais pedidos" removido da home (permanece no /cardapio)
- Paddings verticais do hero e seção "sobre" aumentados (respiro)

### Motivo
Logo repetido 3× (header/hero/splash) + destaques competindo com o CTA principal.

### Impacto
Hero moment dominante; home mais curta e focada; hero 447→479px mobile.

### Breaking Changes
Nenhum (visual apenas).


## 2026-08-13 — Cardápio v2: busca prominente + chips + grid imediato

### Mudanças
- Título "Nosso Cardápio" + descrição removidos
- Busca full-width abaixo do header (era max-w-md discreta)
- Categorias: sidebar → chips horizontais scrolláveis (gold ativo)
- Grid: 1 coluna → 2 colunas mobile (3 desktop)
- "Mais pedidos" removido do topo (produtos já imediatos)
- Paddings reduzidos (py-8 → py-4)

### Motivo
Produtos apareciam abaixo do dobra; categorias escondidas no mobile.

### Impacto
Produto na 1ª viewport (top 199px); filtro 1 toque com URL sync; zero overflow.

### Breaking Changes
Nenhum (visual; API e rotas intactas).


## 2026-08-13 — Modal produto: CTA dourado compacto + contador integrado

### Mudanças
- Botão azul "Adicionar ao Carrinho" → CTA dourado 56px com ícone 🛒 + preço
- Contador de quantidade integrado na mesma linha (era separado)
- Preço atualiza em tempo real (qty + adicionais)

### Motivo
Botão gigante azul competia com o conteúdo; 2 controles separados para 1 tarefa.

### Impacto
CTA 80→56px; 1 controle só; identidade dourada; preço dinâmico.

### Breaking Changes
Nenhum (visual; addItem API intacta).

