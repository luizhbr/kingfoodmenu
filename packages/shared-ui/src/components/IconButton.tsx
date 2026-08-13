import React from 'react';
import { cn } from '../utils/cn.js';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' };

export const IconButton: React.FC<IconButtonProps> = ({
  className, label, size = 'md', children, ...props
}) => (
  <button
    type="button"
    aria-label={label}
    className={cn(
      'inline-flex items-center justify-center rounded-kf-md text-kf-foreground hover:bg-kf-surface-muted active:scale-[0.96] transition-colors disabled:opacity-50',
      sizes[size],
      className
    )}
    {...props}
  >
    {children}
  </button>
);
