[[00 - Home]]

# Security Adaptive CAPTCHA

## P13.6 — Adaptive CAPTCHA (PASS 2026-08-12)

- **Provider:** Cloudflare Turnstile (managed, sem cookies/tracking)
- **Adaptativo:** nível 0 normal → 3 falhas CAPTCHA → 10 falhas lockout
- **Fail-closed:** provider down → login rejeitado (nunca libera)
- **Server-side:** siteverify — `captchaPassed=true` do cliente é ignorado
- **Inativo em produção** até operador prover chaves (zero impacto)
- **17 testes unit** + 9 produção

Ver [[Security Hardening]], [[Security Brute-Force Test]] e [[00 - Home]].
