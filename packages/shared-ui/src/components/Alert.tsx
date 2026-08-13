import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn.js';

const alertVariants = cva(
  'rounded-kf-md border p-4 text-sm',
  {
    variants: {
      variant: {
        info: 'bg-kf-info/10 border-kf-info/20 text-kf-info',
        success: 'bg-kf-success/10 border-kf-success/20 text-kf-success',
        warning: 'bg-kf-warning/10 border-kf-warning/20 text-kf-warning',
        danger: 'bg-kf-danger/10 border-kf-danger/20 text-kf-danger',
      },
    },
    defaultVariants: { variant: 'info' },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
}

export const Alert: React.FC<AlertProps> = ({ className, variant, title, children, ...props }) => (
  <div className={cn(alertVariants({ variant }), className)} role="alert" {...props}>
    {title && <strong className="block font-semibold mb-1">{title}</strong>}
    {children}
  </div>
);
