import React from 'react';
import { cn } from '../utils/cn.js';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open, onClose, title, children
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-kf-drawer" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-kf-lg bg-kf-surface shadow-kf-modal max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-kf-border rounded-full mx-auto mt-3 mb-2" />
        {title && (
          <div className="px-5 py-3 border-b border-kf-border">
            <h2 className="text-lg font-semibold text-kf-foreground">{title}</h2>
          </div>
        )}
        <div className="flex-1 overflow-auto p-5 pb-8">{children}</div>
      </div>
    </div>
  );
};
