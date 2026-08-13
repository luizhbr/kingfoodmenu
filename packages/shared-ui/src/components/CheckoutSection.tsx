import React from 'react';
import { cn } from '../utils/cn.js';

export interface CheckoutSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  step?: number;
  optional?: boolean;
}

export const CheckoutSection: React.FC<CheckoutSectionProps> = ({
  title, step, optional, children, className, ...props
}) => (
  <section className={cn('rounded-kf-lg border border-kf-border bg-kf-surface p-4', className)} {...props}>
    <div className="mb-3 flex items-center gap-3">
      {step && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-kf-primary text-[10px] font-bold text-kf-primary-fg">
          {step}
        </span>
      )}
      <h3 className="text-sm font-semibold text-kf-foreground">{title}</h3>
      {optional && <span className="ml-auto text-xs text-kf-muted">Opcional</span>}
    </div>
    {children}
  </section>
);
