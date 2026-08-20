import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  ClipboardIcon, CreditCardIcon, PrinterIcon, ScaleIcon,
  ChevronRightIcon, FlameIcon,
} from '../components/AdminIcons.js';
import { usePermissions } from '../lib/usePermissions.js';

type Role = 'SUPER_ADMIN' | 'MANAGER' | 'STAFF' | 'DRIVER';

interface HubItem {
  path: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  roles: Role[];
  /** Permissões que liberam o item (qualquer uma basta) */
  perms?: string[];
}

interface HubGroup {
  title: string;
  description?: string;
  items: HubItem[];
}

/**
 * Hub VENDER — TUDO relacionado a vendas: pedidos, cozinha, reservas,
 * pagamentos e impressão. Sem duplicatas com a aba Gestão.
 */
export default function VenderHub() {
  const { user } = useAuth();
  const role = user?.role as Role | undefined;
  const { has } = usePermissions();

  const groups: HubGroup[] = [
    {
      title: 'Pedidos',
      description: 'Operação de vendas',
      items: [
      {
        path: '/orders',
        label: 'Pedidos',
        description: 'Todos os pedidos e status',
        icon: <ClipboardIcon className="w-6 h-6" />,
        roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'DRIVER'],
        perms: ['orders.view'],
      },
      {
        path: '/kitchen',
        label: 'Cozinha',
        description: 'Monitor de preparo',
        icon: <FlameIcon className="w-6 h-6" />,
        roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'],
        perms: ['kitchen.view'],
      },
      ],
    },
    {
      title: 'Pagamentos',
      description: 'Recebimento',
      items: [
        { path: '/settings/payment', label: 'Pagamentos online', description: 'Stripe, PayPal e dinheiro', icon: <CreditCardIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN'] },
      ],
    },
    {
      title: 'Impressão',
      description: 'Comandas e recibos',
      items: [
        { path: '/settings/printers', label: 'Impressoras', description: 'Impressão térmica e agente', icon: <PrinterIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['print.view', 'print.settings'] },
        { path: '/settings/print', label: 'Modelos de impressão', description: 'Comanda e recibo', icon: <ScaleIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['print.view', 'print.settings'] },
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
        <h1 className="text-2xl font-extrabold text-kf-foreground">Vendas</h1>
        <p className="text-sm text-kf-muted mt-1">Operação de vendas, pagamentos e impressão</p>
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
                    <h3 className="text-sm font-bold text-kf-foreground">{item.label}</h3>
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
