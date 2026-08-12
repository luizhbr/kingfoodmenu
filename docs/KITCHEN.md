# Kitchen Display — King Food Foundation

> **URL:** https://king-food-foundation-ui.vercel.app/admin/kitchen
> **Arquivo:** `packages/admin/src/pages/KitchenDisplay.tsx`

## Mecanismo real: POLLING (não Socket.IO)

```ts
// Serverless polling: Socket.IO is not available on Vercel serverless
// function
useEffect(() => {
  const timer = setInterval(fetchOrders, 15000);
  return () => clearInterval(timer);
}, [fetchOrders]);
```

- **Intervalo:** 15 segundos
- **Pedidos carregados:** PENDING + CONFIRMED (fila da cozinha)
- **Atualização:** `fetchOrders()` re-busca a cada tick
- **Mudança de status:** PATCH `/api/orders/:id/status` + atualização otimista
- **Reconciliação:** o polling reconcilia com o servidor após atualização otimista

## Por que polling?

O runtime serverless do Vercel não mantém conexões persistentes (WebSocket).
Socket.IO foi removido (commit c9f5f63) em favor de polling para permanecer
compatível com o runtime.

## Limitações

- Latência de até 15s entre pedido e exibição
- Sem push em tempo real (diferente de Socket.IO)
- Se o servidor estiver frio (cold start), o primeiro fetch pode demorar
