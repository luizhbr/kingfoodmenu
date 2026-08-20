import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  StorefrontIcon, ChartBarIcon, MapPinIcon, StarIcon, TicketIcon, GiftIcon, BoltIcon,
  EnvelopeIcon, BookOpenIcon, PaintBrushIcon, CogIcon,
  CodeBracketIcon, ShieldCheckIcon, UsersIcon,
  FlaskIcon, ChevronRightIcon,
} from '../components/AdminIcons.js';

import { usePermissions } from '../lib/usePermissions.js';

type Role = 'SUPER_ADMIN' | 'MANAGER' | 'STAFF';

interface ManageItem {
  path: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  roles: Role[];
  /** Permissões que liberam o item (qualquer uma basta) */
  perms?: string[];
  badge?: { count: number; label: string };
}

interface ManageGroup {
  title: string;
  description?: string;
  items: ManageItem[];
}

/**
 * Tela Gestão — TUDO relacionado a administração do negócio.
 * Sem duplicatas com a aba Vender (pedidos, cozinha, reservas,
 * pagamentos e impressão ficam em Vender).
 */
export default function Manage({ pendingCount = 0 }: { pendingCount?: number }) {
  const { user } = useAuth();
  const role = user?.role as Role | undefined;
  const { has } = usePermissions();

  const groups: ManageGroup[] = [
    {
      title: 'Operação',
      description: 'Estrutura do negócio',
      items: [
        { path: '/locations', label: 'Locais', description: 'Endereços e mesas', icon: <MapPinIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['settings.view'] },
      ],
    },
    {
      title: 'Financeiro',
      description: 'Vendas e resultados',
      items: [
        { path: '/reports', label: 'Relatórios', description: 'Vendas, receita e tendências', icon: <ChartBarIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['reports.view'] },
        { path: '/settings/mail', label: 'Notificações por e-mail', description: 'SMTP e remetente', icon: <EnvelopeIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN'], perms: ['settings.view'] },
      ],
    },
    {
      title: 'Recursos da loja',
      description: 'Catálogo e relacionamento',
      items: [
        { path: '/menu', label: 'Cardápio', description: 'Itens, categorias e preços', icon: <BookOpenIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['menu.view', 'menu.edit', 'menu.create'] },
        { path: '/design/landing', label: 'Personalização', description: 'Site, tema e marca', icon: <PaintBrushIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['settings.general'] },
        { path: '/loyalty', label: 'Fidelidade', description: 'Pontos e recompensas', icon: <GiftIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['loyalty.view'] },
        { path: '/coupons', label: 'Cupons', description: 'Descontos e promoções', icon: <TicketIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['coupons.view'] },
        { path: '/reviews', label: 'Avaliações', description: 'Moderação de avaliações', icon: <StarIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'], perms: ['reviews.view'] },
      ],
    },
    {
      title: 'Integrações',
      description: 'Conecte seus canais',
      items: [
        { path: '/automation', label: 'Automação', description: 'Regras e fluxos automáticos', icon: <BoltIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['automation.view'] },
      ],
    },
    {
      title: 'Configurações',
      description: 'Estrutura do sistema',
      items: [
        { path: '/settings', label: 'Configurações', description: 'Geral, pedidos e reservas', icon: <CogIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['settings.view'] },
        { path: '/settings/general', label: 'Perfil da loja', description: 'Nome, fuso e contato', icon: <StorefrontIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['settings.general'] },
        { path: '/staff', label: 'Usuários', description: 'Funcionários e permissões', icon: <UsersIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN'], perms: ['staff.view'] },
        { path: '/developer/metrics', label: 'Sistema', description: 'Métricas e auditoria', icon: <CodeBracketIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['settings.view'] },
      ],
    },
  ];

  // Nível 3 (configurações avançadas) — itens que não aparecem no grid principal
  const advancedItems: ManageItem[] = [
    { path: '/legal/pages', label: 'Páginas legais', icon: <ShieldCheckIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['settings.view'] },
    { path: '/legal/cookies', label: 'Cookies', icon: <ShieldCheckIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['settings.view'] },
    { path: '/legal/consent', label: 'Registro de consentimento', icon: <ShieldCheckIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['settings.view'] },
    { path: '/settings/advanced', label: 'Modo de manutenção', icon: <FlaskIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN'], perms: ['settings.view'] },
    { path: '/developer/audit-log', label: 'Registro de auditoria', icon: <FlaskIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN'], perms: ['settings.view'] },
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

  const visibleAdvanced = advancedItems.filter((i) => {
    if (role === 'SUPER_ADMIN') return true;
    if (!i.perms) return !!role && i.roles.includes(role);
    return i.perms.some((p) => has(p as never));
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-kf-foreground">Gestão</h1>
        <p className="text-sm text-kf-muted mt-1">Tudo o que você precisa para administrar o King Food</p>
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

        {visibleAdvanced.length > 0 && (
          <section aria-label="Avançado">
            <div className="mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-kf-muted">Avançado</h2>
            </div>
            <div className="rounded-kf-lg border border-kf-border bg-kf-surface/60 p-1">
              {visibleAdvanced.map((item, i) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-3 min-h-[48px] text-sm font-medium text-kf-foreground hover:bg-kf-surface active:bg-kf-surface-muted transition-colors ${i > 0 ? 'border-t border-kf-border/60' : ''}`}
                >
                  <span className="text-kf-muted">{item.icon}</span>
                  {item.label}
                  <ChevronRightIcon className="w-4 h-4 text-kf-muted/50 ml-auto" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
