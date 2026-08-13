import React from 'react';
import { cn } from '../utils/cn.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || React.useId();
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-kf-foreground">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'w-full min-h-[44px] rounded-kf-md border bg-kf-surface px-3 text-sm text-kf-foreground placeholder:text-kf-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kf-primary/50 focus-visible:border-kf-primary disabled:opacity-50',
            error ? 'border-kf-danger focus-visible:ring-kf-danger/30' : 'border-kf-border',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-kf-danger" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-1 text-xs text-kf-muted">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
