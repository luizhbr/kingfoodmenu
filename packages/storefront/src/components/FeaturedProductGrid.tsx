import { useEffect, useState } from 'react';
import { ProductCard, Skeleton } from '@kitchenasty/shared-ui';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  categoryId?: string;
}

interface Props {
  apiUrl?: string;
  onAdd: (product: Product) => void;
  onClick: (product: Product) => void;
}

export function FeaturedProductGrid({ apiUrl = '/api/menu/items', onAdd, onClick }: Props) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch(apiUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        const list = d?.data?.items || d?.data || [];
        // Take first 6 items as featured
        if (mounted) setItems(list.slice(0, 6));
      })
      .catch(() => mounted && setError(true))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [apiUrl]);

  return (
    <section className="px-4 sm:px-6 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-kf-foreground">Destaques</h2>
        <a href="/menu" className="text-sm font-semibold text-kf-primary-fg hover:underline">Ver tudo →</a>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-kf-lg border border-kf-border bg-kf-surface p-3">
              <Skeleton className="aspect-[4/3] rounded-kf-md" />
              <Skeleton className="mt-3 h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <div className="mt-3 flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-8 rounded-kf-md" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-kf-danger">Não foi possível carregar os destaques.</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-kf-muted">Nenhum produto em destaque no momento.</p>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard
              key={p.id}
              id={p.id}
              name={p.name}
              description={p.description}
              price={p.price}
              image={p.image}
              onAdd={() => onAdd(p)}
              onClick={() => onClick(p)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
