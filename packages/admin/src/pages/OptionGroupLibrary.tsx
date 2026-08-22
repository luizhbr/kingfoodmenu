import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

interface OptionValue {
  id?: string;
  name: string;
  priceModifier: number;
  isDefault: boolean;
  sortOrder: number;
}

interface OptionGroup {
  id?: string;
  name: string;
  displayType: 'SELECT' | 'RADIO' | 'CHECKBOX' | 'QUANTITY';
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  isActive: boolean;
  values: OptionValue[];
  _count?: { menuItems: number };
}

interface MenuItem {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

const EMPTY_GROUP: OptionGroup = {
  name: '',
  displayType: 'CHECKBOX',
  isRequired: false,
  minSelect: 0,
  maxSelect: 1,
  sortOrder: 0,
  isActive: true,
  values: [{ name: '', priceModifier: 0, isDefault: false, sortOrder: 0 }],
};

export default function OptionGroupLibrary() {
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<OptionGroup | null>(null);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ success: boolean; data: OptionGroup[] }>('/option-groups?includeInactive=true');
      setGroups(res.data || []);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function loadMenuItems(groupId?: string) {
    try {
      const res = await api.get<{ success: boolean; data: MenuItem[] }>('/menu/items?limit=200&includeInactive=true');
      setMenuItems(res.data || []);
      if (groupId) {
        const prodRes = await api.get<{ success: boolean; data: { menuItem: MenuItem }[] }>(`/option-groups/${groupId}/products`);
        setAssignedIds(new Set(prodRes.data.map(p => p.menuItem.id)));
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  function startCreate() {
    setEditing({ ...EMPTY_GROUP, values: [{ name: '', priceModifier: 0, isDefault: false, sortOrder: 0 }] });
    setSuccess('');
    setError('');
  }

  function startEdit(g: OptionGroup) {
    setEditing({ ...g, values: g.values.map(v => ({ ...v })) });
    setSuccess('');
    setError('');
  }

  function addValue() {
    if (!editing) return;
    setEditing({
      ...editing,
      values: [...editing.values, { name: '', priceModifier: 0, isDefault: false, sortOrder: editing.values.length }],
    });
  }

  function removeValue(idx: number) {
    if (!editing || editing.values.length <= 1) return;
    setEditing({
      ...editing,
      values: editing.values.filter((_, i) => i !== idx).map((v, i) => ({ ...v, sortOrder: i })),
    });
  }

  function updateValue(idx: number, field: keyof OptionValue, value: string | number | boolean) {
    if (!editing) return;
    const next = [...editing.values];
    next[idx] = { ...next[idx], [field]: value };
    setEditing({ ...editing, values: next });
  }

  async function save() {
    if (!editing) return;
    if (!editing.name.trim()) { setError('Nome do grupo é obrigatório'); return; }
    if (editing.values.some(v => !v.name.trim())) { setError('Todos os valores precisam de nome'); return; }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        ...editing,
        values: editing.values.map((v, i) => ({ ...v, sortOrder: i })),
      };

      if (editing.id) {
        await api.put(`/option-groups/${editing.id}`, payload);
        setSuccess('Grupo atualizado — todos os produtos vinculados foram atualizados');
      } else {
        await api.post('/option-groups', payload);
        setSuccess('Grupo criado');
      }
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Excluir este grupo? Ele será removido de todos os produtos.')) return;
    try {
      await api.delete(`/option-groups/${id}`);
      setSuccess('Grupo excluído');
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function toggleAssign(productId: string, groupId: string) {
    const isAssigned = assignedIds.has(productId);
    try {
      if (isAssigned) {
        await api.post(`/option-groups/${groupId}/unassign`, { menuItemIds: [productId] });
        setAssignedIds(prev => { const n = new Set(prev); n.delete(productId); return n; });
      } else {
        await api.post(`/option-groups/${groupId}/assign`, { menuItemIds: [productId] });
        setAssignedIds(prev => new Set(prev).add(productId));
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">Carregando…</div>;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Biblioteca de Adicionais</h1>
          <p className="text-sm text-gray-500 mt-1">Crie grupos de adicionais uma vez e atribua a vários produtos</p>
        </div>
        <button
          onClick={startCreate}
          className="bg-[#FFD100] text-ink font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-[#FFD100]/90 min-h-[48px]"
        >
          + Novo grupo
        </button>
      </div>

      {error && <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-3 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{success}</div>}

      {/* Lista de grupos */}
      {!editing && !showAssign && (
        <div className="space-y-3">
          {groups.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">Nenhum grupo criado ainda.</p>
              <p className="text-xs mt-1">Clique em "Novo grupo" para começar.</p>
            </div>
          ) : (
            groups.map(g => (
              <div key={g.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900">{g.name}</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {g.displayType}
                      </span>
                      {g.isRequired && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Obrigatório</span>
                      )}
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                        {g._count?.menuItems ?? 0} produto(s)
                      </span>
                      {!g.isActive && (
                        <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Inativo</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {g.values.map(v => (
                        <span key={v.id ?? v.sortOrder} className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1">
                          {v.name}{v.priceModifier > 0 && ` +$${v.priceModifier.toFixed(2)}`}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => { setShowAssign(g.id!); loadMenuItems(g.id); }}
                      className="text-sm bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 min-h-[40px]"
                    >
                      Atribuir
                    </button>
                    <button
                      onClick={() => startEdit(g)}
                      className="text-sm bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 min-h-[40px]"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => remove(g.id!)}
                      className="text-sm bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 min-h-[40px]"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Editor de grupo */}
      {editing && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-4">{editing.id ? 'Editar grupo' : 'Novo grupo'}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do grupo *</label>
              <input
                type="text"
                value={editing.name}
                onChange={e => setEditing({ ...editing, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Ex: Adicionais"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de exibição</label>
              <select
                value={editing.displayType}
                onChange={e => setEditing({ ...editing, displayType: e.target.value as OptionGroup['displayType'] })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="CHECKBOX">Checkbox (múltipla escolha)</option>
                <option value="RADIO">Rádio (escolha única)</option>
                <option value="SELECT">Select (dropdown)</option>
                <option value="QUANTITY">Quantidade</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.isRequired} onChange={e => setEditing({ ...editing, isRequired: e.target.checked })} />
              Obrigatório
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.isActive} onChange={e => setEditing({ ...editing, isActive: e.target.checked })} />
              Ativo
            </label>
            {editing.isRequired && (
              <div className="flex gap-2">
                <input type="number" min={0} value={editing.minSelect} onChange={e => setEditing({ ...editing, minSelect: Number(e.target.value) })} className="w-20 border rounded px-2 py-1 text-sm" />
                <span className="text-sm text-gray-500 self-center">mín</span>
                <input type="number" min={1} value={editing.maxSelect} onChange={e => setEditing({ ...editing, maxSelect: Number(e.target.value) })} className="w-20 border rounded px-2 py-1 text-sm" />
                <span className="text-sm text-gray-500 self-center">máx</span>
              </div>
            )}
          </div>

          {/* Valores */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Adicionais</h3>
              <button onClick={addValue} className="text-sm text-blue-600 hover:underline">+ Adicionar</button>
            </div>
            <div className="space-y-2">
              {editing.values.map((v, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={v.name}
                    onChange={e => updateValue(i, 'name', e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    placeholder="Nome (ex: Nutella)"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={v.priceModifier}
                      onChange={e => updateValue(i, 'priceModifier', Number(e.target.value))}
                      className="w-20 border rounded-lg px-2 py-2 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    onClick={() => removeValue(i)}
                    disabled={editing.values.length <= 1}
                    className="w-9 h-9 rounded-lg bg-red-50 text-red-600 text-sm disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 min-h-[48px] bg-[#FFD100] text-ink font-bold rounded-xl disabled:opacity-50"
            >
              {saving ? 'Salvando…' : 'Salvar grupo'}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="min-h-[48px] px-6 border border-gray-300 rounded-xl text-gray-700 font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Painel de atribuição */}
      {showAssign && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Atribuir a produtos</h2>
            <button onClick={() => setShowAssign(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕ Fechar</button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {menuItems.map(item => (
              <label
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={assignedIds.has(item.id)}
                  onChange={() => toggleAssign(item.id, showAssign)}
                  className="w-5 h-5 accent-[#FFD100]"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                  {!item.isActive && <span className="ml-2 text-xs text-gray-400">(inativo)</span>}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
