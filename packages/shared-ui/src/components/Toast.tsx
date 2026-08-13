import React from 'react';
import { cn } from '../utils/cn.js';

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description?: string;
  onClose?: () => void;
}

const variants = {
  success: 'bg-kf-success text-white',
  warning: 'bg-kf-warning text-white',
  danger: 'bg-kf-danger text-white',
  info: 'bg-kf-info text-white',
};

export const Toast: React.FC<ToastProps> = ({
  variant = 'info', title, description, onClose, className, ...props
}) => (
  <div
    className={cn(
      'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-kf-lg p-4 shadow-kf-modal',
      variants[variant],
      className
    )}
    role="status"
    {...props}
  >
    <div className="flex-1">
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="mt-0.5 text-xs opacity-90">{description}</p>}
    </div>
    {onClose && (
      <button
        onClick={onClose}
        className="shrink-0 p-1 rounded-kf-md hover:bg-white/20"
        aria-label="Fechar"
      >
        ✕
      </button>
    )}
  </div>
);
