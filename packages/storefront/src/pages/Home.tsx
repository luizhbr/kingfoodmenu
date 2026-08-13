/**
 * King Food entry page — adapted from king-food-webview (v3) home shell.
 * Menu CTA routes to native /menu (no OlaClick iframe).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.js';
import FeaturedItems from '../components/FeaturedItems.js';
import Footer from '../components/Footer.js';

const WA_URL = 'https://wa.me/12673107535';
const GROUP_URL = 'https://chat.whatsapp.com/LtoVNE9AJ2u2nlrlruTxhd';
const MAPS_URL = 'https://maps.app.goo.gl/GR2gpipSMqZdH9Xy5';
const INSTAGRAM_URL = 'https://instagram.com/king.food_delivery';
const BG = 'https://kingfood.online/bg-acai.jpg';
const LOGO = 'https://kingfood.online/logo-kingfood.png.png';
const TZ = 'America/New_York';

const HOURS = [
  { day: 0, label: 'Domingo', hours: '6:00 PM – 10:30 PM' },
  { day: 1, label: 'Segunda-feira', hours: '7:00 PM – 10:00 PM' },
  { day: 2, label: 'Terça-feira', hours: 'Fechado' },
  { day: 3, label: 'Quarta-feira', hours: '7:00 PM – 10:00 PM' },
  { day: 4, label: 'Quinta-feira', hours: '7:00 PM – 10:00 PM' },
  { day: 5, label: 'Sexta-feira', hours: 'Fechado' },
  { day: 6, label: 'Sábado', hours: '9:00 PM – 11:00 PM' },
];

const SIDE_LINKS = [
  { label: 'Grupo WhatsApp', icon: '💬', href: GROUP_URL },
  { label: 'Instagram', icon: '📸', href: INSTAGRAM_URL },
  { label: 'Horários e entrega', icon: '🕐', action: 'hours' as const },
  { label: 'Fale conosco', icon: '📱', href: WA_URL },
];

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
    timeZone: TZ,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  let hour = parseInt(get('hour'), 10);
  if (Number.isNaN(hour) || hour === 24) hour = 0;
  const minute = parseInt(get('minute'), 10) || 0;
  return { day: dayMap[get('weekday')] ?? new Date().getDay(), minutes: hour * 60 + minute };
}

function computeOpenStatus(): OpenStatus {
  const { day, minutes } = getColumbusNow();
  const row = HOURS.find((h) => h.day === day) ?? HOURS[0];
  if (row.hours === 'Fechado') {
    for (let i = 1; i <= 7; i++) {
      const nr = HOURS.find((h) => h.day === (day + i) % 7)!;
      if (nr.hours !== 'Fechado') {
        const start = nr.hours.split('–')[0]?.trim() ?? '';
        return {
          open: false,
          label: 'Fechado',
          detail: i === 1 ? `Abre amanhã ${start}` : `Abre ${nr.label} ${start}`,
        };
      }
    }
    return { open: false, label: 'Fechado', detail: 'Veja horários' };
  }
  const [startTok, endTok] = row.hours.split('–').map((s) => s.trim());
  const start = parseClock(startTok);
  const end = parseClock(endTok);
  if (start == null || end == null) return { open: false, label: 'Horários', detail: row.hours };
  if (minutes >= start && minutes < end) {
    return { open: true, label: 'Aberto agora', detail: `Fecha ${endTok}` };
  }
  if (minutes < start) return { open: false, label: 'Fechado', detail: `Abre ${startTok}` };
  for (let i = 1; i <= 7; i++) {
    const nr = HOURS.find((h) => h.day === (day + i) % 7)!;
    if (nr.hours !== 'Fechado') {
      const ns = nr.hours.split('–')[0]?.trim() ?? '';
      return {
        open: false,
        label: 'Fechado',
        detail: i === 1 ? `Abre amanhã ${ns}` : `Abre ${nr.label} ${ns}`,
      };
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

function SplashScreen({ exiting }: { exiting: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center kf-splash ${
        exiting ? 'kf-splash-exiting' : ''
      }`}
      role="status"
      aria-label="Carregando King Food"
    >
      <img
        src={LOGO}
        alt="King Food"
        className="w-40 h-40 sm:w-44 sm:h-44 object-contain"
        decoding="async"
      />
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

function GoogleGIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function Home() {
  const { settings } = useTheme();
  const logo = settings.logo || LOGO;
  const [loading, setLoading] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openStatus, setOpenStatus] = useState<OpenStatus>(() => computeOpenStatus());
  const [showHours, setShowHours] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const loadingDone = useRef(false);
  const today = useMemo(() => getColumbusNow().day, []);

  useEffect(() => {
    setOpenStatus(computeOpenStatus());
    const id = window.setInterval(() => setOpenStatus(computeOpenStatus()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Splash (v3 timing)
  useEffect(() => {
    if (loadingDone.current) return;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const warm =
      typeof sessionStorage !== 'undefined' && sessionStorage.getItem('kf_splash_seen') === '1';
    const minMs = reduce ? 200 : warm ? 450 : 700;
    const maxMs = reduce ? 400 : warm ? 900 : 1600;
    let finished = false;
    let exitTimer: number | undefined;

    const finish = () => {
      if (finished) return;
      finished = true;
      loadingDone.current = true;
      try {
        sessionStorage.setItem('kf_splash_seen', '1');
      } catch {
        /* */
      }
      setSplashExiting(true);
      exitTimer = window.setTimeout(() => setLoading(false), reduce ? 80 : 280);
    };

    const minTimer = window.setTimeout(() => {
      if (document.readyState === 'complete') finish();
    }, minMs);
    const maxTimer = window.setTimeout(finish, maxMs);

    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
      window.clearTimeout(exitTimer);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen || showHours ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen, showHours]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(el.scrollTop > 80);
        ticking = false;
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [loading]);

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-gray-900 relative pb-[var(--kf-nav-h)] md:pb-0">
      {loading && <SplashScreen exiting={splashExiting} />}

      {/* Header limpo */}
      <header
        className={`sticky top-0 z-40 bg-[#F5F1E8]/95 backdrop-blur-md border-b border-ink/5 transition-all duration-300 ${
          scrolled ? 'shadow-sm' : ''
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2.5 max-w-5xl mx-auto w-full gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden w-11 h-11 flex flex-col items-center justify-center gap-1.5 rounded-xl hover:bg-ink/5 transition active:scale-90 shrink-0"
              aria-label="Abrir menu"
            >
              <span className="block w-5 h-0.5 bg-ink rounded" />
              <span className="block w-5 h-0.5 bg-ink rounded" />
              <span className="block w-5 h-0.5 bg-ink rounded" />
            </button>
            <Link to="/" className="flex items-center gap-2 min-w-0">
              <img
                src={logo}
                alt="King Food"
                className="w-9 h-9 object-cover rounded-xl shrink-0 bg-[#FFD100]"
              />
              <div className="leading-tight text-left min-w-0">
                <p className="font-extrabold text-base tracking-tight truncate text-ink">King Food</p>
                <p className="text-[10px] text-gray-500 truncate">Delivery · Columbus, OH</p>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1" aria-label="Principal">
            <Link to="/" className="min-h-[44px] px-3 py-2 rounded-lg text-sm font-bold text-primary-600">
              Início
            </Link>
            <Link
              to="/menu"
              className="min-h-[44px] px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-ink/5"
            >
              Cardápio
            </Link>
            <button
              type="button"
              onClick={() => setShowHours(true)}
              className="min-h-[44px] px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-ink/5"
            >
              Horários
            </button>
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold bg-[#25D366] text-white"
            >
              WhatsApp
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHours(true)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold border ${
                openStatus.open
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-gray-100 border-gray-300 text-gray-600'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  openStatus.open ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                }`}
              />
              <span className="sm:hidden">{openStatus.open ? 'Aberto' : 'Fechado'}</span>
              <span className="hidden sm:inline">{openStatus.label}</span>
            </button>
            <Link
              to="/menu"
              className="shrink-0 min-h-[44px] px-4 py-2 rounded-xl bg-[#FFD100] text-ink text-sm font-extrabold shadow-sm active:scale-[0.98] transition"
            >
              Pedir
            </Link>
          </div>
        </div>
      </header>

      {/* Drawer overlay */}
      <div
        className={`fixed inset-0 z-50 bg-ink/50 transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[80%] max-w-xs bg-[#F5F1E8] border-r border-ink/10 shadow-2xl transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-4 py-5 flex items-center justify-between border-b border-ink/10">
          <div className="flex items-center gap-3">
            <img src={logo} alt="King Food" className="w-10 h-10 object-cover rounded-xl bg-[#FFD100]" />
            <div>
              <p className="font-bold text-ink">King Food</p>
              <p className="text-xs text-gray-500">Menu</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="w-11 h-11 rounded-full bg-ink/5 text-ink"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <nav className="py-2">
          <Link
            to="/menu"
            onClick={() => setDrawerOpen(false)}
            className="block w-full text-left px-5 py-4 text-sm font-medium text-ink hover:bg-[#FFD100] hover:text-ink border-b border-ink/5"
          >
            <span className="mr-3">🛒</span>
            Pedir agora
          </Link>
          {SIDE_LINKS.map((link) =>
            link.action === 'hours' ? (
              <button
                key={link.label}
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setShowHours(true);
                }}
                className="w-full text-left px-5 py-4 text-sm font-medium text-ink/80 hover:bg-[#FFD100] hover:text-ink border-b border-ink/5"
              >
                <span className="mr-3">{link.icon}</span>
                {link.label}
              </button>
            ) : (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setDrawerOpen(false)}
                className="block w-full text-left px-5 py-4 text-sm font-medium text-ink/80 hover:bg-[#FFD100] hover:text-ink border-b border-ink/5"
              >
                <span className="mr-3">{link.icon}</span>
                {link.label}
              </a>
            )
          )}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-ink/10">
          <p
            className={`text-xs text-center font-semibold ${
              openStatus.open ? 'text-emerald-600' : 'text-gray-500'
            }`}
          >
            {openStatus.open ? '● ' : '○ '}
            {openStatus.label} · {openStatus.detail}
          </p>
          <p className="text-xs text-gray-400 text-center mt-1">Delivery · Columbus, OH</p>
        </div>
      </aside>

      {/* Main home content — hero compacto + destaques */}
      <main className="max-w-5xl mx-auto w-full">
        {/* Hero compacto */}
        <section className="px-4 sm:px-6 pt-6 sm:pt-12 pb-2 text-center">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-3">
            Delivery · Columbus, OH
          </p>
          <div className="flex justify-center mb-3">
            <img
              src={logo}
              alt="King Food"
              className="w-20 h-20 sm:w-28 sm:h-28 object-cover rounded-3xl bg-[#FFD100] shadow-lg shadow-[#FFD100]/20"
            />
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight mb-2">
            King Food
          </h1>
          <p className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Açaí brasileiro de verdade</p>
          <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto mb-6">
            Sabor do Brasil pra sua casa. Peça agora.
          </p>

          {/* CTA principal — dominante */}
          <Link
            to="/menu"
            className="w-full sm:w-auto sm:min-w-[280px] min-h-[52px] inline-flex items-center justify-center bg-[#FFD100] hover:bg-[#FFD100]/90 text-ink font-extrabold text-base px-8 py-3.5 rounded-2xl shadow-lg shadow-[#FFD100]/30 active:scale-[0.98] transition"
          >
            Pedir agora →
          </Link>

          {/* Links secundários compactos */}
          <div className="grid grid-cols-2 gap-2.5 max-w-md mx-auto mt-5">
            <a
              href={GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl border border-ink/10 bg-white/70 text-sm font-semibold text-gray-700 hover:bg-white active:scale-[0.98] transition"
            >
              💬 Grupo WA
            </a>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl border border-ink/10 bg-white/70 text-sm font-semibold text-gray-700 hover:bg-white active:scale-[0.98] transition"
            >
              📍 Maps
            </a>
            <button
              type="button"
              onClick={() => setShowHours(true)}
              className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl border border-ink/10 bg-white/70 text-sm font-semibold text-gray-700 hover:bg-white active:scale-[0.98] transition"
            >
              🕐 Horários
            </button>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl border border-ink/10 bg-white/70 text-sm font-semibold text-gray-700 hover:bg-white active:scale-[0.98] transition"
            >
              📸 Instagram
            </a>
          </div>
        </section>

        {/* Destaques — produtos reais aparecem cedo */}
        <section className="pt-8 pb-2">
          <FeaturedItems limit={4} />
        </section>

        {/* Sobre rápido */}
        <section className="px-4 sm:px-6 pt-8 pb-10 text-center">
          <div className="max-w-md mx-auto">
            <p className={`text-sm font-bold mb-1 ${openStatus.open ? 'text-emerald-600' : 'text-gray-500'}`}>
              {openStatus.open ? '● ' : '○ '}
              {openStatus.label}
              {openStatus.detail ? ` · ${openStatus.detail}` : ''}
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Feito pra quem sente falta do Brasil. Açaí de verdade, delivery rápido.
            </p>
          </div>
        </section>

        {/* Footer compacto */}
        <Footer />
      </main>

      {/* Hours sheet */}
      {showHours && (
        <div className="fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowHours(false)} />
          <div className="absolute bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:rounded-3xl w-full rounded-t-3xl border border-white/10 bg-black/95 p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold">Horários e entrega</h2>
              <button
                type="button"
                onClick={() => setShowHours(false)}
                className="w-10 h-10 rounded-full bg-white/10"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <p className={`text-sm font-semibold mb-4 ${openStatus.open ? 'text-emerald-300' : 'text-white/60'}`}>
              {openStatus.label} · {openStatus.detail}
            </p>
            <ul className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
              {HOURS.map((row) => {
                const isToday = row.day === today;
                return (
                  <li
                    key={row.day}
                    className={`flex justify-between gap-3 px-4 py-3 text-sm ${
                      isToday ? 'bg-[#FFD100]/10' : ''
                    }`}
                  >
                    <span className={isToday ? 'font-bold text-[#FFD100]' : 'text-white/80'}>
                      {row.label}
                      {isToday ? ' · hoje' : ''}
                    </span>
                    <span
                      className={
                        isToday
                          ? 'font-bold text-[#FFD100]'
                          : row.hours === 'Fechado'
                            ? 'text-white/30'
                            : 'text-white/60'
                      }
                    >
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
