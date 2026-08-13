import { useState, useEffect } from 'react';

interface AuditEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  requestId: string | null;
  createdAt: string;
}

const ENTITIES = [
  'MenuItem', 'Categoria', 'Order', 'Coupon', 'Local',
  'Funcionários', 'SiteSettings', 'AutomationRule',
];

const ACTIONS = ['create', 'update', 'delete'];

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
};

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (entityFilter) params.set('entity', entityFilter);
    if (actionFilter) params.set('action', actionFilter);
    if (search) params.set('search', search);

    fetch(`/api/developer/audit-logs?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setLogs(res.data);
          setTotalPages(res.pagination.totalPages);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, entityFilter, actionFilter, search, token]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Registro de auditoria</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          aria-label="Filter by entity"
        >
          <option value="">All Entities</option>
          {ENTITIES.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          aria-label="Filter by action"
        >
          <option value="">All Actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search by email or ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64"
          aria-label="Search audit logs"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="table-responsive"><table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-3 text-left">Data</th>
              <th className="px-6 py-3 text-left">User</th>
              <th className="px-6 py-3 text-left">Action</th>
              <th className="px-6 py-3 text-left">Entity</th>
              <th className="px-6 py-3 text-left">Entity ID</th>
              <th className="px-6 py-3 text-left">IP</th>
              <th className="px-6 py-3 text-left">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td data-label="Data" colSpan={7} className="px-6 py-8 text-center text-gray-500">Carregando...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td data-label="Data" colSpan={7} className="px-6 py-8 text-center text-gray-500">No audit log entries.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td data-label="Data" className="px-6 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td data-label="User" className="px-6 py-3 text-gray-700">{log.userEmail}</td>
                  <td data-label="Action" className="px-6 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td data-label="Entity" className="px-6 py-3 text-gray-700">{log.entity}</td>
                  <td data-label="Entity ID" className="px-6 py-3 text-gray-500 font-mono text-xs">
                    {log.entityId ? log.entityId.substring(0, 12) + '...' : '-'}
                  </td>
                  <td data-label="IP" className="px-6 py-3 text-gray-500 font-mono text-xs">{log.ipAddress || '-'}</td>
                  <td data-label="Detalhes" className="px-6 py-3 text-gray-500 text-xs max-w-[200px] truncate">
                    {log.details ? JSON.stringify(log.details) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table></div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
          >Anterior</button>
          <span className="px-3 py-1 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
          >Próximo</button>
        </div>
      )}
    </div>
  );
}
