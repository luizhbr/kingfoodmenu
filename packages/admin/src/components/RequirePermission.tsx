import { Navigate } from 'react-router-dom';
import { usePermissions } from '../lib/usePermissions.js';

interface Props {
  /** Qualquer uma destas permissões libera o acesso */
  perms: string[];
  children: React.ReactNode;
}

/**
 * RequirePermission — proteção por permissão fina no frontend.
 * Usa as permissões do funcionário logado (token). Sem permissão → volta para o painel.
 * O backend também bloqueia (requirePermission) — isto é só a camada de UI.
 */
export default function RequirePermission({ perms, children }: Props) {
  const { has } = usePermissions();

  if (perms.length === 0 || perms.some((p) => has(p as never))) {
    return <>{children}</>;
  }

  return <Navigate to="/" replace />;
}
