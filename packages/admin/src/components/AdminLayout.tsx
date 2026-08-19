import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { PendingOrdersContext } from './PendingOrdersContext.js';
import MobileBottomNav from './MobileBottomNav.js';
import GlobalSearch from './GlobalSearch.js';

type Role = 'SUPER_ADMIN' | 'MANAGER' | 'STAFF';

const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: 'bg-red-500/20 text-red-300',
  MANAGER: 'bg-blue-500/20 text-blue-300',
  STAFF: 'bg-gray-500/20 text-gray-300',
};

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  STAFF: 'Funcionário',
};

/**
 * AdminLayout — header de CONTEXTO/FERRAMENTAS (busca, notificações, perfil).
 * A navegação principal entre áreas (Loja/Gestão/Vender/Pedidos) é ÚNICA:
 * fica na MobileBottomNav (fixa em todas as larguras).
 */
export default function AdminLayout({ children, onLogout }: { children: React.ReactNode; onLogout?: () => void }) {
  const location = useLocation();
  const { user, token } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;

    async function fetchPending() {
      try {
        const res = await fetch('/api/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.data) {
          setPendingCount(data.data?.metrics?.pendingOrders ?? 0);
        }
      } catch { /* ignore */ }
    }

    fetchPending();
    const interval = setInterval(fetchPending, 60000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const role = user?.role as Role | undefined;

  return (
    <div className="min-h-screen bg-cream/40 flex flex-col">
      <header className="bg-cream/90 backdrop-blur-md border-b border-ink/10 sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <span className="text-sm sm:text-base font-extrabold tracking-wide text-kf-ink truncate">
            KING FOOD
          </span>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <GlobalSearch />

            <Link
              to="/orders?status=PENDING"
              className="relative p-2.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
              title="Pedidos pendentes"
              aria-label="Pedidos pendentes"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full" aria-hidden="true">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </Link>

            {user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Menu do usuário"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full bg-[#FFD100]/20 text-ink flex items-center justify-center text-sm font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <svg className="w-4 h-4 text-gray-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-1 w-56 bg-cream rounded-xl shadow-soft border border-ink/10 py-1 z-50 kf-anim-scale-in">
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </div>
                    <Link
                      to="/settings/general"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Perfil
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Conta
                    </Link>
                    {role === 'SUPER_ADMIN' && (
                      <Link
                        to="/staff"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Usuários e permissões
                      </Link>
                    )}
                    {onLogout && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onLogout();
                        }}
                        className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        Sair
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto p-3 sm:p-6 overflow-x-hidden main-safe-bottom">
        <PendingOrdersContext.Provider value={pendingCount}>{children}</PendingOrdersContext.Provider>
      </main>

      {/* Única navegação principal — fixa em todas as larguras */}
      <MobileBottomNav />
    </div>
  );
}
