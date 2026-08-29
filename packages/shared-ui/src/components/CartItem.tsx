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
        <div
          className="flex h-full items-center justify-center bg-kf-surface-muted"
          role="img"
          aria-label={name}
          title={name}
        >
          {/* Placeholder neutro da marca — nunca um emoji sem relação com o item.
              A imagem real vem de CartContext.item.image (mesma fonte do cardápio). */}
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-kf-muted/60">
            <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
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
