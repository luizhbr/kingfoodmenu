import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi.js';
import MenuItemModal from '../components/MenuItemModal.js';
import ProductImageCarousel from '../components/ProductImageCarousel.js';
import { resolveGallery } from '../lib/gallery.js';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category')
  );
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [page, setPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const { data: apiCategories, isLoading: categoriesLoading, error: categoriesError } = useApi<Category[]>('/api/menu/categories');
  const categories = apiCategories || FALLBACK_CATEGORIES;

  // Build items URL with filters
  const itemsUrl = buildItemsUrl(selectedCategory, debouncedSearch, page);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [pagination, setPagination] = useState<MenuResponse['pagination'] | null>(null);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch items
  useEffect(() => {
    setItemsLoading(true);
    setItemsError(null);
    fetch(itemsUrl.startsWith('http') ? itemsUrl : `${import.meta.env.VITE_API_URL || ''}${itemsUrl}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load menu');
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('API returned non-JSON response');
        }
        return res.json();
      })
      .then((json) => {
        setItems(json.data);
        setPagination(json.pagination);
      })
      .catch((err) => {
          // Fallback to static data when API is not available
          console.warn('Menu API unavailable, using fallback data:', err.message);
          const filtered = selectedCategory
            ? FALLBACK_ITEMS.filter((i: { category: { id: string } }) => i.category.id === selectedCategory)
            : FALLBACK_ITEMS;
          setItems(filtered);
          setPagination({ page: 1, limit: 100, total: filtered.length, totalPages: 1 });
          setItemsError(null);
        })
      .finally(() => setItemsLoading(false));
  }, [itemsUrl]);

  // Sync URL params
  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedCategory) params.category = selectedCategory;
    if (debouncedSearch) params.search = debouncedSearch;
    if (page > 1) params.page = String(page);
    setSearchParams(params, { replace: true });
  }, [selectedCategory, debouncedSearch, page, setSearchParams]);

  const activeCategories = categories?.filter((c) => c.isActive && !c.parentId) || [];
  const activeItems = items.filter((i) => i.isActive && (!i.trackStock || i.stockQty > 0));

  function handleCategoryClick(catId: string | null) {
    setSelectedCategory(catId);
    setPage(1);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Busca prominente — logo abaixo do header (Apple HIG: clarity) */}
      <div className="mb-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder={t('menu.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
      </div>

      {/* Categorias — chips horizontais scrolláveis (Material 3: containment) */}
      <div className="mb-4 -mx-4 sm:-mx-0 px-4 sm:px-0 overflow-x-auto no-scrollbar" role="tablist" aria-label="Categorias">
        <div className="flex gap-2 w-max">
          <button
            onClick={() => handleCategoryClick(null)}
            className={`shrink-0 min-h-[40px] px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              !selectedCategory
                ? 'bg-[#FFD100] text-ink shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t('menu.allCategories')}
          </button>
          {categoriesLoading && (
            <span className="shrink-0 px-4 py-2 text-sm text-gray-400">{t('common.loading')}</span>
          )}
          {activeCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`shrink-0 min-h-[40px] px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[#FFD100] text-ink shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Menu items grid — produtos imediatos */}
        <div className="flex-1">
          {itemsLoading && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5" aria-busy="true" aria-label="Carregando cardápio">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="w-full aspect-[4/3] bg-gray-200 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                    <div className="h-5 bg-gray-200 rounded animate-pulse w-1/3 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {itemsError && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg">
              {t('common.error')}
            </div>
          )}

          {!itemsLoading && !itemsError && activeItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('menu.noItems')}</p>
            </div>
          )}

          {!itemsLoading && activeItems.length > 0 && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                {activeItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow text-left"
                  >
                    <ProductImageCarousel
                      images={resolveGallery(item.image, (item as any).images)}
                      alt={item.name}
                    />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <span className="text-primary-600 font-bold whitespace-nowrap">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {item.category.name}
                        </span>
                        {item._count.options > 0 && (
                          <span className="text-xs text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full">
                            {t('menu.options')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  >
                    {t('locations.previous')}
                  </button>
                  <span className="text-sm text-gray-600">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  >
                    {t('locations.next')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Item detail modal */}
      {selectedItemId && (
        <MenuItemModal
          itemId={selectedItemId}
          onClose={() => setSelectedItemId(null)}
        />
      )}
    </div>
  );
}

function buildItemsUrl(categoryId: string | null, search: string, page: number): string {
  const params = new URLSearchParams();
  if (categoryId) params.set('categoryId', categoryId);
  if (search) params.set('search', search);
  if (page > 1) params.set('page', String(page));
  params.set('limit', '12');
  return `/api/menu/items?${params}`;
}
