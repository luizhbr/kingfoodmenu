import { useEffect, useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext.js';
import {
  Button,
  CartItem,
  Drawer,
  EmptyState,
  Price,
  IconButton,
} from '@kitchenasty/shared-ui';

export default function CartDrawer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, clear, subtotal } = useCart();
  const [removedItem, setRemovedItem] = useState<{ id: string; snapshot: typeof items } | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    },
    [setIsOpen]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  function handleRemove(id: string) {
    if (removedItem) removeItem(removedItem.id);
    setRemovedItem({ id, snapshot: items });
    // Auto-dismiss undo after 4s
    setTimeout(() => {
      setRemovedItem((current) => {
        if (current?.id === id) {
          removeItem(id);
          return null;
        }
        return current;
      });
    }, 4000);
  }

  function handleUndo() {
    if (removedItem) {
      setRemovedItem(null);
    }
  }

  return (
    <Drawer open={isOpen} onClose={() => setIsOpen(false)} title={t('cart.title', 'Seu carrinho')} position="bottom">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-5 pb-[calc(11rem+env(safe-area-inset-bottom))]">
          {items.length === 0 ? (
            <EmptyState
              icon="🛒"
              title={t('cart.empty', 'Seu carrinho está vazio')}
              description={t('cart.emptyDesc', 'Adicione algo delicioso para começar.')}
              action={{ label: t('cart.browseMenu', 'Ver cardápio'), onClick: () => { setIsOpen(false); navigate('/menu'); } }}
            />
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const isPendingRemoval = removedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`transition-all duration-300 ${isPendingRemoval ? 'opacity-50 scale-95' : ''}`}
                  >
                    <CartItem
                      name={item.name}
                      quantity={item.quantity}
                      unitPrice={item.price}
                      options={item.options.map((o) => o.valueName)}
                      image={undefined}
                      onQuantityChange={(qty) => updateQuantity(item.id, qty)}
                      onRemove={() => handleRemove(item.id)}
                    />
                  </div>
                );
              })}

              {removedItem && (
                <div className="flex items-center justify-between rounded-kf-lg bg-kf-ink/5 px-3 py-2">
                  <span className="text-sm text-kf-foreground">{t('cart.removed', 'Produto removido')}</span>
                  <Button variant="ghost" size="sm" onClick={handleUndo}>{t('cart.undo', 'Desfazer')}</Button>
                </div>
              )}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="absolute inset-x-0 bottom-2 border-t border-kf-border bg-kf-surface p-5 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] rounded-t-kf-lg">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-kf-muted">
                {(() => { const n = items.reduce((sum, i) => sum + i.quantity, 0); return `${t('cart.subtotal', 'Subtotal')} · ${n} ${n === 1 ? t('cart.itemSingular', 'item') : t('cart.items', 'itens')}`; })()}
              </span>
              <Price value={subtotal} size="lg" />
            </div>
            <Link
              to="/checkout"
              onClick={() => setIsOpen(false)}
            >
              <Button className="w-full min-h-[52px]">{t('cart.checkout', 'Continuar para o checkout')}</Button>
            </Link>
            <button
              onClick={clear}
              className="mt-3 block w-full text-center text-sm text-kf-danger hover:text-kf-danger-hover"
            >
              {t('cart.clear', 'Esvaziar carrinho')}
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
