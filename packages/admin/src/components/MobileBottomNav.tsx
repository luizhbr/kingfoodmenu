import { Link, useLocation } from 'react-router-dom';
import { usePendingOrders } from './PendingOrdersContext.js';
import { StorefrontIcon, GridIcon, ClipboardIcon } from './AdminIcons.js';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

function isActive(path: string, current: string): boolean {
  if (path === '/') return current === '/';
  return current === path || current.startsWith(path + '/');
}

/**
 * Bottom navigation mobile — apenas os 4 destinos principais.
 * Todas as demais funcionalidades ficam nos hubs (Loja/Gestão/Vender/Pedidos).
 */
export default function MobileBottomNav() {
  const location = useLocation();
  const current = location.pathname;
  const pendingCount = usePendingOrders();

  const mainItems: NavItem[] = [
    { path: '/loja', label: 'Loja', icon: <StorefrontIcon className="w-6 h-6" /> },
    { path: '/manage', label: 'Gestão', icon: <GridIcon className="w-6 h-6" /> },
    { path: '/vender', label: 'Vender', icon: <ClipboardIcon className="w-6 h-6" /> },
    { path: '/pedidos', label: 'Pedidos', icon: <ClipboardIcon className="w-6 h-6" /> },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-kf-surface/95 backdrop-blur border-t border-kf-border pb-[max(env(safe-area-inset-bottom),0px)]"
      aria-label="Navegação principal"
    >
      <div className="flex items-stretch justify-evenly max-w-lg mx-auto">
        {mainItems.map((item) => {
          const active = isActive(item.path, current);
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
