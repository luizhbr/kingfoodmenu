[[00 - Home]]

# Security Brute-Force Test

## P13.5 — Auth Abuse Test (PASS 2026-08-12)

- **Brute-force:** 9× 401 + 429 (Retry-After 38s) ✅
- **Enumeração:** respostas indistinguíveis ✅
- **JWT:** malformado/inválido/alg=none → 401 ✅
- **RBAC:** customer→staff/reports/driver = 403 ✅
- **Spraying:** 1 senha × 3 contas = 401 ✅
- **Pós-bloqueio:** login válido recupera ✅
- **Sem 5xx, sem crash** ✅

Ver [[Security Hardening]] e [[00 - Home]].
