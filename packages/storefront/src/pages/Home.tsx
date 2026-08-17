/**
 * King Food entry page — faithful clone of king-food-v3 landing (kingfood.online).
 * Preserves Foundation integration: /menu routing, splash, hours sheet, open status.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.js';
import Footer from '../components/Footer.js';
import { CategoryPills } from '../components/CategoryPills.js';
import { QuickSearch } from '../components/QuickSearch.js';
import { PromoBanner } from '../components/PromoBanner.js';
import { FeaturedProductGrid } from '../components/FeaturedProductGrid.js';
import CartBar from '../components/CartBar.js';

const WA_URL_DEF = 'https://wa.me/12673107535';
const GROUP_URL_DEF = 'https://chat.whatsapp.com/LtoVNE9AJ2u2nlrlruTxhd';
const MAPS_URL_DEF = 'https://maps.app.goo.gl/GR2gpipSMqZdH9Xy5';
const INSTAGRAM_URL_DEF = 'https://instagram.com/king.food_delivery';
const SORTEIO_IG_POST_URL = 'https://www.instagram.com/p/DbjecIfC6kS/?igsh=MWF2dnZzZ3RudmF6Yw==';
const BG_DEF = 'https://kingfood.online/bg-acai.jpg';
const LOGO_DEF = '/logo-kingfood.png.png';
const FEATURED_IMG = '/featured-abacaxi.png';
const FEATURED_PRODUCT_URL = 'https://kingfood.fe-v2.ola.click/acai-do-king/acai-tropical-no-abacaxi';
const TZ_DEF = 'America/New_York';

const DEFAULT_HOURS: { day: number; label: string; hours: string }[] = [
  { day: 0, label: 'Domingo', hours: '6:00 PM – 10:30 PM' },
  { day: 1, label: 'Segunda-feira', hours: '7:00 PM – 10:00 PM' },
  { day: 2, label: 'Terça-feira', hours: 'Fechado' },
  { day: 3, label: 'Quarta-feira', hours: '7:00 PM – 10:00 PM' },
  { day: 4, label: 'Quinta-feira', hours: '7:00 PM – 10:00 PM' },
  { day: 5, label: 'Sexta-feira', hours: 'Fechado' },
  { day: 6, label: 'Sábado', hours: '9:00 PM – 11:00 PM' },
];

function getHours(settings: any): { day: number; label: string; hours: string }[] {
  return settings?.landingHours?.rows || DEFAULT_HOURS;
}
function getSocialLinks(settings: any, onHours: () => void): any[] {
  const stored = settings?.landingSocial || [];
  if (stored.length > 0) {
    return stored
      .filter((s: any) => s.enabled !== false)
      .map((s: any) => {
        if (s.platform === 'hours' || s.url === '#hours') return { label: s.label, icon: s.icon || '🕐', action: 'hours' as const };
        return { label: s.label, icon: s.icon || '🔗', href: s.url };
      });
  }
  return [
    { label: 'Cardápio', icon: '🥣', action: 'menu' as const },
    { label: 'Grupo WhatsApp', icon: '💬', href: GROUP_URL_DEF },
    { label: 'WhatsApp', icon: '📱', href: WA_URL_DEF },
    { label: 'Instagram', icon: '📸', href: INSTAGRAM_URL_DEF },
    { label: 'Google Maps', icon: '📍', href: MAPS_URL_DEF },
    { label: 'Horários e entrega', icon: '🕐', action: 'hours' as const },
  ];
}

type OpenStatus =
  | { open: true; label: string; detail: string }
  | { open: false; label: string; detail: string };

function parseClock(token: string): number | null {
  const m = token.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

function getColumbusNow(): { day: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ_DEF,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  let hour = parseInt(get('hour'), 10);
  if (Number.isNaN(hour) || hour === 24) hour = 0;
  const minute = parseInt(get('minute'), 10) || 0;
  return { day: dayMap[get('weekday')] ?? new Date().getDay(), minutes: hour * 60 + minute };
}

function computeOpenStatus(): OpenStatus {
  const { day, minutes } = getColumbusNow();
  const row = DEFAULT_HOURS.find((h) => h.day === day) ?? DEFAULT_HOURS[0];
  if (row.hours === 'Fechado') {
    for (let i = 1; i <= 7; i++) {
      const nr = DEFAULT_HOURS.find((h) => h.day === (day + i) % 7)!;
      if (nr.hours !== 'Fechado') {
        const start = nr.hours.split('–')[0]?.trim() ?? '';
        return { open: false, label: 'Fechado', detail: i === 1 ? `Abre amanhã ${start}` : `Abre ${nr.label} ${start}` };
      }
    }
    return { open: false, label: 'Fechado', detail: 'Veja horários' };
  }
  const [startTok, endTok] = row.hours.split('–').map((s) => s.trim());
  const start = parseClock(startTok);
  const end = parseClock(endTok);
  if (start == null || end == null) return { open: false, label: 'Horários', detail: row.hours };
  if (minutes >= start && minutes < end) return { open: true, label: 'Aberto agora', detail: `Fecha ${endTok}` };
  if (minutes < start) return { open: false, label: 'Fechado', detail: `Abre ${startTok}` };
  for (let i = 1; i <= 7; i++) {
    const nr = DEFAULT_HOURS.find((h) => h.day === (day + i) % 7)!;
    if (nr.hours !== 'Fechado') {
      const ns = nr.hours.split('–')[0]?.trim() ?? '';
      return { open: false, label: 'Fechado', detail: i === 1 ? `Abre amanhã ${ns}` : `Abre ${nr.label} ${ns}` };
    }
  }
  return { open: false, label: 'Fechado', detail: 'Veja horários' };
}

function AcaiBerry({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="36" height="40" viewBox="0 0 36 40" fill="none" aria-hidden>
      <ellipse cx="18" cy="30" rx="14" ry="6" fill="#3D1F14" />
      <path d="M6 28c0 6.6 5.4 10 12 10s12-3.4 12-10H6z" fill="#5C2E1F" />
      <ellipse cx="18" cy="22" rx="13" ry="10" fill="#4A0E6B" />
      <ellipse cx="18" cy="20" rx="11" ry="8" fill="#6B1B8C" />
      <ellipse cx="13" cy="17" rx="3.2" ry="2" fill="#9B4DCA" opacity="0.85" />
      <circle cx="12" cy="23" r="1.3" fill="#FFD100" />
      <circle cx="17" cy="25" r="1.1" fill="#E8A317" />
      <circle cx="22" cy="22" r="1.2" fill="#FFD100" />
    </svg>
  );
}

function SplashScreen({ exiting, logo: logoProp }: { exiting: boolean; logo?: string }) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center kf-splash ${
        exiting ? 'kf-splash-exiting' : ''
      }`}
      role="status"
      aria-label="Carregando King Food"
    >
      <img src={logoProp || LOGO_DEF} alt="King Food" className="w-40 h-40 sm:w-44 sm:h-44 object-contain" decoding="async" />
      <div className="mt-7 flex items-end justify-center gap-2.5 h-12" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="kf-acai inline-flex">
            <AcaiBerry />
          </span>
        ))}
      </div>
      <div className="mt-6 w-36 h-1 rounded-full bg-black/15 overflow-hidden">
        <div className="kf-splash-bar h-full w-full rounded-full bg-black/70" />
      </div>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function Home() {
  const { settings } = useTheme();
  const logo = settings.logo || LOGO_DEF;
  const bg = settings.heroSection?.backgroundImage || BG_DEF;
  const myTz = settings.landingHours?.timezone || TZ_DEF;
  const myHours = getHours(settings);
  const mySideLinks = useMemo(() => getSocialLinks(settings, () => setShowHours(true)), [settings]);
  const myContact = settings.landingContact || {};
  const myWaUrl = myContact.whatsapp ? `https://wa.me/${myContact.whatsapp.replace(/[^\d]/g, '')}` : WA_URL_DEF;
  const myInstagramUrl = (settings.landingSocial || []).find((s: any) => s.platform?.toLowerCase() == 'instagram')?.url || INSTAGRAM_URL_DEF;
  const [loading, setLoading] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openStatus, setOpenStatus] = useState<OpenStatus>(() => computeOpenStatus());
  const [showHours, setShowHours] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const loadingDone = useRef(false);
  const today = useMemo(() => getColumbusNow().day, []);
  const navigate = useNavigate();

  useEffect(() => {
    setOpenStatus(computeOpenStatus());
    const id = window.setInterval(() => setOpenStatus(computeOpenStatus()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    fetch('/api/menu/categories')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setCategories((d?.data || []).slice(0, 10)))
      .catch(() => setCategories([]));
  }, []);

  // Splash (v3 timing)
  useEffect(() => {
    if (loadingDone.current) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const warm = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('kf_splash_seen') === '1';
    const minMs = reduce ? 200 : warm ? 450 : 700;
    const maxMs = reduce ? 400 : warm ? 900 : 1600;
    let finished = false;
    let exitTimer: number | undefined;

    const finish = () => {
      if (finished) return;
      finished = true;
      loadingDone.current = true;
      try { sessionStorage.setItem('kf_splash_seen', '1'); } catch { /* */ }
      setSplashExiting(true);
      exitTimer = window.setTimeout(() => setLoading(false), reduce ? 80 : 280);
    };

    const minTimer = window.setTimeout(() => { if (document.readyState === 'complete') finish(); }, minMs);
    const maxTimer = window.setTimeout(finish, maxMs);

    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
      window.clearTimeout(exitTimer);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen || showHours ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen, showHours]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { setScrolled(el.scrollTop > 80); ticking = false; });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [loading]);

  return (
    <div className="min-h-screen bg-[#E2DDCF] text-[#221D25] relative pb-[var(--kf-nav-h)] md:pb-0 overflow-x-hidden">
      {loading && <SplashScreen exiting={splashExiting} logo={logo} />}

      {/* Soft orbs — Yampi-like atmosphere (v3) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#FFD100]/25 blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-64 h-64 rounded-full bg-white/40 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-[#221D25]/[0.04] blur-3xl" />
      </div>

      {/* Promo bar — sorteio Instagram (v3) */}
      <a
        href={SORTEIO_IG_POST_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 z-40 block bg-[#221D25] text-[#E2DDCF] text-center text-[11px] sm:text-xs font-extrabold tracking-wide uppercase px-3 py-2.5 hover:bg-[#221D25]/90 active:scale-[0.99] transition"
      >
        Sorteio no Instagram · comenta AÇAÍ e participa →
      </a>

      {/* Header (v3) */}
      <header
        className={`sticky top-0 z-40 border-b transition-all duration-300 ${
          scrolled ? 'bg-[#E2DDCF]/90 backdrop-blur-md border-[#221D25]/10' : 'bg-transparent border-transparent'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-xl hover:bg-[#221D25]/5 transition active:scale-90"
              aria-label="Abrir menu"
            >
              <span className="block w-5 h-0.5 bg-[#221D25] rounded" />
              <span className="block w-5 h-0.5 bg-[#221D25] rounded" />
              <span className="block w-5 h-0.5 bg-[#221D25] rounded" />
            </button>
            <Link to="/" className="flex items-center gap-2.5 active:scale-95 transition-all duration-300" aria-label="King Food — início">
              <img src={logo} alt="King Food" className="w-8 h-8 object-contain rounded-lg" />
              <div className="leading-tight text-left">
                <p className="font-bold text-sm tracking-tight text-[#221D25]">King Food</p>
                <p className="text-[10px] text-[#221D25]/45">Açaí • Delivery</p>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1" aria-label="Principal">
            <Link to="/" className="px-3 py-2 rounded-lg text-sm font-semibold text-[#221D25]">Início</Link>
            <Link to="/menu" className="px-3 py-2 rounded-lg text-sm font-semibold text-[#221D25]/50 hover:text-[#221D25] hover:bg-[#221D25]/5">Cardápio</Link>
            <button
              type="button"
              onClick={() => setShowHours(true)}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-[#221D25]/50 hover:text-[#221D25] hover:bg-[#221D25]/5"
            >
              Horários
            </button>
            <Link to="/menu" className="ml-2 px-5 py-2 kf-btn-ink text-sm">Pedir agora</Link>
            <a
              href={myWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 px-4 py-2 rounded-pill text-sm font-bold bg-[#25D366] text-white hover:bg-[#25D366]/90 transition"
            >
              WhatsApp
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHours(true)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold border ${
                openStatus.open ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-gray-100 border-gray-300 text-gray-600'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${openStatus.open ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="sm:hidden">{openStatus.open ? 'Aberto' : 'Fechado'}</span>
              <span className="hidden sm:inline">{openStatus.label}</span>
            </button>
            <Link
              to="/menu"
              className="md:hidden text-xs font-extrabold text-[#E2DDCF] bg-[#221D25] px-3.5 py-1.5 rounded-pill shadow-cta active:scale-95 transition"
            >
              Pedir
            </Link>
          </div>
        </div>
      </header>

      {/* Drawer overlay */}
      <div
        className={`fixed inset-0 z-50 bg-[#221D25]/40 transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Drawer (v3) */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[80%] max-w-xs bg-[#E2DDCF] border-r border-[#221D25]/10 shadow-2xl transition-transform duration-300 ease-out ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-4 py-5 flex items-center justify-between border-b border-[#221D25]/10">
          <div className="flex items-center gap-3">
            <img src={logo} alt="King Food" className="w-10 h-10 object-contain rounded-lg" />
            <div>
              <p className="font-bold text-[#221D25]">King Food</p>
              <p className="text-xs text-[#221D25]/40">Menu</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="w-9 h-9 rounded-full bg-[#221D25]/5 flex items-center justify-center text-[#221D25] hover:bg-[#221D25]/10 transition active:scale-90"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <nav className="py-2">
          {mySideLinks.map((link) => {
            if (link.action === 'hours') {
              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => { setDrawerOpen(false); setShowHours(true); }}
                  className="w-full text-left px-5 py-4 text-sm font-medium text-[#221D25]/80 hover:bg-[#221D25] hover:text-[#E2DDCF] border-b border-[#221D25]/5 transition active:bg-[#221D25]/90"
                >
                  <span className="mr-3">{link.icon}</span>
                  {link.label}
                </button>
              );
            }
            if (link.action === 'menu') {
              return (
                <Link
                  key={link.label}
                  to="/menu"
                  onClick={() => setDrawerOpen(false)}
                  className="block w-full text-left px-5 py-4 text-sm font-medium text-[#221D25]/80 hover:bg-[#221D25] hover:text-[#E2DDCF] border-b border-[#221D25]/5 transition active:bg-[#221D25]/90"
                >
                  <span className="mr-3">{link.icon}</span>
                  {link.label}
                </Link>
              );
            }
            return (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setDrawerOpen(false)}
                className="block w-full text-left px-5 py-4 text-sm font-medium text-[#221D25]/80 hover:bg-[#221D25] hover:text-[#E2DDCF] border-b border-[#221D25]/5 transition active:bg-[#221D25]/90"
              >
                <span className="mr-3">{link.icon}</span>
                {link.label}
              </a>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#221D25]/10">
          <p className="text-xs text-[#221D25]/35 text-center">Entrega em até 40 min • Columbus, OH</p>
        </div>
      </aside>

      {/* Main home content — v3 hero + destaques */}
      <main ref={mainRef} className="max-w-5xl mx-auto w-full pb-[calc(var(--kf-nav-h)+2rem)]">
        <div className="max-w-sm md:max-w-lg mx-auto flex flex-col items-center md:items-start text-center md:text-left px-5 pt-8 pb-8 md:pt-20">
          {/* Logo com glow */}
          <div className="relative mb-4">
            <div className="absolute inset-0 -m-3 rounded-3xl bg-white/50 blur-sm" aria-hidden />
            <img src={logo} alt="King Food" className="relative w-20 h-20 md:w-28 md:h-28 object-contain rounded-2xl" />
          </div>

          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#221D25]/45 mb-2">
            Delivery · Columbus, OH
          </p>
          <h1 className="kf-display text-3xl md:text-5xl text-[#221D25] mb-2">King Food</h1>
          <p className="text-sm md:text-base text-[#221D25]/70 font-semibold mb-1">Açaí brasileiro de verdade</p>
          <p className="text-sm md:text-base text-[#221D25]/55 leading-relaxed mb-7 max-w-md">
            Sabor do Brasil pra sua casa. Peça agora.
          </p>

          {/* CTA principal (v3 kf-btn-ink) */}
          <Link
            to="/menu"
            className="w-full md:w-auto md:min-w-[240px] kf-btn-ink py-3.5 text-base text-center will-change-transform"
          >
            Pedir agora →
          </Link>

          {/* Chips 2x2 (v3) */}
          <div className="w-full mt-5 grid grid-cols-2 gap-2">
            <a href={GROUP_URL_DEF} target="_blank" rel="noopener noreferrer" className="kf-chip px-3 py-3 text-sm font-bold text-[#221D25] text-center">
              Grupo WA
            </a>
            <a href={MAPS_URL_DEF} target="_blank" rel="noopener noreferrer" className="kf-chip px-3 py-3 text-sm font-bold text-[#221D25] text-center">
              Maps · avaliações
            </a>
            <button type="button" onClick={() => setShowHours(true)} className="kf-chip px-3 py-3 text-sm font-bold text-[#221D25]">
              Horários
            </button>
            <a href={myInstagramUrl} target="_blank" rel="noopener noreferrer" className="kf-chip px-3 py-3 text-sm font-bold text-[#221D25] text-center">
              Instagram
            </a>
          </div>

          {/* Destaque — Açaí No Abacaxi (v3) */}
          <button
            type="button"
            onClick={() => navigate('/menu')}
            className="w-full mt-7 kf-card p-3 flex items-center gap-3 overflow-hidden text-left hover:bg-white/70 active:scale-[0.99] transition"
          >
            <img src={FEATURED_IMG} alt="Açaí No Abacaxi" className="shrink-0 w-16 h-16 rounded-2xl object-cover shadow-soft" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-[#221D25]/40">Destaque</p>
              <p className="text-sm font-extrabold text-[#221D25] truncate">Açaí No Abacaxi 🍍</p>
              <p className="mt-0.5 text-xs font-bold text-[#221D25]/55">US$ 27.00 · Ver no cardápio →</p>
            </div>
          </button>
        </div>

        {/* Seções Foundation (cardápio rápido) */}
        <QuickSearch />
        <CategoryPills categories={categories} />
        <PromoBanner />
        <FeaturedProductGrid onAdd={(p) => navigate('/menu')} onClick={(p) => navigate('/menu')} />

        {/* Sobre rápido */}
        <section className="px-4 sm:px-6 pt-8 pb-10 text-center">
          <div className="max-w-md mx-auto kf-card p-4">
            <p className={`text-sm font-bold mb-1 ${openStatus.open ? 'text-emerald-600' : 'text-[#221D25]/50'}`}>
              {openStatus.open ? '● ' : '○ '}
              {openStatus.label}
              {openStatus.detail ? ` · ${openStatus.detail}` : ''}
            </p>
            <p className="text-sm text-[#221D25]/55 leading-relaxed">
              Feito pra quem sente falta do Brasil. Açaí de verdade, delivery rápido.
            </p>
          </div>
        </section>

        {/* Footer compacto */}
        <Footer />
      </main>

      {/* Floating WhatsApp - mobile (v3) */}
      <a
        href={myWaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="md:hidden fixed z-[45] right-4 bottom-16 w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#25D366]/90 text-white shadow-lg shadow-[#25D366]/30 flex items-center justify-center active:scale-90 transition"
        aria-label="WhatsApp"
      >
        <WhatsAppIcon className="w-7 h-7" />
      </a>

      {/* Hours sheet */}
      {showHours && (
        <div className="fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowHours(false)} />
          <div className="absolute bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:rounded-3xl w-full rounded-t-3xl border border-white/10 bg-black/95 p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold">Horários e entrega</h2>
              <button type="button" onClick={() => setShowHours(false)} className="w-10 h-10 rounded-full bg-white/10" aria-label="Fechar">
                ✕
              </button>
            </div>
            <p className={`text-sm font-semibold mb-4 ${openStatus.open ? 'text-emerald-300' : 'text-white/60'}`}>
              {openStatus.label} · {openStatus.detail}
            </p>
            <ul className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
              {myHours.map((row) => {
                const isToday = row.day === today;
                return (
                  <li key={row.day} className={`flex justify-between gap-3 px-4 py-3 text-sm ${isToday ? 'bg-[#FFD100]/10' : ''}`}>
                    <span className={isToday ? 'font-bold text-[#FFD100]' : 'text-white/80'}>
                      {row.label}
                      {isToday ? ' · hoje' : ''}
                    </span>
                    <span className={isToday ? 'font-bold text-[#FFD100]' : row.hours === 'Fechado' ? 'text-white/30' : 'text-white/60'}>
                      {row.hours}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Link
              to="/menu"
              onClick={() => setShowHours(false)}
              className="mt-4 flex min-h-[52px] items-center justify-center rounded-2xl bg-[#FFD100] text-black font-bold"
            >
              {openStatus.open ? 'Pedir agora' : 'Ver cardápio'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
