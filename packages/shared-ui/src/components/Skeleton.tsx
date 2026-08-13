import { cn } from '../utils/cn.js';

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={cn('animate-pulse rounded-kf-md bg-kf-surface-muted', className)}
    {...props}
  />
);
