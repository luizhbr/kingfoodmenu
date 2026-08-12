[[KING_FOOD_MASTER_INDEX]]

# Known Issues

## BLOCKED

- **Google Maps** — sem API key (geo.ts = ray-casting local apenas)

## CONFIGURATION PENDING

- **CAPTCHA em produção** — infra implementada/testada; `CAPTCHA_ENABLED=false`
  até operador prover chaves Cloudflare Turnstile
- **Risk store in-memory** — por instância (Vercel serverless); Redis futuro

## LIMITAÇÕES

- **Profit/CMV** — NÃO implementado (sem CMV confiável)
- **Push notifications** — infra não existe (push-token controller existe,
  envio não)
- **Excel Orders** — limitado a 2000 registros por export
- **3 rotas órfãs** — ver docs/ORPHAN_ROUTES.md
- **9 models sem uso** — ver docs/ORPHAN_ROUTES.md

## FUTURE

- **KING PRINT** — impressão térmica própria (registrado, não implementado)
- **Redis risk store** — ambiente distribuído
- **UX Final** — após backend consolidado
