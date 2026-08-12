[[00 - Home]]

# Security Hardening

## P13 — Security Hardening (PASS 2026-08-12)

- **JWT_SECRET fail-fast** — produção sem secret → crash (nunca fallback forjável)
- **.claude/settings.local.json untracked** — credencial local removida do repo
- **catch {} silenciosos** → logs
- **Verificado:** CORS, rate-limit, helmet, CSRF, preço server-side,
  webhooks assinados, upload filtrado, sem secrets no código
- **Token forjado → 401 em produção** (prova do secret real)

Ver [[00 - Home]].
