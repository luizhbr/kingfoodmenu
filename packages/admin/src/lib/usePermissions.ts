import { useAuth } from '../context/AuthContext.js';
import { PERMISSION_GROUPS, Permission } from '@kitchenasty/shared/permissions';

// Derivação local: mesmo conteúdo de ALL_PERMISSIONS do shared
const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key)
);

/**
 * usePermissions — acesso às permissões do funcionário logado.
 * SUPER_ADMIN tem tudo. Fallback: padrão do papel (vem do backend).
 */
export function usePermissions() {
  const { user } = useAuth();

  // SUPER_ADMIN sempre tem acesso total
  if (user?.role === 'SUPER_ADMIN') {
    return {
      permissions: ALL_PERMISSIONS,
      has: (_perm: Permission) => true,
      hasAny: (_perms: Permission[]) => true,
      groupEnabled: (_id: string) => true,
    };
  }

  const perms: Permission[] = (user?.permissions?.length ? user.permissions : []) as Permission[];

  return {
    permissions: perms,
    has: (perm: Permission) => perms.includes(perm),
    hasAny: (permsNeeded: Permission[]) => permsNeeded.some((p) => perms.includes(p)),
    groupEnabled: (id: string) => {
      const group = PERMISSION_GROUPS.find((g) => g.id === id);
      if (!group) return false;
      return group.permissions.some((p) => perms.includes(p.key));
    },
  };
}
