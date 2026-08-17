import { useEffect, useRef } from 'react';
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
  /** Altura do header fixo acima da barra (offset do sticky). Default 64px. */
  headerOffset?: number;
}

/**
 * Barra de categorias do cardápio — navegação horizontal com sticky.
 * - Uma linha, scroll horizontal com swipe (sem quebra de linha).
 * - Sticky abaixo do header do site (offset via headerOffset).
 * - Auto-scroll horizontal: mantém a categoria ativa visível (centralizada).
 * - Touch targets ≥ 44px, contraste King Food (ativo = amarelo, inativo = claro).
 */
export function CategoryPills({ categories, selected, onSelect, loading, headerOffset = 64 }: Props) {
  const barRef = useRef<HTMLDivElement | null>(null);

  // Mantém a categoria ativa visível na área horizontal (ex.: via IntersectionObserver).
  useEffect(() => {
    const bar = barRef.current;
    if (!bar || !selected) return;
    const el = bar.querySelector<HTMLElement>(`[data-cat-id="${selected}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selected]);

  return (
    <div
      ref={barRef}
      className="sticky z-40 -mx-4 px-4 sm:mx-0 sm:px-0 bg-kf-bg/95 backdrop-blur-sm border-b border-kf-border/70"
      style={{ top: headerOffset }}
      role="tablist"
      aria-label="Categorias"
    >
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-2.5">
        <button
          type="button"
          data-cat-id=""
          onClick={() => onSelect?.(null)}
          className={cn(
            'shrink-0 inline-flex items-center min-h-[44px] px-4 rounded-kf-pill border text-sm font-semibold transition-colors',
            selected === null || selected === undefined
              ? 'border-kf-primary bg-kf-primary text-kf-primary-fg'
              : 'border-kf-border bg-kf-surface text-kf-foreground hover:border-kf-primary hover:bg-kf-primary/10'
          )}
          role="tab"
          aria-selected={selected === null || selected === undefined}
        >
          Todos
        </button>
        {loading && (
          <span className="shrink-0 px-4 py-2 text-sm text-kf-muted">Carregando...</span>
        )}
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            data-cat-id={cat.id}
            onClick={() => onSelect?.(cat.id)}
            className={cn(
              'shrink-0 inline-flex items-center min-h-[44px] px-4 rounded-kf-pill border text-sm font-semibold transition-colors',
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
    </div>
  );
}
