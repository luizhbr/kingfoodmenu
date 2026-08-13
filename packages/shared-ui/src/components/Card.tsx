import { cn } from '../utils/cn.js';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card: React.FC<CardProps> = ({ className, children, ...props }) => (
  <div
    className={cn(
      'rounded-kf-lg bg-kf-surface border border-kf-border shadow-kf-card overflow-hidden',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('px-4 py-4 border-b border-kf-border', className)} {...props} />
);

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('p-4', className)} {...props} />
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('px-4 py-4 border-t border-kf-border', className)} {...props} />
);
