import { useCallback, useState } from 'react';

/**
 * useOrderActions — ação única de domínio para REJEITAR/CANCELAR pedidos (ORDER-ACTIONS-V1).
 *
 * O backend NÃO possui status REJECTED nem endpoint DELETE: o mecanismo existente
 * é PATCH /api/orders/:id/status → CANCELLED (staff), com e-mail ao cliente,
 * audit log, reversão de cashback e evento SSE. Rejeição de um pedido PENDING
 * usa exatamente o mesmo mecanismo (estado resultante: CANCELLED).
 *
 * Fonte única de verdade para a lista e o detalhe do pedido.
 */
export type OrderActionState =
  | { status: 'idle' }
  | { status: 'pending'; message: string }
  | { status: 'done'; message: string }
  | { status: 'error'; message: string };

const CANCELLABLE: Record<string, boolean> = {
  PENDING: true,
  CONFIRMED: true,
  PREPARING: true,
  READY: true,
};

/** Status onde a ação NÃO está disponível. */
export function isActionable(status: string): boolean {
  return !!CANCELLABLE[status];
}

/** Rótulo da ação conforme o status (semântica de UX; estado resultante = CANCELLED). */
export function actionLabelFor(status: string): string {
  return status === 'PENDING' ? 'Rejeitar pedido' : 'Cancelar pedido';
}

export function useOrderActions() {
  const token = localStorage.getItem('token') || '';
  const [state, setState] = useState<OrderActionState>({ status: 'idle' });

  /**
   * Rejeita/cancela um pedido. type: 'reject' (PENDING) | 'cancel' (demais).
   * Retorna true em sucesso. Desabilita duplo clique internamente.
   */
  const runOrderAction = useCallback(
    async (orderId: string, type: 'reject' | 'cancel'): Promise<boolean> => {
      if (state.status === 'pending') return false; // impede requisições simultâneas
      setState({
        status: 'pending',
        message: type === 'reject' ? 'Rejeitando pedido...' : 'Cancelando pedido...',
      });
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'CANCELLED' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao atualizar o pedido');
        setState({
          status: 'done',
          message: type === 'reject' ? 'Pedido rejeitado' : 'Pedido cancelado',
        });
        return true;
      } catch (e: any) {
        setState({ status: 'error', message: e.message || 'Erro ao atualizar o pedido' });
        return false;
      }
    },
    [token, state.status]
  );

  const resetState = useCallback(() => setState({ status: 'idle' }), []);

  return { actionState: state, runOrderAction, resetState };
}
