import React, { createContext, useContext, useState, useEffect } from 'react';
const API_BASE = import.meta.env.VITE_API_URL || '';
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
export interface SiteSettings {
  id: string;
  siteName: string;
  siteTitle: string;
  favicon: string | null;
  logo: string | null;
  colorPrimary: string;
  colorSecondary: string;
  darkMode: 'light' | 'dark' | 'system';
  storefrontTemplate: string;
  heroSection: HeroSection | null;
  featuresSection: FeatureItem[] | null;
  ctaSection: CtaSection | null;
  landingSocial?: { platform: string; label: string; url: string; icon?: string; enabled?: boolean }[];
  landingHours?: { enabled?: boolean; rows?: { day: number; label: string; hours: string }[]; timezone?: string };
  landingContact?: { phone?: string; whatsapp?: string; email?: string; address?: string };
  visualPublished?: {
    colors?: { primary?: string; secondary?: string; background?: string; surface?: string; text?: string; textMuted?: string; border?: string; price?: string };
    typography?: { font?: string; weight?: string; baseSize?: number; headingScale?: number };
    components?: { cardRadius?: number; buttonRadius?: number; buttonStyle?: string };
  } | null;
}
interface ThemeContextType {
  settings: SiteSettings;
  isDark: boolean;
}
const defaultSettings: SiteSettings = {
  id: 'default',
  siteName: 'King Food',
  siteTitle: 'King Food | Açaí brasileiro de verdade · Columbus, OH',
  favicon: 'https://kingfood.online/icons/launchericon-192x192.png',
  logo: 'https://kingfood.online/logo-kingfood.png.png',
  colorPrimary: '#FFD100',
  colorSecondary: '#E31818',
  darkMode: 'light',
  storefrontTemplate: 'modern',
  heroSection: {
    title: 'Açaí brasileiro de verdade',
    subtitle: 'Sabor do Brasil pra sua casa. Peça agora.',
    ctaPrimaryText: 'Ver Cardápio',
    ctaPrimaryLink: '/menu',
    ctaSecondaryText: 'Pedir agora',
    ctaSecondaryLink: '/menu',
  },
  featuresSection: null,
  ctaSection: null,
  landingSocial: undefined,
  landingHours: undefined,
  landingContact: undefined,
};
const ThemeContext = createContext<ThemeContextType>({
  settings: defaultSettings,
  isDark: false,
});
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
function generatePalette(hex: string): Record<string, string> {
  const [h, s] = hexToHsl(hex);
  const shades: Record<string, number> = {
    '50': 96,
    '100': 90,
    '200': 80,
    '300': 70,
    '400': 60,
    '500': 50,
    '600': 40,
    '700': 33,
    '800': 26,
    '900': 20,
    '950': 12,
  };
  const result: Record<string, string> = {};
  for (const [key, lightness] of Object.entries(shades)) {
    result[key] = hslToHex(h, s, lightness);
  }
  return result;
}
function applyColorVars(prefix: string, hex: string) {
  const palette = generatePalette(hex);
  const root = document.documentElement;
  for (const [shade, color] of Object.entries(palette)) {
    root.style.setProperty(`--color-${prefix}-${shade}`, color);
  }
}
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setSettings({ ...defaultSettings, ...json.data });
        }
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    applyColorVars('primary', settings.colorPrimary || '#FFD100');
    applyColorVars('secondary', settings.colorSecondary || '#E31818');
  }, [settings.colorPrimary, settings.colorSecondary]);
  // === Função reutilizável: aplica config visual ao :root ===
  const FONT_STACKS: Record<string, string> = {
    system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: 'ui-monospace, "Cascadia Code", "Courier New", monospace',
  };
  function applyVisualConfig(v: any) {
    if (!v) return;
    const root = document.documentElement;
    if (v.colors?.primary) {
      applyColorVars('primary', v.colors.primary);
      root.style.setProperty('--kf-primary', v.colors.primary);
    }
    if (v.colors?.secondary) {
      applyColorVars('secondary', v.colors.secondary);
      root.style.setProperty('--kf-secondary', v.colors.secondary);
    }
    if (v.colors?.background) root.style.setProperty('--kf-bg', v.colors.background);
    if (v.colors?.surface) root.style.setProperty('--kf-surface', v.colors.surface);
    if (v.colors?.text) { root.style.setProperty('--kf-foreground', v.colors.text); root.style.setProperty('--kf-ink', v.colors.text); }
    if (v.colors?.textMuted) root.style.setProperty('--kf-muted', v.colors.textMuted);
    if (v.colors?.border) root.style.setProperty('--kf-border', v.colors.border);
    if (v.colors?.price) root.style.setProperty('--kf-price', v.colors.price);
    if (v.colors?.accent) root.style.setProperty('--kf-accent', v.colors.accent);
    if (v.typography?.font) {
      const stack = FONT_STACKS[v.typography.font] || FONT_STACKS.system;
      root.style.setProperty('--kf-font-sans', stack);
      root.style.setProperty('--kf-font-display', stack);
    }
    if (v.components?.cardRadius != null) {
      root.style.setProperty('--kf-radius-lg', `${v.components.cardRadius}px`);
      root.style.setProperty('--kf-radius-md', `${Math.max(6, Math.round(v.components.cardRadius * 0.6))}px`);
    }
    if (v.components?.buttonStyle && v.components?.buttonRadius != null) {
      const r = v.components.buttonStyle === 'pill' ? 9999 : v.components.buttonRadius;
      root.style.setProperty('--kf-radius-pill', `${r}px`);
    }
  }

  // Aplica a configuração visual PUBLICADA (Fase 3) — a loja só muda
  // quando o admin publica explicitamente. Nunca usa o rascunho.
  useEffect(() => {
    applyVisualConfig(settings.visualPublished);
  }, [settings.visualPublished]);

  // === PREVIEW AO VIVO: recebe rascunho do Construtor Visual via postMessage ===
  // O admin embute este storefront num iframe e envia o rascunho a cada mudança.
  // URL deve conter ?preview=1 para ativar o modo preview.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') !== '1') return;
    function onMessage(e: MessageEvent) {
      if (!e.data || e.data.type !== 'kf-preview') return;
      applyVisualConfig(e.data.config);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    const { darkMode } = settings;
    let dark = false;
    if (darkMode === 'dark') {
      dark = true;
    } else if (darkMode === 'system') {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);
  useEffect(() => {
    document.title = settings.siteTitle;
  }, [settings.siteTitle]);
  useEffect(() => {
    if (settings.favicon) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.favicon;
    }
  }, [settings.favicon]);
  return (
    <ThemeContext.Provider value={{ settings, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  return useContext(ThemeContext);
}
