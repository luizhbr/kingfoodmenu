import { useEffect, useMemo, useRef, useState } from 'react';
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
import MenuItemModal from '../components/MenuItemModal.js';
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
/** Altura aproximada da barra sticky de categorias (offset do scroll-margin das seções). */
const CATEGORY_BAR_OFFSET = 60;

function sectionId(catId: string, page: number): string {
  return page > 1 ? `menu-section-${catId}-p${page}` : `menu-section-${catId}`;
}

export default function Menu() {
  const { t } = useTranslation();
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('category'));
  /** Categoria ativa durante o scroll (sincronizada com a seção visível). */
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [items, setItems] = useState<MenuItem[]>([]);
  const [pagination, setPagination] = useState<MenuResponse['pagination'] | null>(null);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<Error | null>(null);

  // Refs das seções (âncoras estáveis para o IntersectionObserver)
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const firstSectionRef = useRef<HTMLElement | null>(null);
  /** Categoria clicada aguardando o carregamento dos itens filtrados para scrollar. */
  const pendingScrollRef = useRef<{ catId: string } | null>(null);

  // Fetch categories
  useEffect(() => {
    fetch('/api/menu/categories')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setCategories((d?.data || []).filter((c: Category) => c.isActive && !c.parentId)))
      .catch(() => setCategories(FALLBACK_CATEGORIES.filter((c) => c.isActive && !c.parentId) as Category[]))
      .finally(() => setCategoriesLoading(false));
  }, []);

  // Build items URL (busca removida — sem filtro de search)
  const itemsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('categoryId', selectedCategory);
    if (page > 1) params.set('page', String(page));
    params.set('limit', '50');
    const apiBase = import.meta.env.VITE_API_URL || '';
    return `${apiBase}/api/menu/items?${params}`;
  }, [selectedCategory, page]);

  // Fetch items
  useEffect(() => {
    let mounted = true;
    setItemsLoading(true);
    setItemsError(null);
    fetch(itemsUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json) => {
        if (!mounted) return;
        setItems(json.data || []);
        setPagination(json.pagination || null);
      })
      .catch((err) => {
        if (!mounted) return;
        console.warn('Menu API unavailable, using fallback:', err.message);
        const filtered = selectedCategory
          ? FALLBACK_ITEMS.filter((i: any) => i.category.id === selectedCategory)
          : FALLBACK_ITEMS;
        setItems(filtered);
        setPagination({ page: 1, limit: 100, total: filtered.length, totalPages: 1 });
      })
      .finally(() => { if (mounted) setItemsLoading(false); });
    return () => { mounted = false; };
  }, [itemsUrl, selectedCategory]);

  // Sync URL params (apenas categoria e página — busca removida)
  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedCategory) params.category = selectedCategory;
    if (page > 1) params.page = String(page);
    setSearchParams(params, { replace: true });
  }, [selectedCategory, page, setSearchParams]);

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

  // Scroll vertical -> categoria ativa (IntersectionObserver, sem listener por pixel)
  useEffect(() => {
    if (itemsLoading || grouped.length === 0) return;
    const refs = sectionRefs.current;
    const first = firstSectionRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible: { id: string | null; top: number }[] = [];
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.categoryId ?? null;
          visible.push({ id, top: entry.boundingClientRect.top });
        }
        if (visible.length > 0) {
          // Seção mais próxima do topo da área de leitura vence
          visible.sort((a, b) => a.top - b.top);
          setActiveCategory(visible[0].id);
        } else if (first) {
          // Nada na faixa de leitura: acima da primeira seção = topo do cardápio = "Todos"
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
        if (seen.has(id)) return; // primeira seção de cada categoria (página atual)
        seen.add(id);
      }
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [grouped, itemsLoading]);

  function handleCategoryClick(catId: string | null) {
    setSelectedCategory(catId);
    setActiveCategory(catId);
    setPage(1);
    if (catId) {
      // Espera os itens filtrados carregarem: as seções mudam (skeleton -> grid)
      // e um scroll prematuro seria cancelado no meio do caminho.
      pendingScrollRef.current = { catId };
    } else {
      // "Todos" volta ao início do cardápio
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Scroll pós-carregamento do clique em categoria
  useEffect(() => {
    if (itemsLoading || !pendingScrollRef.current) return;
    const { catId } = pendingScrollRef.current;
    pendingScrollRef.current = null;
    const el = document.getElementById(sectionId(catId, page));
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Categoria sem produtos: volta ao topo (EmptyState)
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsLoading, grouped, page]);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header compacto */}
        <header className="mb-4">
          <h1 className="text-xl sm:text-2xl font-extrabold text-kf-foreground">{t('menu.title', 'Nosso Cardápio')}</h1>
          <p className="text-sm text-kf-muted">{t('menu.subtitle', 'Escolha seus favoritos')}</p>
        </header>

        {/* Categorias (barra sticky com scroll horizontal) — somente na listagem.
            Com o detalhe do produto aberto (MenuItemModal) a barra é removida do DOM
            para não ficar sobreposta nem reservar espaço. */}
        {!selectedItemId && (
          <CategoryPills
            categories={categoryList}
            selected={activeCategory}
            onSelect={handleCategoryClick}
            loading={categoriesLoading}
            headerOffset={HEADER_OFFSET}
          />
        )}

        {/* Produtos agrupados por categoria */}
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
              retry={() => window.location.reload()}
            />
          )}

          {!itemsLoading && !itemsError && activeItems.length === 0 && (
            <EmptyState
              title={
                selectedCategory
                  ? t('menu.noItemsInCategoryTitle', 'Categoria vazia')
                  : t('menu.noItemsTitle', 'Nenhum produto encontrado')
              }
              description={
                selectedCategory
                  ? t('menu.noItemsInCategoryDesc', 'Não há produtos nesta categoria ainda.')
                  : t('menu.noItemsDesc', 'Tente outra categoria.')
              }
              action={
                selectedCategory
                  ? {
                      label: t('menu.clearFilters', 'Ver todos os produtos'),
                      onClick: () => { setSelectedCategory(null); setPage(1); },
                    }
                  : undefined
              }
            />
          )}

          {!itemsLoading && !itemsError && activeItems.length > 0 && (
            <>
              {grouped.map((group, gi) => {
                const id = sectionId(group.category.id, page);
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

              {pagination && pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    {t('common.previous', 'Anterior')}
                  </Button>
                  <span className="text-sm text-kf-muted">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {t('common.next', 'Próximo')}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {selectedItemId && (
        <MenuItemModal itemId={selectedItemId} onClose={() => setSelectedItemId(null)} />
      )}
      <CartBar />
    </div>
  );
}
