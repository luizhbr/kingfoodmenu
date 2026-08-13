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
