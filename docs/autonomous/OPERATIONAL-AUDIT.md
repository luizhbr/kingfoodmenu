# KING FOOD AUTONOMOUS ENGINEERING — INITIAL AUDIT

## 1. Arquitetura encontrada

### Backend (packages/server)
- Express + Prisma + Neon PostgreSQL.
- Auth JWT separado para staff (`/api/auth/staff/login`) e customers (`/api/auth/customer/login`).
- CSRF double-submit para requisições sem Bearer; Bearer bypassa CSRF.
- EventEmitter central (`lib/events.ts`) dispara `order.created` e `order.statusChanged`.
- Socket.IO para notificações em tempo real.
- Webhooks com assinatura (`/api/webhooks/*`, `/api/automation/webhook`).

### Impressão
- `print.routes.ts`: CRUD de printers + jobs + endpoints de agente (`/agent/jobs`, `/agent/jobs/:id/ticket`).
- `print.controller.ts`: `createJob`, `listJobs`, `retryJob`, `agentFetchJobs`, `agentTicket`.
- `autoPrintOnConfirmed` em `lib/events.ts` enfileira um `PrintJob` para cada printer `enabled` quando `order.statusChanged` chega em `CONFIRMED`.
- `print-agent` (Node.js local) faz polling, formata ticket ESC/POS, imprime via `OS_PRINTER` (Windows spooler P/Invoke).
- Admin: `SettingsPrinters.tsx`, `SettingsPrint.tsx`, `usePrintOrder.ts`.
- `OrderDetail.tsx` provavelmente tem botão de imprimir.

### Driver
- `driver.routes.ts`: endpoints para aceitar, retirar, sair para entrega, entregar.
- `driver.controller.ts`: lógica de transição de status.
- **Nenhuma UI mobile/driver encontrada** além do pacote `mobile` com 8 componentes genéricos (sem páginas de driver).

### Staff
- Backend CRUD completo: listar, convidar (`/api/staff/invite`), editar (`PATCH`), desativar (`DELETE`).
- Admin: `StaffList.tsx`, `StaffEdit.tsx`, `StaffInvite.tsx` — rotas existem.
- Ações de editar/desativar/convidar estão presentes na UI.

### Automações
- `automation.routes.ts` + `automation.controller.ts` com CRUD completo.
- `order.created` e `order.statusChanged` disparam `processRules('...', data)`.
- Endpoint `/api/automation/webhook` existe mas webhook handler é stub.
- Admin: `AutomationRuleList.tsx`, `AutomationRuleForm.tsx`.

### Cardápio
- Backend: `/api/menu/*` com categorias, itens, opções, imagens, disponibilidade.
- Admin: `MenuItemList/Form`, `CategoryList/Form`.
- Storefront: `/menu` com cards, busca, carrinho.

## 2. P0 — Operação quebrada

### P0-001 — Impressão
- **Não auditada fisicamente ainda.**
- Código existe e parece consistente: evento → job → agente → printer.
- Próximo passo: testar impressão de teste, manual e auto-print com RONGTA real.
- **Impacto:** sem prova física, não se pode declarar operacional.

### P0-002 — OrderConfirmation exibe `$NaN` para preço do item em produção
- Evidência: screenshot `prod-order-confirmation.png`.
- Causa provável: frontend usa `item.price`; backend retorna `unitPrice`.
- Arquivo: `packages/storefront/src/pages/OrderConfirmation.tsx`.
- **Impacto:** cliente vê preço inválido no resumo do pedido.

### P0-003 — Checkout delivery sem inline errors
- Evidência: screenshot `prod-delivery-error.png`.
- `validateAddress()` retorna false e seta erro global, mas não preenche `addressErrors`.
- **Impacto:** usuário não sabe quais campos de endereço estão faltando.

## 3. P1 — Funcionalidade importante incompleta

### P1-001 — App Driver
- Backend de driver existe e está completo.
- Pacote `mobile` não possui páginas de driver.
- **Gap:** não há interface para motorista aceitar/entregar pedidos.

### P1-002 — WhatsApp operacional
- Código stub (`notifyOrderWhatsApp`) existe mas não foi auditado.
- Não há evidência de envio real.

### P1-003 — Automações webhook
- Endpoint `/api/automation/webhook` é stub.
- Regras podem ser criadas mas triggers externos não funcionam sem webhook real.

## 4. P2 — UX/Performance

### P2-001 — Checkout labels
- Labels atuais: "Como receber?", "Quando receber?", "Alguma observação?".
- Checklist esperava: "Tipo de pedido", "Agendamento", "Observações".
- Não é bug funcional, mas pode ser ajustado para alinhamento.

### P2-002 — Mobile bottom padding
- CTA sticky e bottom dock estão posicionados corretamente, mas telas pequenas precisam scroll para acessar botões de tipo de pedido quando CTA está visível.

## 5. P3 — Melhorias

### P3-001 — Roadmap SaaS
- Ainda não iniciado.

## 6. Impressão — detalhe

```
order.statusChanged CONFIRMED
  → lib/events.ts autoPrintOnConfirmed
    → cria PrintJob (orderId, printerId, type='AUTO')
      → print-agent poll /api/print/agent/jobs
        → GET /api/print/agent/jobs/:jobId/ticket
          → renderReceipt / buildKitchenTicket
            → agent formata ESC/POS e envia para OS_PRINTER
```

Risco identificado:
- O agente local precisa de token de dispositivo e impressora `enabled`.
- Se a impressora não estiver `enabled`, auto-print não cria job.
- Se o agente não estiver rodando, jobs ficam em QUEUED.

## 7. Driver — detalhe

- API completa, mas sem UI.
- Motorista precisaria de app/mobile ou página web.

## 8. WhatsApp operacional

- `notifyOrderWhatsApp` é stub (catch).
- Não há integração real detectada.

## 9. Staff — detalhe

- Backend e admin UI completos.
- `StaffList.tsx` permite editar, desativar e convidar.
- Não há indicação de que a UI não permita essas ações.

## 10. Automações — detalhe

- CRUD de regras funciona.
- `processRules` executa `executeAction` de `lib/actions.ts`.
- Webhook externo ainda não implementado.

## 11. Cardápio — detalhe

- Backend/admin/storefront alinhados.
- Documentação em `packages/docs/features/menu-management.md` descreve funcionalidades.

## 12. UX gaps

- OrderConfirmation: preço do item `NaN`.
- Checkout delivery: sem inline errors.
- Mobile: scroll necessário para acessar tipo de pedido quando CTA aparece.

## 13. Segurança

- CSRF e RBAC mantidos.
- Nenhuma alteração de backend realizada.

## 14. Performance

- Bundle storefront: 492 KB (~146 KB gzip).
- Admin bundle: 916 KB (~235 KB gzip) — acima do limite de 500 KB, mas já existia.

## 15. Dívida técnica

- Server tests: 15 arquivos falhando (baseline preexistente desde FASE 4).
- Admin bundle chunk warning.
- Webhook stub.
- Driver sem UI.

## 16. Funcionalidades existentes sem UI

- Driver API completa sem interface mobile/web.

## 17. Funcionalidades de UI sem backend funcional

- Nenhuma identificada. Automação webhook é backend stub.

## 18. Recomendações

1. **Corrigir P0-002 ($NaN)** — ajustar `OrderConfirmation.tsx` para usar o campo correto do backend.
2. **Corrigir P0-003 (delivery inline errors)** — popular `addressErrors` em `validateAddress()`.
3. **Testar impressão física** — criar printer enabled, executar print-agent local, gerar pedido em produção e verificar comanda física.
4. **Auditar WhatsApp** — verificar se há integração oculta ou se é stub.
5. **Planejar UI do motorista** — prioridade P1.

## 19. Próxima tarefa

**P0-002 + P0-003: corrigir OrderConfirmation `$NaN` e checkout delivery inline errors.**

Ambos são bugs frontend, não exigem alteração de backend, banco ou Stripe.
