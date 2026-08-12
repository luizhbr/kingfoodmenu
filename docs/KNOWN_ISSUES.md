# Known Issues — King Food Foundation

> **Somente problemas REAIS e atuais** (2026-08-12)

## BLOCKED

| Issue | Detalhe |
|-------|---------|
| Google Maps (P11) | Sem API key no ambiente. Autocomplete/placeId/delivery fee dependem dela. BLOCKED. |

## ORPHAN

| Issue | Detalhe |
|-------|---------|
| 3 rotas órfãs | attribution, referral, webhook — definidas, não montadas, sem uso. Ver ORPHAN_ROUTES.md |
| 9 models sem uso | CustomerGroup, OperatingHour, MenuOption, MenuOptionValue, MenuItemMealtime, MenuItemAllergen, OrderItemOption, Store, Promotion. Ver DATABASE.md |

## Serverless limitations

| Issue | Detalhe |
|-------|---------|
| Socket.IO inativo | Kitchen usa polling 15s (ver KITCHEN.md) |
| Uploads efêmeros | Arquivos em disco não persistem entre requisições |
| Sem cron | Timers em background não funcionam no serverless |
| Cold start | Primeira requisição após idle pode demorar |

## Ambiente Hermes (PC)

| Issue | Detalhe |
|-------|---------|
| Bash do terminal quebrado | Efeito de matar processos na limpeza do Buzz. Contornado com Python subprocess. Reiniciar o PC restaura. |
| Hermes Desktop | Backend local (porta 50000/42017) não sobe — gateway do Telegram segue vivo. |


## Menor (não bloqueante)

| Issue | Detalhe |
|-------|---------|
| SESSION_STARTED duplicado | O hook useTracking envia SESSION_STARTED a cada mount; remontagem na mesma sessão gera 2 eventos com mesma sessionId. Não afeta pedidos. |

## Resolvidos (não são issues atuais)

- ~~FUNCTION_INVOCATION_FAILED~~ — resolvido (import dist, não src)
- ~~/api/dashboard 404~~ — resolvido (c3600a2)
- ~~tracking 500 (source minúsculo)~~ — resolvido (86a0570)
- ~~tracking 500 (customerId inválido)~~ — resolvido (86a0570)
- ~~kitchen Socket.IO~~ — resolvido (polling, c9f5f63)
- ~~admin blank page /admin~~ — resolvido (b16dd65)
