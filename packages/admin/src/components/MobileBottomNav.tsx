import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface BottomNavItem {
  path: string;
  label: string;
  icon: string;
}

interface Group {
  title: string;
  items: BottomNavItem[];
}

const GROUPS: Group[] = [
  {
    title: 'Operação',
    items: [
      { path: '/kitchen', label: 'Cozinha', icon: '🍳' },
      { path: '/orders', label: 'Delivery', icon: '🛵' },
      { path: '/locations', label: 'Locais', icon: '📍' },
      { path: '/reservations', label: 'Reservas', icon: '🗓' },
    ],
  },
  {
    title: 'Crescimento',
    items: [
      { path: '/reviews', label: 'Avaliações', icon: '⭐' },
      { path: '/reports', label: 'Relatórios', icon: '📊' },
      { path: '/coupons', label: 'Cupons', icon: '🏷' },
      { path: '/automation', label: 'Automação', icon: '⚡' },
      { path: '/loyalty', label: 'Fidelidade', icon: '🎁' },
    ],
  },
  {
    title: 'Configuração',
    items: [
      { path: '/settings', label: 'Configurações', icon: '⚙' },
      { path: '/settings/print', label: 'Impressão', icon: '🖨' },
      { path: '/design/landing', label: 'Design', icon: '🎨' },
      { path: '/legal/pages', label: 'Jurídico', icon: '⚖' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { path: '/developer/metrics', label: 'Desenvolvedor', icon: '🛠' },
      { path: '/staff', label: 'Funcionários', icon: '👥' },
    ],
  },
];

function isActive(path: string, current: string): boolean {
  if (path === '/orders') return current.startsWith('/orders');
  if (path === '/menu') return current.startsWith('/menu');
  return current === path || current.startsWith(path + '/');
}

export default function MobileBottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const current = location.pathname;

  const mainItems: BottomNavItem[] = [
    { path: '/orders', label: 'Pedidos', icon: '📋' },
    { path: '/reports', label: 'Vendas', icon: '💰' },
    { path: '/menu', label: 'Cardápio', icon: '🥣' },
  ];

  return (
    <>
      {/* Bottom navigation (mobile/tablet only) */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-cream/95 backdrop-blur-xl border-t border-ink/10 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5"
        aria-label="Navegação rápida"
      >
        <div className="flex items-stretch justify-evenly max-w-lg mx-auto">
          {mainItems.map((item) => {
            const active = isActive(item.path, current);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[72px] py-1.5 rounded-xl transition active:scale-90 min-h-[48px] ${
                  active ? 'text-ink' : 'text-ink/40'
                }`}
              >
                <span className="text-xl leading-none" aria-hidden="true">{item.icon}</span>
                <span className="text-[10px] font-bold">{item.label}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-gold" aria-hidden="true" />}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[72px] py-1.5 rounded-xl transition active:scale-90 min-h-[48px] ${
              moreOpen || (!mainItems.some((i) => isActive(i.path, current))) ? 'text-ink' : 'text-ink/40'
            }`}
            aria-label="Mais opções"
            aria-expanded={moreOpen}
          >
            <span className="text-xl leading-none" aria-hidden="true">⋮</span>
            <span className="text-[10px] font-bold">Mais</span>
            {moreOpen && <span className="w-1.5 h-1.5 rounded-full bg-gold" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* More bottom sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mais opções">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute bottom-0 inset-x-0 bg-cream rounded-t-2xl shadow-2xl max-h-[75vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="sticky top-0 bg-cream/95 backdrop-blur px-4 py-3 flex items-center justify-between border-b border-ink/10 rounded-t-2xl">
              <h2 className="text-base font-bold text-ink">Mais</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-ink/5 text-ink active:scale-90 transition"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="px-4 py-3 space-y-5">
              {GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink/40 mb-1.5 px-1">
                    {group.title}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isActive(item.path, current);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMoreOpen(false)}
                          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium min-h-[48px] transition ${
                            active
                              ? 'bg-ink text-cream'
                              : 'text-ink/80 hover:bg-ink/5 active:bg-ink/10'
                          }`}
                        >
                          <span className="text-base" aria-hidden="true">{item.icon}</span>
                          {item.label}
                          <span className="ml-auto text-ink/25" aria-hidden="true">›</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
