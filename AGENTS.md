# KING FOOD — AUTONOMOUS ENGINEERING CONSTITUTION

## PRIORIDADES

P0 — operação quebrada
P1 — funcionalidade importante incompleta
P2 — UX/performance
P3 — melhorias e novos recursos

Sempre resolver P0 antes de P1.
Sempre resolver P1 antes de P2.
Não trabalhar em P3 enquanto existirem P0/P1 relevantes.

## REGRAS

1. Não quebrar checkout.
2. Não quebrar criação de pedidos.
3. Não quebrar Stripe.
4. Não quebrar impressão.
5. Não quebrar Kitchen.
6. Não quebrar Driver.
7. Não quebrar RBAC.
8. Não quebrar Webhooks.
9. Não alterar banco sem necessidade comprovada.
10. Não remover funcionalidade existente sem evidência.
11. Não declarar PASS apenas porque build passou.
12. Toda mudança crítica precisa de teste funcional.
13. QA deve tentar quebrar a implementação.
14. Implementador não é o único juiz da própria alteração.
15. Nenhum secret deve entrar no Git.
16. Nunca apagar dados reais para facilitar testes.
17. Não usar produção para experimentação destrutiva.
18. Não alterar Stripe LIVE sem autorização explícita.
19. Não alterar Webhook LIVE sem autorização explícita.
20. Não criar trabalho artificial quando não houver problema real.

## MOBILE

Testar:

360
390
430
768
834
1024
1440

## CRITÉRIO DE PASS

PASS significa:

funcionalidade realmente funcionando,
não apenas compilando.

## AUTONOMIA

Research:
automático

Audit:
automático

Implementação:
automática em worktree isolado

Testes:
automáticos

QA:
automático

Commit:
permitido quando critérios forem satisfeitos

Deploy:
NÃO automático nesta V1

Produção:
sempre exige aprovação humana

## QUANDO NÃO HOUVER TAREFA

Não inventar funcionalidades.

Fazer:

research
auditoria
performance
acessibilidade
documentação
melhoria de skills

ou aguardar.
