import React from 'react';
import { cn } from '../utils/cn.js';

const statusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-kf-warning/15 text-kf-warning' },
  CONFIRMED: { label: 'Confirmado', color: 'bg-kf-info/15 text-kf-info' },
  PREPARING: { label: 'Em preparo', color: 'bg-kf-primary/15 text-kf-primary-fg' },
  READY: { label: 'Pronto', color: 'bg-kf-secondary/15 text-kf-secondary' },
  OUT_FOR_DELIVERY: { label: 'Saiu para entrega', color: 'bg-kf-accent/15 text-kf-accent' },
  DELIVERED: { label: 'Entregue', color: 'bg-kf-success/15 text-kf-success' },
  CANCELLED: { label: 'Cancelado', color: 'bg-kf-danger/15 text-kf-danger' },
};

export interface OrderStatusProps {
  status: string;
}

export const OrderStatus: React.FC<OrderStatusProps> = ({ status }) => {
  const s = statusMap[status] || { label: status, color: 'bg-kf-surface-muted text-kf-muted' };
  return (
    <span className={cn('inline-flex items-center rounded-kf-pill px-2.5 py-0.5 text-xs font-semibold', s.color)}>
      {s.label}
    </span>
  );
};
