import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePendingOrders } from './PendingOrdersContext.js';
import {
  StorefrontIcon, GridIcon, ClipboardIcon, FlameIcon,
  ChartBarIcon, BookOpenIcon, TicketIcon, GiftIcon, BoltIcon,
  CogIcon, PaintBrushIcon, ScaleIcon, CodeBracketIcon, UsersIcon,
  MapPinIcon, CalendarIcon, StarIcon, PrinterIcon, FlaskIcon, ShieldCheckIcon,
  CreditCardIcon, EnvelopeIcon,
} from './AdminIcons.js';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface Group {
  title: string;
  items: NavItem[];
}

const GROUPS: Group[] = [
  {
    title: 'Operação',
    items: [
      { path: '/kitchen', label: 'Cozinha', icon: <FlameIcon className="w-5 h-5" /> },
      { path: '/reservations', label: 'Reservas', icon: <CalendarIcon className="w-5 h-5" /> },
      { path: '/locations', label: 'Locais', icon: <MapPinIcon className="w-5 h-5" /> },
    ],
  },
  {
    title: 'Crescimento',
    items: [
      { path: '/reports', label: 'Relatórios', icon: <ChartBarIcon className="w-5 h-5" /> },
      { path: '/reviews', label: 'Avaliações', icon: <StarIcon className="w-5 h-5" /> },
      { path: '/coupons', label: 'Cupons', icon: <TicketIcon className="w-5 h-5" /> },
      { path: '/automation', label: 'Automação', icon: <BoltIcon className="w-5 h-5" /> },
      { path: '/loyalty', label: 'Fidelidade', icon: <GiftIcon className="w-5 h-5" /> },
    ],
  },
  {
    title: 'Loja',
    items: [
      { path: '/menu/items', label: 'Cardápio', icon: <BookOpenIcon className="w-5 h-5" /> },
      { path: '/design/landing', label: 'Personalização', icon: <PaintBrushIcon className="w-5 h-5" /> },
      { path: '/settings', label: 'Configurações', icon: <CogIcon className="w-5 h-5" /> },
      { path: '/settings/printers', label: 'Impressão', icon: <PrinterIcon className="w-5 h-5" /> },
    ],
  },
  {
    title: 'Conta e Sistema',
    items: [
      { path: '/staff', label: 'Funcionários', icon: <UsersIcon className="w-5 h-5" /> },
      { path: '/settings/payment', label: 'Pagamentos', icon: <CreditCardIcon className="w-5 h-5" /> },
      { path: '/settings/mail', label: 'E-mail', icon: <EnvelopeIcon className="w-5 h-5" /> },
      { path: '/developer/metrics', label: 'Métricas da API', icon: <CodeBracketIcon className="w-5 h-5" /> },
      { path: '/legal/pages', label: 'Páginas legais', icon: <ScaleIcon className="w-5 h-5" /> },
      { path: '/legal/cookies', label: 'Cookies', icon: <ShieldCheckIcon className="w-5 h-5" /> },
      { path: '/settings/advanced', label: 'Avançado', icon: <FlaskIcon className="w-5 h-5" /> },
    ],
  },
];

function isActive(path: string, current: string): boolean {
  if (path === '/') return current === '/';
  return current === path || current.startsWith(path + '/');
}

export default function MobileBottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const current = location.pathname;
  const pendingCount = usePendingOrders();

  const mainItems: NavItem[] = [
    { path: '/', label: 'Loja', icon: <StorefrontIcon className="w-6 h-6" /> },
    { path: '/manage', label: 'Gestão', icon: <GridIcon className="w-6 h-6" /> },
    { path: '/orders', label: 'Vender', icon: <ClipboardIcon className="w-6 h-6" /> },
  ];

  return (
    <>
      {/* Bottom navigation (mobile/tablet only) */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-kf-surface/95 backdrop-blur-xl border-t border-kf-border px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
        aria-label="Navegação rápida"
      >
        <div className="flex items-stretch justify-evenly max-w-lg mx-auto">
          {mainItems.map((item) => {
            const active = isActive(item.path, current);
            const showBadge = item.path === '/orders' && pendingCount > 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[76px] py-1.5 rounded-xl transition active:scale-90 min-h-[52px] ${
                  active ? 'text-kf-primary' : 'text-kf-muted'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="relative leading-none" aria-hidden="true">
                  {item.icon}
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-2.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-kf-primary text-kf-primary-fg text-[10px] font-bold">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-bold">{item.label}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-kf-primary" aria-hidden="true" />}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[76px] py-1.5 rounded-xl transition active:scale-90 min-h-[52px] ${
              moreOpen || !mainItems.some((i) => isActive(i.path, current)) ? 'text-kf-primary' : 'text-kf-muted'
            }`}
            aria-label="Mais opções"
            aria-expanded={moreOpen}
          >
            <span className="text-xl leading-none" aria-hidden="true">⋯</span>
            <span className="text-[10px] font-bold">Mais</span>
            {moreOpen && <span className="w-1.5 h-1.5 rounded-full bg-kf-primary" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* More bottom sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mais opções">
          <div className="absolute inset-0 bg-kf-ink/40" onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <div className="absolute bottom-0 inset-x-0 bg-kf-surface rounded-t-2xl shadow-kf-modal max-h-[75vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="sticky top-0 bg-kf-surface/95 backdrop-blur px-4 py-3 flex items-center justify-between border-b border-kf-border rounded-t-2xl">
              <h2 className="text-base font-bold text-kf-foreground">Mais</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-kf-surface-muted text-kf-foreground active:scale-90 transition"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="px-4 py-3 space-y-5">
              {GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-kf-muted mb-1.5 px-1">{group.title}</p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isActive(item.path, current);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMoreOpen(false)}
                          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium min-h-[48px] transition ${
                            active ? 'bg-kf-primary text-kf-primary-fg' : 'text-kf-foreground/80 hover:bg-kf-surface-muted active:bg-kf-surface-muted'
                          }`}
                          aria-current={active ? 'page' : undefined}
                        >
                          <span aria-hidden="true">{item.icon}</span>
                          {item.label}
                          <span className="ml-auto text-kf-muted/40" aria-hidden="true">›</span>
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
