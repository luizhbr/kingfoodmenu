import { Link } from 'react-router-dom';
import { cn } from '@kitchenasty/shared-ui';

export interface Category {
  id: string;
  name: string;
}

interface Props {
  categories: Category[];
}

export function CategoryPills({ categories }: Props) {
  if (!categories.length) return null;
  return (
    <section className="px-4 sm:px-6 py-4">
      <h2 className="mb-3 text-sm font-semibold text-kf-foreground">Categorias</h2>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="Categorias">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/menu?category=${encodeURIComponent(cat.id)}`}
            className={cn(
              'shrink-0 inline-flex items-center min-h-[40px] px-4 rounded-kf-pill',
              'border border-kf-border bg-kf-surface text-sm font-semibold text-kf-foreground',
              'hover:border-kf-primary hover:bg-kf-primary/10 active:scale-[0.97] transition-colors'
            )}
            role="tab"
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
