import { useEffect, useCallback, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext.js';
import {
  Button,
  CartItem,
  Drawer,
  EmptyState,
  Price,
} from '@kitchenasty/shared-ui';
import {
  getUpsellRecommendations,
  getUpsellTitle,
  getUpsellSubtitle,
  groupOfCategory,
  type UpsellMenuItem,
} from '../lib/upsell.js';

export default function CartDrawer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, clear, subtotal, addItem } = useCart();
  const [removedItem, setRemovedItem] = useState<{ id: string; snapshot: typeof items } | null>(null);
  const [menuItems, setMenuItems] = useState<UpsellMenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

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

  // Busca o cardápio UMA vez (com categoria embutida). O cálculo de
  // recomendação é local (lib/upsell.ts) — sem requisição por mudança.
  useEffect(() => {
    if (!isOpen || menuItems.length > 0) return;
    setMenuLoading(true);
    fetch('/api/menu/items?limit=200')
      .then((res) => res.json())
      .then((data) => {
        const list = (data.data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          image: p.image ?? null,
          isActive: p.isActive,
          categoryId: p.categoryId ?? null,
          categoryName: p.category?.name ?? null,
        }));
        setMenuItems(list);
      })
      .catch(() => setMenuItems([]))
      .finally(() => setMenuLoading(false));
  }, [isOpen, menuItems.length]);

  // Recomendações recalculadas localmente a cada mudança do carrinho
  const recommendations = useMemo(() => {
    const cartForUpsell = items.map((i) => ({
      menuItemId: i.menuItemId,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      categoryName: menuItems.find((m) => m.id === i.menuItemId)?.categoryName ?? null,
    }));
    return getUpsellRecommendations(cartForUpsell, menuItems);
  }, [items, menuItems]);

  const cartGroups = useMemo(
    () => Array.from(new Set(items.map((i) => groupOfCategory(menuItems.find((m) => m.id === i.menuItemId)?.categoryName ?? null)))),
    [items, menuItems]
  );

  function handleRemove(id: string) {
    if (removedItem) removeItem(removedItem.id);
    setRemovedItem({ id, snapshot: items });
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

  function handleAddUpsell(item: UpsellMenuItem) {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      options: [],
      image: item.image ?? undefined,
    });
    setAddedIds((p) => ({ ...p, [item.id]: true }));
    setTimeout(() => setAddedIds((p) => ({ ...p, [item.id]: false })), 1500);
  }

  return (
    <Drawer open={isOpen} onClose={() => setIsOpen(false)} title={t('cart.title', 'Seu carrinho')} position="bottom" headerClassName="px-4 py-2.5">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 pb-[calc(11rem+env(safe-area-inset-bottom))]">
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
                      image={item.image}
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

              {/* Upsell dinâmico e contextual */}
              {recommendations.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-sm font-bold text-kf-foreground">{getUpsellTitle(cartGroups)}</h3>
                  <p className="text-xs text-kf-muted mb-3">{getUpsellSubtitle(cartGroups)}</p>
                  {menuLoading ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-28 rounded-kf-lg bg-kf-surface-muted animate-pulse" />
                      <div className="h-28 rounded-kf-lg bg-kf-surface-muted animate-pulse" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {recommendations.map((item) => (
                        <div key={item.id} className="flex flex-col rounded-kf-lg border border-kf-border bg-kf-surface p-2.5">
                          <div className="flex h-16 w-full items-center justify-center overflow-hidden rounded-kf-md bg-kf-surface-muted mb-2">
                            {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <span className="text-2xl">🥣</span>}
                          </div>
                          <p className="text-sm font-semibold text-kf-foreground truncate">{item.name}</p>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <Price value={item.price} size="sm" />
                            <Button type="button" size="sm" onClick={() => handleAddUpsell(item)} disabled={addedIds[item.id]} className="shrink-0">
                              {addedIds[item.id] ? '✓' : t('common.add', 'Adicionar')}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
            <Button
              variant="outline"
              fullWidth
              className="mt-3 min-h-[52px]"
              onClick={() => { setIsOpen(false); navigate('/menu'); }}
            >
              {t('cart.continueShopping', 'Continuar comprando')}
            </Button>
            <Button
              variant="outline"
              fullWidth
              className="mt-2 min-h-[52px] text-kf-danger hover:text-kf-danger-hover"
              onClick={clear}
            >
              {t('cart.clear', 'Esvaziar carrinho')}
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
