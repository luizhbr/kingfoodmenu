import React from 'react';
import { cn } from '../utils/cn.js';

const driverMap: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: 'Disponível', color: 'bg-kf-success/15 text-kf-success' },
  ASSIGNED: { label: 'Atribuído', color: 'bg-kf-info/15 text-kf-info' },
  PICKING_UP: { label: 'Retirando', color: 'bg-kf-warning/15 text-kf-warning' },
  OUT_FOR_DELIVERY: { label: 'A caminho', color: 'bg-kf-accent/15 text-kf-accent' },
  DELIVERED: { label: 'Entregue', color: 'bg-kf-success/15 text-kf-success' },
  OFFLINE: { label: 'Offline', color: 'bg-kf-surface-muted text-kf-muted' },
};

export interface DriverStatusProps {
  status: string;
}

export const DriverStatus: React.FC<DriverStatusProps> = ({ status }) => {
  const s = driverMap[status] || { label: status, color: 'bg-kf-surface-muted text-kf-muted' };
  return (
    <span className={cn('inline-flex items-center rounded-kf-pill px-2.5 py-0.5 text-xs font-semibold', s.color)}>
      {s.label}
    </span>
  );
};
