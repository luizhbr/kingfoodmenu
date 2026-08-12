# Development Rules — King Food Foundation

> Regras obrigatórias para qualquer alteração no projeto.

1. **Não confiar em dados enviados pelo cliente.** Preços, totais e fees são
   calculados no servidor a partir do banco.

2. **Preços vêm do servidor.** O cliente pode enviar o que quiser; o servidor
   recalcula sempre.

3. **Toda alteração de schema precisa de migration.** Nunca editar o schema
   sem criar a migration correspondente.

4. **Toda rota nova precisa ser montada no app.** Definir o router não basta —
   montar em `app.ts` ou será 404.

5. **Toda alteração de API precisa de teste.** Pelo menos um teste manual
   documentado (local ou produção).

6. **Toda alteração de produção precisa de build.** Typecheck + build antes
   de deploy.

7. **Toda alteração crítica precisa de smoke test.** Verificar o endpoint em
   produção após o deploy.

8. **Nunca declarar PASS sem evidência.** Evidência = código + typecheck +
   build + teste + deploy + produção + banco (quando aplicável).

9. **Nunca declarar write concluído sem reler o arquivo.** Após qualquer
   write/patch: reler do disco, `git diff`, confirmar conteúdo.

10. **Nunca apagar código órfão sem decisão explícita.** Rotas/models órfãos
    ficam marcados como ORPHAN — REVIEW REQUIRED até decisão.

## Verificação de mutação (obrigatória)

Após QUALQUER write/patch:

1. Ler novamente o arquivo do disco
2. Confirmar que a alteração existe
3. `git diff`
4. Confirmar conteúdo contra o objetivo

Se a ferramenta retornar erro → `FILE_MUTATION_FAILED` → estratégia alternativa.

## Git não é prova suficiente

Commit/deploy OK ≠ alteração presente. Validar sempre:

```
DISCO → GIT → BUILD → TESTE → DEPLOY → PRODUÇÃO
```

Divergência → PARAR E INVESTIGAR.
