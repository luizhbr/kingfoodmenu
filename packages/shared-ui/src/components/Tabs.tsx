import React, { useState } from 'react';
import { cn } from '../utils/cn.js';

export interface Tab {
  id: string;
  label: string;
  badge?: string | number;
}

export interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  variant?: 'pill' | 'underline';
}

export const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange, variant = 'pill' }) => {
  return (
    <div className={cn('flex gap-1', variant === 'underline' && 'border-b border-kf-border')} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'min-h-[40px] px-3 py-1.5 text-sm font-medium transition-colors',
              variant === 'pill' && (
                isActive
                  ? 'bg-kf-primary text-kf-primary-fg rounded-kf-pill'
                  : 'text-kf-muted hover:text-kf-foreground rounded-kf-pill'
              ),
              variant === 'underline' && (
                isActive
                  ? 'text-kf-foreground border-b-2 border-kf-primary -mb-[1px]'
                  : 'text-kf-muted hover:text-kf-foreground'
              )
            )}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span className={cn(
                'ml-1.5 inline-flex items-center justify-center rounded-kf-pill px-1.5 py-0.5 text-[10px] font-bold',
                isActive ? 'bg-kf-ink/10 text-kf-ink' : 'bg-kf-surface-muted text-kf-muted'
              )}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
