import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { usePendingOrders } from '../components/PendingOrdersContext.js';
import { ClipboardIcon, ChevronRightIcon } from '../components/AdminIcons.js';
import { usePermissions } from '../lib/usePermissions.js';

type Role = 'SUPER_ADMIN' | 'MANAGER' | 'STAFF' | 'DRIVER';

interface HubItem {
  path: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  roles: Role[];
  perms?: string[];
  badge?: { count: number; label: string };
}

interface HubGroup {
  title: string;
  description?: string;
  items: HubItem[];
}

/**
 * Hub PEDIDOS — lista e monitor da cozinha.
 */
export default function PedidosHub() {
  const { user } = useAuth();
  const role = user?.role as Role | undefined;
  const { has } = usePermissions();
  const pendingCount = usePendingOrders();

  const groups: HubGroup[] = [
    {
      title: 'Acompanhamento',
      description: 'Monitoramento em tempo real',
      items: [
        {
          path: '/orders',
          label: 'Lista de pedidos',
          description: 'Filtros, status e detalhes',
          icon: <ClipboardIcon className="w-6 h-6" />,
          roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'DRIVER'],
          perms: ['orders.view'],
          badge: pendingCount > 0 ? { count: pendingCount, label: 'pendentes' } : undefined,
        },
        {
          path: '/kitchen',
          label: 'Monitor da cozinha',
          description: 'Preparo em tempo real',
          icon: <ClipboardIcon className="w-6 h-6" />,
          roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'],
          perms: ['kitchen.view'],
        },
      ],
    },
  ];

  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        if (role === 'SUPER_ADMIN') return true;
        if (!i.perms) return !!role && i.roles.includes(role);
        return i.perms.some((p) => has(p as never));
      }),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-kf-foreground">Pedidos</h1>
        <p className="text-sm text-kf-muted mt-1">Acompanhe pedidos e cozinha</p>
      </header>

      <div className="space-y-8">
        {visibleGroups.map((group) => (
          <section key={group.title} aria-label={group.title}>
            <div className="mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-kf-muted">{group.title}</h2>
              {group.description && <p className="text-xs text-kf-muted/70 mt-0.5">{group.description}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="group relative flex flex-col gap-3 rounded-kf-lg border border-kf-border bg-kf-surface p-4 min-h-[110px] transition-all hover:border-kf-primary hover:shadow-kf-card active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-kf-ink/70 group-hover:text-kf-primary transition-colors">{item.icon}</span>
                    <ChevronRightIcon className="w-4 h-4 text-kf-muted/50 group-hover:text-kf-primary transition-colors" />
                  </div>
                  <div className="mt-auto">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-kf-foreground">{item.label}</h3>
                      {item.badge && item.badge.count > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-kf-primary text-kf-primary-fg text-[10px] font-bold" aria-label={`${item.badge.count} ${item.badge.label}`}>
                          {item.badge.count > 99 ? '99+' : item.badge.count}
                        </span>
                      )}
                    </div>
                    {item.description && <p className="text-xs text-kf-muted mt-0.5 line-clamp-1">{item.description}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
