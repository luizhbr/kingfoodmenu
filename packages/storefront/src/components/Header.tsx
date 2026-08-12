import { Suspense, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import { useCart } from '../context/CartContext.js';
import { useTheme } from '../context/ThemeContext.js';
import LanguageSwitcher from './LanguageSwitcher.js';
import { headerVariants } from '../templates/headers/index.js';
import type { TemplateId } from '../templates/index.js';

const WA_URL = 'https://wa.me/12673107535';

function ClassicHeader() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { itemCount, setIsOpen: openCart } = useCart();
  const { settings } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = location.pathname === '/';

  const navLinks = isHome
    ? [
        { to: '/', label: 'Início' },
        { to: '/menu', label: 'Cardápio' },
      ]
    : [
        { to: '/', label: t('nav.home') },
        { to: '/menu', label: t('nav.menu') },
        { to: '/locations', label: t('nav.locations') },
        { to: '/gallery', label: t('nav.gallery') },
        { to: '/reservations', label: t('nav.reservations') },
      ];

  function isActive(path: string) {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }

  const shell = isHome
    ? 'bg-black/70 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 text-white'
    : 'bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-50';

  const linkIdle = isHome
    ? 'text-white/60 hover:text-white hover:bg-white/10'
    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800';

  const linkActive = isHome
    ? 'text-[#FFD100] bg-white/10'
    : 'text-primary-600 bg-primary-50 dark:bg-primary-900/30';

  return (
    <header className={shell}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            {settings.logo ? (
              <img
                src={settings.logo}
                alt={settings.siteName}
                className="w-8 h-8 rounded-lg object-cover bg-[#FFD100]"
              />
            ) : (
              <div className="w-8 h-8 bg-[#FFD100] rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-sm">{settings.siteName.charAt(0)}</span>
              </div>
            )}
            <div className="leading-tight min-w-0">
              <span
                className={`block text-base font-bold truncate ${
                  isHome ? 'text-white' : 'text-gray-900 dark:text-white'
                }`}
              >
                {settings.siteName}
              </span>
              {isHome && (
                <span className="block text-[10px] text-white/50 truncate">Açaí · Delivery</span>
              )}
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.to) ? linkActive : linkIdle
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isHome && (
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 min-h-[40px] px-4 py-2 rounded-lg text-sm font-bold bg-[#25D366] text-white hover:bg-[#25D366]/90 transition inline-flex items-center"
              >
                WhatsApp
              </a>
            )}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {!isHome && <LanguageSwitcher />}
            <button
              onClick={() => openCart(true)}
              className={`relative p-2 rounded-md ${
                isHome ? 'text-white/80 hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              aria-label={t('nav.openCart')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#FFD100] text-black text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>
            {user ? (
              <>
                <Link
                  to="/account"
                  className={`text-sm ${isHome ? 'text-white/80' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {user.name}
                </Link>
                <button
                  onClick={logout}
                  className={`text-sm ${isHome ? 'text-white/50' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              !isHome && (
                <>
                  <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">
                    {t('nav.login')}
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {t('nav.signUp')}
                  </Link>
                </>
              )
            )}
          </div>

          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={() => openCart(true)}
              className={`relative p-2 rounded-md ${
                isHome ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label={t('nav.openCart')}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#FFD100] text-black text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>
            <button
              className={`p-2 rounded-md ${isHome ? 'text-white hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={t('nav.toggleMenu')}
            >
              {mobileOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div
          className={`md:hidden border-t ${
            isHome ? 'border-white/10 bg-black/95' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
          }`}
        >
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive(link.to)
                    ? isHome
                      ? 'text-[#FFD100] bg-white/10'
                      : 'text-primary-600 bg-primary-50'
                    : isHome
                      ? 'text-white/80 hover:bg-white/10'
                      : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isHome && (
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-bold text-[#25D366]"
              >
                WhatsApp
              </a>
            )}
            {!isHome && (
              <div className="px-3 py-2">
                <LanguageSwitcher />
              </div>
            )}
            {!isHome && (
              <div className="border-t border-gray-200 pt-3 mt-3">
                {user ? (
                  <>
                    <Link
                      to="/account"
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 text-base font-medium text-gray-600"
                    >
                      {t('nav.myAccount')}
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setMobileOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 text-base font-medium text-gray-500"
                    >
                      {t('nav.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 text-base font-medium text-gray-600"
                    >
                      {t('nav.login')}
                    </Link>
                    <Link
                      to="/register" onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 text-base font-medium text-primary-600"
                    >
                      {t('nav.signUp')}
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default function Header() {
  const { settings } = useTheme();
  const location = useLocation();
  // On home, always use King Food classic header (ignore template variants)
  if (location.pathname === '/') {
    return <ClassicHeader />;
  }

  const templateId = (settings.storefrontTemplate || 'classic') as TemplateId;
  const VariantHeader = headerVariants[templateId];

  if (VariantHeader) {
    return (
      <Suspense fallback={<div className="h-16 bg-white dark:bg-gray-900" />}>
        <VariantHeader />
      </Suspense>
    );
  }

  return <ClassicHeader />;
}
