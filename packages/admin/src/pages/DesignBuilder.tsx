import { useMemo, useState } from 'react';

/* ════════════════════════════════════════════════════════════════════
   KING FOOD — VISUAL EXPERIENCE BUILDER
   Editor visual (UX/UI only): tema, cores, tipografia, componentes,
   landing, cardápio, navegação e mobile com LIVE PREVIEW.
   Persistência/publicação: integração futura (estado visual apenas).
   ════════════════════════════════════════════════════════════════════ */

type Device = 'desktop' | 'tablet' | 'mobile';
type PreviewPage = 'landing' | 'menu';
type TabKey = 'appearance' | 'landing' | 'menu' | 'nav' | 'mobile';

interface BuilderConfig {
  preset: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    accent: string;
    price: string;
    active: string;
  };
  typography: {
    font: string;
    weight: string;
    baseSize: number;
    headingScale: number;
    spacing: number;
  };
  components: {
    buttonStyle: 'pill' | 'rounded' | 'square';
    buttonRadius: number;
    buttonSize: 'sm' | 'md' | 'lg';
    cardRadius: number;
    cardShadow: 'none' | 'subtle' | 'soft';
    cardBorder: boolean;
    cardPadding: number;
    imageRatio: '4/3' | '1/1' | '16/10';
    imageRadius: number;
    categoryStyle: 'pill' | 'rounded' | 'underline';
    categoryActiveColor: string;
    categoryInactiveColor: string;
    categoryRadius: number;
  };
  landing: {
    heroTitle: string;
    heroSubtitle: string;
    ctaText: string;
    ctaPosition: 'left' | 'center';
    heroImage: boolean;
    featuresStyle: 'cards' | 'list';
    featuresCount: number;
    showFeatures: boolean;
    showFooter: boolean;
    footerStyle: 'dark' | 'light';
  };
  menu: {
    columnsDesktop: number;
    columnsTablet: number;
    columnsMobile: number;
    gap: number;
    cardStyle: 'clean' | 'bordered' | 'shadow';
    showPrice: boolean;
    showDescription: boolean;
    showBadge: boolean;
    categorySize: 'sm' | 'md' | 'lg';
    categorySpacing: number;
  };
  nav: {
    headerStyle: 'classic' | 'modern';
    showCart: boolean;
    showNotifications: boolean;
    bottomNavStyle: 'light' | 'dark';
    desktopNav: 'top' | 'side';
  };
  mobile: {
    density: 'compact' | 'comfortable' | 'spacious';
    cardSize: 'sm' | 'md' | 'lg';
    columns: number;
    spacing: number;
    headerCompact: boolean;
    bottomNavVisible: boolean;
  };
}

/* ── Presets ──────────────────────────────────────────────────────── */

const PRESETS: { id: string; name: string; config: BuilderConfig }[] = [
  {
    id: 'kingfood',
    name: 'King Food',
    config: {
      preset: 'kingfood',
      colors: {
        primary: '#FFD100', secondary: '#E31818', background: '#F5F3EF',
        surface: '#FFFFFF', text: '#221D25', textMuted: '#6B6570',
        border: '#E8E4DC', accent: '#B8C438', price: '#221D25', active: '#FFD100',
      },
      typography: { font: 'system', weight: '700', baseSize: 16, headingScale: 1.25, spacing: 1.5 },
      components: {
        buttonStyle: 'pill', buttonRadius: 48, buttonSize: 'md',
        cardRadius: 16, cardShadow: 'subtle', cardBorder: true, cardPadding: 12,
        imageRatio: '4/3', imageRadius: 12,
        categoryStyle: 'pill', categoryActiveColor: '#FFD100', categoryInactiveColor: '#FFFFFF', categoryRadius: 9999,
      },
      landing: {
        heroTitle: 'Açaí brasileiro de verdade', heroSubtitle: 'Delivery · Columbus, OH',
        ctaText: 'Pedir agora', ctaPosition: 'center', heroImage: true,
        featuresStyle: 'cards', featuresCount: 3, showFeatures: true, showFooter: true, footerStyle: 'dark',
      },
      menu: {
        columnsDesktop: 4, columnsTablet: 3, columnsMobile: 2, gap: 12,
        cardStyle: 'clean', showPrice: true, showDescription: true, showBadge: true,
        categorySize: 'md', categorySpacing: 8,
      },
      nav: { headerStyle: 'modern', showCart: true, showNotifications: true, bottomNavStyle: 'light', desktopNav: 'top' },
      mobile: { density: 'comfortable', cardSize: 'md', columns: 2, spacing: 12, headerCompact: false, bottomNavVisible: true },
    },
  },
  {
    id: 'minimal',
    name: 'Minimalista',
    config: {
      preset: 'minimal',
      colors: {
        primary: '#1A1A1A', secondary: '#6B6570', background: '#FAFAFA',
        surface: '#FFFFFF', text: '#111111', textMuted: '#888888',
        border: '#EEEEEE', accent: '#333333', price: '#111111', active: '#1A1A1A',
      },
      typography: { font: 'system', weight: '500', baseSize: 15, headingScale: 1.15, spacing: 1.25 },
      components: {
        buttonStyle: 'square', buttonRadius: 4, buttonSize: 'md',
        cardRadius: 8, cardShadow: 'none', cardBorder: true, cardPadding: 12,
        imageRatio: '1/1', imageRadius: 4,
        categoryStyle: 'underline', categoryActiveColor: '#1A1A1A', categoryInactiveColor: '#FFFFFF', categoryRadius: 4,
      },
      landing: {
        heroTitle: 'Açaí brasileiro', heroSubtitle: 'Columbus, OH',
        ctaText: 'Pedir', ctaPosition: 'left', heroImage: true,
        featuresStyle: 'list', featuresCount: 3, showFeatures: true, showFooter: true, footerStyle: 'light',
      },
      menu: {
        columnsDesktop: 4, columnsTablet: 3, columnsMobile: 2, gap: 16,
        cardStyle: 'bordered', showPrice: true, showDescription: false, showBadge: false,
        categorySize: 'sm', categorySpacing: 6,
      },
      nav: { headerStyle: 'classic', showCart: true, showNotifications: false, bottomNavStyle: 'light', desktopNav: 'top' },
      mobile: { density: 'compact', cardSize: 'sm', columns: 2, spacing: 8, headerCompact: true, bottomNavVisible: true },
    },
  },
  {
    id: 'modern',
    name: 'Moderno',
    config: {
      preset: 'modern',
      colors: {
        primary: '#2563EB', secondary: '#7C3AED', background: '#F8FAFC',
        surface: '#FFFFFF', text: '#0F172A', textMuted: '#64748B',
        border: '#E2E8F0', accent: '#0EA5E9', price: '#0F172A', active: '#2563EB',
      },
      typography: { font: 'system', weight: '700', baseSize: 16, headingScale: 1.3, spacing: 1.5 },
      components: {
        buttonStyle: 'rounded', buttonRadius: 12, buttonSize: 'md',
        cardRadius: 20, cardShadow: 'soft', cardBorder: false, cardPadding: 16,
        imageRatio: '16/10', imageRadius: 16,
        categoryStyle: 'pill', categoryActiveColor: '#2563EB', categoryInactiveColor: '#F1F5F9', categoryRadius: 9999,
      },
      landing: {
        heroTitle: 'Açaí fresco, todos os dias', heroSubtitle: 'Delivery rápido · Columbus, OH',
        ctaText: 'Pedir agora', ctaPosition: 'center', heroImage: true,
        featuresStyle: 'cards', featuresCount: 4, showFeatures: true, showFooter: true, footerStyle: 'dark',
      },
      menu: {
        columnsDesktop: 4, columnsTablet: 3, columnsMobile: 2, gap: 16,
        cardStyle: 'shadow', showPrice: true, showDescription: true, showBadge: true,
        categorySize: 'md', categorySpacing: 10,
      },
      nav: { headerStyle: 'modern', showCart: true, showNotifications: true, bottomNavStyle: 'dark', desktopNav: 'top' },
      mobile: { density: 'comfortable', cardSize: 'md', columns: 2, spacing: 16, headerCompact: false, bottomNavVisible: true },
    },
  },
  {
    id: 'vibrant',
    name: 'Vibrante',
    config: {
      preset: 'vibrant',
      colors: {
        primary: '#FF5A1F', secondary: '#FFD100', background: '#FFF7F2',
        surface: '#FFFFFF', text: '#2D1B12', textMuted: '#8A6A55',
        border: '#F5E3D8', accent: '#00C2A8', price: '#FF5A1F', active: '#FF5A1F',
      },
      typography: { font: 'system', weight: '800', baseSize: 17, headingScale: 1.35, spacing: 1.6 },
      components: {
        buttonStyle: 'pill', buttonRadius: 9999, buttonSize: 'lg',
        cardRadius: 24, cardShadow: 'soft', cardBorder: false, cardPadding: 16,
        imageRatio: '4/3', imageRadius: 20,
        categoryStyle: 'pill', categoryActiveColor: '#FF5A1F', categoryInactiveColor: '#FFFFFF', categoryRadius: 9999,
      },
      landing: {
        heroTitle: 'Explosão de sabor!', heroSubtitle: 'Açaí + frutas + crocante',
        ctaText: 'Quero agora', ctaPosition: 'center', heroImage: true,
        featuresStyle: 'cards', featuresCount: 4, showFeatures: true, showFooter: true, footerStyle: 'dark',
      },
      menu: {
        columnsDesktop: 4, columnsTablet: 2, columnsMobile: 2, gap: 12,
        cardStyle: 'shadow', showPrice: true, showDescription: true, showBadge: true,
        categorySize: 'lg', categorySpacing: 12,
      },
      nav: { headerStyle: 'modern', showCart: true, showNotifications: true, bottomNavStyle: 'dark', desktopNav: 'top' },
      mobile: { density: 'spacious', cardSize: 'lg', columns: 1, spacing: 16, headerCompact: false, bottomNavVisible: true },
    },
  },
  {
    id: 'elegant',
    name: 'Elegante',
    config: {
      preset: 'elegant',
      colors: {
        primary: '#1F2937', secondary: '#B45309', background: '#FDFBF7',
        surface: '#FFFFFF', text: '#1F2937', textMuted: '#9CA3AF',
        border: '#F0EAE0', accent: '#B45309', price: '#B45309', active: '#1F2937',
      },
      typography: { font: 'serif', weight: '600', baseSize: 16, headingScale: 1.28, spacing: 1.5 },
      components: {
        buttonStyle: 'rounded', buttonRadius: 8, buttonSize: 'md',
        cardRadius: 12, cardShadow: 'subtle', cardBorder: true, cardPadding: 14,
        imageRatio: '4/3', imageRadius: 8,
        categoryStyle: 'underline', categoryActiveColor: '#1F2937', categoryInactiveColor: '#FFFFFF', categoryRadius: 8,
      },
      landing: {
        heroTitle: 'Açaí artesanal', heroSubtitle: 'Feito com ingredientes selecionados',
        ctaText: 'Experimente', ctaPosition: 'left', heroImage: true,
        featuresStyle: 'list', featuresCount: 3, showFeatures: true, showFooter: true, footerStyle: 'dark',
      },
      menu: {
        columnsDesktop: 3, columnsTablet: 2, columnsMobile: 2, gap: 20,
        cardStyle: 'bordered', showPrice: true, showDescription: true, showBadge: false,
        categorySize: 'md', categorySpacing: 10,
      },
      nav: { headerStyle: 'classic', showCart: true, showNotifications: false, bottomNavStyle: 'light', desktopNav: 'side' },
      mobile: { density: 'comfortable', cardSize: 'md', columns: 2, spacing: 14, headerCompact: false, bottomNavVisible: true },
    },
  },
];

const DEFAULT_CONFIG: BuilderConfig = PRESETS[0].config;

/* ── Helpers ──────────────────────────────────────────────────────── */

function contrastText(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#221D25' : '#FFFFFF';
}

const FONTS: { id: string; label: string; stack: string }[] = [
  { id: 'system', label: 'Sistema', stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { id: 'serif', label: 'Serifada', stack: 'Georgia, "Times New Roman", serif' },
  { id: 'mono', label: 'Mono', stack: 'ui-monospace, "Cascadia Code", "Courier New", monospace' },
];

const WEIGHTS = [
  { id: '400', label: 'Regular' },
  { id: '500', label: 'Medium' },
  { id: '600', label: 'Semi-bold' },
  { id: '700', label: 'Bold' },
  { id: '800', label: 'Extra bold' },
];

/* ── Sub-componentes de UI do editor ───────────────────────────────── */

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left min-h-[44px] hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
          aria-label={`Cor ${label}`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
          }}
          className="w-20 px-2 py-1.5 text-xs border border-gray-200 rounded-lg font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label={`Hex ${label}`}
        />
        <span className="w-5 h-5 rounded-full border border-gray-200" style={{ background: value }} aria-hidden />
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, step = 1, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        <span className="text-xs text-gray-500 font-mono">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#FFD100]"
        aria-label={label}
      />
    </div>
  );
}

function SegmentedControl<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div>
      <span className="block text-xs font-medium text-gray-600 mb-1.5">{label}</span>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden" role="radiogroup" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={value === opt.id}
            onClick={() => onChange(opt.id)}
            className={`flex-1 min-h-[40px] px-2 text-xs font-medium transition-colors ${
              value === opt.id ? 'bg-[#FFD100] text-[#221D25]' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between min-h-[44px]"
    >
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <span className={`w-10 h-6 rounded-full transition-colors relative ${value ? 'bg-[#FFD100]' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}

/* ── Preview ───────────────────────────────────────────────────────── */

function PreviewLanding({ cfg }: { cfg: BuilderConfig }) {
  const c = cfg.colors;
  const t = cfg.typography;
  const l = cfg.landing;
  const font = FONTS.find((f) => f.id === t.font)?.stack || FONTS[0].stack;
  const headingSize = Math.round(t.baseSize * t.headingScale * 2.2);
  const btnRadius = cfg.components.buttonStyle === 'pill' ? 9999 : cfg.components.buttonStyle === 'rounded' ? 12 : 4;

  return (
    <div style={{ fontFamily: font, background: c.background, color: c.text, fontSize: t.baseSize * 0.8 }}>
      {/* Header */}
      <div style={{ background: c.surface, borderBottom: `1px solid ${c.border}`, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 18, height: 18, borderRadius: 5, background: c.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: contrastText(c.primary), fontSize: 9, fontWeight: 800 }}>K</span>
          <span style={{ fontWeight: 800, fontSize: 12 }}>King Food</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {cfg.nav.showCart && (
            <span style={{ width: 22, height: 22, borderRadius: 6, background: c.primary, color: contrastText(c.primary), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🛒</span>
          )}
          <span style={{ padding: '4px 10px', borderRadius: btnRadius, background: c.primary, color: contrastText(c.primary), fontSize: 10, fontWeight: 700 }}>{l.ctaText}</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: '16px 12px', textAlign: l.ctaPosition === 'center' ? 'center' : 'left' }}>
        {l.heroImage && (
          <div style={{ height: 70, borderRadius: 12, background: `linear-gradient(135deg, ${c.primary}33, ${c.secondary}33)`, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }} aria-hidden>
            🍧
          </div>
        )}
        <div style={{ fontSize: headingSize, fontWeight: Number(t.weight), lineHeight: 1.1, letterSpacing: '-0.02em' }}>{l.heroTitle}</div>
        <div style={{ color: c.textMuted, fontSize: 11, marginTop: 4 }}>{l.heroSubtitle}</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 6, justifyContent: l.ctaPosition === 'center' ? 'center' : 'flex-start' }}>
          <span style={{ padding: '6px 14px', borderRadius: btnRadius, background: c.primary, color: contrastText(c.primary), fontSize: 11, fontWeight: 700 }}>{l.ctaText} →</span>
          <span style={{ padding: '6px 14px', borderRadius: btnRadius, border: `1px solid ${c.border}`, color: c.text, fontSize: 11 }}>Ver cardápio</span>
        </div>
      </div>

      {/* Features */}
      {l.showFeatures && (
        <div style={{ padding: '0 12px 14px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Destaques</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(l.featuresCount, 3)}, 1fr)`, gap: 8 }}>
            {Array.from({ length: Math.min(l.featuresCount, 3) }).map((_, i) => (
              <div key={i} style={{
                background: c.surface, border: cfg.components.cardBorder ? `1px solid ${c.border}` : 'none',
                borderRadius: cfg.components.cardRadius, padding: 10,
                boxShadow: cfg.components.cardShadow === 'soft' ? '0 4px 12px rgba(0,0,0,0.08)' : cfg.components.cardShadow === 'subtle' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              }}>
                <div style={{ fontSize: 16 }}>🍓</div>
                <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4 }}>Fresco</div>
                <div style={{ fontSize: 8, color: c.textMuted }}>Ingredientes selecionados</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {l.showFooter && (
        <div style={{
          background: l.footerStyle === 'dark' ? '#221D25' : c.surface,
          color: l.footerStyle === 'dark' ? '#E2DDCF' : c.text,
          padding: '12px', textAlign: 'center', fontSize: 9,
        }}>
          <div style={{ fontWeight: 800, fontSize: 11 }}>King Food</div>
          <div style={{ opacity: 0.7 }}>Açaí brasileiro · Columbus, OH</div>
          <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center', gap: 8 }}>
            <span>Cardápio</span><span>·</span><span>Locais</span><span>·</span><span>Instagram</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewMenu({ cfg }: { cfg: BuilderConfig }) {
  const c = cfg.colors;
  const t = cfg.typography;
  const m = cfg.menu;
  const font = FONTS.find((f) => f.id === t.font)?.stack || FONTS[0].stack;
  const btnRadius = cfg.components.buttonRadius;
  const catRadius = cfg.components.categoryRadius;
  const catStyle = cfg.components.categoryStyle;
  const cardRadius = cfg.components.cardRadius;
  const imgRadius = cfg.components.imageRadius;
  const cols = m.columnsMobile;
  const items = [
    { name: 'Açaí King Tradicional', price: 13.9, emoji: '🍧' },
    { name: 'Smash Burger Duplo', price: 15.5, emoji: '🍔' },
    { name: 'Açaí com Nutella', price: 16.9, emoji: '🍫' },
    { name: 'Coxinha', price: 6.5, emoji: '🥟' },
  ];

  return (
    <div style={{ fontFamily: font, background: c.background, color: c.text, fontSize: t.baseSize * 0.8 }}>
      {/* Header */}
      <div style={{ background: c.surface, borderBottom: `1px solid ${c.border}`, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, fontSize: 12 }}>King Food</span>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: c.primary, color: contrastText(c.primary), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🛒</span>
      </div>

      {/* Category pills */}
      <div style={{ padding: '8px 12px 0', display: 'flex', gap: 6, overflow: 'hidden' }}>
        {['Todos', 'Açaí', 'Burgers', 'Bebidas'].map((cat, i) => {
          const active = i === 1;
          const bg = active ? cfg.components.categoryActiveColor : cfg.components.categoryInactiveColor;
          return (
            <span key={cat} style={{
              padding: `${m.categorySize === 'sm' ? 3 : m.categorySize === 'md' ? 5 : 7}px 12px`,
              borderRadius: catStyle === 'pill' ? 9999 : catStyle === 'rounded' ? catRadius : 0,
              borderBottom: catStyle === 'underline' && active ? `2px solid ${cfg.components.categoryActiveColor}` : 'none',
              background: catStyle === 'underline' ? 'transparent' : bg,
              color: active ? contrastText(cfg.components.categoryActiveColor) : c.textMuted,
              fontSize: m.categorySize === 'sm' ? 9 : m.categorySize === 'md' ? 10 : 11,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}>
              {cat}
            </span>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ padding: 10, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: m.gap }}>
        {items.map((item) => (
          <div key={item.name} style={{
            background: c.surface,
            border: cfg.components.cardBorder ? `1px solid ${c.border}` : 'none',
            borderRadius: cardRadius,
            padding: cfg.components.cardPadding,
            boxShadow: cfg.components.cardShadow === 'soft' ? '0 4px 12px rgba(0,0,0,0.08)' : cfg.components.cardShadow === 'subtle' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          }}>
            <div style={{
              aspectRatio: cfg.components.imageRatio.replace('/', ' / '),
              borderRadius: imgRadius,
              background: `linear-gradient(135deg, ${c.primary}22, ${c.secondary}22)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }} aria-hidden>
              {item.emoji}
            </div>
            {m.showBadge && (
              <span style={{ display: 'inline-block', marginTop: 6, padding: '1px 6px', borderRadius: 9999, background: c.primary, color: contrastText(c.primary), fontSize: 7, fontWeight: 700 }}>Opções</span>
            )}
            <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4 }}>{item.name}</div>
            {m.showDescription && <div style={{ fontSize: 8, color: c.textMuted, marginTop: 2 }}>Descrição do produto</div>}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              {m.showPrice && <span style={{ fontSize: 10, fontWeight: 800, color: c.price }}>${item.price.toFixed(2)}</span>}
              <span style={{ width: 20, height: 20, borderRadius: btnRadius, background: c.primary, color: contrastText(c.primary), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>+</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewFrame({ cfg, device, page }: { cfg: BuilderConfig; device: Device; page: PreviewPage }) {
  const widths: Record<Device, string> = { desktop: '100%', tablet: '768px', mobile: '390px' };
  const height: Record<Device, string> = { desktop: '520px', tablet: '520px', mobile: '640px' };
  const isMobile = device === 'mobile';

  return (
    <div className="flex justify-center">
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden transition-all duration-300"
        style={{ width: widths[device], maxWidth: '100%', height: height[device] }}
        role="img"
        aria-label={`Preview ${page === 'landing' ? 'Landing' : 'Cardápio'} em ${device}`}
      >
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b border-gray-200">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <span className="text-[10px] text-gray-400 font-mono">{isMobile ? '390px' : device === 'tablet' ? '768px' : 'Desktop'}</span>
        </div>
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 28px)' }}>
          {page === 'landing' ? <PreviewLanding cfg={cfg} /> : <PreviewMenu cfg={cfg} />}
        </div>
        {isMobile && cfg.mobile.bottomNavVisible && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: cfg.nav.bottomNavStyle === 'dark' ? '#221D25' : '#FFFFFF',
            borderTop: `1px solid ${cfg.colors.border}`,
            display: 'flex', justifyContent: 'space-around', padding: '6px 0 8px',
          }}>
            {['Início', 'Cardápio', 'Horários', 'Carrinho'].map((item, i) => (
              <div key={item} style={{ textAlign: 'center', color: i === 1 ? cfg.colors.primary : cfg.colors.textMuted, fontSize: 8 }}>
                <div style={{ fontSize: 12 }}>{['🏠', '🍧', '🕐', '🛒'][i]}</div>
                {item}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Editor principal ─────────────────────────────────────────────── */

export default function DesignBuilder() {
  const [config, setConfig] = useState<BuilderConfig>(DEFAULT_CONFIG);
  const [device, setDevice] = useState<Device>('desktop');
  const [page, setPage] = useState<PreviewPage>('landing');
  const [tab, setTab] = useState<TabKey>('appearance');
  const [dirty, setDirty] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [toast, setToast] = useState('');

  function update<K extends keyof BuilderConfig>(key: K, value: BuilderConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function updateNested<K extends keyof BuilderConfig>(key: K, patch: Partial<BuilderConfig[K]>) {
    setConfig((prev) => {
      const current = prev[key] as Record<string, unknown>;
      return { ...prev, [key]: { ...current, ...(patch as Record<string, unknown>) } };
    });
    setDirty(true);
  }

  function applyPreset(id: string) {
    const preset = PRESETS.find((p) => p.id === id);
    if (preset) {
      setConfig(JSON.parse(JSON.stringify(preset.config)));
      setDirty(true);
    }
  }

  function restoreDefault() {
    setConfig(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
    setDirty(false);
    setShowRestore(false);
    setToast('Aparência restaurada para o padrão');
    setTimeout(() => setToast(''), 2500);
  }

  function discard() {
    setConfig(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
    setDirty(false);
    setToast('Alterações descartadas');
    setTimeout(() => setToast(''), 2500);
  }

  function fakeAction(label: string) {
    setToast(`${label} — persistência será integrada em breve`);
    setTimeout(() => setToast(''), 3000);
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'appearance', label: 'Aparência' },
    { key: 'landing', label: 'Landing Page' },
    { key: 'menu', label: 'Cardápio' },
    { key: 'nav', label: 'Navegação' },
    { key: 'mobile', label: 'Mobile' },
  ];

  const c = config.colors;
  const t = config.typography;
  const comp = config.components;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header do editor */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold text-gray-900">Construtor Visual</h1>
            <p className="text-xs text-gray-500">King Food — Visual Experience Builder</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {dirty && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" aria-hidden />
                Alterações não salvas
              </span>
            )}
            <button
              type="button"
              onClick={discard}
              disabled={!dirty}
              className="min-h-[44px] px-4 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={() => fakeAction('Rascunho salvo')}
              disabled={!dirty}
              className="min-h-[44px] px-4 rounded-xl border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Salvar rascunho
            </button>
            <button
              type="button"
              onClick={() => fakeAction('Publicado')}
              disabled={!dirty}
              className="min-h-[44px] px-5 rounded-xl bg-[#FFD100] text-[#221D25] text-sm font-bold hover:bg-[#E6BC00] disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-sm"
            >
              Publicar
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-[1400px] mx-auto px-4 flex gap-1 overflow-x-auto no-scrollbar pb-2" role="tablist" aria-label="Seções do editor">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              type="button"
              role="tab"
              aria-selected={tab === tb.key}
              onClick={() => setTab(tb.key)}
              className={`shrink-0 min-h-[44px] px-4 rounded-lg text-sm font-semibold transition-colors ${
                tab === tb.key ? 'bg-[#FFD100] text-[#221D25]' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-4 grid lg:grid-cols-[380px_1fr] gap-4">
        {/* ── CONTROLES ── */}
        <div className="space-y-3 order-2 lg:order-1">
          {tab === 'appearance' && (
            <>
              {/* Presets */}
              <Section title="Tema">
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((p) => {
                    const selected = config.preset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.id)}
                        aria-pressed={selected}
                        className={`rounded-xl border p-2 text-left transition-all min-h-[64px] ${
                          selected ? 'border-[#FFD100] ring-2 ring-[#FFD100]/40 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex gap-1 mb-1.5">
                          <span className="w-4 h-4 rounded-full border border-gray-200" style={{ background: p.config.colors.primary }} />
                          <span className="w-4 h-4 rounded-full border border-gray-200" style={{ background: p.config.colors.secondary }} />
                          <span className="w-4 h-4 rounded-full border border-gray-200" style={{ background: p.config.colors.background }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                          {selected && <span className="text-[#E6BC00]">✓</span>} {p.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setShowRestore(true)}
                  className="w-full min-h-[44px] rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Restaurar padrão
                </button>
              </Section>

              {/* Cores */}
              <Section title="Cores">
                <ColorField label="Cor principal" value={c.primary} onChange={(v) => updateNested('colors', { primary: v })} />
                <ColorField label="Cor secundária" value={c.secondary} onChange={(v) => updateNested('colors', { secondary: v })} />
                <ColorField label="Fundo" value={c.background} onChange={(v) => updateNested('colors', { background: v })} />
                <ColorField label="Superfície" value={c.surface} onChange={(v) => updateNested('colors', { surface: v })} />
                <ColorField label="Texto" value={c.text} onChange={(v) => updateNested('colors', { text: v })} />
                <ColorField label="Texto secundário" value={c.textMuted} onChange={(v) => updateNested('colors', { textMuted: v })} />
                <ColorField label="Borda" value={c.border} onChange={(v) => updateNested('colors', { border: v })} />
                <ColorField label="Destaque" value={c.accent} onChange={(v) => updateNested('colors', { accent: v })} />
                <ColorField label="Preço" value={c.price} onChange={(v) => updateNested('colors', { price: v })} />
                <ColorField label="Estado ativo" value={c.active} onChange={(v) => updateNested('colors', { active: v })} />
              </Section>

              {/* Tipografia */}
              <Section title="Tipografia">
                <SegmentedControl
                  label="Fonte"
                  value={t.font}
                  options={FONTS.map((f) => ({ id: f.id as 'system' | 'serif' | 'mono', label: f.label }))}
                  onChange={(v) => updateNested('typography', { font: v })}
                />
                <SegmentedControl
                  label="Peso"
                  value={t.weight}
                  options={WEIGHTS.map((w) => ({ id: w.id as '400' | '500' | '600' | '700' | '800', label: w.label }))}
                  onChange={(v) => updateNested('typography', { weight: v })}
                />
                <SliderField label="Tamanho base" value={t.baseSize} min={13} max={20} unit="px" onChange={(v) => updateNested('typography', { baseSize: v })} />
                <SliderField label="Escala de títulos" value={t.headingScale} min={1.1} max={1.5} step={0.05} onChange={(v) => updateNested('typography', { headingScale: v })} />
                <SliderField label="Espaçamento" value={t.spacing} min={1} max={2} step={0.1} onChange={(v) => updateNested('typography', { spacing: v })} />
              </Section>

              {/* Componentes */}
              <Section title="Componentes">
                <SegmentedControl
                  label="Estilo do botão"
                  value={comp.buttonStyle}
                  options={[{ id: 'pill' as const, label: 'Pílula' }, { id: 'rounded' as const, label: 'Arredondado' }, { id: 'square' as const, label: 'Quadrado' }]}
                  onChange={(v) => updateNested('components', { buttonStyle: v })}
                />
                <SliderField label="Raio do botão" value={comp.buttonRadius} min={0} max={48} unit="px" onChange={(v) => updateNested('components', { buttonRadius: v })} />
                <SegmentedControl
                  label="Tamanho do botão"
                  value={comp.buttonSize}
                  options={[{ id: 'sm' as const, label: 'P' }, { id: 'md' as const, label: 'M' }, { id: 'lg' as const, label: 'G' }]}
                  onChange={(v) => updateNested('components', { buttonSize: v })}
                />
                <SliderField label="Raio do card" value={comp.cardRadius} min={0} max={32} unit="px" onChange={(v) => updateNested('components', { cardRadius: v })} />
                <SegmentedControl
                  label="Sombra do card"
                  value={comp.cardShadow}
                  options={[{ id: 'none' as const, label: 'Nenhuma' }, { id: 'subtle' as const, label: 'Suave' }, { id: 'soft' as const, label: 'Forte' }]}
                  onChange={(v) => updateNested('components', { cardShadow: v })}
                />
                <ToggleField label="Borda do card" value={comp.cardBorder} onChange={(v) => updateNested('components', { cardBorder: v })} />
                <SliderField label="Espaçamento do card" value={comp.cardPadding} min={8} max={24} unit="px" onChange={(v) => updateNested('components', { cardPadding: v })} />
                <SegmentedControl
                  label="Proporção da imagem"
                  value={comp.imageRatio}
                  options={[{ id: '4/3' as const, label: '4:3' }, { id: '1/1' as const, label: '1:1' }, { id: '16/10' as const, label: '16:10' }]}
                  onChange={(v) => updateNested('components', { imageRatio: v })}
                />
                <SliderField label="Raio da imagem" value={comp.imageRadius} min={0} max={24} unit="px" onChange={(v) => updateNested('components', { imageRadius: v })} />
                <SegmentedControl
                  label="Estilo das categorias"
                  value={comp.categoryStyle}
                  options={[{ id: 'pill' as const, label: 'Pílula' }, { id: 'rounded' as const, label: 'Arredondado' }, { id: 'underline' as const, label: 'Sublinhado' }]}
                  onChange={(v) => updateNested('components', { categoryStyle: v })}
                />
                <ColorField label="Categoria ativa" value={comp.categoryActiveColor} onChange={(v) => updateNested('components', { categoryActiveColor: v })} />
                <ColorField label="Categoria inativa" value={comp.categoryInactiveColor} onChange={(v) => updateNested('components', { categoryInactiveColor: v })} />
                <SliderField label="Raio da categoria" value={comp.categoryRadius} min={0} max={9999} unit="px" onChange={(v) => updateNested('components', { categoryRadius: v })} />
              </Section>
            </>
          )}

          {tab === 'landing' && (
            <>
              <Section title="Hero">
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
                    <input
                      type="text"
                      value={config.landing.heroTitle}
                      onChange={(e) => updateNested('landing', { heroTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Subtítulo</label>
                    <input
                      type="text"
                      value={config.landing.heroSubtitle}
                      onChange={(e) => updateNested('landing', { heroSubtitle: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Texto do CTA</label>
                    <input
                      type="text"
                      value={config.landing.ctaText}
                      onChange={(e) => updateNested('landing', { ctaText: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <SegmentedControl
                    label="Posição do CTA"
                    value={config.landing.ctaPosition}
                    options={[{ id: 'left' as const, label: 'Esquerda' }, { id: 'center' as const, label: 'Centro' }]}
                    onChange={(v) => updateNested('landing', { ctaPosition: v })}
                  />
                  <ToggleField label="Imagem no hero" value={config.landing.heroImage} onChange={(v) => updateNested('landing', { heroImage: v })} />
                </div>
              </Section>

              <Section title="Destaques">
                <SegmentedControl
                  label="Estilo"
                  value={config.landing.featuresStyle}
                  options={[{ id: 'cards' as const, label: 'Cards' }, { id: 'list' as const, label: 'Lista' }]}
                  onChange={(v) => updateNested('landing', { featuresStyle: v })}
                />
                <SliderField label="Quantidade" value={config.landing.featuresCount} min={2} max={6} onChange={(v) => updateNested('landing', { featuresCount: v })} />
                <ToggleField label="Mostrar seção" value={config.landing.showFeatures} onChange={(v) => updateNested('landing', { showFeatures: v })} />
              </Section>

              <Section title="Rodapé">
                <ToggleField label="Mostrar rodapé" value={config.landing.showFooter} onChange={(v) => updateNested('landing', { showFooter: v })} />
                <SegmentedControl
                  label="Estilo"
                  value={config.landing.footerStyle}
                  options={[{ id: 'dark' as const, label: 'Escuro' }, { id: 'light' as const, label: 'Claro' }]}
                  onChange={(v) => updateNested('landing', { footerStyle: v })}
                />
              </Section>

              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center">
                <p className="text-xs text-gray-500">
                  Redes sociais, horários e contato: disponíveis quando integrados à API de configurações.
                </p>
              </div>
            </>
          )}

          {tab === 'menu' && (
            <>
              <Section title="Layout">
                <SliderField label="Colunas desktop" value={config.menu.columnsDesktop} min={2} max={5} onChange={(v) => updateNested('menu', { columnsDesktop: v })} />
                <SliderField label="Colunas tablet" value={config.menu.columnsTablet} min={2} max={4} onChange={(v) => updateNested('menu', { columnsTablet: v })} />
                <SliderField label="Colunas mobile" value={config.menu.columnsMobile} min={1} max={3} onChange={(v) => updateNested('menu', { columnsMobile: v })} />
                <SliderField label="Espaçamento" value={config.menu.gap} min={4} max={24} unit="px" onChange={(v) => updateNested('menu', { gap: v })} />
              </Section>

              <Section title="Cards">
                <SegmentedControl
                  label="Estilo"
                  value={config.menu.cardStyle}
                  options={[{ id: 'clean' as const, label: 'Limpo' }, { id: 'bordered' as const, label: 'Borda' }, { id: 'shadow' as const, label: 'Sombra' }]}
                  onChange={(v) => updateNested('menu', { cardStyle: v })}
                />
                <ToggleField label="Mostrar preço" value={config.menu.showPrice} onChange={(v) => updateNested('menu', { showPrice: v })} />
                <ToggleField label="Mostrar descrição" value={config.menu.showDescription} onChange={(v) => updateNested('menu', { showDescription: v })} />
                <ToggleField label="Mostrar badge" value={config.menu.showBadge} onChange={(v) => updateNested('menu', { showBadge: v })} />
              </Section>

              <Section title="Categorias">
                <SegmentedControl
                  label="Tamanho"
                  value={config.menu.categorySize}
                  options={[{ id: 'sm' as const, label: 'P' }, { id: 'md' as const, label: 'M' }, { id: 'lg' as const, label: 'G' }]}
                  onChange={(v) => updateNested('menu', { categorySize: v })}
                />
                <SliderField label="Espaçamento" value={config.menu.categorySpacing} min={4} max={20} unit="px" onChange={(v) => updateNested('menu', { categorySpacing: v })} />
              </Section>

              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center">
                <p className="text-xs text-gray-500">
                  Categorias sticky, sincronização com scroll e agrupamento de produtos: comportamento preservado.
                </p>
              </div>
            </>
          )}

          {tab === 'nav' && (
            <>
              <Section title="Header">
                <SegmentedControl
                  label="Estilo"
                  value={config.nav.headerStyle}
                  options={[{ id: 'classic' as const, label: 'Clássico' }, { id: 'modern' as const, label: 'Moderno' }]}
                  onChange={(v) => updateNested('nav', { headerStyle: v })}
                />
                <ToggleField label="Mostrar carrinho" value={config.nav.showCart} onChange={(v) => updateNested('nav', { showCart: v })} />
                <ToggleField label="Mostrar notificações" value={config.nav.showNotifications} onChange={(v) => updateNested('nav', { showNotifications: v })} />
              </Section>

              <Section title="Desktop">
                <SegmentedControl
                  label="Navegação"
                  value={config.nav.desktopNav}
                  options={[{ id: 'top' as const, label: 'Superior' }, { id: 'side' as const, label: 'Lateral' }]}
                  onChange={(v) => updateNested('nav', { desktopNav: v })}
                />
              </Section>

              <Section title="Mobile">
                <SegmentedControl
                  label="Bottom navigation"
                  value={config.nav.bottomNavStyle}
                  options={[{ id: 'light' as const, label: 'Clara' }, { id: 'dark' as const, label: 'Escura' }]}
                  onChange={(v) => updateNested('nav', { bottomNavStyle: v })}
                />
              </Section>
            </>
          )}

          {tab === 'mobile' && (
            <>
              <Section title="Densidade">
                <SegmentedControl
                  label="Densidade"
                  value={config.mobile.density}
                  options={[{ id: 'compact' as const, label: 'Compacta' }, { id: 'comfortable' as const, label: 'Confortável' }, { id: 'spacious' as const, label: 'Espaçosa' }]}
                  onChange={(v) => updateNested('mobile', { density: v })}
                />
                <SegmentedControl
                  label="Tamanho dos cards"
                  value={config.mobile.cardSize}
                  options={[{ id: 'sm' as const, label: 'P' }, { id: 'md' as const, label: 'M' }, { id: 'lg' as const, label: 'G' }]}
                  onChange={(v) => updateNested('mobile', { cardSize: v })}
                />
                <SliderField label="Colunas" value={config.mobile.columns} min={1} max={3} onChange={(v) => updateNested('mobile', { columns: v })} />
                <SliderField label="Espaçamento" value={config.mobile.spacing} min={4} max={24} unit="px" onChange={(v) => updateNested('mobile', { spacing: v })} />
              </Section>

              <Section title="Header e navegação">
                <ToggleField label="Header compacto" value={config.mobile.headerCompact} onChange={(v) => updateNested('mobile', { headerCompact: v })} />
                <ToggleField label="Bottom navigation visível" value={config.mobile.bottomNavVisible} onChange={(v) => updateNested('mobile', { bottomNavVisible: v })} />
              </Section>

              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center">
                <p className="text-xs text-gray-500">
                  Preview mobile simula ~390px. Toque, safe-area e gestos: comportamento nativo preservado.
                </p>
              </div>
            </>
          )}
        </div>

        {/* ── PREVIEW ── */}
        <div className="order-1 lg:order-2">
          <div className="sticky top-[120px] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex rounded-lg border border-gray-200 overflow-hidden" role="radiogroup" aria-label="Dispositivo">
                {([['desktop', '🖥️ Desktop'], ['tablet', '📱 Tablet'], ['mobile', '📲 Mobile']] as [Device, string][]).map(([d, label]) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={device === d}
                    onClick={() => setDevice(d)}
                    className={`min-h-[40px] px-3 text-xs font-semibold transition-colors ${
                      device === d ? 'bg-[#FFD100] text-[#221D25]' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden" role="radiogroup" aria-label="Página do preview">
                {([['landing', 'Landing'], ['menu', 'Cardápio']] as [PreviewPage, string][]).map(([pg, label]) => (
                  <button
                    key={pg}
                    type="button"
                    role="radio"
                    aria-checked={page === pg}
                    onClick={() => setPage(pg)}
                    className={`min-h-[40px] px-3 text-xs font-semibold transition-colors ${
                      page === pg ? 'bg-[#FFD100] text-[#221D25]' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <PreviewFrame cfg={config} device={device} page={page} />
              <span className="absolute top-2 right-2 text-[10px] font-semibold text-gray-400 bg-white/80 rounded-full px-2 py-0.5 border border-gray-200">
                PREVIEW AO VIVO
              </span>
            </div>

            <p className="text-center text-[11px] text-gray-400">
              Preview ≠ Salvar ≠ Publicar — as alterações aparecem aqui antes de qualquer persistência.
            </p>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#221D25] text-[#E2DDCF] text-sm font-medium rounded-full px-5 py-3 shadow-lg kf-anim-scale-in" role="status">
          {toast}
        </div>
      )}

      {/* Modal Restaurar */}
      {showRestore && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 kf-anim-fade-in"
          onClick={() => setShowRestore(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Restaurar aparência padrão"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 kf-anim-scale-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Restaurar aparência padrão?</h2>
            <p className="text-sm text-gray-500 mb-5">
              Todas as alterações não salvas do editor serão perdidas. Esta ação restaura somente o estado local.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowRestore(false)}
                className="flex-1 min-h-[48px] rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={restoreDefault}
                className="flex-1 min-h-[48px] rounded-xl bg-[#FFD100] text-[#221D25] text-sm font-bold hover:bg-[#E6BC00] transition-colors"
              >
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
