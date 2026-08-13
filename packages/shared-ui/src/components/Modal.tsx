import React from 'react';
import { cn } from '../utils/cn.js';
import { Button } from './Button.js';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };

export const Modal: React.FC<ModalProps> = ({
  open, onClose, title, description, children, footer, size = 'md'
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-kf-modal flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          'w-full rounded-kf-lg bg-kf-surface shadow-kf-modal overflow-hidden',
          sizes[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div className="px-5 py-4 border-b border-kf-border">
            {title && <h2 className="text-lg font-semibold text-kf-foreground">{title}</h2>}
            {description && <p className="text-sm text-kf-muted mt-1">{description}</p>}
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-kf-border flex gap-2 justify-end">{footer}</div>}
      </div>
    </div>
  );
};
