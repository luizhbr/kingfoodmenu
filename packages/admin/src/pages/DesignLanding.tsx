import { useState, useEffect } from 'react';

interface HeroSection {
  title?: string;
  subtitle?: string;
  ctaPrimaryText?: string;
  ctaPrimaryLink?: string;
  ctaSecondaryText?: string;
  ctaSecondaryLink?: string;
  backgroundImage?: string;
}
interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}
interface CtaSection {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
}
interface SocialLink {
  platform: string;
  label: string;
  url: string;
  icon?: string;
  enabled?: boolean;
}
interface HoursRow {
  day: number;
  label: string;
  hours: string;
}
interface LandingHours {
  enabled?: boolean;
  rows?: HoursRow[];
  timezone?: string;
}
interface LandingContact {
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
}
interface SettingsData {
  heroSection?: HeroSection;
  featuresSection?: FeatureItem[];
  ctaSection?: CtaSection;
  landingSocial?: SocialLink[];
  landingHours?: LandingHours;
  landingContact?: LandingContact;
}

type TabName = 'hero' | 'features' | 'cta' | 'social' | 'hours' | 'contact';

const DEFAULT_HOURS: HoursRow[] = [
  { day: 0, label: 'Domingo', hours: '6:00 PM – 10:30 PM' },
  { day: 1, label: 'Segunda-feira', hours: '7:00 PM – 10:00 PM' },
  { day: 2, label: 'Terça-feira', hours: 'Fechado' },
  { day: 3, label: 'Quarta-feira', hours: '7:00 PM – 10:00 PM' },
  { day: 4, label: 'Quinta-feira', hours: '7:00 PM – 10:00 PM' },
  { day: 5, label: 'Sexta-feira', hours: 'Fechado' },
  { day: 6, label: 'Sábado', hours: '9:00 PM – 11:00 PM' },
];

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function Field({ label, value, onChange, placeholder, type = 'text', rows, error }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; rows?: number; error?: string;
}) {
  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {rows ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
          className={inputClass} placeholder={placeholder} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          className={inputClass} placeholder={placeholder} />
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function validateUrl(url: string): boolean {
  if (!url) return true;
  try { new URL(url); return true; }
  catch { return url.startsWith('/') || url.startsWith('#'); }
}

export default function DesignLanding() {
  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<TabName>('hero');
  const [data, setData] = useState<SettingsData>({});
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true); setError(''); setSuccess('');
    const body: Record<string, any> = {};
    switch (tab) {
      case 'hero': body.heroSection = data.heroSection || {}; break;
      case 'features': body.featuresSection = data.featuresSection || []; break;
      case 'cta': body.ctaSection = data.ctaSection || {}; break;
      case 'social': body.landingSocial = data.landingSocial || []; break;
      case 'hours': body.landingHours = data.landingHours || { enabled: true, rows: DEFAULT_HOURS, timezone: 'America/New_York' }; break;
      case 'contact': body.landingContact = data.landingContact || {}; break;
    }
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (d.success) {
        setSuccess('Salvo com sucesso');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof d.error === 'string' ? d.error : 'Falha ao salvar');
      }
    } catch {
      setError('Erro de rede');
    } finally { setSaving(false); }
  }

  function validateAndSave() {
    const errs: Record<string, string> = {};
    if (tab === 'hero') {
      const h = data.heroSection || {};
      if (h.ctaPrimaryLink && !validateUrl(h.ctaPrimaryLink)) errs.ctaPrimaryLink = 'URL inv\u00e1lida';
      if (h.ctaSecondaryLink && !validateUrl(h.ctaSecondaryLink)) errs.ctaSecondaryLink = 'URL inv\u00e1lida';
      if (h.backgroundImage && !validateUrl(h.backgroundImage)) errs.backgroundImage = 'URL inv\u00e1lida';
    }
    if (tab === 'social') {
      (data.landingSocial || []).forEach((s, i) => {
        if (s.url && !validateUrl(s.url)) errs[`social_${i}`] = `URL inv\u00e1lida em "${s.label || s.platform}"`;
      });
    }
    setUrlErrors(errs);
    if (Object.keys(errs).length > 0) return;
    handleSave();
  }

  if (loading) return <div className="p-6 text-gray-500">Carregando...</div>;

  const tabs: { key: TabName; label: string }[] = [
    { key: 'hero', label: 'Hero' },
    { key: 'features', label: 'Destaques' },
    { key: 'cta', label: 'CTA Final' },
    { key: 'social', label: 'Redes' },
    { key: 'hours', label: 'Hor\u00e1rios' },
    { key: 'contact', label: 'Contato' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-gray-900 truncate">P\u00e1gina inicial</h1>
        <button onClick={validateAndSave} disabled={saving}
          className="shrink-0 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition">
          {saving ? 'Salvando\u2026' : 'Salvar'}
        </button>
      </div>

      {/* Tab navigation */}
      <div className="sticky top-[57px] z-10 bg-white border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-1 px-3 py-2 min-w-max" role="tablist">
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                tab === t.key
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Messages */}
      {error && <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      {/* Content */}
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        {/* === HERO === */}
        {tab === 'hero' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Hero</h2>
            <Field label="T\u00edtulo" value={data.heroSection?.title || ''} onChange={(v) => setData({...data, heroSection:{...(data.heroSection||{}), title:v}})} placeholder="King Food" />
            <Field label="Subt\u00edtulo" value={data.heroSection?.subtitle || ''} onChange={(v) => setData({...data, heroSection:{...(data.heroSection||{}), subtitle:v}})} placeholder="A\u00e7a\u00ed brasileiro de verdade" rows={2} />
            <Field label="Texto CTA principal" value={data.heroSection?.ctaPrimaryText || ''} onChange={(v) => setData({...data, heroSection:{...(data.heroSection||{}), ctaPrimaryText:v}})} placeholder="Pedir agora" />
            <Field label="Link CTA principal" value={data.heroSection?.ctaPrimaryLink || ''} onChange={(v) => setData({...data, heroSection:{...(data.heroSection||{}), ctaPrimaryLink:v}})} placeholder="/menu" error={urlErrors.ctaPrimaryLink} />
            <Field label="Texto CTA secund\u00e1rio" value={data.heroSection?.ctaSecondaryText || ''} onChange={(v) => setData({...data, heroSection:{...(data.heroSection||{}), ctaSecondaryText:v}})} placeholder="Ver hor\u00e1rios" />
            <Field label="Link CTA secund\u00e1rio" value={data.heroSection?.ctaSecondaryLink || ''} onChange={(v) => setData({...data, heroSection:{...(data.heroSection||{}), ctaSecondaryLink:v}})} placeholder="/horarios" error={urlErrors.ctaSecondaryLink} />
            <Field label="URL imagem de fundo" value={data.heroSection?.backgroundImage || ''} onChange={(v) => setData({...data, heroSection:{...(data.heroSection||{}), backgroundImage:v}})} placeholder="https://kingfood.online/bg-acai.jpg" error={urlErrors.backgroundImage} />
          </div>
        )}

        {/* === FEATURES === */}
        {tab === 'features' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Destaques</h2>
              <button type="button" onClick={() => {const u=[...(data.featuresSection||[]),{icon:'\u2b50',title:'',description:''}]; setData({...data, featuresSection:u});}}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium">+ Adicionar</button>
            </div>
            {(data.featuresSection||[]).length===0 && <p className="text-sm text-gray-500 mb-3">Nenhum destaque configurado.</p>}
            {(data.featuresSection||[]).map((f,i)=>(
              <div key={i} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg mb-3">
                <div className="flex-shrink-0 w-12">
                  <label className="text-xs text-gray-500 block mb-1">\u00cdcone</label>
                  <input value={f.icon} onChange={(e)=>{const u=[...(data.featuresSection||[])]; u[i]={...u[i], icon:e.target.value}; setData({...data, featuresSection:u});}}
                    className="w-full px-2 py-2 border rounded text-center text-lg" />
                </div>
                <div className="flex-1 grid grid-cols-1 gap-2">
                  <input value={f.title} onChange={(e)=>{const u=[...(data.featuresSection||[])]; u[i]={...u[i], title:e.target.value}; setData({...data, featuresSection:u});}}
                    className="w-full px-3 py-2 border rounded text-sm" placeholder="T\u00edtulo" />
                  <input value={f.description} onChange={(e)=>{const u=[...(data.featuresSection||[])]; u[i]={...u[i], description:e.target.value}; setData({...data, featuresSection:u});}}
                    className="w-full px-3 py-2 border rounded text-sm" placeholder="Descri\u00e7\u00e3o" />
                </div>
                <button type="button" onClick={()=>{const u=(data.featuresSection||[]).filter((_,idx)=>idx!==i); setData({...data, featuresSection:u});}}
                  className="mt-5 text-red-500 hover:text-red-700 text-sm shrink-0">Remover</button>
              </div>
            ))}
          </div>
        )}

        {/* === CTA === */}
        {tab === 'cta' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">CTA Final</h2>
            <Field label="T\u00edtulo" value={data.ctaSection?.title||''} onChange={(v)=>setData({...data, ctaSection:{...(data.ctaSection||{}), title:v}})} placeholder="Pronto para pedir?" />
            <Field label="Descri\u00e7\u00e3o" value={data.ctaSection?.description||''} onChange={(v)=>setData({...data, ctaSection:{...(data.ctaSection||{}), description:v}})} rows={2} />
            <Field label="Texto do bot\u00e3o" value={data.ctaSection?.buttonText||''} onChange={(v)=>setData({...data, ctaSection:{...(data.ctaSection||{}), buttonText:v}})} placeholder="Ver card\u00e1pio" />
            <Field label="Link do bot\u00e3o" value={data.ctaSection?.buttonLink||''} onChange={(v)=>setData({...data, ctaSection:{...(data.ctaSection||{}), buttonLink:v}})} placeholder="/menu" />
          </div>
        )}

        {/* === SOCIAL === */}
        {tab === 'social' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Redes sociais</h2>
              <button type="button" onClick={()=>{const u=[...(data.landingSocial||[]),{platform:'',label:'',url:'',icon:'',enabled:true}]; setData({...data, landingSocial:u});}}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium">+ Adicionar</button>
            </div>
            {(data.landingSocial||[]).length===0 && <p className="text-sm text-gray-500 mb-3">Nenhum link configurado.</p>}
            {(data.landingSocial||[]).map((s,i)=>(
              <div key={i} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg mb-3 flex-wrap">
                <input value={s.platform} onChange={(e)=>{const u=[...(data.landingSocial||[])]; u[i]={...u[i], platform:e.target.value}; setData({...data, landingSocial:u});}}
                  className="flex-1 min-w-[80px] px-2 py-1.5 border rounded text-sm" placeholder="Plataforma" />
                <input value={s.label} onChange={(e)=>{const u=[...(data.landingSocial||[])]; u[i]={...u[i], label:e.target.value}; setData({...data, landingSocial:u});}}
                  className="flex-1 min-w-[100px] px-2 py-1.5 border rounded text-sm" placeholder="R\u00f3tulo" />
                <input value={s.url} onChange={(e)=>{const u=[...(data.landingSocial||[])]; u[i]={...u[i], url:e.target.value}; setData({...data, landingSocial:u});}}
                  className="flex-[2] min-w-[140px] px-2 py-1.5 border rounded text-sm" placeholder="https://..." />
                {urlErrors[`social_${i}`] && <p className="w-full text-xs text-red-500">{urlErrors[`social_${i}`]}</p>}
                <label className="text-xs text-gray-500 flex items-center gap-1">
                  <input type="checkbox" checked={s.enabled!==false} onChange={(e)=>{const u=[...(data.landingSocial||[])]; u[i]={...u[i], enabled:e.target.checked}; setData({...data, landingSocial:u});}} />
                  Ativo
                </label>
                <button type="button" onClick={()=>{const u=(data.landingSocial||[]).filter((_,idx)=>idx!==i); setData({...data, landingSocial:u});}}
                  className="text-red-500 hover:text-red-700 text-sm shrink-0">\u00d7</button>
              </div>
            ))}
          </div>
        )}

        {/* === HOURS === */}
        {tab === 'hours' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Hor\u00e1rios</h2>
            <div className="flex items-center gap-2 mb-4">
              <input type="checkbox" checked={data.landingHours?.enabled!==false}
                onChange={(e)=>setData({...data, landingHours:{...(data.landingHours||{}), enabled:e.target.checked}})} />
              <label className="text-sm text-gray-700">Exibir hor\u00e1rios na p\u00e1gina inicial</label>
            </div>
            <div className="space-y-2">
              {(data.landingHours?.rows||DEFAULT_HOURS).map((row,i)=>(
                <div key={row.day} className="flex gap-2 items-center flex-wrap">
                  <span className="text-sm font-medium w-24 shrink-0">{DAY_NAMES[row.day]}</span>
                  <input value={row.hours} onChange={(e)=>{const rows=[...(data.landingHours?.rows||DEFAULT_HOURS)]; rows[i]={...rows[i], hours:e.target.value}; setData({...data, landingHours:{...(data.landingHours||{}), rows}});}}
                    className="flex-1 min-w-[120px] px-2 py-1.5 border rounded text-sm" />
                </div>
              ))}
            </div>
            <Field label="Fuso hor\u00e1rio" value={data.landingHours?.timezone||'America/New_York'}
              onChange={(v)=>setData({...data, landingHours:{...(data.landingHours||{}), timezone:v}})} />
          </div>
        )}

        {/* === CONTACT === */}
        {tab === 'contact' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informa\u00e7\u00f5es de contato</h2>
            <Field label="Telefone" value={data.landingContact?.phone||''} onChange={(v)=>setData({...data, landingContact:{...(data.landingContact||{}), phone:v}})} placeholder="(614) 555-1234" />
            <Field label="WhatsApp (n\u00famero completo)" value={data.landingContact?.whatsapp||''} onChange={(v)=>setData({...data, landingContact:{...(data.landingContact||{}), whatsapp:v}})} placeholder="12673107535" />
            <Field label="E-mail" value={data.landingContact?.email||''} onChange={(v)=>setData({...data, landingContact:{...(data.landingContact||{}), email:v}})} placeholder="contato@kingfood.com" type="email" />
            <Field label="Endere\u00e7o" value={data.landingContact?.address||''} onChange={(v)=>setData({...data, landingContact:{...(data.landingContact||{}), address:v}})} placeholder="Columbus, OH" />
          </div>
        )}
      </div>
    </div>
  );
}
