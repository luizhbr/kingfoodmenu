import { useState } from 'react';

interface Props {
  orderNumber: string;
  type: 'reject' | 'cancel';
  busy: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Modal de confirmação para REJEITAR (PENDING) / CANCELAR (demais status).
 * Exige confirmação explícita, mostra o número do pedido e a consequência.
 * O estado resultante no backend é CANCELLED (mecanismo existente).
 */
export default function OrderActionModal({ orderNumber, type, busy, error, onConfirm, onClose }: Props) {
  const [confirmed, setConfirmed] = useState(false);

  const isReject = type === 'reject';
  const title = isReject ? 'Rejeitar pedido?' : 'Cancelar pedido?';
  const description = isReject
    ? `O pedido ${orderNumber} será marcado como rejeitado e não continuará no fluxo de produção.`
    : `O pedido ${orderNumber} será cancelado e não continuará no fluxo de produção.`;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={busy ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        <h2 className="text-lg font-bold text-gray-900 text-center mb-2">{title}</h2>
        <p className="text-sm text-gray-600 text-center mb-4">{description}</p>

        <label className="flex items-start gap-2 mb-4 px-1">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={busy}
            className="mt-0.5 w-4 h-4 accent-red-600"
          />
          <span className="text-xs text-gray-500">
            Entendo que esta ação é permanente e o pedido sairá do fluxo de produção.
          </span>
        </label>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || !confirmed}
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition inline-flex items-center justify-center gap-2"
          >
            {busy && (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />
            )}
            {busy ? (isReject ? 'Rejeitando...' : 'Cancelando...') : (isReject ? 'Rejeitar pedido' : 'Cancelar pedido')}
          </button>
        </div>
      </div>
    </div>
  );
}
