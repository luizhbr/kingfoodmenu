# n8n Workflows — King Food WhatsApp Bot (MVP)

4 workflows mínimos. **Nenhuma regra de negócio aqui** — o backend King Food é a fonte da verdade (preço, delivery, cupom, total, status).

## Importar
1. n8n → Workflows → Import from File
2. Configurar variáveis de ambiente no n8n:
   - `KINGFOOD_API_URL` = https://king-food-foundation-ui.vercel.app
   - `WHATSAPP_ACCESS_TOKEN` = token da Meta Cloud API
   - `WHATSAPP_PHONE_NUMBER_ID` = id do número
3. Ativar os workflows

## Fluxos
| Workflow | Função |
|---|---|
| 01-whatsapp-incoming | Webhook Meta → normalizar → dedupe → King Food API → resposta |
| 02-whatsapp-outgoing | Evento do backend → Meta Cloud API → cliente |
| 03-error-handler | Registro de erro → retry controlado (máx 3) → fallback |
| 04-human-handoff | Bot → humano → bot (persistido no backend) |

## Segurança
- Nenhum secret nos workflows — apenas referências a env vars
- Nenhuma regra de negócio duplicada
- Idempotência: o backend deduplica por messageId (unique constraint)
