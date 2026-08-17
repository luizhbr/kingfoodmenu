import { Link, useLocation } from 'react-router-dom';
import { usePendingOrders } from './PendingOrdersContext.js';
import { MAIN_NAV_ITEMS, getActiveArea } from './mainNav.js';

/**
 * Bottom navigation — ÚNICA navegação principal entre as áreas.
 * Usa MAIN_NAV_ITEMS (fonte única). Fixa em todas as larguras.
 * Estado ativo derivado da rota atual via getActiveArea().
 */
export default function MobileBottomNav() {
  const location = useLocation();
  const pendingCount = usePendingOrders();
  const activeArea = getActiveArea(location.pathname);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-kf-surface/95 backdrop-blur border-t border-kf-border pb-[max(env(safe-area-inset-bottom),0px)]"
      aria-label="Navegação principal"
    >
      <div className="flex items-stretch justify-evenly max-w-lg mx-auto">
        {MAIN_NAV_ITEMS.map((item) => {
          const active = item.path === activeArea;
          const showBadge = item.path === '/pedidos' && pendingCount > 0;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[72px] py-1.5 rounded-xl transition active:scale-90 min-h-[52px] ${
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
      </div>
    </nav>
  );
}
