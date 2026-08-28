import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.js';
import { computeOpenStatus, getColumbusNow, getHours } from '../lib/hours.js';

const WA_URL_DEF = 'https://wa.me/12673107535';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/**
 * StoreHeader — réplica do header v3 da landing (Home).
 * Mesmo topo/base do site: logo, status aberto/fechado, Horários,
 * Pedir agora e WhatsApp. O conteúdo de baixo muda por página.
 */
export default function StoreHeader() {
  const { settings } = useTheme();
  const logo = settings.logo;
  const myHours = getHours(settings);
  const myContact = settings.landingContact || {};
  const myWaUrl = myContact.whatsapp ? `https://wa.me/${myContact.whatsapp.replace(/[^\d]/g, '')}` : WA_URL_DEF;

  const [openStatus, setOpenStatus] = useState(() => computeOpenStatus(myHours));
  const [showHours, setShowHours] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const today = useMemo(() => getColumbusNow().day, []);

  useEffect(() => {
    setOpenStatus(computeOpenStatus(myHours));
    const id = window.setInterval(() => setOpenStatus(computeOpenStatus(myHours)), 60_000);
    return () => window.clearInterval(id);
  }, [myHours]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = showHours ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showHours]);

  return (
    <>
      {/* Promo bar — sorteio Instagram (v3) */}
      <a
        href="https://www.instagram.com/p/DbjecIfC6kS/?igsh=MWF2dnZzZ3RudmF6Yw=="
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 z-40 block bg-kf-ink text-kf-bg text-center text-[11px] sm:text-xs font-extrabold tracking-wide uppercase px-3 py-2.5 hover:bg-kf-ink/90 active:scale-[0.99] transition"
      >
        Sorteio no Instagram · comenta AÇAÍ e participa →
      </a>

      {/* Header (v3) — barra única com fade de transparência */}
      <div className="sticky top-0 z-40">
      <header
        className={`transition-all duration-300 ${
          scrolled ? 'backdrop-blur-md' : ''
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt="King Food" className="w-8 h-8 rounded-lg object-cover" />
            ) : null}
            <span className="text-sm font-extrabold tracking-tight text-kf-ink">King Food</span>
          </div>

          <nav className="hidden md:flex items-center gap-1" aria-label="Principal">
            <Link to="/" className="px-3 py-2 rounded-lg text-sm font-semibold text-kf-ink/50 hover:text-kf-ink hover:bg-kf-ink/5">Início</Link>
            <Link to="/menu" className="px-3 py-2 rounded-lg text-sm font-semibold text-kf-ink">Cardápio</Link>
            <button
              type="button"
              onClick={() => setShowHours(true)}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-kf-ink/50 hover:text-kf-ink hover:bg-kf-ink/5"
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
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full min-h-[44px] px-3 py-2 text-[11px] font-bold border ${
                openStatus.open ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-gray-100 border-gray-300 text-gray-600'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${openStatus.open ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="sm:hidden">{openStatus.open ? 'Aberto' : 'Fechado'}</span>
              <span className="hidden sm:inline">{openStatus.label}</span>
            </button>
            <Link
              to="/menu"
              className="md:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-xs font-extrabold text-kf-bg bg-kf-ink px-4 py-2 rounded-pill active:scale-95 transition"
            >
              Pedir
            </Link>
          </div>
        </div>
      </header>      </div>

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
                  <li key={row.day} className={`flex justify-between gap-3 px-4 py-3 text-sm ${isToday ? 'bg-kf-primary/10' : ''}`}>
                    <span className={isToday ? 'font-bold text-kf-primary' : 'text-white/80'}>
                      {row.label}
                      {isToday ? ' · hoje' : ''}
                    </span>
                    <span className={isToday ? 'font-bold text-kf-primary' : row.hours === 'Fechado' ? 'text-white/30' : 'text-white/60'}>
                      {row.hours}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Link
              to="/menu"
              onClick={() => setShowHours(false)}
              className="mt-4 flex min-h-[52px] items-center justify-center rounded-2xl bg-kf-primary text-black font-bold"
            >
              {openStatus.open ? 'Pedir agora' : 'Ver cardápio'}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
