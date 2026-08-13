import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface FeaturedItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image: string | null;
  isActive: boolean;
  category: { id: string; name: string };
}

/**
 * "Mais pedidos" — produtos reais do cardápio (API /api/menu/items com fallback estático).
 * Mostrado na Home e no topo do Cardápio para vender logo de cara.
 */
export default function FeaturedItems({ limit = 4, compact = false }: { limit?: number; compact?: boolean }) {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${base}/api/menu/items?limit=100`);
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        const list: FeaturedItem[] = (json.data || [])
          .filter((i: FeaturedItem) => i.isActive)
          .slice(0, limit);
        if (!cancelled) {
          setItems(list);
          setLoading(false);
        }
      } catch {
        // Fallback estático — dados reais do cardápio (menuFallback.ts)
        import('../data/menuFallback.js').then((mod) => {
          if (cancelled) return;
          const list = mod.FALLBACK_ITEMS.filter((i: FeaturedItem) => i.isActive).slice(0, limit);
          setItems(list);
          setLoading(false);
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  if (loading) return null;

  if (items.length === 0) return null;

  return (
    <section className="px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Mais pedidos</h2>
            <p className="text-sm text-gray-500 mt-0.5">Os favoritos de quem já pediu</p>
          </div>
          <Link to="/menu" className="text-sm font-bold text-primary-600 hover:text-primary-700 shrink-0">
            Ver cardápio →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {items.map((item) => (
            <Link
              key={item.id}
              to="/menu"
              className="group bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow text-left"
            >
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-full aspect-[4/3] object-cover" loading="lazy" />
              ) : (
                <div className="w-full aspect-[4/3] bg-gradient-to-br from-[#FFD100]/80 to-[#FFD100]/30 flex items-center justify-center">
                  <span className="text-5xl" aria-hidden>🍧</span>
                </div>
              )}
              <div className="p-3 sm:p-4">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-snug line-clamp-2 min-h-[2.5rem]">
                  {item.name}
                </h3>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-primary-600 font-extrabold">${item.price.toFixed(2)}</span>
                  {!compact && (
                    <span className="text-xs text-gray-400 group-hover:text-primary-600 transition-colors whitespace-nowrap">
                      Ver →
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
