# Cashback — King Food Foundation

> **Status:** P6 = PASS (2026-08-12)

## Arquitetura

```
CashbackWallet (saldo legível)
  └── balance (NUNCA negativo)
CashbackTransaction (ledger imutável — fonte de auditoria)
  └── CREDIT | DEBIT | REVERSAL | ADJUSTMENT
```

## Regra default

- **5%** de cashback sobre base elegível
- Configurável via `SiteSettings.generalSettings.cashbackPercent` (0-1)
- Fallback seguro: 5%

## Base de cálculo

```
eligibleBase = subtotal - couponDiscount
cashback = eligibleBase × rate
```

- **NÃO** inclui delivery
- **NÃO** inclui tax
- Tudo server-side (nunca confia em valores do frontend)

## Elegibilidade

- CREDIT somente quando o pedido atinge **DELIVERED** ou **PICKED_UP**
- Pedido CANCELLED → REVERSAL do cashback creditado
- Cashback nunca utilizável no próprio pedido que o gerou

## Idempotência

- `@@unique([type, referenceId])` no ledger
- CREDIT: referenceId = orderId (1 crédito por pedido)
- DEBIT: referenceId = `ck-{idempotencyKey}` (1 débito por checkout)
- REVERSAL: referenceId = orderId
- Retry de checkout → mesmo idempotencyKey → sem duplicação

## Concurrency

- DEBIT usa `SELECT ... FOR UPDATE` na wallet dentro de transação
- 2 requests simultâneos com mesmo saldo → somente 1 vence, saldo nunca negativo
- Verificado: 2x $0.70 simultâneo → 1 × 201, 1 × 400, saldo 0

## Rollback

- Se o create do pedido falhar após o DEBIT pré-pago → `reverseDebit` restaura
- Ledger imutável: REVERSAL registrada, nunca apaga a original

## APIs

| Method | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/cashback/balance | customer | Saldo (via JWT) |
| GET | /api/cashback/transactions | customer | Histórico (via JWT) |
| GET | /api/cashback/customers/:id | MANAGER+ | Wallet de um cliente |
| POST | /api/cashback/customers/:id/adjust | MANAGER+ | Ajuste manual (com motivo) |

## Segurança

- Identidade sempre via JWT — nunca customerId do cliente
- Customer → adjust: 403
- Anonymous → balance: 401
- Saldo nunca negativo (transação atômica)
- Ajuste exige reason (rastreabilidade)

## Combinações

- **Coupon + Cashback:** coupon primeiro, base elegível = subtotal - desconto
- **Loyalty + Coupon + Cashback:** todos permitidos, total = max(0, ...)
- Ordem: subtotal → coupon → base → cashback usado → tax/delivery → total

## Testes

- Unit: 20 testes novos (70/70 total)
- Produção: P6-PROD-001..018 todos PASS
