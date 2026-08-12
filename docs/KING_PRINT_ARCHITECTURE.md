# KING PRINT — Architecture Decision

> P15 (2026-08-12)

## Decisão

**API REST + polling HTTPS + agente local (Node CLI) + escpos (MIT)**

## Alternativas avaliadas

| Alternativa | Licença | Veredicto |
|-------------|---------|-----------|
| QZ Tray | Proprietária (free tier) | ❌ lock-in, não open source |
| WebUSB/Web Serial | — (browser API) | ❌ Chrome-only, PWA/iOS não suporta |
| Browser print (window.print) | — | ❌ sem controle ESC/POS, UX ruim |
| Agente local próprio + escpos | MIT | ✅ escolhido |
| WebSocket | — | ❌ não disponível em Vercel serverless |

## Justificativa

- Vercel serverless não suporta WebSocket persistente → polling HTTPS
- escpos (MIT) é maduro para ESC/POS em Windows (USB/OS printer)
- Agente próprio = sem lock-in, multi-tenant futuro, comercializável
- Pairing seguro (código single-use) em vez de JWT permanente no agente

## Fluxo de autenticação

1. Admin cria Printer (MANAGER+)
2. Admin gera pairing code (expira 10min, single-use)
3. Agente local envia code + deviceId → servidor associa
4. Agente usa `Authorization: Device <deviceId>` (token de dispositivo)
5. Heartbeat mantém status ONLINE

## Fluxo de impressão

1. Pedido confirmado → STAFF cria job (ou futuramente automático)
2. Job QUEUED no Neon
3. Agente faz polling GET /agent/jobs
4. Agente baixa ticket (GET /agent/jobs/:id/ticket)
5. Agente imprime via escpos
6. Agente reporta PRINTED/FAILED
7. FAILED → retry manual (STAFF) ou automático com backoff

## Segurança

- Device token ≠ JWT de usuário (escopo limitado a jobs da própria printer)
- Pairing: código expira, single-use, não concede acesso administrativo
- RBAC: printers MANAGER+, jobs STAFF+
- Nenhum dado financeiro no ticket

## Riscos

- Agente precisa de Node instalado no PC da cozinha (documentado)
- Polling 5-10s (latência aceitável para comanda)
- Multi-instância serverless: risk store in-memory (jobs são no Neon — ok)

## Evolução

1. ✅ Backend completo (models, API, service, testes)
2. ⏳ Print agent CLI (packages/print-agent)
3. ⏳ Admin UI (printers + jobs)
4. ⏳ Kitchen integration (status de impressão)
5. ⏳ Impressão automática no order.created
