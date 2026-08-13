import React from 'react';
import { cn } from '../utils/cn.js';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Switch: React.FC<SwitchProps> = ({ className, label, ...props }) => (
  <label className={cn('inline-flex items-center gap-3 cursor-pointer', className)}>
    <div className="relative">
      <input type="checkbox" className="peer sr-only" {...props} />
      <div className="h-6 w-11 rounded-kf-pill bg-kf-border peer-checked:bg-kf-primary transition-colors" />
      <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
    </div>
    {label && <span className="text-sm text-kf-foreground">{label}</span>}
  </label>
);
