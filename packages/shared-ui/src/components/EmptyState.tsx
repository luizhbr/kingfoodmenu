import { cn } from '../utils/cn.js';
import { Button } from './Button.js';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  className, icon, title, description, action, ...props
}) => (
  <div
    className={cn('flex flex-col items-center justify-center text-center p-8 rounded-kf-lg', className)}
    {...props}
  >
    {icon && <div className="mb-4 text-4xl text-kf-muted">{icon}</div>}
    <h3 className="text-base font-semibold text-kf-foreground">{title}</h3>
    {description && <p className="mt-1 text-sm text-kf-muted max-w-xs">{description}</p>}
    {action && (
      <Button className="mt-5" onClick={action.onClick}>{action.label}</Button>
    )}
  </div>
);
