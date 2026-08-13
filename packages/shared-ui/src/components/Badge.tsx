import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn.js';

const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-kf-pill text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-kf-primary/15 text-kf-primary-fg',
        success: 'bg-kf-success/15 text-kf-success',
        warning: 'bg-kf-warning/15 text-kf-warning',
        danger: 'bg-kf-danger/15 text-kf-danger',
        info: 'bg-kf-info/15 text-kf-info',
        muted: 'bg-kf-surface-muted text-kf-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge: React.FC<BadgeProps> = ({ className, variant, children, ...props }) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props}>
    {children}
  </span>
);
