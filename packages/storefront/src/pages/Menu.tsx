import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext.js';
import {
  Button,
  EmptyState,
  ErrorState,
  ProductCard,
  Skeleton,
} from '@kitchenasty/shared-ui';
import CartBar from '../components/CartBar.js';
import { CategoryPills } from '../components/CategoryPills.js';
const MenuItemModal = lazy(() => import('../components/MenuItemModal.js'));
import { FALLBACK_CATEGORIES, FALLBACK_ITEMS } from '../data/menuFallback.js';

interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  parentId: string | null;
  _count: { menuItems: number };
  children: Category[];
}

interface MenuItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image: string | null;
  isActive: boolean;
  trackStock: boolean;
  stockQty: number;
  category: { id: string; name: string };
  _count: { options: number; allergens: number; mealtimes: number };
}

interface MenuResponse {
  items: MenuItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** Altura do header fixo do site (h-16) — a barra de categorias fica sticky abaixo dele. */
const HEADER_OFFSET = 64;

function sectionId(catId: string): string {
  return `menu-section-${catId}`;
}

export default function Menu() {
  const { t } = useTranslation();
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  /** Categoria ativa (sincronizada com a seção visível via scroll E via clique). */
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [items, setItems] = useState<MenuItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<Error | null>(null);

  // Refs das seções (âncoras estáveis para o IntersectionObserver)
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const firstSectionRef = useRef<HTMLElement | null>(null);
  /** Flag para suprimir o IntersectionObserver durante scroll programático (clique em categoria). */
  const isScrollingRef = useRef(false);

  // Fetch categories
  useEffect(() => {
    fetch('/api/menu/categories')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setCategories((d?.data || []).filter((c: Category) => c.isActive && !c.parentId)))
      .catch(() => setCategories(FALLBACK_CATEGORIES.filter((c) => c.isActive && !c.parentId) as Category[]))
      .finally(() => setCategoriesLoading(false));
  }, []);

  // Fetch ALL items (uma única vez — sem filtro de categoria)
  const loadMenu = useCallback(() => {
    setItemsLoading(true);
    setItemsError(null);
    const apiBase = import.meta.env.VITE_API_URL || '';
    return fetch(`${apiBase}/api/menu/items?limit=200`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json) => {
        setItems(json.data || []);
      })
      .catch((err) => {
        console.warn('Menu API unavailable, using fallback:', err.message);
        setItems(FALLBACK_ITEMS);
      })
      .finally(() => setItemsLoading(false));
  }, []);

  useEffect(() => {
    let mounted = true;
    loadMenu().then(() => { /* mounted guard desnecessário — loadMenu é idempotente */ });
    return () => { mounted = false; };
  }, [loadMenu]);

  // Sync URL params (apenas categoria ativa para deep-linking)
  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchParams.get('category')) {
      params.category = searchParams.get('category')!;
    }
    // Não sobrescreve se já está vazio
    if (Object.keys(params).length > 0) {
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const categoryList = useMemo(
    () => (categoriesLoading ? [] : categories.map((c) => ({ id: c.id, name: c.name }))),
    [categories, categoriesLoading]
  );

  const activeItems = useMemo(
    () => items.filter((i) => i.isActive && (!i.trackStock || i.stockQty > 0)),
    [items]
  );

  /** Produtos agrupados por categoria, na ordem atual das categorias. */
  const grouped = useMemo(() => {
    const groups: { category: { id: string; name: string }; items: MenuItem[] }[] = [];
    const byCat = new Map<string, MenuItem[]>();
    for (const item of activeItems) {
      const arr = byCat.get(item.category.id) ?? [];
      arr.push(item);
      byCat.set(item.category.id, arr);
    }
    // Ordem: categorias conhecidas primeiro; categorias desconhecidas (edge) no final
    const knownIds = new Set(categories.map((c) => c.id));
    const orderedIds = [...categories.map((c) => c.id), ...[...byCat.keys()].filter((id) => !knownIds.has(id))];
    for (const id of orderedIds) {
      const cat = categories.find((c) => c.id === id);
      const groupItems = byCat.get(id);
      if (!groupItems || groupItems.length === 0) continue;
      groups.push({ category: { id, name: cat?.name ?? groupItems[0].category.name }, items: groupItems });
    }
    return groups;
  }, [activeItems, categories]);

  const gridColumns =
    'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4';

  // Scroll vertical -> categoria ativa
  // Dual approach: IntersectionObserver (primário) + scroll listener (fallback)
  // O fallback garante funcionamento mesmo em browsers onde IO não dispara com scrollTo()
  useEffect(() => {
    if (itemsLoading || grouped.length === 0) return;
    const refs = sectionRefs.current;
    const first = firstSectionRef.current;

    /** Calcula qual categoria está visível no topo da área de leitura. */
    function computeActiveCategory() {
      if (isScrollingRef.current) return;
      const refs = sectionRefs.current;
      const first = firstSectionRef.current;
      if (!first) return;

      const viewportTop = HEADER_OFFSET;
      const viewportMid = window.innerHeight * 0.35; // 35% da viewport = zona de leitura
      let bestId: string | null = null;
      let bestTop = Infinity;

      refs.forEach((el) => {
        const r = el.getBoundingClientRect();
        // Seção cujo topo passou da zona de leitura mas cujo conteúdo ainda está visível
        if (r.top <= viewportMid && r.bottom > viewportTop) {
          if (r.top < bestTop) {
            bestTop = r.top;
            bestId = el.dataset.categoryId ?? null;
          }
        }
      });

      if (bestId) {
        setActiveCategory(bestId);
      } else {
        const absTop = first.getBoundingClientRect().top + window.scrollY;
        if (window.scrollY < absTop - 80) setActiveCategory(null);
      }
    }

    // IntersectionObserver (primário — mais eficiente)
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return;
        const visible: { id: string | null; top: number }[] = [];
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.categoryId ?? null;
          visible.push({ id, top: entry.boundingClientRect.top });
        }
        if (visible.length > 0) {
          visible.sort((a, b) => a.top - b.top);
          setActiveCategory(visible[0].id);
        } else if (first) {
          const absTop = first.getBoundingClientRect().top + window.scrollY;
          if (window.scrollY < absTop - 80) setActiveCategory(null);
        }
      },
      { rootMargin: `-${HEADER_OFFSET}px 0px -55% 0px`, threshold: 0 }
    );

    const seen = new Set<string>();
    refs.forEach((el) => {
      const id = el.dataset.categoryId;
      if (id) {
        if (seen.has(id)) return;
        seen.add(id);
      }
      observer.observe(el);
    });

    // Fallback: scroll listener com throttle via requestAnimationFrame
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        computeActiveCategory();
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    // Chamar uma vez para setar o estado inicial
    computeActiveCategory();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [grouped, itemsLoading]);

  // Limpa refs das seções quando os itens mudam (evita refs órfãs)
  useEffect(() => {
    if (itemsLoading) return;
    // Mantém apenas refs de categorias que existem no grouped atual
    const validIds = new Set(grouped.map((g) => g.category.id));
    const current = sectionRefs.current;
    for (const id of [...current.keys()]) {
      if (!validIds.has(id)) current.delete(id);
    }
  }, [grouped, itemsLoading]);

  function handleCategoryClick(catId: string | null) {
    setActiveCategory(catId);
    if (catId) {
      // Scroll suave até a seção da categoria — sem refetch, sem "página nova"
      const el = document.getElementById(sectionId(catId));
      if (el) {
        isScrollingRef.current = true;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Reabilita o observer depois que o scroll suave termina
        setTimeout(() => { isScrollingRef.current = false; }, 800);
      }
    } else {
      // "Todos" volta ao início do cardápio
      isScrollingRef.current = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => { isScrollingRef.current = false; }, 800);
    }
  }

  function handleQuickAdd(item: MenuItem) {
    if (item._count.options > 0) {
      setSelectedItemId(item.id);
    } else {
      addItem({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        options: [],
      });
    }
  }

  return (
    <div className="min-h-screen bg-kf-bg pb-[calc(var(--kf-nav-h)+2.5rem)]">
      {/* Promo bar — sorteio Instagram */}
      <a
        href="https://www.instagram.com/p/DbjecIfC6kS/?igsh=MWF2dnZzZ3RudmF6Yw=="
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 z-40 block bg-kf-ink text-kf-bg text-center text-[11px] sm:text-xs font-extrabold tracking-wide uppercase px-3 py-2.5 hover:bg-kf-ink/90 active:scale-[0.99] transition"
      >
        Sorteio no Instagram · comenta AÇAÍ e participa →
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header estilizado */}
        <header className="mb-6 text-center pt-4 pb-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-kf-foreground tracking-tight">
            {t('menu.title', 'Nosso Cardápio')}
          </h1>
          <p className="text-sm text-kf-muted mt-1">
            {t('menu.subtitle', 'Escolha seus favoritos')}
            {!itemsLoading && !itemsError && activeItems.length > 0 && (
              <span className="ml-2 inline-flex items-center rounded-kf-pill bg-kf-primary/10 px-2 py-0.5 text-[11px] font-bold text-kf-primary">
                {activeItems.length} {t('menu.items', 'itens')}
              </span>
            )}
          </p>
        </header>

        {/* Categorias (barra sticky com scroll horizontal) */}
        {!selectedItemId && (
          <CategoryPills
            categories={categoryList}
            selected={activeCategory}
            onSelect={handleCategoryClick}
            loading={categoriesLoading}
            headerOffset={HEADER_OFFSET}
          />
        )}

        {/* Produtos agrupados por categoria — TODOS numa página só */}
        <div className="mt-4">
          {itemsLoading && (
            <div className={gridColumns} aria-busy="true" aria-label={t('menu.loading', 'Carregando cardápio')}>
              {Array.from({ length: 8 }).map((_, i) => (
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

          {!itemsLoading && itemsError && (
            <ErrorState
              title={t('menu.errorTitle', 'Erro ao carregar cardápio')}
              description={t('menu.errorDesc', 'Tente novamente em instantes.')}
              retry={loadMenu}
            />
          )}

          {!itemsLoading && !itemsError && activeItems.length === 0 && (
            <EmptyState
              title={t('menu.noItemsTitle', 'Nenhum produto encontrado')}
              description={t('menu.noItemsDesc', 'Tente novamente em instantes.')}
            />
          )}

          {!itemsLoading && !itemsError && activeItems.length > 0 && (
            <>
              {grouped.map((group, gi) => {
                const id = sectionId(group.category.id);
                return (
                  <section
                    key={id}
                    id={id}
                    ref={(el) => {
                      if (el) {
                        sectionRefs.current.set(group.category.id, el);
                        if (gi === 0) firstSectionRef.current = el;
                      }
                    }}
                    data-category-id={group.category.id}
                    className="scroll-mt-[calc(4rem+3.75rem)] kf-anim-fade-in"
                    aria-label={group.category.name}
                  >
                    <h2 className="mb-3 flex items-center gap-3 text-base font-extrabold uppercase tracking-wide text-kf-foreground">
                      {group.category.name}
                      <span className="h-px flex-1 bg-kf-border" aria-hidden />
                    </h2>
                    <div className={gridColumns}>
                      {group.items.map((item) => (
                        <ProductCard
                          key={item.id}
                          id={item.id}
                          name={item.name}
                          description={item.description || undefined}
                          price={item.price}
                          image={item.image || undefined}
                          badge={item._count.options > 0 ? t('menu.options', 'Opções') : undefined}
                          parallax
                          onClick={() => setSelectedItemId(item.id)}
                          onAdd={() => handleQuickAdd(item)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </>
          )}
        </div>
      </div>

      {selectedItemId && (
        <Suspense fallback={null}>
          <MenuItemModal itemId={selectedItemId} onClose={() => setSelectedItemId(null)} />
        </Suspense>
      )}
      <CartBar />
    </div>
  );
}
