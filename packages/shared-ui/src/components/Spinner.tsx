import { cn } from '../utils/cn.js';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

export const Spinner: React.FC<SpinnerProps> = ({ className, size = 'md', ...props }) => (
  <div
    className={cn('animate-spin rounded-full border-2 border-current border-t-transparent text-kf-primary', sizes[size], className)}
    role="status"
    aria-label="Carregando"
    {...props}
  >
    <span className="sr-only">Carregando...</span>
  </div>
);
