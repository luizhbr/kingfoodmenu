import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext.js';

/**
 * CartBar — barra fixa de carrinho no rodapé do cardápio (UX-V6).
 * Padrão kingfood.online: sempre visível durante a navegação (não modal),
 * mostra contagem + total, e "Ver pedido" abre o drawer de revisão.
 * - Oculta quando o carrinho está vazio.
 * - Não bloqueia o cardápio — o cliente continua comprando com a barra à vista.
 * - z-[55]: acima da bottom nav (50), atrás do drawer (60) e do modal (70).
 */
export default function CartBar() {
  const { t } = useTranslation();
  const { itemCount, subtotal, setIsOpen } = useCart();
  if (itemCount === 0) return null;

  const label = `${itemCount} ${itemCount === 1 ? t('cart.productSingular', 'produto') : t('cart.products', 'produtos')}`;

  return (
    <div
      data-testid="cart-bar"
      className="fixed inset-x-4 bottom-[calc(var(--kf-nav-h)+0.75rem)] z-[55] md:inset-x-auto md:right-6 md:bottom-6 md:w-[340px] pointer-events-none"
    >
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t('cart.viewOrder', 'Ver pedido')}
        className="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-2xl bg-kf-ink px-4 py-3 text-kf-bg shadow-kf-card transition-transform active:scale-[0.98] hover:scale-[1.01]"
      >
        <span className="flex items-center gap-2 text-sm font-bold">
          <span aria-hidden className="text-base">🛒</span>
          {label}
        </span>
        <span className="flex items-center gap-1 text-sm font-extrabold">
          <span data-testid="cart-bar-total" className="tabular-nums">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(subtotal)}
          </span>
          <span aria-hidden className="ml-1">→</span>
        </span>
      </button>
    </div>
  );
}
