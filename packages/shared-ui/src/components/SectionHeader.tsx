import { cn } from '../utils/cn.js';

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  className, title, action, ...props
}) => (
  <div className={cn('flex items-center justify-between gap-3 mb-3', className)} {...props}>
    <h2 className="text-base font-semibold text-kf-foreground">{title}</h2>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
