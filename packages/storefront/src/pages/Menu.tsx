import { useEffect, useMemo, useState } from 'react';
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
import { QuickSearch } from '../components/QuickSearch.js';
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

export default function Menu() {
  const { t } = useTranslation();
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('category'));
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [page, setPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [items, setItems] = useState<MenuItem[]>([]);
  const [pagination, setPagination] = useState<MenuResponse['pagination'] | null>(null);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<Error | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch categories
  useEffect(() => {
    fetch('/api/menu/categories')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setCategories((d?.data || []).filter((c: Category) => c.isActive && !c.parentId)))
      .catch(() => setCategories(FALLBACK_CATEGORIES.filter((c) => c.isActive && !c.parentId) as Category[]))
      .finally(() => setCategoriesLoading(false));
  }, []);

  // Build items URL
  const itemsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('categoryId', selectedCategory);
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (page > 1) params.set('page', String(page));
    params.set('limit', '12');
    const apiBase = import.meta.env.VITE_API_URL || '';
    return `${apiBase}/api/menu/items?${params}`;
  }, [selectedCategory, debouncedSearch, page]);

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

  // Sync URL params
  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedCategory) params.category = selectedCategory;
    if (debouncedSearch) params.search = debouncedSearch;
    if (page > 1) params.page = String(page);
    setSearchParams(params, { replace: true });
  }, [selectedCategory, debouncedSearch, page, setSearchParams]);

  const categoryList = useMemo(
    () => (categoriesLoading ? [] : categories.map((c) => ({ id: c.id, name: c.name }))),
    [categories, categoriesLoading]
  );

  const activeItems = useMemo(
    () => items.filter((i) => i.isActive && (!i.trackStock || i.stockQty > 0)),
    [items]
  );

  function handleCategoryClick(catId: string | null) {
    setSelectedCategory(catId);
    setPage(1);
  }

  function handleSearch(q: string) {
    setSearch(q);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header compacto */}
        <header className="mb-4">
          <h1 className="text-xl sm:text-2xl font-extrabold text-kf-foreground">{t('menu.title', 'Cardápio')}</h1>
          <p className="text-sm text-kf-muted">{t('menu.subtitle', 'Escolha seus favoritos')}</p>
        </header>

        {/* Busca */}
        <QuickSearch initialValue={search} />

        {/* Categorias */}
        <CategoryPills
          categories={categoryList}
          selected={selectedCategory}
          onSelect={handleCategoryClick}
          loading={categoriesLoading}
        />

        {/* Grid de produtos */}
        <div className="mt-4">
          {itemsLoading && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label={t('menu.loading', 'Carregando cardápio')}>
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
              title={t('menu.noItemsTitle', 'Nenhum produto encontrado')}
              description={t('menu.noItemsDesc', 'Tente outra busca ou categoria.')}
              action={{ label: t('menu.clearFilters', 'Limpar filtros'), onClick: () => { setSelectedCategory(null); setSearch(''); } }}
            />
          )}

          {!itemsLoading && activeItems.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {activeItems.map((item) => (
                  <ProductCard
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    description={item.description || undefined}
                    price={item.price}
                    image={item.image || undefined}
                    badge={item._count.options > 0 ? t('menu.options', 'Opções') : undefined}
                    onClick={() => setSelectedItemId(item.id)}
                    onAdd={() => handleQuickAdd(item)}
                  />
                ))}
              </div>

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
    </div>
  );
}
