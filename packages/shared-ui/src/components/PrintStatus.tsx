import React from 'react';
import { cn } from '../utils/cn.js';

const printMap: Record<string, string> = {
  idle: 'bg-kf-surface-muted text-kf-muted',
  sending: 'bg-kf-info/15 text-kf-info',
  printed: 'bg-kf-success/15 text-kf-success',
  failed: 'bg-kf-danger/15 text-kf-danger',
};

const printLabel: Record<string, string> = {
  idle: 'Pronto',
  sending: 'Enviando...',
  printed: 'Impresso',
  failed: 'Falha',
};

export interface PrintStatusProps {
  status: 'idle' | 'sending' | 'printed' | 'failed';
}

export const PrintStatus: React.FC<PrintStatusProps> = ({ status }) => (
  <span className={cn('inline-flex items-center rounded-kf-pill px-2 py-0.5 text-[10px] font-bold uppercase', printMap[status])}>
    {printLabel[status]}
  </span>
);
