import React from 'react';
import { cn } from '../utils/cn.js';
import { Price } from './Price.js';
import { Button } from './Button.js';

export interface ProductCardProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  badge?: string;
  onAdd: () => void;
  onClick?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id, name, description, price, image, badge, onAdd, onClick
}) => (
  <div
    onClick={onClick}
    className={cn(
      'group flex flex-col rounded-kf-lg bg-kf-surface border border-kf-border shadow-kf-subtle overflow-hidden',
      onClick && 'cursor-pointer active:scale-[0.99] transition-transform'
    )}
  >
    <div className="relative aspect-[4/3] overflow-hidden bg-kf-surface-muted">
      {image ? (
        <img
          src={image}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-3xl">🍔</div>
      )}
      {badge && (
        <span className="absolute left-2 top-2 rounded-kf-pill bg-kf-primary px-2 py-0.5 text-[10px] font-bold text-kf-primary-fg">
          {badge}
        </span>
      )}
    </div>
    <div className="flex flex-1 flex-col p-3">
      <h3 className="text-sm font-semibold text-kf-foreground line-clamp-1">{name}</h3>
      {description && (
        <p className="mt-0.5 text-xs text-kf-muted line-clamp-2">{description}</p>
      )}
      <div className="mt-auto flex items-center justify-between pt-3">
        <Price value={price} size="sm" />
        <Button size="sm" onClick={(e) => { e.stopPropagation(); onAdd(); }} aria-label={`Adicionar ${name}`}>
          +
        </Button>
      </div>
    </div>
  </div>
);
