import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '../utils/cn.js';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-[colors,transform,shadow] duration-kf-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kf-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-kf-primary text-kf-primary-fg hover:bg-kf-primary-hover shadow-kf-card',
        secondary: 'bg-kf-secondary text-white hover:opacity-90 shadow-kf-subtle',
        outline: 'border border-kf-border bg-kf-surface text-kf-foreground hover:bg-kf-surface-muted',
        ghost: 'text-kf-foreground hover:bg-kf-surface-muted',
        danger: 'bg-kf-danger text-white hover:bg-red-700 shadow-kf-card',
      },
      size: {
        sm: 'min-h-[36px] px-3 text-xs rounded-kf-md',
        md: 'min-h-[44px] px-4 text-sm rounded-kf-lg',
        lg: 'min-h-[48px] px-6 text-base rounded-kf-lg',
        icon: 'min-h-[44px] min-w-[44px] rounded-kf-md',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = 'Button';
