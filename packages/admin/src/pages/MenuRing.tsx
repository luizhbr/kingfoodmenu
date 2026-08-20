import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

interface MenuItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  description: string | null;
  category: { id: string; name: string };
  _count: { options: number; allergens: number; mealtimes: number };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { menuItems: number };
}

interface MenuItemResponse {
  success: boolean;
  data: MenuItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * MenuRing — painel de cardápio estilo "Ring" (app de gestão):
 * categorias com contadores, produtos com imagem/preço/variantes,
 * botão +Produto, animações suaves (fade-in, slide, hover) e parallax
 * sutil no scroll. Sem dependências novas — CSS/Tailwind puro.
 */
export default function MenuRing() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState(0);

  const fetchAll = useCallback(() => {
    Promise.all([
      api.get<{ data: Category[] }>('/menu/categories?includeInactive=true'),
      api.get<MenuItemResponse>('/menu/items?limit=100&includeInactive=true'),
    ])
      .then(([catRes, itemRes]) => {
        setCategories(catRes.data);
        setItems(itemRes.data);
        // Expandir categorias com itens por padrão
        const withItems = new Set(
          catRes.data.filter((c) => c._count.menuItems > 0).map((c) => c.id)
        );
        setExpanded(withItems);
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Parallax sutil: o header desliza mais devagar que o conteúdo
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setParallax(Math.min(el.scrollTop * 0.35, 80));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  // IntersectionObserver: fade-in ao entrar na viewport
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible((prev) => new Set(prev).add((e.target as HTMLElement).dataset.id!));
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    document.querySelectorAll('[data-animate]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [loading, categories, items, search]);

  const toggleCategory = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredItems = items.filter((it) => {
    if (search && !it.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeCount = items.filter((i) => i.isActive).length;
  const totalCount = items.length;

  const catWithItems = categories
    .filter((c) => c._count.menuItems > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const catItems = (catId: string) =>
    filteredItems
      .filter((it) => it.category.id === catId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="min-h-screen bg-kf-bg flex flex-col">
      {/* Header com parallax */}
      <div
        className="relative overflow-hidden bg-gradient-to-br from-kf-primary/15 via-kf-surface to-kf-bg border-b border-kf-border"
        style={{ transform: `translateY(${parallax * 0.4}px)` }}
      >
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-kf-primary/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-kf-info/10 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-extrabold text-kf-foreground">Cardápio</h1>
              <p className="text-sm text-kf-muted mt-0.5">
                {activeCount}/{totalCount} produtos ativos
              </p>
            </div>
            <Link
              to="/menu/items/new"
              className="inline-flex items-center gap-1.5 bg-kf-primary text-kf-primary-fg px-4 py-2.5 rounded-kf-lg font-bold text-sm hover:bg-kf-primary-hover active:scale-95 transition-all shadow-kf-card min-h-[44px]"
            >
              <span className="text-lg leading-none">+</span> Produto
            </Link>
          </div>

          {/* Busca */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-kf-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full bg-kf-surface border border-kf-border rounded-kf-lg pl-10 pr-4 py-2.5 text-sm text-kf-foreground placeholder:text-kf-muted focus:outline-none focus:ring-2 focus:ring-kf-primary/40 transition-shadow"
              aria-label="Buscar produto"
            />
          </div>
        </div>
      </div>

      {/* Conteúdo com scroll (parallax) */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-4">
          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-kf-primary/20 border-t-kf-primary rounded-full animate-spin" role="status" aria-label="Carregando" />
            </div>
          )}

          {error && (
            <div className="bg-kf-danger/10 text-kf-danger p-4 rounded-kf-lg text-sm">{error}</div>
          )}

          {!loading && !error && catWithItems.length === 0 && (
            <div className="text-center py-16">
              <p className="text-kf-muted mb-4">Nenhuma categoria com produtos.</p>
              <Link to="/menu/items/new" className="text-kf-primary font-semibold">Criar primeiro produto</Link>
            </div>
          )}

          {!loading && catWithItems.map((cat, catIdx) => {
            const catProds = catItems(cat.id);
            const isOpen = expanded.has(cat.id);
            const isFeatured = catIdx === 0;
            return (
              <section
                key={cat.id}
                data-animate
                data-id={`cat-${cat.id}`}
                className={`transition-all duration-500 ease-out ${
                  visible.has(`cat-${cat.id}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
              >
                {/* Cabeçalho da categoria */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between bg-kf-surface border border-kf-border rounded-kf-lg px-4 py-3 hover:border-kf-primary/40 hover:shadow-kf-card transition-all active:scale-[0.99] min-h-[52px]"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-9 h-9 rounded-kf-md flex items-center justify-center font-extrabold text-sm ${
                      isFeatured ? 'bg-kf-primary text-kf-primary-fg' : 'bg-kf-primary/10 text-kf-primary'
                    }`}>
                      {cat._count.menuItems}
                    </span>
                    <div className="text-left">
                      <h2 className="font-bold text-kf-foreground text-sm sm:text-base">{cat.name}</h2>
                      {cat.description && <p className="text-xs text-kf-muted">{cat.description}</p>}
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-kf-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Produtos da categoria */}
                <div className={`grid gap-3 mt-3 transition-all duration-500 ease-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}>
                  <div className="overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {catProds.length === 0 && (
                        <p className="text-kf-muted text-sm col-span-full py-4 text-center">Sem produtos nesta categoria.</p>
                      )}
                      {catProds.map((item, idx) => (
                        <Link
                          key={item.id}
                          to={`/menu/items/${item.id}`}
                          data-animate
                          data-id={`item-${item.id}`}
                          style={{ transitionDelay: `${Math.min(idx * 40, 200)}ms` }}
                          className={`group bg-kf-surface border rounded-kf-lg overflow-hidden hover:shadow-kf-elevated hover:-translate-y-0.5 transition-all duration-300 ${
                            item.isActive ? 'border-kf-border' : 'border-kf-border/50 opacity-60'
                          } ${
                            visible.has(`item-${item.id}`) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                          }`}
                        >
                          <div className="relative aspect-[4/3] bg-kf-surface-muted overflow-hidden">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-4xl text-kf-muted/40" aria-hidden="true">
                                🍧
                              </div>
                            )}
                            {!item.isActive && (
                              <span className="absolute top-2 left-2 bg-kf-danger text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Inativo
                              </span>
                            )}
                            {item._count.options > 0 && (
                              <span className="absolute bottom-2 right-2 bg-kf-ink/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur">
                                {item._count.options} {item._count.options === 1 ? 'variante' : 'variantes'}
                              </span>
                            )}
                          </div>
                          <div className="p-3">
                            <h3 className="font-bold text-kf-foreground text-sm leading-snug line-clamp-2">{item.name}</h3>
                            {item.description && (
                              <p className="text-xs text-kf-muted mt-1 line-clamp-2">{item.description}</p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-extrabold text-kf-primary text-sm">
                                ${item.price.toFixed(2)}
                              </span>
                              <span className="text-kf-muted text-xs group-hover:text-kf-primary transition-colors">
                                Editar →
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
