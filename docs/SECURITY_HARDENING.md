# Security Hardening — King Food Foundation

> **Status:** P13 = PASS (2026-08-12)

## Auditoria forense (DISK + HEAD + PRODUÇÃO)

### ✅ Verificado SEGURO

| Área | Status |
|------|--------|
| CORS | ✅ restrito (CORS_ORIGINS, credentials) |
| Rate limiting | ✅ 3 níveis (api 300/min, auth 100/15min, strict 10/min) |
| Helmet + CSP | ✅ contentSecurityPolicy configurado |
| CSRF | ✅ token cookie + header, verificação dupla |
| JWT | ✅ secret real em produção (66 chars), expiração 7d |
| Preço server-side | ✅ menuItemMap do banco, cliente nunca envia preço |
| Valores financeiros | ✅ nenhum subtotal/total/discount aceito do cliente |
| Settings públicos | ✅ toPublicSettings filtra (só branding) |
| Webhooks | ✅ assinatura verificada (payment + automation) |
| Upload | ✅ filtro MIME (jpeg/png/webp/gif) + 5MB + UUID filename |
| Secrets no código | ✅ nenhum (23 hits = placeholders/docs) |
| .env | ✅ gitignored |

### 🔧 Corrigido (P13)

| Bug | Severidade | Fix |
|-----|-----------|-----|
| `.claude/settings.local.json` versionado com DATABASE_URL local | P1 | `git rm --cached` + gitignore |
| `JWT_SECRET` fallback `'dev-secret-change-me'` (produção sem env → tokens forjáveis) | P1 | fail-fast: throw em produção se ausente; fallback só dev/test |
| 4 `catch {}` silenciosos (appEvents) | P2 | log de erro adicionado |

### ✅ Testado em produção

- P13-PROD-001 storefront: 200
- P13-PROD-002 admin login: 200 (JWT funciona)
- P13-PROD-003 reports autenticado: 200
- P13-PROD-004 **token forjado com fallback dev → 401** (produção usa secret real)
- P13-PROD-005 .claude untracked confirmado

## Não encontrado (auditoria)

- TODO/FIXME/HACK: nenhum
- Rotas sem auth: apenas públicas legítimas (menu, locations, legal, login/register, webhooks com assinatura)
- Valores financeiros do cliente: nenhum
- Secrets hardcoded: nenhum real
