import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import MobileBottomNav from './MobileBottomNav';

type Role = 'SUPER_ADMIN' | 'MANAGER' | 'STAFF';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles: Role[];
  section: 'operar' | 'gerenciar' | 'crescer';
  children?: { path: string; label: string }[];
}

const navItems: NavItem[] = [
  { path: '/', label: 'Painel', icon: '\u25A1', roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'], section: 'operar' },
  { path: '/orders', label: 'Pedidos', icon: '\uD83D\uDCCB', roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'], section: 'operar' },
  {
    path: '/reservations',
    section: 'operar',
    label: 'Reservas',
    icon: '\uD83D\uDDD3',
    roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'],
    children: [
      { path: '/reservations', label: 'Todas as reservas' },
      { path: '/reservations/trends', label: 'Tendências' },
    ],
  },
  { path: '/reviews', label: 'Avaliações', icon: '\u2B50', roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'], section: 'crescer' },
  { path: '/kitchen', label: 'Cozinha', icon: '\uD83C\uDF73', roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'], section: 'operar' },
  { path: '/locations', label: 'Locais', icon: '\u25CE', roles: ['SUPER_ADMIN', 'MANAGER'], section: 'gerenciar' },
  {
    path: '/menu',
    section: 'gerenciar',
    label: 'Cardápio',
    icon: '\u2630',
    roles: ['SUPER_ADMIN', 'MANAGER'],
    children: [
      { path: '/menu/items', label: 'Itens' },
      { path: '/menu/categories', label: 'Categorias' },
    ],
  },
  { path: '/reports', label: 'Relatórios', icon: '\uD83D\uDCCA', roles: ['SUPER_ADMIN', 'MANAGER'], section: 'crescer' },
  { path: '/coupons', label: 'Cupons', icon: '\uD83C\uDFF7', roles: ['SUPER_ADMIN', 'MANAGER'], section: 'crescer' },
  { path: '/automation', label: 'Automação', icon: '\u26A1', roles: ['SUPER_ADMIN', 'MANAGER'], section: 'crescer' },
  { path: '/loyalty', label: 'Fidelidade', icon: '\uD83C\uDF81', roles: ['SUPER_ADMIN', 'MANAGER'], section: 'crescer' },
  {
    path: '/design',
    section: 'gerenciar',
    label: 'Design',
    icon: '\uD83C\uDFA8',
    roles: ['SUPER_ADMIN', 'MANAGER'],
    children: [
      { path: '/design/landing', label: 'Página inicial' },
      { path: '/design/branding', label: 'Marca' },
      { path: '/design/theme', label: 'Tema' },
      { path: '/design/templates', label: 'Modelos' },
      { path: '/design/gallery', label: 'Galeria' },
      { path: '/design/media', label: 'Biblioteca de mídia' },
    ],
  },
  {
    path: '/legal',
    section: 'gerenciar',
    label: 'Jurídico',
    icon: '\u2696',
    roles: ['SUPER_ADMIN', 'MANAGER'],
    children: [
      { path: '/legal/pages', label: 'Páginas' },
      { path: '/legal/cookies', label: 'Categorias de cookies' },
      { path: '/legal/consent', label: 'Registro de consentimento' },
    ],
  },
  {
    path: '/settings',
    section: 'gerenciar',
    label: 'Configurações',
    icon: '\u2699',
    roles: ['SUPER_ADMIN', 'MANAGER'],
    children: [
      { path: '/settings', label: 'Todas as configurações' },
      { path: '/settings/general', label: 'Geral' },
      { path: '/settings/order', label: 'Pedidos' },
      { path: '/settings/print', label: 'Modelos de Impressão/Recibo' },
      { path: '/settings/review', label: 'Avaliações' },
    ],
  },
  {
    path: '/developer',
    section: 'gerenciar',
    label: 'Desenvolvedor',
    icon: '\uD83D\uDEE0',
    roles: ['SUPER_ADMIN', 'MANAGER'],
    children: [
      { path: '/developer/metrics', label: 'Métricas da API' },
      { path: '/developer/audit-log', label: 'Registro de auditoria' },
    ],
  },
  { path: '/staff', label: 'Funcionários', icon: '\uD83D\uDC65', roles: ['SUPER_ADMIN'], section: 'gerenciar' },
];

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

export default function AdminLayout({ children, onLogout }: { children: React.ReactNode; onLogout?: () => void }) {
  const location = useLocation();
  const { user, token } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const filteredNav = user
    ? navItems.filter((item) => item.roles.includes(user.role))
    : [];

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Poll pending order count
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

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // Close drawer on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isManagerPlus = user && (user.role === 'SUPER_ADMIN' || user.role === 'MANAGER');

  const SECTION_LABELS: Record<string, string> = {
    operar: 'Operar',
    gerenciar: 'Gerenciar',
    crescer: 'Crescer',
  };

  const groupedNav = (['operar', 'gerenciar', 'crescer'] as const)
    .map((section) => ({
      section,
      items: filteredNav.filter((item) => item.section === section),
    }))
    .filter((g) => g.items.length > 0);

  const sidebar = (
    <nav className="flex-1 py-4 overflow-y-auto">
      {groupedNav.map((group) => (
        <div key={group.section} className="mb-4">
          <p className="px-6 pb-1 text-[10px] font-bold uppercase tracking-widest text-cream/30">
            {SECTION_LABELS[group.section]}
          </p>
          {group.items.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            return (
              <div key={item.path}>
                <Link
                  to={item.children ? item.children[0].path : item.path}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center px-6 py-3 text-sm transition-colors min-h-[44px] ${isActive
                    ? 'bg-ink/60 text-gold border-r-2 border-gold'
                    : 'text-cream/70 hover:bg-ink/60 hover:text-cream'
                    }`}
                >
                  <span className="mr-3 text-base">{item.icon}</span>
                  {item.label}
                </Link>
                {item.children && isActive && (
                  <div className="bg-ink/40">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        onClick={() => setDrawerOpen(false)}
                        className={`block pl-14 pr-6 py-2.5 text-xs min-h-[40px] transition-colors ${location.pathname.startsWith(child.path)
                          ? 'text-gold'
                          : 'text-cream/50 hover:text-cream'
                          }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const sidebarHeader = (
    <>
      <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gold">King Food</h1>
          <p className="text-xs text-cream/50 mt-1">Painel administrativo</p>
        </div>
        <button
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg"
          aria-label="Fechar menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {user && (
        <div className="px-6 py-4 border-b border-ink/10">
          <p className="text-sm font-medium text-cream truncate">{user.name}</p>
          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>
            {ROLE_LABELS[user.role]}
          </span>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-cream/40 flex">
      {/* Sidebar — fixed on desktop, drawer on mobile */}
      <aside
        ref={drawerRef}
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-ink text-cream flex flex-col transition-transform duration-300 transform lg:static lg:translate-x-0 lg:w-64 lg:flex ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
        role="navigation"
        aria-label="Navegação principal"
      >
        {sidebarHeader}
        {sidebar}
      </aside>

      {/* Drawer backdrop (mobile only) */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-ink/40 z-30 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <header className="bg-cream/90 backdrop-blur-md border-b border-ink/10 px-3 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            {/* Hamburger (mobile only) */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
              aria-label="Abrir menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="lg:hidden text-sm font-semibold text-gray-800 truncate">
              King Food
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notifications bell */}
            <Link
              to="/orders?status=PENDING"
              className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Pedidos pendentes"
              aria-label="Pedidos pendentes"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="sr-only" aria-live="polite">
                {pendingCount > 0 ? `${pendingCount} pedido${pendingCount === 1 ? '' : 's'} pendente${pendingCount === 1 ? '' : 's'}` : ''}
              </span>
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full" aria-hidden="true">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </Link>

            {/* Settings gear */}
            {isManagerPlus && (
              <Link
                to="/settings"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Configurações"
                aria-label="Configurações"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            )}

            {/* Separator */}
            <div className="w-px h-6 bg-gray-200 hidden sm:block" />

            {/* User avatar + dropdown */}
            {user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Menu do usuário"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full bg-gold/20 text-ink flex items-center justify-center text-sm font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700 font-medium hidden sm:block">{user.name}</span>
                  <svg className="w-4 h-4 text-gray-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-cream rounded-xl shadow-soft border border-ink/10 py-1 z-50">
                    {isManagerPlus && (
                      <Link
                        to="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Configurações
                      </Link>
                    )}
                    {onLogout && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onLogout();
                        }}
                        className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Sair
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-6 w-full max-w-full overflow-x-hidden pb-24 lg:pb-6">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
