import React from 'react';
import { cn } from '../utils/cn.js';

export interface QuantitySelectorProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'md';
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  value, min = 1, max = 99, onChange, size = 'md'
}) => {
  const buttonClass = size === 'sm'
    ? 'h-8 w-8 rounded-kf-md'
    : 'h-10 w-10 rounded-kf-lg';
  return (
    <div className="flex items-center gap-1" aria-label="Seletor de quantidade">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={cn(
          'flex items-center justify-center border border-kf-border bg-kf-surface text-kf-foreground font-semibold disabled:opacity-40 active:scale-[0.95] transition-transform',
          buttonClass
        )}
        aria-label="Diminuir"
      >
        −
      </button>
      <span
        className={cn(
          'flex items-center justify-center font-semibold text-kf-foreground tabular-nums',
          size === 'sm' ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-base'
        )}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn(
          'flex items-center justify-center border border-kf-border bg-kf-surface text-kf-foreground font-semibold disabled:opacity-40 active:scale-[0.95] transition-transform',
          buttonClass
        )}
        aria-label="Aumentar"
      >
        +
      </button>
    </div>
  );
};
