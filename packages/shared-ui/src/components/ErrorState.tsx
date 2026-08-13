import { cn } from '../utils/cn.js';
import { Button } from './Button.js';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  retry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  className, title = 'Algo deu errado', description, retry, ...props
}) => (
  <div
    className={cn('flex flex-col items-center justify-center text-center p-8 rounded-kf-lg border border-kf-danger/20 bg-kf-danger/5', className)}
    {...props}
  >
    <div className="text-4xl mb-4">⚠️</div>
    <h3 className="text-base font-semibold text-kf-danger">{title}</h3>
    {description && <p className="mt-1 text-sm text-kf-muted max-w-xs">{description}</p>}
    {retry && <Button variant="outline" className="mt-5" onClick={retry}>Tentar novamente</Button>}
  </div>
);
