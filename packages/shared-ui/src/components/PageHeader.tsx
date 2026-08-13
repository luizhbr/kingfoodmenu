import { cn } from '../utils/cn.js';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  className, title, subtitle, action, ...props
}) => (
  <div className={cn('flex items-center justify-between gap-4 mb-5', className)} {...props}>
    <div>
      <h1 className="text-xl font-bold text-kf-foreground">{title}</h1>
      {subtitle && <p className="text-sm text-kf-muted">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
