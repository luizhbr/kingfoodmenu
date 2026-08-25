# ADMIN AUDIT REPORT — King Food Admin (2026-08-24)

Auditoria FASE 1 (inventário) + FASE 2 (por menu) + FASE 3 (priorização).
Base: código real (packages/admin + packages/server) — sem deploy, sem alteração de código.

## 1) INVENTÁRIO — ROTAS ADMIN (55 páginas + 32 grupos de API)

Legenda: 🟢 funcionando | 🟡 parcial | 🔴 quebrado | ⚪ incompleto | 🔵 UI/mock

### Navegação principal (4 hubs + bottom nav mobile)
| MENU | ROTA | FUNCIONALIDADE | STATUS | PROBLEMAS | PRIORIDADE |
|---|---|---|---|---|---|
| Loja | /loja | Hub da loja | 🟢 | — | — |
| Gestão | /manage | Hub gestão | 🟢 | — | — |
| Vendas | /vender | Hub vendas/impressão | 🟢 | — | — |
| Pedidos | /pedidos | Hub pedidos/cozinha | 🟢 | — | — |
| MobileBottomNav | (4 hubs) | Navegação inferior | 🟢 | /settings/whatsapp cai em área /loja (WhatsApp é operação → deveria ser Vendas) | P3 |

### Loja (menu/catálogo/design)
| Menu | Rota | Status | Problemas | P |
|---|---|---|---|---|
| Menu (cardápio) | /menu | 🟢 | /menu/items redireciona p/ /menu (rota morta) | P3 |
| Categorias | /menu/categories | 🟢 | — |
| Itens | /menu/items/:id | 🟢 | perms menu.create/edit | — |
| Adicionais | /menu/option-groups | 🟢 | perms menu.edit | — |
| Mesas | /locations/:id/tables | 🟢 | — |
| Localizações | /locations | 🟢 | — |
| Zonas entrega | /locations/:id/delivery-zones | 🟢 | fonte compartilhada com storefront (geo.ts) | — |
| Design (7 sub) | /design/* | 🟢 | builder/landing/branding/theme/templates/gallery/media | — |

### Vendas
| Menu | Status | Problemas | P |
|---|---|---|---|
| Pedidos /orders, /orders/:id | 🟢 | OrderList + Detail + OrderActionModal | — |
| Cozinha | /kitchen | 🟢 | KitchenDisplay + PendingOrdersContext (polling) | — |
| Impressão | /settings/print*, printers | 🟢 | print service | — |
| Pagamentos | /settings/payment | 🟢 | SUPER_ADMIN only | — |

### Gestão
| Menu | Status | Problemas | P |
|---|---|---|---|
| Relatórios /reports | 🟢 | MANAGER+ | — |
| Reviews /reviews | 🟢 | perms reviews.view | — |
| Cupons /coupons | 🟢 | — |
| Fidelidade /loyalty | 🟢 | perms loyalty.view | — |
| Automação /automation | 🟢 | perms automation.view | — |
| Staff | 🟢 | SUPER_ADMIN | — |
| Legal/cookies/consent | 🟢 | — |
| Auditoria /developer/audit-log | 🟢 | SUPER_ADMIN | — |

### Central WhatsApp (/settings/whatsapp) — PRIORIDADE ALTA
| Item | Status | Problemas | P |
|---|---|---|---|
| Status web (QR) | 🔴 | ERRO ENOENT /var/task/.whatsapp-session — mkdir no filesystem serverless | P0 |
| Erro exibido | 🔴 | Erro técnico cru (`Erro: {webStatus.lastError}`) direto na tela | P0 |
| Estados web | 🟡 | 5 estados existem, mas ERROR não oferece ação (botão só em DISCONNECTED) | P1 |
| Botões | 🟡 | Conectar/QR/Desconectar/Logout OK; falta "Tentar novamente" em ERROR; sem última conexão/número | P2 |
| Meta Cloud API | 🟢 | webhook + testConnection + n8n | — |
| KingAgent/bot | 🟢 | kill switch WHATSAPP_AUTOMATION_ENABLED=false (off por padrão) ✓ | — |
| Conversas/handoff | 🟢 | /conversations + handoff | — |

### Configurações
Todas gated: mail/payment/advanced = SUPER_ADMIN; demais MANAGER+. Secrets nunca expostos (hasAccessToken bool) ✓

### Outros
| Menu | Status | Problemas | P |
|---|---|---|---|
| Dashboard / | 🟢 | fetch REAL /api/dashboard (12 métricas) — não é mock ✓ | — |
| Login / AcceptInvite | 🟢 | AuthContext + RequireRole/Permission | — |
| Reservas | ⚪ | ReservationList/Detail/Trends EXISTEM mas NÃO estão no main.tsx → páginas órfãs inacessíveis | P2 |
| DeveloperMetrics | 🟢 | — |

## FASE 4 — DIAGNÓSTICO ENOENT (10 perguntas)
1. Onde: web.ts L131 (connect) + L304 (writeSnapshot) → mkdirSync(getSessionDir()).
2. Por que /var/task: cwd do Lambda da Vercel = /var/task; WHATSAPP_SESSION_DIR NÃO setado → cwd/.whatsapp-session.
3. Runtime: Node.js Vercel Function (AWS Lambda).
4. Filesystem persistente? NÃO. /var/task é read-only → mkdir falha. /tmp é gravável mas EFÊMERO.
5. Vercel executa? SIM — erro do screenshot é produção.
6. Sessão sobrevive? NÃO — nada persiste em serverless.
7. Múltiplas instâncias? NÃO suportado (creds divergem → loop de QR).
8. Baileys vivo? NÃO — processo morre no fim da invocação (stateless).
9. Auth files: auth.enc.json AES-256-GCM + WHATSAPP_SESSION_ENCRYPTION_KEY (design bom, destino impossível).
10. Risco de perda: 100% hoje (nem conecta).

CONCLUSÃO: arquitetura atual (Baileys inline em serverless + filesystem) é INCOMPATÍVEL.
RECOMENDAÇÃO (não implementada):
  FRONTEND(admin) → API serverless stateless → SERVIÇO WA long-running (worker/VPS) → Baileys → persistência criptografada (Postgres/Blob).
  QR efêmero via /tmp só demo. Painel NÃO mantém processo.
  (Fix intermediário possível pós-autorização: /tmp + aviso "demo", ou feature-flag.)

## FASE 3 — PRIORIZAÇÃO
P0 | WhatsApp ENOENT (serverless) | Arquitetura (decisão do usuário)
P0 | Erro técnico cru na Central | Mensagem operacional + [detalhes] + [Tentar novamente]
P1 | Estado ERROR sem botão de retry | Botão Reconectar visível em ERROR
P1 | Sessão nunca persiste | Resolvido pela arquitetura (fase 2)
P2 | Reservas órfãs | Habilitar menu ou remover
P2 | Central WhatsApp na área errada (bottomNav) | Mover p/ Vendas
P2 | Sem última conexão/número conectado | Adicionar info
P3 | /menu/items rota morta | Remover/rotear
P4 | Estética | FASE 17 — só pós funcional

## TOP 10 PROBLEMAS
1. P0 WhatsApp não conecta (ENOENT serverless)
2. P0 Erro técnico cru exposto
3. P1 ERROR sem ação (retry)
4. P1 Sessão nunca persiste
5. P2 Reservas órfãs
6. P2 WhatsApp na área errada
7. P2 Sem info de conexão
8. P3 /menu/items morta
9. P3 Responsividade mobile a validar em execução
10. P4 Padronização visual

## RISCOS
- Segurança: OK (sessão nunca exposta; perms+CSRF+CSP nonce+sanitizer). Ponto baixo: whatsapp.controller devolve String(err) (vaza path interno).
- Produção: não alterar sem autorização.
- WhatsApp ban: mínimo (bot off, sem disparo em massa, kill switch) ✓
- Dados: sessão criptografada seria perdida — arquitetura resolve.

---
AUDITORIA COMPLETA — aguardando autorização para FASE 2 (implementação por prioridade).
