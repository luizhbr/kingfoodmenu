import { Link } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher.js';
import { useHeaderProps } from './useHeaderProps.js';

export default function ArtDecoHeader() {
  const { t, user, logout, itemCount, openCart, settings, navLinks, isActive, mobileOpen, setMobileOpen } = useHeaderProps();

  return (
    <header className="bg-[#111111] sticky top-0 z-50 border-b-2 border-[#C9A227]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            {settings.logo ? (
              <img src={settings.logo} alt={settings.siteName} className="w-9 h-9 rounded object-cover border border-[#C9A227]" />
            ) : (
              <div className="w-9 h-9 bg-[#C9A227] flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                <span className="text-[#111] font-black text-lg">{settings.siteName.charAt(0)}</span>
              </div>
            )}
            <span className="text-xl font-black text-[#F5EFE0] tracking-[0.2em] uppercase" style={{ fontFamily: 'Georgia, serif' }}>{settings.siteName}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className={`text-[11px] font-bold tracking-[0.15em] uppercase transition-colors ${
                isActive(link.to) ? 'text-[#C9A227]' : 'text-[#F5EFE0]/70 hover:text-[#C9A227]'
              }`}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={() => openCart(true)}
              className="relative p-2.5 text-[#C9A227] border border-[#C9A227]/40 hover:bg-[#C9A227]/10 transition-colors"
              aria-label={t('nav.openCart')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#C9A227] text-[#111] text-[10px] font-black flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-[#C9A227]/50 to-transparent" />
    </header>
  );
}
