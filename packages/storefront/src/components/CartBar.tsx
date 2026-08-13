import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext.js';

export default function CartBar() {
  const { t } = useTranslation();
  const { itemCount, subtotal, setIsOpen } = useCart();
  if (itemCount === 0) return null;

  return (
    <div className="fixed inset-x-4 bottom-[calc(var(--kf-nav-h)+0.75rem)] z-kf-cart-bar" data-testid="cart-bar">
      <Link
        to="/checkout"
        className="flex items-center justify-between rounded-kf-xl bg-kf-primary px-4 py-3.5 text-kf-primary-fg shadow-kf-card transition-transform active:scale-[0.99]"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(true);
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🛒</span>
          <span className="text-sm font-semibold">
            {itemCount} {itemCount === 1 ? t('cart.itemSingular', 'item') : t('cart.items', 'itens')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold">${subtotal.toFixed(2)}</span>
          <span className="text-sm font-semibold">{t('cart.open', 'Ver carrinho')}</span>
        </div>
      </Link>
    </div>
  );
}
