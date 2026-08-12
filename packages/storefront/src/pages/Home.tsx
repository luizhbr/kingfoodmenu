import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.js';

const WA_URL = 'https://wa.me/12673107535';
const GROUP_URL = 'https://chat.whatsapp.com/LtoVNE9AJ2u2nlrlruTxhd';
const MAPS_URL = 'https://maps.app.goo.gl/GR2gpipSMqZdH9Xy5';
const INSTAGRAM_URL = 'https://instagram.com/king.food_delivery';
const BG = 'https://kingfood.online/bg-acai.jpg';
const LOGO = 'https://kingfood.online/logo-kingfood.png.png';
const TZ = 'America/New_York';

/** Hours mirror production shell (Columbus, OH). */
const HOURS = [
  { day: 0, label: 'Domingo', hours: '6:00 PM – 10:30 PM' },
  { day: 1, label: 'Segunda-feira', hours: '7:00 PM – 10:00 PM' },
  { day: 2, label: 'Terça-feira', hours: 'Fechado' },
  { day: 3, label: 'Quarta-feira', hours: '7:00 PM – 10:00 PM' },
  { day: 4, label: 'Quinta-feira', hours: '7:00 PM – 10:00 PM' },
  { day: 5, label: 'Sexta-feira', hours: 'Fechado' },
  { day: 6, label: 'Sábado', hours: '9:00 PM – 11:00 PM' },
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
  const wd = get('weekday');
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
  if (Number.isNaN(hour)) hour = 0;
  if (hour === 24) hour = 0;
  const minute = parseInt(get('minute'), 10) || 0;
  return { day: dayMap[wd] ?? new Date().getDay(), minutes: hour * 60 + minute };
}

function computeOpenStatus(): OpenStatus {
  const { day, minutes } = getColumbusNow();
  const row = HOURS.find((h) => h.day === day) ?? HOURS[0];
  if (row.hours === 'Fechado') {
    for (let i = 1; i <= 7; i++) {
      const nd = (day + i) % 7;
      const nr = HOURS.find((h) => h.day === nd)!;
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
  if (start == null || end == null) {
    return { open: false, label: 'Horários', detail: row.hours };
  }
  if (minutes >= start && minutes < end) {
    return { open: true, label: 'Aberto agora', detail: `Fecha ${endTok}` };
  }
  if (minutes < start) {
    return { open: false, label: 'Fechado', detail: `Abre ${startTok}` };
  }
  for (let i = 1; i <= 7; i++) {
    const nd = (day + i) % 7;
    const nr = HOURS.find((h) => h.day === nd)!;
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
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function Home() {
  const { settings } = useTheme();
  const logo = settings.logo || LOGO;
  const [openStatus, setOpenStatus] = useState<OpenStatus>(() => computeOpenStatus());
  const [showHours, setShowHours] = useState(false);
  const today = useMemo(() => getColumbusNow().day, []);

  useEffect(() => {
    setOpenStatus(computeOpenStatus());
    const id = window.setInterval(() => setOpenStatus(computeOpenStatus()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="relative min-h-[calc(100vh-4rem)] text-white"
      style={{
        background: `linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.72) 35%, rgba(0,0,0,0.45) 65%, rgba(0,0,0,0.2) 100%), url('${BG}') center/cover no-repeat`,
      }}
    >
      <div className="max-w-5xl mx-auto px-5 pt-8 pb-16 md:pt-16 md:pb-20">
        <div className="flex flex-col md:flex-row md:items-center md:gap-12">
          {/* Hero column */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1">
            <img
              src={logo}
              alt="King Food"
              className="w-20 h-20 md:w-32 md:h-32 object-cover mb-4 rounded-2xl bg-[#FFD100]"
              decoding="async"
            />

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              KING FOOD
            </h1>
            <p className="mt-2 text-sm md:text-base font-semibold text-white/90 drop-shadow">
              Açaí brasileiro de verdade · Columbus, OH
            </p>

            <button
              type="button"
              onClick={() => setShowHours(true)}
              className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition ${
                openStatus.open
                  ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                  : 'bg-white/10 border-white/15 text-white/75'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  openStatus.open ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'
                }`}
              />
              {openStatus.label}
              {openStatus.detail ? ` · ${openStatus.detail}` : ''}
            </button>

            <p className="mt-4 text-sm md:text-base text-white/95 max-w-md leading-relaxed drop-shadow">
              Sabor do Brasil pra sua casa. Peça agora.
            </p>

            <Link
              to="/menu"
              className="mt-6 w-full md:w-auto md:min-w-[240px] min-h-[52px] inline-flex items-center justify-center rounded-2xl bg-[#FFD100] text-black font-bold text-base shadow-lg shadow-[#FFD100]/25 hover:bg-[#FFD100]/90 active:scale-[0.98] transition"
            >
              {openStatus.open ? 'Pedir agora →' : 'Ver cardápio →'}
            </Link>

            <a
              href={GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 min-h-[44px] inline-flex items-center text-sm font-bold text-white/90 hover:text-white underline-offset-4 hover:underline"
            >
              Entrar no grupo e pegar novidade
            </a>

            <div className="mt-6 flex flex-wrap gap-2 justify-center md:justify-start">
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow"
              >
                <WhatsAppIcon className="w-4 h-4" />
                WhatsApp
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white"
              >
                Instagram
              </a>
              <button
                type="button"
                onClick={() => setShowHours(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white"
              >
                🕐 Horários
              </button>
            </div>
          </div>

          {/* Side cards — desktop */}
          <div className="hidden md:flex flex-col gap-4 flex-1 mt-10 md:mt-0">
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition min-h-[72px]"
            >
              <div className="shrink-0 w-11 h-11 rounded-full bg-white flex items-center justify-center">
                <GoogleGIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Google Business</p>
                <p className="text-[#FFD100] text-sm">★★★★★</p>
                <p className="text-sm text-[#FFD100]">Ver no Google o que a galera fala →</p>
              </div>
            </a>

            <div className="grid grid-cols-2 gap-3">
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-3.5 hover:bg-white/10 transition min-h-[64px]"
              >
                <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
                <div>
                  <p className="text-xs font-bold">WhatsApp</p>
                  <p className="text-[10px] text-white/70">Chamar agora</p>
                </div>
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-3.5 hover:bg-white/10 transition min-h-[64px]"
              >
                <span className="text-lg" aria-hidden>
                  📸
                </span>
                <div>
                  <p className="text-xs font-bold">Instagram</p>
                  <p className="text-[10px] text-white/70">@king.food_delivery</p>
                </div>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowHours(true)}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition text-left min-h-[72px]"
            >
              <span className="text-2xl" aria-hidden>
                🕐
              </span>
              <div>
                <p className="text-sm font-bold">Horários e entrega</p>
                <p className="text-xs text-white/50">
                  {openStatus.label} · delivery ~50–60 min
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile reviews + contact */}
        <div className="md:hidden mt-10 space-y-4">
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
          >
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <GoogleGIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Google Business</p>
              <p className="text-[#FFD100] text-sm">Ver avaliações →</p>
            </div>
          </a>
        </div>

        {/* Featured teaser */}
        <div className="mt-10 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-[#FFD100]/20 flex items-center justify-center text-2xl">
            🍍
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#FFD100]">Destaque</p>
            <p className="text-sm font-bold text-white truncate">Açaí Tropical (no Abacaxi)</p>
            <p className="text-xs text-white/60">US$ 27.00</p>
          </div>
          <Link
            to="/menu"
            className="shrink-0 text-xs font-bold text-[#FFD100] underline-offset-2 hover:underline"
          >
            Ver cardápio →
          </Link>
        </div>
      </div>

      {/* Hours modal */}
      {showHours && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowHours(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 bg-black/95 p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-white">Horários e entrega</h2>
              <button
                type="button"
                onClick={() => setShowHours(false)}
                className="w-10 h-10 rounded-full bg-white/10 text-white"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <p
              className={`text-sm font-semibold mb-4 ${
                openStatus.open ? 'text-emerald-300' : 'text-white/60'
              }`}
            >
              {openStatus.label} · {openStatus.detail}
            </p>
            <ul className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
              {HOURS.map((row) => {
                const isToday = row.day === today;
                const closed = row.hours === 'Fechado';
                return (
                  <li
                    key={row.day}
                    className={`flex items-center justify-between gap-3 px-4 py-3 ${
                      isToday ? 'bg-[#FFD100]/10' : ''
                    }`}
                  >
                    <span
                      className={`text-sm ${
                        isToday ? 'font-bold text-[#FFD100]' : 'font-medium text-white/80'
                      }`}
                    >
                      {row.label}
                      {isToday ? ' · hoje' : ''}
                    </span>
                    <span
                      className={`text-sm tabular-nums ${
                        isToday
                          ? 'font-bold text-[#FFD100]'
                          : closed
                            ? 'text-white/30'
                            : 'text-white/60'
                      }`}
                    >
                      {row.hours}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-sm text-white/50">Entrega ~50–60 min · Columbus, OH</p>
            <Link
              to="/menu"
              onClick={() => setShowHours(false)}
              className="mt-4 w-full min-h-[52px] inline-flex items-center justify-center rounded-2xl bg-[#FFD100] text-black font-bold"
            >
              {openStatus.open ? 'Pedir agora' : 'Ver cardápio'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
