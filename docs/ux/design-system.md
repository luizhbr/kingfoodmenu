# Design System — Padrões King Food

## OrderCard

### Uso
Lista de pedidos (admin) — substitui linhas de tabela por cards operacionais.

### Props
- `order: OrderSummary` — { id, orderNumber, orderType, status, total, createdAt, scheduledAt, customer, location, _count }
- `token: string` — Bearer token para GET /orders/:id (expansão) e PATCH /orders/:id/status (ação)
- `onStatusChange: (orderId, newStatus) => void` — callback após ação bem-sucedida

### Estados
- **PENDING:** borda dourada + pulso (hero moment) + botão "Aceitar pedido"
- **CONFIRMED/PREPARING/READY:** botão contextual escuro (próximo passo do fluxo)
- **OUT_FOR_DELIVERY/DELIVERED/PICKED_UP:** link "Ver detalhes" (terminal)
- **Expansão:** loading spinner, erro com mensagem PT-BR, itens + totais + metadados
- **Ação:** estado "Atualizando..." com disabled (evita duplo submit)

### Acessibilidade
- Botão do preview com `aria-expanded` + `aria-label` descritivo
- Touch targets: 48px (ações), 44px (links)
- `prefers-reduced-motion`: desativa animações

### Responsividade
- Mobile (1 coluna) / md (2) / xl (3)
- Zero overflow em 360-1440px (validado)

## ProductImageCarousel

### Uso
Cards de produto e modal de detalhes quando há 2+ imagens.

### Props
- `images: string[]` — URLs em ordem de exibição
- `alt: string` — texto alternativo base
- `autoPlayMs?: number` — intervalo (default 4500)
- `className?`, `imgClassName?`

### Comportamento
- 1 imagem → sem carrossel, sem indicadores (comportamento antigo)
- Swipe horizontal não bloqueia scroll vertical
- Autoplay pausa ao tocar/hover e retoma após 6s
- Aspect ratio fixo 4:3 (zero layout shift)
- Lazy loading nas imagens secundárias

## FeaturedItemsSkeleton

### Uso
Estado de carregamento de FeaturedItems (Home + topo do Cardápio) — reserva espaço para evitar CLS.

### Estrutura
- Mesmo grid do estado real: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- Card placeholder: `aspect-[4/3]` + 3 linhas de texto `animate-pulse`
- Header ("Mais pedidos" + "Ver cardápio →") renderizado desde o início

### Acessibilidade
- `aria-busy="true"` + `aria-label="Carregando produtos em destaque"` na section
- Placeholders são `div` (sem leitura de conteúdo falso)

### Responsividade
- Mesmos breakpoints do grid real (2→3→4 colunas)
- Zero overflow em 360-1440px (validado)


## CartDrawerFooter (padrão drawer + dock)

### Uso
Qualquer drawer/sheet que coexista com a bottom nav fixa (kf-bottom-dock).

### Estrutura
- Footer: `absolute bottom-[calc(4.25rem+env(safe-area-inset-bottom))]` + sombra superior
- Conteúdo: `overflow-y-auto` + `pb-[calc(9.5rem+env(safe-area-inset-bottom))]`
- Drawer: `relative` (âncora do footer absoluto)

### Regra
Nunca deixar dois elementos fixed com o mesmo z-index competindo — o footer do drawer deve ancorar ACIMA da nav (bottom = nav-height + safe-area), nunca atrás.

### Validação
390px: footer bottom 776 ≤ dock top 781; último item visível após scroll; zero erros.

