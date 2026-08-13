import React from 'react';
import { cn } from '../utils/cn.js';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'bottom' | 'right' | 'left';
}

const positions = {
  bottom: 'inset-x-0 bottom-0 rounded-t-kf-lg',
  right: 'inset-y-0 right-0 h-full rounded-l-kf-lg',
  left: 'inset-y-0 left-0 h-full rounded-r-kf-lg',
};

export const Drawer: React.FC<DrawerProps> = ({
  open, onClose, title, children, position = 'bottom'
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-kf-drawer"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute bg-kf-surface shadow-kf-modal flex flex-col max-h-[90vh]',
          positions[position]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {position === 'bottom' && (
          <div className="w-12 h-1.5 bg-kf-border rounded-full mx-auto mt-3 mb-2" />
        )}
        {title && (
          <div className="px-5 py-4 border-b border-kf-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-kf-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-kf-md hover:bg-kf-surface-muted text-kf-muted"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
};
