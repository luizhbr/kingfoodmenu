# Coupons — King Food Foundation

> **Status:** P5 = PASS (2026-08-12)

## Tipos

| Tipo | Exemplo | Cálculo |
|------|---------|---------|
| PERCENTAGE | SAVE10 = 10% | subtotal × (value/100), cap maxDiscount |
| FIXED | SAVE5 = $5 | min(value, subtotal) |
| FREE_DELIVERY | FRETEGRATIS | deliveryFee = 0 (não toca subtotal) |

## Regras de validação (server-side)

1. code existe (normalizado: trim + uppercase)
2. isActive = true
3. startsAt <= now <= expiresAt
4. usageCount < usageLimit
5. perCustomerLimit (clientes autenticados)
6. subtotal >= minOrder (subtotal SERVER-side)
7. desconto nunca negativo, nunca > subtotal
8. percentage cap 100%

## Arquitetura

```
CLIENT → couponCode
  ↓
SERVER (coupon-service.ts)
  ↓
buscar cupom → validar regras → calcular desconto
  ↓
persistir pedido (couponId, discount)
  ↓
recordCouponUsage (ledger + usageCount atômico)
```

## Ledger (CouponUsage)

- Tabela `coupon_usages`: couponId, orderId (unique), customerId, code, discountAmount
- Constraint `@@unique([couponId, orderId])` — idempotente
- `recordCouponUsage` verifica se já existe para o orderId antes de gravar
- usageCount incrementado na MESMA transação

## Idempotência

- idempotencyKey do pedido preservada
- Retry com mesma chave → mesmo pedido (duplicate: true) → sem novo uso do cupom
- Verificado: 2 POSTs mesma chave = 1 pedido, 1 uso

## Segurança

- Cliente NUNCA envia discountAmount/finalTotal — servidor calcula tudo
- `validateCoupon` (preview) marca `preview: true` — checkout revalida
- RBAC: criar/editar/desativar = STAFF; delete = SUPER_ADMIN/MANAGER
- Customer → 403; Anonymous → 401

## Stacking

- **1 cupom por pedido** (por design)

## Coupon + Loyalty

- Ambos permitidos no mesmo pedido
- total = max(0, subtotal + tax + delivery - loyaltyDiscount - couponDiscount)
- Verificado: combinação sem total negativo

## Cancelamento

- Pedido CANCELLED não cria novo desconto
- Uso do cupom permanece auditável (não reutilizado automaticamente)

## Testes

- Unit: 22 testes (coupon-service.test.ts) — 51/51 total
- Produção: P5-PROD-001..016 todos PASS
