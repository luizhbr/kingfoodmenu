import { cn } from '@kitchenasty/shared-ui';

export interface Category {
  id: string;
  name: string;
}

interface Props {
  categories: Category[];
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  loading?: boolean;
}

export function CategoryPills({ categories, selected, onSelect, loading }: Props) {
  const allLabel = 'Todos';
  return (
    <section className="py-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-kf-foreground">Categorias</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="Categorias">
        <button
          type="button"
          onClick={() => onSelect?.(null)}
          className={cn(
            'shrink-0 inline-flex items-center min-h-[40px] px-4 rounded-kf-pill border text-sm font-semibold transition-colors',
            selected === null || selected === undefined
              ? 'border-kf-primary bg-kf-primary text-kf-primary-fg'
              : 'border-kf-border bg-kf-surface text-kf-foreground hover:border-kf-primary hover:bg-kf-primary/10'
          )}
          role="tab"
          aria-selected={selected === null || selected === undefined}
        >
          {allLabel}
        </button>
        {loading && (
          <span className="shrink-0 px-4 py-2 text-sm text-kf-muted">Carregando...</span>
        )}
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect?.(cat.id)}
            className={cn(
              'shrink-0 inline-flex items-center min-h-[40px] px-4 rounded-kf-pill border text-sm font-semibold transition-colors',
              selected === cat.id
                ? 'border-kf-primary bg-kf-primary text-kf-primary-fg'
                : 'border-kf-border bg-kf-surface text-kf-foreground hover:border-kf-primary hover:bg-kf-primary/10'
            )}
            role="tab"
            aria-selected={selected === cat.id}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </section>
  );
}
