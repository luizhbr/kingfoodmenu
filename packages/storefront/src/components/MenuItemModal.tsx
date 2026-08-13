import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext.js';
import {
  Badge,
  Button,
  Modal,
  Price,
  QuantitySelector,
  Skeleton,
  Input,
  IconButton,
} from '@kitchenasty/shared-ui';
import { FALLBACK_ITEMS } from '../data/menuFallback.js';
import ProductImageCarousel from './ProductImageCarousel.js';
import { resolveGallery } from '../lib/gallery.js';

interface OptionValue {
  id: string;
  name: string;
  priceModifier: number;
  isDefault: boolean;
  sortOrder: number;
}

interface MenuOption {
  id: string;
  name: string;
  displayType: 'SELECT' | 'RADIO' | 'CHECKBOX' | 'QUANTITY';
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  values: OptionValue[];
}

interface Allergen {
  allergen: { id: string; name: string };
}

interface MenuItemDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image: string | null;
  images?: { url: string; sortOrder: number; isPrimary: boolean }[] | null;
  isActive: boolean;
  category: { id: string; name: string };
  options: MenuOption[];
  allergens: Allergen[];
}

interface Props {
  itemId: string;
  onClose: () => void;
}

export default function MenuItemModal({ itemId, onClose }: Props) {
  const { t } = useTranslation();
  const { addItem } = useCart();
  const [item, setItem] = useState<MenuItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [comment, setComment] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setAdded(false);
    setQuantity(1);
    setComment('');
    const apiBase = import.meta.env.VITE_API_URL || '';
    fetch(`${apiBase}/api/menu/items/${itemId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load item');
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('API unavailable');
        return res.json();
      })
      .then((json) => {
        setItem(json.data);
        const defaults: Record<string, string[]> = {};
        for (const opt of json.data.options) {
          const defaultVals = opt.values.filter((v: OptionValue) => v.isDefault).map((v: OptionValue) => v.id);
          if (defaultVals.length > 0) {
            defaults[opt.id] = defaultVals;
          } else if (opt.isRequired && (opt.displayType === 'SELECT' || opt.displayType === 'RADIO')) {
            defaults[opt.id] = [opt.values[0]?.id].filter(Boolean);
          }
        }
        setSelections(defaults);
      })
      .catch(() => {
        const fallbackItem = FALLBACK_ITEMS.find((i: { id: string }) => i.id === itemId);
        if (fallbackItem) {
          setItem({
            ...fallbackItem,
            description: fallbackItem.description || null,
            options: [],
            allergens: [],
            isActive: true,
            slug: fallbackItem.id,
          });
        } else {
          setError(t('menu.itemNotFound', 'Produto não encontrado'));
        }
      })
      .finally(() => setLoading(false));
  }, [itemId, t]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function handleSelect(optionId: string, valueId: string, displayType: string, maxSelect: number) {
    setSelections((prev) => {
      const current = prev[optionId] || [];
      if (displayType === 'SELECT' || displayType === 'RADIO') {
        return { ...prev, [optionId]: [valueId] };
      }
      if (current.includes(valueId)) {
        return { ...prev, [optionId]: current.filter((id) => id !== valueId) };
      }
      if (current.length >= maxSelect) return prev;
      return { ...prev, [optionId]: [...current, valueId] };
    });
  }

  const total = useMemo(() => {
    if (!item) return 0;
    let sum = item.price;
    for (const opt of item.options) {
      const selected = selections[opt.id] || [];
      for (const val of opt.values) {
        if (selected.includes(val.id)) sum += val.priceModifier;
      }
    }
    return sum * quantity;
  }, [item, selections, quantity]);

  const canAdd = useMemo(() => {
    if (!item || !item.isActive) return false;
    for (const opt of item.options) {
      if (opt.isRequired) {
        const selected = selections[opt.id] || [];
        if (selected.length === 0) return false;
      }
    }
    return true;
  }, [item, selections]);

  function handleAddToCart() {
    if (!item || !canAdd) return;
    const cartOptions = item.options.flatMap((opt) => {
      const selected = selections[opt.id] || [];
      return opt.values
        .filter((v) => selected.includes(v.id))
        .map((v) => ({
          optionId: opt.id,
          optionName: opt.name,
          valueId: v.id,
          valueName: v.name,
          priceModifier: v.priceModifier,
        }));
    });
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
      options: cartOptions,
      comment,
    });
    onClose();
  }

  return (
    <Modal open={true} onClose={onClose} title={item?.name || t('menu.product', 'Produto')} size="lg">
      {loading && (
        <div className="space-y-4 p-1">
          <Skeleton className="aspect-[16/10] rounded-kf-lg" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 rounded-kf-lg" />
          <Skeleton className="h-12 rounded-kf-lg" />
        </div>
      )}

      {error && (
        <div className="text-center py-6">
          <p className="text-kf-danger font-medium">{error}</p>
          <Button variant="outline" onClick={onClose} className="mt-4">
            {t('common.close', 'Fechar')}
          </Button>
        </div>
      )}

      {!loading && item && (
        <>
          <div className="max-h-[60vh] overflow-y-auto pr-1 pb-4 space-y-4">
            <div className="rounded-kf-lg overflow-hidden bg-kf-surface-muted">
              <ProductImageCarousel images={resolveGallery(item.image, item.images)} alt={item.name} />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-kf-foreground">{item.name}</h2>
                <p className="text-sm text-kf-muted">{item.category.name}</p>
              </div>
              <Price value={item.price} size="lg" />
            </div>

            {item.description && <p className="text-sm text-kf-muted">{item.description}</p>}

            {item.allergens.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.allergens.map((a) => (
                  <Badge key={a.allergen.id} variant="warning">
                    {a.allergen.name}
                  </Badge>
                ))}
              </div>
            )}

            {item.options.length > 0 && (
              <div className="space-y-5 rounded-kf-lg border border-kf-border bg-kf-surface p-4">
                {item.options.map((opt) => (
                  <div key={opt.id}>
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-kf-foreground">{opt.name}</h3>
                      {opt.isRequired && <Badge variant="danger">{t('common.required', 'Obrigatório')}</Badge>}
                      {opt.maxSelect > 1 && !opt.isRequired && (
                        <span className="text-xs text-kf-muted">{t('menu.maxSelect', 'máx {{max}}').replace('{{max}}', String(opt.maxSelect))}</span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {opt.values.map((val) => {
                        const selected = (selections[opt.id] || []).includes(val.id);
                        const isRadio = opt.displayType === 'SELECT' || opt.displayType === 'RADIO';
                        return (
                          <label
                            key={val.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-kf-md border p-3 transition-colors ${
                              selected
                                ? 'border-kf-primary bg-kf-primary/10'
                                : 'border-kf-border hover:border-kf-primary/50'
                            }`}
                          >
                            <input
                              type={isRadio ? 'radio' : 'checkbox'}
                              name={`option-${opt.id}`}
                              checked={selected}
                              onChange={() => handleSelect(opt.id, val.id, opt.displayType, opt.maxSelect)}
                              className="h-4 w-4 accent-kf-primary"
                            />
                            <span className="flex-1 text-sm text-kf-foreground">{val.name}</span>
                            {val.priceModifier !== 0 && (
                              <span className="text-xs text-kf-muted">
                                +<Price value={val.priceModifier} size="sm" />
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Input
              label={t('menu.comment', 'Observação (opcional)')}
              placeholder={t('menu.commentPlaceholder', 'Ex: sem cebola, bem passado...')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="sticky bottom-0 mt-4 -mx-5 -mb-5 border-t border-kf-border bg-kf-surface p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
            <div className="mb-3 flex items-center justify-between">
              <QuantitySelector value={quantity} onChange={setQuantity} min={1} max={99} />
              <div className="text-right">
                <p className="text-xs text-kf-muted">{t('cart.subtotal', 'Subtotal')}</p>
                <Price value={total} size="lg" />
              </div>
            </div>
            <Button onClick={handleAddToCart} disabled={!canAdd} className="w-full min-h-[52px]">
              {added ? (
                t('menu.added', 'Adicionado ✓')
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {t('menu.addToCart', 'Adicionar ao carrinho')}
                </span>
              )}
            </Button>
            {!canAdd && item.options.some((o) => o.isRequired) && (
              <p className="mt-2 text-center text-xs text-kf-danger">
                {t('menu.selectRequired', 'Selecione as opções obrigatórias para continuar')}
              </p>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
