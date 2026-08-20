import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Staff {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  location: { id: string; name: string } | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  STAFF: 'bg-gray-100 text-gray-700',
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER: 'Manager',
  STAFF: 'Funcionários',
};

export default function StaffList() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const token = localStorage.getItem('token') || '';
  const currentUserId = (() => {
    try { return JSON.parse(atob(localStorage.getItem('token')?.split('.')[1] || '')).id; } catch { return ''; }
  })();

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (roleFilter) params.set('role', roleFilter);
    if (search) params.set('search', search);

    fetch(`/api/staff?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load staff');
        return res.json();
      })
      .then((data) => {
        setStaff(data.data);
        setPagination(data.pagination);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, roleFilter, search, token]);

  async function handleDelete(target: Staff) {
    if (deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/staff/${target.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete staff member');
      }
      setStaff((prev) => prev.filter((s) => s.id !== target.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete staff member');
    } finally {
      setDeleting(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, isActive } : s)));
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Funcionários</h1>
        <Link
          to="/staff/invite"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors text-center"
        >
          + Convidar Funcionário
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none flex-1 w-full"
          aria-label="Search staff by name or email"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none w-full sm:w-auto"
          aria-label="Filter by role"
        >
          <option value="">Todos os cargos</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="STAFF">Funcionários</option>
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label="Carregando" />
        </div>
      )}

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {!loading && !error && staff.length === 0 && (
        <p className="text-gray-500 text-center py-12">No staff members found.</p>
      )}

      {!loading && staff.length > 0 && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Desktop: tabela completa */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">E-mail</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Função</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Local</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td data-label="Nome" className="px-4 py-3 font-medium">{member.name}</td>
                      <td data-label="E-mail" className="px-4 py-3 text-gray-600">{member.email}</td>
                      <td data-label="Função" className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-700'}`}>
                          {ROLE_LABELS[member.role] || member.role}
                        </span>
                      </td>
                      <td data-label="Local" className="px-4 py-3 text-gray-600">
                        {member.location?.name || '—'}
                      </td>
                      <td data-label="Status" className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(member.id, !member.isActive)}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${member.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                            }`}
                          aria-label={`${member.isActive ? 'Deactivate' : 'Activate'} ${member.name}`}
                        >
                          {member.isActive ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td data-label="Ações" className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/staff/${member.id}`}
                            className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                          >Editar</Link>
                          {member.id !== currentUserId && member.role !== 'SUPER_ADMIN' && (
                            <button
                              onClick={() => setDeleteTarget(member)}
                              className="text-red-600 hover:text-red-700 text-xs font-medium"
                              aria-label={`Excluir ${member.name}`}
                            >Excluir</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Celular (cards empilhados — sem rolagem lateral) */}
            <div className="md:hidden divide-y divide-gray-100">
              {staff.map((member) => (
                <div key={member.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 break-words">{member.name}</div>
                      <div className="text-xs text-gray-500 break-words">{member.email}</div>
                    </div>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-700'}`}>
                      {ROLE_LABELS[member.role] || member.role}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      <span className="font-medium text-gray-600">Local: </span>
                      {member.location?.name || '—'}
                    </div>
                    <button
                      onClick={() => toggleActive(member.id, !member.isActive)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${member.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                        }`}
                      aria-label={`${member.isActive ? 'Deactivate' : 'Activate'} ${member.name}`}
                    >
                      {member.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Link
                      to={`/staff/${member.id}`}
                      className="flex-1 text-center px-3 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium"
                    >Editar</Link>
                    {member.id !== currentUserId && member.role !== 'SUPER_ADMIN' && (
                      <button
                        onClick={() => setDeleteTarget(member)}
                        className="flex-1 text-center px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium"
                      >Excluir</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >Anterior</button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >Próximo</button>
            </div>
          )}
        </>
      )}

      {/* Modal de confirmação de exclusão */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar exclusão"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900">Excluir funcionário?</h2>
            <p className="text-sm text-gray-600 mt-2">
              <strong>{deleteTarget.name}</strong> ({deleteTarget.email}) perderá o acesso
              ao painel imediatamente. O histórico de pedidos dele é mantido.
            </p>
            {deleteError && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mt-3">{deleteError}</div>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >Cancelar</button>
              <button
                onClick={() => void handleDelete(deleteTarget)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
