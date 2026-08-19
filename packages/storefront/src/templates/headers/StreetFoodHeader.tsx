import { Link } from 'react-router-dom';
import LanguageSwitcher from '../../components/LanguageSwitcher.js';
import { useHeaderProps } from './useHeaderProps.js';

export default function StreetFoodHeader() {
  const { t, user, logout, itemCount, openCart, settings, navLinks, isActive, mobileOpen, setMobileOpen } = useHeaderProps();

  return (
    <header className="bg-[#1A1A1A] sticky top-0 z-50 border-b-4 border-[#FF2E2E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            {settings.logo ? (
              <img src={settings.logo} alt={settings.siteName} className="w-10 h-10 object-cover border-2 border-[#FF2E2E]" />
            ) : (
              <div className="w-10 h-10 bg-[#FF2E2E] flex items-center justify-center -skew-x-6">
                <span className="text-white font-black text-xl">{settings.siteName.charAt(0)}</span>
              </div>
            )}
            <span className="text-2xl font-black text-white uppercase tracking-tight italic">{settings.siteName}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className={`px-4 py-2 text-sm font-black uppercase tracking-wide transition-colors ${
                isActive(link.to) ? 'bg-[#FF2E2E] text-white' : 'text-white/80 hover:text-[#FFD600]'
              }`}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={() => openCart(true)}
              className="relative p-2.5 text-white hover:text-[#FFD600] transition-colors"
              aria-label={t('nav.openCart')}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FFD600] text-[#1A1A1A] text-[10px] font-black flex items-center justify-center rounded-full">
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
