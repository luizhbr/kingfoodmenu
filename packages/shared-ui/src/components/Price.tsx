import { cn } from '../utils/cn.js';

export interface PriceProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  currency?: string;
  original?: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' };

export const Price: React.FC<PriceProps> = ({
  value, currency = '$', original, size = 'md', className, ...props
}) => {
  const formatted = `${currency}${value.toFixed(2)}`;
  return (
    <span className={cn('inline-flex items-baseline gap-2', className)} {...props}>
      <span className={cn('font-bold text-kf-foreground', sizeClasses[size])}>{formatted}</span>
      {original !== undefined && original > value && (
        <span className="text-sm text-kf-muted line-through">
          {currency}{original.toFixed(2)}
        </span>
      )}
    </span>
  );
};
