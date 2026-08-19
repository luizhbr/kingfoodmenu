import { Link } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher.js';
import { useHeaderProps } from './useHeaderProps.js';

export default function TropicalHeader() {
  const { t, user, logout, itemCount, openCart, settings, navLinks, isActive, mobileOpen, setMobileOpen } = useHeaderProps();

  return (
    <header className="bg-[#0B6E4F] sticky top-0 z-50 shadow-lg shadow-emerald-900/20">
      {/* Leaf pattern strip */}
      <div className="h-1 bg-gradient-to-r from-[#FFD166] via-[#FF6B6A] to-[#FFD166]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            {settings.logo ? (
              <img src={settings.logo} alt={settings.siteName} className="w-9 h-9 rounded-full object-cover ring-2 ring-[#FFD166]" />
            ) : (
              <div className="w-9 h-9 bg-[#FFD166] rounded-full flex items-center justify-center ring-2 ring-white/30">
                <span className="text-[#0B6B4F] font-extrabold text-lg italic">{settings.siteName.charAt(0)}</span>
              </div>
            )}
            <span className="text-xl font-extrabold text-white tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>{settings.siteName}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className={`px-3 py-2 rounded-full text-sm font-semibold transition-colors ${
                isActive(link.to) ? 'text-[#0B6B4F] bg-[#FFD166]' : 'text-white/85 hover:text-white hover:bg-white/10'
              }`}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={() => openCart(true)}
              className={`relative p-2.5 rounded-full ${isActive('/menu') ? 'text-[#FFD166]' : 'text-white/85 hover:text-white hover:bg-white/10'}`}
              aria-label={t('nav.openCart')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FF6B6A] text-white text-[10px] font-bold flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
            {user ? (
              <button onClick={logout} className="text-white/80 hover:text-white text-sm font-semibold hidden sm:block">
                {t('nav.logout')}
              </button>
            ) : null}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="md:hidden bg-[#0B6B4F] border-t border-white/10 px-4 py-3">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)} className={`block py-3 px-4 rounded-xl text-sm font-semibold ${isActive(link.to) ? 'bg-[#FFD166] text-[#0B6B4F]' : 'text-white/85 hover:bg-white/10'}`}>
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
