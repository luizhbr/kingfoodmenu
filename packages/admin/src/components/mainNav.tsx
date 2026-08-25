import { StorefrontIcon, GridIcon, CreditCardIcon, ClipboardIcon } from './AdminIcons.js';

export type Role = 'SUPER_ADMIN' | 'MANAGER' | 'STAFF' | 'DRIVER';

export interface MainNavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
  /** Permissões que liberam esta área (qualquer uma basta) */
  perms?: string[];
}

export const MAIN_NAV_ITEMS: MainNavItem[] = [
  { path: '/loja', label: 'Loja', icon: <StorefrontIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'], perms: ['menu.view', 'settings.view', 'settings.general'] },
  { path: '/manage', label: 'Gestão', icon: <GridIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'], perms: ['reports.view', 'staff.view', 'coupons.view', 'loyalty.view', 'reviews.view', 'settings.view', 'automation.view'] },
  { path: '/vender', label: 'Vendas', icon: <CreditCardIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'], perms: ['orders.view', 'finance.view', 'print.view'] },
  { path: '/pedidos', label: 'Pedidos', icon: <ClipboardIcon className="w-6 h-6" />, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'DRIVER'], perms: ['orders.view', 'kitchen.view'] },
];

/**
 * Mapeamento de rotas de FUNCIONALIDADE → área (mesma fonte de verdade).
 * Permite que subrotas (ex.: /design/builder, /orders, /reports) marquem
 * a área correta na bottom nav sem criar navegação paralela.
 */
// ORDEM IMPORTANTE: prefixos específicos ANTES de genéricos (ex.: /settings/printers
// antes de /settings). A primeira correspondência vence.
const AREA_BY_PREFIX: { prefix: string; area: string }[] = [
  // VENDER — operação de vendas e impressão (específicos de /settings primeiro)
  { prefix: '/settings/printers', area: '/vender' },
  { prefix: '/settings/print', area: '/vender' },
  { prefix: '/settings/payment', area: '/vender' },
  { prefix: '/settings/whatsapp', area: '/vender' },
  // LOJA — aparência, catálogo, perfil, configurações em geral
  { prefix: '/design', area: '/loja' },
  { prefix: '/menu', area: '/loja' },
  { prefix: '/locations', area: '/loja' },
  { prefix: '/settings/general', area: '/loja' },
  { prefix: '/settings', area: '/loja' }, // configurações em geral → Loja (contexto)
  // GESTÃO — crescimento e administração
  { prefix: '/reports', area: '/manage' },
  { prefix: '/reviews', area: '/manage' },
  { prefix: '/coupons', area: '/manage' },
  { prefix: '/loyalty', area: '/manage' },
  { prefix: '/automation', area: '/manage' },
  { prefix: '/staff', area: '/manage' },
  { prefix: '/legal', area: '/manage' },
  { prefix: '/developer', area: '/manage' },
  // PEDIDOS — pedidos e cozinha
  { prefix: '/orders', area: '/pedidos' },
  { prefix: '/kitchen', area: '/pedidos' },
];

/**
 * Identifica a área ativa a partir da rota atual.
 * 1. Rotas dos hubs: /loja, /manage, /vender, /pedidos (+ subrotas /loja/*)
 * 2. Rotas de funcionalidade mapeadas (ex.: /design/builder → /loja)
 * Retorna o path do item ativo ou null (ex.: /login, /accept-invite).
 */
export function getActiveArea(pathname: string): string | null {
  for (const item of MAIN_NAV_ITEMS) {
    if (pathname === item.path || pathname.startsWith(item.path + '/')) {
      return item.path;
    }
  }
  // rota raiz "/" → nenhuma área (Dashboard é página inicial neutra)
  if (pathname === '/') return null;
  for (const map of AREA_BY_PREFIX) {
    if (pathname === map.prefix || pathname.startsWith(map.prefix + '/')) {
      return map.area;
    }
  }
  return null;
}
