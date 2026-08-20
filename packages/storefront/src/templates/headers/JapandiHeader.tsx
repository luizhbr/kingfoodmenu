import { Link } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher.js';
import { useHeaderProps } from './useHeaderProps.js';

export default function JapandiHeader() {
  const { t, user, logout, itemCount, openCart, settings, navLinks, isActive, mobileOpen, setMobileOpen } = useHeaderProps();

  return (
    <header className="bg-kf-bg dark:bg-kf-foreground border-b border-kf-border dark:border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            {settings.logo ? (
              <img src={settings.logo} alt={settings.siteName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-kf-primary flex items-center justify-center">
                <span className="text-kf-primary-fg font-light text-base" style={{ fontFamily: 'Georgia, serif' }}>{settings.siteName.charAt(0)}</span>
              </div>
            )}
            <span className="text-lg font-light tracking-[0.25em] uppercase text-kf-foreground dark:text-kf-bg" style={{ fontFamily: 'Georgia, serif' }}>{settings.siteName}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className={`text-xs tracking-[0.2em] uppercase transition-colors ${
                isActive(link.to) ? 'text-kf-primary border-b border-kf-primary' : 'text-kf-muted dark:text-kf-muted hover:text-kf-primary'
              } pb-1`}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={() => openCart(true)}
              className="relative p-2.5 text-kf-foreground dark:text-kf-bg hover:text-kf-primary transition-colors"
              aria-label={t('nav.openCart')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-kf-primary text-kf-primary-fg text-[10px] font-bold flex items-center justify-center rounded-full">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
