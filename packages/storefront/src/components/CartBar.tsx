import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext.js';

/**
 * CartBar — botão flutuante do carrinho (FAB).
 * Substitui a antiga barra horizontal fixa. Mesma fonte de estado (CartContext),
 * mesma ação ("Ver carrinho" → abre o CartDrawer via setIsOpen), mesma rota.
 *
 * z-[55]: acima da bottom nav (50), atrás do drawer (60) e do modal (70) —
 * prioridade MODAL > CONTROLES > CONTEÚDO > BOTÃO.
 */
export default function CartBar() {
  const { t } = useTranslation();
  const { itemCount, setIsOpen } = useCart();
  if (itemCount === 0) return null;

  return (
    <Link
      to="/checkout"
      data-testid="cart-fab"
      aria-label={t('cart.open', 'Ver carrinho')}
      className="fixed right-5 bottom-[calc(var(--kf-nav-h)+0.75rem)] md:bottom-6 z-[55] flex h-14 w-14 items-center justify-center rounded-full bg-kf-primary text-kf-primary-fg shadow-kf-card transition-transform active:scale-95 hover:scale-105"
      onClick={(e) => {
        e.preventDefault();
        setIsOpen(true);
      }}
    >
      <span className="text-2xl leading-none" aria-hidden>🛒</span>
      {itemCount > 0 && (
        <span
          key={itemCount}
          className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1.5 text-xs font-bold text-white shadow-sm kf-fab-pop"
          aria-label={`${itemCount} ${itemCount === 1 ? t('cart.itemSingular', 'item') : t('cart.items', 'itens')}`}
        >
          {itemCount}
        </span>
      )}
    </Link>
  );
}
