import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

interface Template {
  id?: string;
  name: string;
  type: string;
  isDefault: boolean;
  enabled: boolean;
  showLogo: boolean;
  logoUrl: string | null;
  logoAlignment: string;
  logoWidth: number;
  showBusinessName: boolean;
  businessName: string;
  showPhone: boolean;
  phone: string | null;
  showAddress: boolean;
  address: string | null;
  showInstagram: boolean;
  instagram: string | null;
  showOrderNumber: boolean;
  showDateTime: boolean;
  showOrderType: boolean;
  showCustomer: boolean;
  showCustomerPhone: boolean;
  showDeliveryAddress: boolean;
  showNotes: boolean;
  showQuantity: boolean;
  showItemName: boolean;
  showModifiers: boolean;
  showPrices: boolean;
  showSubtotal: boolean;
  showDeliveryFee: boolean;
  showDiscount: boolean;
  showTax: boolean;
  showTotal: boolean;
  showPaymentMethod: boolean;
  showFooter: boolean;
  footerText: string | null;
  footerAlignment: string;
  separatorStyle: string;
  fontSize: string;
  boldBusinessName: boolean;
  boldOrderNumber: boolean;
  boldTotal: boolean;
  lineWidth: number;
  paperWidth: number;
  characterWidth: number;
}

const EMPTY: Template = {
  name: 'Kitchen', type: 'KITCHEN', isDefault: true, enabled: true,
  showLogo: false, logoUrl: null, logoAlignment: 'center', logoWidth: 48,
  showBusinessName: true, businessName: 'KING FOOD',
  showPhone: false, phone: '', showAddress: false, address: '',
  showInstagram: false, instagram: '',
  showOrderNumber: true, showDateTime: true, showOrderType: true,
  showCustomer: false, showCustomerPhone: false, showDeliveryAddress: false, showNotes: true,
  showQuantity: true, showItemName: true, showModifiers: true, showPrices: false,
  showSubtotal: false, showDeliveryFee: false, showDiscount: false, showTax: false,
  showTotal: false, showPaymentMethod: false,
  showFooter: false, footerText: '', footerAlignment: 'center',
  separatorStyle: 'dashes', fontSize: 'medium',
  boldBusinessName: true, boldOrderNumber: true, boldTotal: true,
  lineWidth: 42, paperWidth: 80, characterWidth: 48,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-2">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded" />
      {label}
    </label>
  );
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-2 py-1.5 text-sm"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export default function SettingsPrint() {
  const token = localStorage.getItem('token') || '';
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [t, setT] = useState<Template>(EMPTY);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const api = useCallback(async (path: string, opts: RequestInit = {}) => {
    const res = await fetch(path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    return res.json();
  }, [token]);

  const refreshPreview = useCallback((tpl: Template) => {
    // Local preview — never sends to printer
    const W = tpl.characterWidth || 48;
    const sep = tpl.separatorStyle === 'equals' ? '='.repeat(W) : tpl.separatorStyle === 'none' ? '' : '-'.repeat(W);
    const lines: string[] = [];
    if (tpl.showLogo && tpl.logoUrl) lines.push('[LOGO]');
    if (tpl.showBusinessName && tpl.businessName) lines.push(tpl.businessName.padEnd(W));
    if (tpl.showPhone && tpl.phone) lines.push(tpl.phone.padEnd(W));
    if (tpl.showAddress && tpl.address) lines.push(tpl.address.padEnd(W));
    if (tpl.showInstagram && tpl.instagram) lines.push(tpl.instagram.padEnd(W));
    if (sep) lines.push(sep);
    if (tpl.showOrderNumber) lines.push(`PEDIDO #KF-123456`.padEnd(W));
    if (tpl.showDateTime) lines.push(`12/08/2026 16:41`.padEnd(W));
    if (tpl.showOrderType) lines.push(`PICKUP`.padEnd(W));
    if (sep) lines.push(sep);
    if (tpl.showCustomer) lines.push(`CLIENTE: Maria Silva`);
    if (tpl.showCustomerPhone) lines.push(`TEL: (614) 555-0134`);
    if (tpl.showDeliveryAddress) lines.push(`END: 123 Main St, Columbus, OH`);
    lines.push(`1x Açaí King Tradicional Bowl`);
    if (tpl.showModifiers) { lines.push(`   + Banana`); lines.push(`   + Morango`); }
    if (tpl.showPrices) lines.push(`   $12.90`);
    lines.push(`2x Coxinha de Frango`);
    if (tpl.showPrices) lines.push(`   $4.00`);
    if (sep) lines.push(sep);
    const money = (label: string, v: string) => label.padEnd(W - v.length) + v;
    if (tpl.showSubtotal) lines.push(money('Subtotal', '$16.90'));
    if (tpl.showDeliveryFee) lines.push(money('Delivery', '$3.50'));
    if (tpl.showDiscount) lines.push(money('Discount', '-$2.00'));
    if (tpl.showTax) lines.push(money('Tax', '$1.35'));
    if (tpl.showTotal) lines.push(money('TOTAL', '$18.25'));
    if (tpl.showPaymentMethod) lines.push(`PAGAMENTO: CARD`);
    if (tpl.showNotes) lines.push(`OBS: Sem cebola`);
    if (tpl.showFooter && tpl.footerText) { if (sep) lines.push(sep); lines.push(tpl.footerText.padEnd(W)); }
    setPreview(lines.join('\n'));
  }, []);

  useEffect(() => {
    api('/api/admin/print/templates')
      .then((res) => {
        if (res.success && res.data) {
          setTemplates(res.data);
          if (res.data.length > 0) {
            setSelectedId(res.data[0].id);
            setT(res.data[0]);
            refreshPreview(res.data[0]);
          } else {
            // No saved templates yet — show the default (legacy) design so the
            // preview is never blank and the user sees what they are editing.
            setT(EMPTY);
            refreshPreview(EMPTY);
          }
        } else {
          setT(EMPTY);
          refreshPreview(EMPTY);
        }
      })
      .catch(() => {
        setT(EMPTY);
        refreshPreview(EMPTY);
      })
      .finally(() => setLoading(false));
  }, [api, refreshPreview]);

  function selectTemplate(id: string) {
    setSelectedId(id);
    const tpl = templates.find((x) => x.id === id);
    if (tpl) { setT(tpl); refreshPreview(tpl); }
  }

  function update<K extends keyof Template>(key: K, value: Template[K]) {
    const next = { ...t, [key]: value };
    setT(next);
    refreshPreview(next);
  }

  async function handleSave() {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await api(selectedId ? `/api/admin/print/templates/${selectedId}` : '/api/admin/print/templates', {
        method: selectedId ? 'PUT' : 'POST',
        body: JSON.stringify(t),
      });
      if (res.success) {
        setSuccess('Alterações salvas');
        if (!selectedId && res.data?.id) {
          setSelectedId(res.data.id);
          setTemplates((prev) => [...prev, res.data]);
        } else if (selectedId) {
          setTemplates((prev) => prev.map((x) => (x.id === selectedId ? res.data : x)));
        }
      } else {
        setError(res.error || 'Erro ao salvar');
      }
    } catch {
      setError('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  function handleRestore() {
    setT(EMPTY);
    refreshPreview(EMPTY);
    setSuccess('Configuração restaurada para o padrão');
  }

  async function handleTestPrint() {
    setError(''); setSuccess('');
    try {
      const res = await api('/api/admin/print/templates/test', { method: 'POST', body: JSON.stringify({ templateId: selectedId || undefined }) });
      if (res.success) setSuccess('Teste renderizado — envie pelo agente para imprimir');
      else setError(res.error || 'Erro no teste');
    } catch {
      setError('Erro no teste');
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    const fd = new FormData();
    fd.append('logo', file);
    try {
      const res = await fetch(`/api/admin/print/templates/${selectedId}/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        setT((prev) => ({ ...prev, logoUrl: json.data.logoUrl, showLogo: true, logoWidth: json.data.width }));
        refreshPreview({ ...t, logoUrl: json.data.logoUrl, showLogo: true, logoWidth: json.data.width });
        setSuccess('Logo enviado');
      } else {
        setError(json.error || 'Erro no upload');
      }
    } catch {
      setError('Erro no upload');
    }
  }

  if (loading) return <div className="p-6 text-gray-500">Carregando…</div>;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Personalização da Comanda</h1>
          <p className="text-sm text-gray-500">Configuração da impressão térmica 80mm</p>
        </div>
        <Link to="/settings" className="text-sm text-orange-600 hover:underline">← Configurações</Link>
      </div>

      {error && <div className="mb-3 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      {success && <div className="mb-3 p-3 bg-green-50 text-green-700 rounded text-sm">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Editor ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <select value={selectedId} onChange={(e) => selectTemplate(e.target.value)} className="border rounded px-2 py-1.5 text-sm flex-1">
              {templates.length === 0 && <option value="">Novo template</option>}
              {templates.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.type})</option>)}
            </select>
            <button onClick={() => { setSelectedId(''); setT({ ...EMPTY, name: 'Novo' }); refreshPreview({ ...EMPTY, name: 'Novo' }); }} className="text-sm bg-gray-100 hover:bg-gray-200 rounded px-3 py-1.5">Novo</button>
          </div>

          <Section title="Cabeçalho">
            <Check label="Mostrar logo" checked={t.showLogo} onChange={(v) => update('showLogo', v)} />
            <Check label="Mostrar nome da empresa" checked={t.showBusinessName} onChange={(v) => update('showBusinessName', v)} />
            <TextInput label="Nome da empresa" value={t.businessName} onChange={(v) => update('businessName', v)} />
            <Check label="Mostrar telefone" checked={t.showPhone} onChange={(v) => update('showPhone', v)} />
            <TextInput label="Telefone" value={t.phone || ''} onChange={(v) => update('phone', v)} />
            <Check label="Mostrar endereço" checked={t.showAddress} onChange={(v) => update('showAddress', v)} />
            <TextInput label="Endereço" value={t.address || ''} onChange={(v) => update('address', v)} />
            <Check label="Mostrar Instagram" checked={t.showInstagram} onChange={(v) => update('showInstagram', v)} />
            <TextInput label="Instagram" value={t.instagram || ''} onChange={(v) => update('instagram', v)} />
          </Section>

          <Section title="Logo">
            <input type="file" accept="image/png,image/jpeg" onChange={handleLogoUpload} className="text-sm" />
            <p className="text-xs text-gray-400">PNG/JPEG até 512 KB. Convertido para bitmap 1-bit térmico.</p>
            <Select label="Alinhamento da logo" value={t.logoAlignment} onChange={(v) => update('logoAlignment', v)} options={[
              { value: 'left', label: 'Esquerda' }, { value: 'center', label: 'Centro' }, { value: 'right', label: 'Direita' },
            ]} />
          </Section>

          <Section title="Pedido">
            <Check label="Mostrar número do pedido" checked={t.showOrderNumber} onChange={(v) => update('showOrderNumber', v)} />
            <Check label="Mostrar data/hora" checked={t.showDateTime} onChange={(v) => update('showDateTime', v)} />
            <Check label="Mostrar tipo (PICKUP/DELIVERY)" checked={t.showOrderType} onChange={(v) => update('showOrderType', v)} />
            <Check label="Mostrar observações" checked={t.showNotes} onChange={(v) => update('showNotes', v)} />
          </Section>

          <Section title="Cliente">
            <Check label="Mostrar cliente" checked={t.showCustomer} onChange={(v) => update('showCustomer', v)} />
            <Check label="Mostrar telefone do cliente" checked={t.showCustomerPhone} onChange={(v) => update('showCustomerPhone', v)} />
            <Check label="Mostrar endereço de entrega" checked={t.showDeliveryAddress} onChange={(v) => update('showDeliveryAddress', v)} />
          </Section>

          <Section title="Produtos">
            <Check label="Mostrar quantidade" checked={t.showQuantity} onChange={(v) => update('showQuantity', v)} />
            <Check label="Mostrar nome do item" checked={t.showItemName} onChange={(v) => update('showItemName', v)} />
            <Check label="Mostrar adicionais" checked={t.showModifiers} onChange={(v) => update('showModifiers', v)} />
            <Check label="Mostrar preços" checked={t.showPrices} onChange={(v) => update('showPrices', v)} />
          </Section>

          <Section title="Valores">
            <Check label="Mostrar subtotal" checked={t.showSubtotal} onChange={(v) => update('showSubtotal', v)} />
            <Check label="Mostrar taxa de entrega" checked={t.showDeliveryFee} onChange={(v) => update('showDeliveryFee', v)} />
            <Check label="Mostrar desconto" checked={t.showDiscount} onChange={(v) => update('showDiscount', v)} />
            <Check label="Mostrar imposto" checked={t.showTax} onChange={(v) => update('showTax', v)} />
            <Check label="Mostrar total" checked={t.showTotal} onChange={(v) => update('showTotal', v)} />
            <Check label="Mostrar método de pagamento" checked={t.showPaymentMethod} onChange={(v) => update('showPaymentMethod', v)} />
          </Section>

          <Section title="Rodapé">
            <Check label="Mostrar rodapé" checked={t.showFooter} onChange={(v) => update('showFooter', v)} />
            <TextInput label="Texto do rodapé" value={t.footerText || ''} onChange={(v) => update('footerText', v)} />
            <Select label="Alinhamento do rodapé" value={t.footerAlignment} onChange={(v) => update('footerAlignment', v)} options={[
              { value: 'left', label: 'Esquerda' }, { value: 'center', label: 'Centro' }, { value: 'right', label: 'Direita' },
            ]} />
          </Section>

          <Section title="Impressora">
            <Select label="Template" value={t.type} onChange={(v) => update('type', v)} options={[
              { value: 'KITCHEN', label: 'Kitchen' }, { value: 'CUSTOMER', label: 'Customer' }, { value: 'DELIVERY', label: 'Delivery' },
            ]} />
            <Select label="Tamanho" value={t.fontSize} onChange={(v) => update('fontSize', v)} options={[
              { value: 'small', label: 'Pequeno' }, { value: 'medium', label: 'Médio' }, { value: 'large', label: 'Grande' },
            ]} />
            <Select label="Papel" value={String(t.paperWidth)} onChange={(v) => update('paperWidth', Number(v))} options={[
              { value: '80', label: '80mm' }, { value: '58', label: '58mm' },
            ]} />
            <Select label="Separador" value={t.separatorStyle} onChange={(v) => update('separatorStyle', v)} options={[
              { value: 'dashes', label: 'Traços' }, { value: 'equals', label: 'Igual' }, { value: 'none', label: 'Nenhum' },
            ]} />
          </Section>

          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50">
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </button>
            <button onClick={handleRestore} className="bg-gray-100 hover:bg-gray-200 rounded px-4 py-2 text-sm">Restaurar padrão</button>
            <button onClick={handleTestPrint} className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm">Imprimir teste</button>
          </div>
        </div>

        {/* ── Preview ── */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Pré-visualização 80mm</h3>
          <div className="bg-white rounded-lg shadow p-4 flex justify-center">
            <pre className="font-mono text-[11px] leading-tight bg-white text-black whitespace-pre-wrap" style={{ width: '240px', fontFamily: 'monospace' }}>
              {preview}
            </pre>
          </div>
          <p className="text-xs text-gray-400 mt-2">O preview não envia nada para a impressora.</p>
        </div>
      </div>
    </div>
  );
}
