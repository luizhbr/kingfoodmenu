import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext.js';

const HOURS = [
  { day: 0, label: 'Domingo', hours: '6:00 PM – 10:30 PM' },
  { day: 1, label: 'Segunda', hours: '7:00 PM – 10:00 PM' },
  { day: 2, label: 'Terça', hours: 'Fechado' },
  { day: 3, label: 'Quarta', hours: '7:00 PM – 10:00 PM' },
  { day: 4, label: 'Quinta', hours: '7:00 PM – 10:00 PM' },
  { day: 5, label: 'Sexta', hours: 'Fechado' },
  { day: 6, label: 'Sábado', hours: '9:00 PM – 11:00 PM' },
];

function HoursSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  const today = new Date().getDay();

  return (
    <div className="fixed inset-0 z-[70] md:hidden">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />
      <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border border-white/10 bg-black text-white p-5 pb-[calc(1rem+env(safe-area-inset-bottom))] max-h-[75vh] overflow-y-auto">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold">Horários e entrega</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
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
        <p className="mt-3 text-xs text-white/50">Entrega ~50–60 min · Columbus, OH</p>
        <Link
          to="/menu"
          onClick={onClose}
          className="mt-4 flex min-h-[48px] items-center justify-center rounded-2xl bg-[#FFD100] text-black font-bold"
        >
          Ver cardápio
        </Link>
      </div>
    </div>
  );
}

export default function BottomDock() {
  const location = useLocation();
  const { itemCount, setIsOpen } = useCart();
  const [hoursOpen, setHoursOpen] = useState(false);

  const path = location.pathname;
  const isHome = path === '/';
  const isMenu = path.startsWith('/menu') || path.startsWith('/checkout');

  const itemClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-0.5 min-w-[72px] min-h-[52px] py-1 rounded-lg transition active:scale-90 ${
      active ? 'text-[#FFD100]' : 'text-white/40'
    }`;

  return (
    <>
      <nav
        className="kf-bottom-dock md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch bg-black/95 backdrop-blur-xl border-t border-white/10 px-1 pt-1"
        style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
        aria-label="Navegação inferior"
      >
        <div className="flex items-center justify-evenly max-w-md mx-auto w-full">
          <Link to="/" className={itemClass(isHome)} aria-current={isHome ? 'page' : undefined}>
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12l9-9 9 9" />
              <path d="M5 10v10h14V10" />
            </svg>
            <span className="text-[10px] font-semibold">Início</span>
          </Link>

          <Link to="/menu" className={itemClass(isMenu)} aria-current={isMenu ? 'page' : undefined}>
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <line x1="8" y1="8" x2="16" y2="8" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="8" y1="16" x2="13" y2="16" />
            </svg>
            <span className="text-[10px] font-semibold">Cardápio</span>
          </Link>

          <button
            type="button"
            onClick={() => setHoursOpen(true)}
            className={itemClass(hoursOpen)}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 14" />
            </svg>
            <span className="text-[10px] font-semibold">Horários</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className={`${itemClass(false)} relative`}
            aria-label="Carrinho"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
            </svg>
            <span className="text-[10px] font-semibold">Carrinho</span>
            {itemCount > 0 && (
              <span className="absolute top-0.5 right-3 min-w-[16px] h-4 px-1 rounded-full bg-[#FFD100] text-black text-[10px] font-bold flex items-center justify-center">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      <HoursSheet open={hoursOpen} onClose={() => setHoursOpen(false)} />
    </>
  );
}
