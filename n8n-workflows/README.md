# n8n Workflows — King Food WhatsApp Bot (MVP)

4 workflows mínimos. **Nenhuma regra de negócio aqui** — o backend King Food é a fonte da verdade (preço, delivery, cupom, total, status).

## Arquitetura oficial

```
Meta WhatsApp Cloud API
        ↓
King Food Backend (valida HMAC, deduplica, persiste, controla bot/handoff)
        ↓
N8N (processamento interno — intenção/IA)
        ↓
King Food Backend (valida resultado, envia pela Meta)
        ↓
Meta WhatsApp Cloud API
        ↓
Cliente
```

O backend é o **gateway de segurança** do WhatsApp. O n8n **nunca** é endpoint público da Meta.

## Importar
1. n8n → Workflows → Import from File
2. Configurar variáveis de ambiente no n8n:
   - `KINGFOOD_API_URL` = https://king-food-foundation-ui.vercel.app
   - `META_ACCESS_TOKEN` = token da Meta Cloud API
   - `META_PHONE_NUMBER_ID` = id do número
   - `N8N_WEBHOOK_SECRET` = token interno compartilhado com o backend (header `x-n8n-token`)
3. Ativar os workflows

## Fluxos
| Workflow | Função |
|---|---|
| 01-whatsapp-incoming | Backend → n8n (normalizar intenção) → King Food API → resposta ao backend |
| 02-whatsapp-outgoing | Evento do backend → Meta Cloud API → cliente |
| 03-error-handler | Registro de erro → retry controlado (máx 3) → fallback |
| 04-human-handoff | Bot → humano → bot (persistido no backend) |

## Segurança
- Nenhum secret nos workflows — apenas referências a env vars (`$env.*`)
- Nenhuma regra de negócio duplicada
- Idempotência: o backend deduplica por messageId (unique constraint)
- O endpoint `/api/whatsapp/process` exige header `x-n8n-token` (N8N_WEBHOOK_SECRET)
- Convenção de env vars: `META_*` para credenciais da Meta Cloud API (nunca `WHATSAPP_*`)
