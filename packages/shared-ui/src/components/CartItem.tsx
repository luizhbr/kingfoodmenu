import React from 'react';
import { cn } from '../utils/cn.js';
import { Price } from './Price.js';
import { QuantitySelector } from './QuantitySelector.js';

export interface CartItemProps {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  options?: string[];
  image?: string;
  onQuantityChange: (qty: number) => void;
  onRemove: () => void;
}

export const CartItem: React.FC<CartItemProps> = ({
  name, quantity, unitPrice, options, image, onQuantityChange, onRemove
}) => (
  <div className="flex gap-3 rounded-kf-lg border border-kf-border bg-kf-surface p-3">
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-kf-md bg-kf-surface-muted">
      {image ? (
        <img src={image} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-2xl">🍔</div>
      )}
    </div>
    <div className="flex flex-1 flex-col justify-between">
      <div>
        <h4 className="text-sm font-semibold text-kf-foreground">{name}</h4>
        {options && options.length > 0 && (
          <p className="text-xs text-kf-muted">{options.join(', ')}</p>
        )}
      </div>
      <div className="flex items-center justify-between">
        <QuantitySelector size="sm" value={quantity} onChange={onQuantityChange} />
        <div className="flex items-center gap-2">
          <Price value={unitPrice * quantity} size="sm" />
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-xs text-kf-danger hover:bg-kf-danger/10 rounded-kf-md"
            aria-label={`Remover ${name}`}
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  </div>
);
