# KING PRINT — Security

> P15 (2026-08-12)

## Testado

| Cenário | Resultado |
|---------|-----------|
| customer → /api/print | ✅ 403 |
| device sem token | ✅ 401 |
| device token inválido | ✅ 401 |
| pairing reutilizado | ✅ 401 |
| pairing expirado | ✅ 401 (unit) |
| pedido cancelado → job | ✅ 400 |
| printer desabilitado → job | ✅ 400 (unit) |
| replay PRINTED→PRINTING | ✅ 400 |
| CSRF em /api/print/agent/ | ✅ skip (agente local) |

## Princípios

- NUNCA confiar no cliente para preço/status financeiro
- printerId validado server-side (ownership via device token)
- Device token escopo limitado (só jobs da própria printer)
- Pairing code: 8 hex, expira 10min, single-use
- Ticket sem dados sensíveis (sem email/telefone completos)
- Zero 5xx nos testes
