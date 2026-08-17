import { createContext, useContext } from 'react';

/** Contagem de pedidos pendentes, populada pelo AdminLayout (polling único). */
export const PendingOrdersContext = createContext(0);

export function usePendingOrders(): number {
  return useContext(PendingOrdersContext);
}
