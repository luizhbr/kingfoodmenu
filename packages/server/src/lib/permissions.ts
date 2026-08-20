// ============================================================
// PERMISSÕES DO PAINEL — fonte única de verdade
// Grupos + funções finas. Cada funcionário tem um conjunto.
// ============================================================

export type PermissionGroupId =
  | 'orders'
  | 'kitchen'
  | 'menu'
  | 'reports'
  | 'finance'
  | 'staff'
  | 'settings'
  | 'print'
  | 'loyalty'
  | 'coupons'
  | 'reviews'
  | 'automation';

export type Permission =
  // Pedidos
  | 'orders.view'
  | 'orders.updateStatus'
  | 'orders.delete'
  // Cozinha
  | 'kitchen.view'
  | 'kitchen.updateStatus'
  // Cardápio
  | 'menu.view'
  | 'menu.create'
  | 'menu.edit'
  | 'menu.delete'
  | 'menu.categories'
  // Relatórios
  | 'reports.view'
  // Financeiro
  | 'finance.view'
  | 'finance.refund'
  // Funcionários
  | 'staff.view'
  | 'staff.invite'
  | 'staff.edit'
  | 'staff.delete'
  // Configurações
  | 'settings.view'
  | 'settings.general'
  // Impressão
  | 'print.view'
  | 'print.settings'
  // Fidelidade
  | 'loyalty.view'
  | 'loyalty.manage'
  // Cupons
  | 'coupons.view'
  | 'coupons.manage'
  // Avaliações
  | 'reviews.view'
  | 'reviews.manage'
  // Automação
  | 'automation.view'
  | 'automation.manage';

export interface PermissionEntry {
  key: Permission;
  label: string;
}

export interface PermissionGroup {
  id: PermissionGroupId;
  label: string;
  icon: string;
  permissions: PermissionEntry[];
}

// CATÁLOGO de grupos e funções — usado pelo admin para configurar cada funcionário
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'orders',
    label: 'Pedidos',
    icon: '📋',
    permissions: [
      { key: 'orders.view', label: 'Ver pedidos' },
      { key: 'orders.updateStatus', label: 'Mudar status' },
      { key: 'orders.delete', label: 'Excluir pedidos' },
    ],
  },
  {
    id: 'kitchen',
    label: 'Cozinha',
    icon: '🔥',
    permissions: [
      { key: 'kitchen.view', label: 'Ver cozinha' },
      { key: 'kitchen.updateStatus', label: 'Atualizar preparo' },
    ],
  },
  {
    id: 'menu',
    label: 'Cardápio',
    icon: '🍧',
    permissions: [
      { key: 'menu.view', label: 'Ver cardápio' },
      { key: 'menu.create', label: 'Criar produtos' },
      { key: 'menu.edit', label: 'Editar produtos' },
      { key: 'menu.delete', label: 'Excluir produtos' },
      { key: 'menu.categories', label: 'Gerenciar categorias' },
    ],
  },
  {
    id: 'reports',
    label: 'Relatórios',
    icon: '📊',
    permissions: [
      { key: 'reports.view', label: 'Ver relatórios' },
    ],
  },
  {
    id: 'finance',
    label: 'Financeiro',
    icon: '💳',
    permissions: [
      { key: 'finance.view', label: 'Ver pagamentos' },
      { key: 'finance.refund', label: 'Estornos/reembolsos' },
    ],
  },
  {
    id: 'staff',
    label: 'Funcionários',
    icon: '👥',
    permissions: [
      { key: 'staff.view', label: 'Ver funcionários' },
      { key: 'staff.invite', label: 'Convidar' },
      { key: 'staff.edit', label: 'Editar' },
      { key: 'staff.delete', label: 'Excluir' },
    ],
  },
  {
    id: 'settings',
    label: 'Configurações',
    icon: '⚙️',
    permissions: [
      { key: 'settings.view', label: 'Ver configurações' },
      { key: 'settings.general', label: 'Editar perfil da loja' },
    ],
  },
  {
    id: 'print',
    label: 'Impressão',
    icon: '🖨️',
    permissions: [
      { key: 'print.view', label: 'Ver impressoras/modelos' },
      { key: 'print.settings', label: 'Configurar impressão' },
    ],
  },
  {
    id: 'loyalty',
    label: 'Fidelidade',
    icon: '🎁',
    permissions: [
      { key: 'loyalty.view', label: 'Ver pontos' },
      { key: 'loyalty.manage', label: 'Gerenciar recompensas' },
    ],
  },
  {
    id: 'coupons',
    label: 'Cupons',
    icon: '🎟️',
    permissions: [
      { key: 'coupons.view', label: 'Ver cupons' },
      { key: 'coupons.manage', label: 'Gerenciar cupons' },
    ],
  },
  {
    id: 'reviews',
    label: 'Avaliações',
    icon: '⭐',
    permissions: [
      { key: 'reviews.view', label: 'Ver avaliações' },
      { key: 'reviews.manage', label: 'Moderar avaliações' },
    ],
  },
  {
    id: 'automation',
    label: 'Automação',
    icon: '⚡',
    permissions: [
      { key: 'automation.view', label: 'Ver automações' },
      { key: 'automation.manage', label: 'Gerenciar automações' },
    ],
  },
];

// Permissões padrão por papel
export const ROLE_DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key)),
  MANAGER: PERMISSION_GROUPS.filter((g) => !['staff', 'settings', 'finance', 'automation'].includes(g.id))
    .flatMap((g) => g.permissions.map((p) => p.key)),
  STAFF: [
    'orders.view', 'orders.updateStatus',
    'kitchen.view', 'kitchen.updateStatus',
    'menu.view',
    'print.view',
  ],
  DRIVER: ['orders.view'],
};

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key)
);
