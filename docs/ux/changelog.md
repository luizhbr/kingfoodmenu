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
