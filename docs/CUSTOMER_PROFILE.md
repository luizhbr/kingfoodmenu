# Customer Profile — King Food Foundation

> **Status:** P3 = PASS (2026-08-12)

## Arquitetura

```
ANONYMOUS ──► checkout guest (sem login, sem customerId)
CUSTOMER ──► login/register ──► JWT ──► /api/customer/*
```

## Endpoints

| Method | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/customer/profile | customer | Perfil do próprio cliente |
| PATCH | /api/customer/profile | customer | Atualizar nome/telefone |
| GET | /api/customer/orders | customer | Histórico de pedidos (próprios) |

## Segurança

- **Identidade vem do JWT** (`req.user.id`), NUNCA de customerId do cliente
- IDOR-safe: `?customerId=OUTRO` é ignorado — sempre retorna os próprios
- Staff token → 401 (staff não é customer)
- Anonymous → 401
- Order history NÃO expõe custos/margem/dados internos

## Relações

- `Customer` ↔ `Order` (1:N) — customerId persistido no checkout autenticado
- `Customer` ↔ `Address`, `Reservation`, `Review`, `LoyaltyTransaction`, `Attribution`, `TrackingEvent`

## Checkout

- **Guest checkout preservado** (sem login obrigatório)
- Autenticado: customerId vem do token e é persistido
- Verificado: 201 + customerId no Supabase

## Testes (produção)

| Teste | Resultado |
|-------|-----------|
| P3-PROD-001 anonymous → profile | ✅ 401 |
| P3-PROD-002 customer → profile | ✅ 200 |
| P3-PROD-003 order history | ✅ 200 |
| P3-PROD-004 IDOR attempt | ✅ isolado |
| P3-PROD-005 anonymous checkout | ✅ 201 |
| P3-PROD-006 authenticated checkout | ✅ 201 + customerId |
| P3-PROD-007 Supabase relation | ✅ customer↔order |

## Base para futuras fases

- `loyaltyPoints` já existe no Customer (P4)
- `Address[]` já existe (endereços)
- `LoyaltyTransaction[]` já existe (ledger P4)
- `Referral[]` já existe (indicações)
- `Attribution` já existe (P12)
