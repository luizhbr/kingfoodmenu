[[00 - Home]]

# Menu

Ver [[03 - Database]] e [[05 - Admin POS]].

## P2 — Admin Menu CRUD (PASS 2026-08-12)

- Categorias: criar, editar, desativar, ordenar
- Produtos: nome, descrição, preço, **SKU**, **cost**, imagem, categoria, ativo/inativo, estoque, ordenação
- Modifiers/options: nome, preço, min/max, obrigatório, ordenação
- Storefront consome o MESMO catálogo (fonte única)
- Produtos desativados somem do storefront (isActive filter)
- Admin usa includeInactive=true para gerenciar
