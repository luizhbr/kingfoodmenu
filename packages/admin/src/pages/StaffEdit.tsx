import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PERMISSION_GROUPS, ROLE_DEFAULT_PERMISSIONS, Permission } from '@kitchenasty/shared/permissions';

interface Staff {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[] | null;
  phone: string | null;
  isActive: boolean;
  locationId: string | null;
  location: { id: string; name: string } | null;
}

interface Location {
  id: string;
  name: string;
}

export default function StaffEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [staff, setStaff] = useState<Staff | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [locationId, setLocationId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState('');
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    Promise.all([
      fetch(`/api/staff/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/locations?limit=100', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([staffData, locData]) => {
        if (!staffData.success) throw new Error(staffData.error || 'Failed to load staff');
        const s = staffData.data as Staff;
        setStaff(s);
        setName(s.name);
        setRole(s.role);
        setPhone(s.phone || '');
        setLocationId(s.locationId || '');
        setIsActive(s.isActive);
        if (locData.success) setLocations(locData.data || []);
        // Permissões: as salvas ou o padrão do papel
        const saved = s.permissions?.length
          ? s.permissions
          : (ROLE_DEFAULT_PERMISSIONS[s.role as keyof typeof ROLE_DEFAULT_PERMISSIONS] as string[] | undefined) || [];
        setPermissions(new Set(saved));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  const togglePerm = (key: string) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (groupKey: string) => {
    const group = PERMISSION_GROUPS.find((g) => g.id === groupKey);
    if (!group) return;
    const keys = group.permissions.map((p) => p.key);
    setPermissions((prev) => {
      const next = new Set(prev);
      const allOn = keys.every((k) => next.has(k));
      if (allOn) keys.forEach((k) => next.delete(k));
      else keys.forEach((k) => next.add(k));
      return next;
    });
  };

  const groupState = (groupKey: string): 'all' | 'some' | 'none' => {
    const group = PERMISSION_GROUPS.find((g) => g.id === groupKey);
    if (!group) return 'none';
    const keys = group.permissions.map((p) => p.key);
    const on = keys.filter((k) => permissions.has(k)).length;
    if (on === 0) return 'none';
    if (on === keys.length) return 'all';
    return 'some';
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name,
          role,
          phone: phone || null,
          locationId: locationId || null,
          isActive,
          permissions: [...permissions],
          ...(password ? { password } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      navigate('/staff');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!staff) {
    return <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error || 'Staff not found'}</div>;
  }

  const isSuperAdmin = role === 'SUPER_ADMIN';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/staff" className="text-gray-400 hover:text-gray-600">← Back</Link>
        <h1 className="text-2xl font-bold text-gray-900">Editar funcionário</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>
        )}

        {/* Dados básicos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Dados básicos</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={staff.email}
              disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  // Ao trocar o papel, preenche as permissões padrão do papel
                  const defaults = ROLE_DEFAULT_PERMISSIONS[e.target.value as keyof typeof ROLE_DEFAULT_PERMISSIONS];
                  if (defaults) setPermissions(new Set(defaults));
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="STAFF">Funcionário</option>
                <option value="DRIVER">Entregador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">—</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nova senha <span className="text-gray-400 font-normal">(opcional — deixe vazio para manter)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Funcionário ativo</span>
          </label>
        </div>

        {/* Permissões */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900">Ferramentas disponíveis</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isSuperAdmin
                  ? 'Super Admin tem acesso a tudo (não precisa configurar).'
                  : `${permissions.size} permissões selecionadas — o funcionário vê só o que está liberado.`}
              </p>
            </div>
          </div>

          {isSuperAdmin ? (
            <p className="text-sm text-gray-400 bg-gray-50 rounded-lg p-4">
              🛡️ Super Admin acessa todas as ferramentas do painel.
            </p>
          ) : (
            <div className="space-y-3">
              {PERMISSION_GROUPS.map((group) => {
                const state = groupState(group.id);
                return (
                  <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <span aria-hidden="true">{group.icon}</span> {group.label}
                      </span>
                      <span
                        className={`w-5 h-5 rounded border flex items-center justify-center text-xs font-bold ${
                          state === 'all'
                            ? 'bg-primary-600 border-primary-600 text-white'
                            : state === 'some'
                            ? 'bg-primary-100 border-primary-400 text-primary-700'
                            : 'border-gray-300 text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                    </button>
                    <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.permissions.map((p) => (
                        <label key={p.key} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={permissions.has(p.key)}
                            onChange={() => togglePerm(p.key)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Link to="/staff" className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
