# FASE 2 — HOME V2 AUDIT

## Arquivo base
- `packages/storefront/src/pages/Home.tsx`
- 565 LOC
- Estado atual: já passou por revisão V2 anterior (remoção de logo duplicada, respiro vertical)

## Imports atuais
- Layout, Footer
- FeaturedItems (tree-shaken do bundle, mas ainda no código-fonte)
- hooks: useAuth, useCart, useTranslation
- API: /api/locations, /api/menu/categories, /api/settings

## Estrutura atual
1. Header com localização + status
2. Hero com logo grande + texto + CTA
3. Destaques (FeaturedItems)
4. Categorias em grid (se existirem)
5. Footer mínimo
6. BottomDock

## Problemas a resolver na FASE 2
1. **Hero ocupa muita dobra** — empurra produtos para baixo em mobile.
2. **FeaturedItems removido visualmente** — home pode parecer vazia após hero.
3. **Categorias não são chips horizontais interativos** na home.
4. **Falta densidade de produtos acima da dobra** no mobile.
5. **Não há upsell/destaque claro** (promoção, mais pedidos, combo).
6. **CTA do hero genérico** — pode ser substituído por ação de conversão direta.

## Componentes a criar/reutilizar
| Componente | Origem | Nota |
|-----------|--------|------|
| ModernHeader | shared-ui / existente | manter |
| HeroCompact | novo | menos altura, foco em local + busca + CTA |
| CategoryPills | novo | chips horizontais scrolláveis (reutilizar de Menu V2) |
| FeaturedProductGrid | shared-ui ProductCard | 4-6 cards acima da dobra |
| PromoBanner | novo | badge + texto + CTA dourado |
| QuickSearch | novo | busca visível para menu |
| BottomDock | existente | manter |

## APIs necessárias
- `GET /api/locations` → seleção
- `GET /api/menu/items?featured=true` → destaques (se existir)
- `GET /api/menu/categories` → categorias
- `GET /api/settings` → site name, branding

## Mobile-first
- Prioridade 360/390/430
- Hero não deve ultrapassar 50-60% da viewport
- Cards de produto em grid 2 colunas mobile / 3-4 desktop
- Chips de categoria scrolláveis horizontalmente

## Referência visual
- Produção atual: https://king-food-foundation-ui.vercel.app/
- Não copiar cegamente; extrair princípios de hierarquia e conversão.

## Riscos
- Não quebrar /cardapio (já foi refeito na V2)
- Não quebrar checkout flow
- Preservar PWA, BottomDock, i18n, Auth
- Não adicionar dependências pesadas

## Critério de PASS
- [ ] Home renderiza sem erros em 360/390/430/768/1440
- [ ] Produtos aparecem acima da dobra em mobile
- [ ] Categorias são 1 toque para ir ao menu filtrado
- [ ] CTA principal leva à conversão
- [ ] BottomDock não cobre conteúdo
- [ ] Bundle não cresce injustificadamente
- [ ] Regressão 8/8 PASS
