import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  StorefrontIcon, BookOpenIcon, PaintBrushIcon, MapPinIcon,
  CogIcon, ChevronRightIcon, ChartBarIcon, StarIcon,
} from '../components/AdminIcons.js';
import { usePermissions } from '../lib/usePermissions.js';

type Role = 'SUPER_ADMIN' | 'MANAGER' | 'STAFF';

interface HubItem {
  path: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  roles: Role[];
  /** Permissões que liberam o item (qualquer uma basta) */
  perms?: string[];
  external?: boolean;
}

interface HubGroup {
  title: string;
  description?: string;
  items: HubItem[];
}

/**
 * Hub LOJA — operação e configuração da loja.
 * Apenas organização visual: todas as rotas e dados são os existentes.
 */
export default function LojaHub() {
  const { user } = useAuth();
  const role = user?.role as Role | undefined;
  const { has } = usePermissions();

  const groups: HubGroup[] = [
    {
      title: 'Aparência',
      description: 'Site, tema e identidade',
      items: [
        { path: '/design/builder', label: 'Construtor Visual', description: 'Editor visual com preview ao vivo', icon: <PaintBrushIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['settings.general'] },
        { path: '/design/landing', label: 'Página inicial', description: 'Hero, seções e conteúdo', icon: <StarIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['settings.general'] },
        { path: '/design/branding', label: 'Marca', description: 'Logo, favicon e cores', icon: <PaintBrushIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['settings.general'] },
        { path: '/design/theme', label: 'Tema', description: 'Tema e dark mode', icon: <PaintBrushIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['settings.general'] },
        { path: '/design/templates', label: 'Modelos', description: 'Modelos de página', icon: <PaintBrushIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['settings.general'] },
        { path: '/design/gallery', label: 'Galeria', description: 'Imagens da loja', icon: <StarIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['settings.general'] },
      ],
    },
    {
      title: 'Catálogo',
      description: 'Produtos e categorias',
      items: [
        { path: '/menu', label: 'Cardápio', description: 'Itens, preços e opções', icon: <BookOpenIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['menu.view', 'menu.edit', 'menu.create'] },
        { path: '/menu/categories', label: 'Categorias', description: 'Organize os grupos', icon: <BookOpenIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['menu.categories'] },
        { path: '/menu/option-groups', label: 'Adicionais', description: 'Grupos reutilizáveis de adicionais', icon: <BookOpenIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['menu.view', 'menu.edit', 'menu.create'] },
      ],
    },
    {
      title: 'Configurações da loja',
      description: 'Perfil, horários e locais',
      items: [
        { path: '/settings/general', label: 'Perfil da loja', description: 'Nome, fuso e contato', icon: <StorefrontIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['settings.general'] },
        { path: '/locations', label: 'Locais e mesas', description: 'Endereços e capacidade', icon: <MapPinIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['settings.view'] },
        { path: '/settings', label: 'Configurações', description: 'Todas as configurações', icon: <CogIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER'], perms: ['settings.view'] },
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
        <h1 className="text-2xl font-extrabold text-kf-foreground">Loja</h1>
        <p className="text-sm text-kf-muted mt-1">Aparência, catálogo e configurações do seu negócio</p>
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
