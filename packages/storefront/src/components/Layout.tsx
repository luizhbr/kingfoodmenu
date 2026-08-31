import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.js';
import Footer from './Footer.js';
import CartDrawer from './CartDrawer.js';
import CookieBanner from './CookieBanner.js';
import BottomDock from './BottomDock.js';
import StoreHeader from './StoreHeader.js';

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  // Home = King Food v3 entry shell (own header/drawer/splash)
  if (isHome) {
    return (
      <div className="bg-black text-white">
        <Outlet />
        <CartDrawer />
        <BottomDock />
      </div>
    );
  }

  // Páginas internas = mesmo topo/base da landing (v3): StoreHeader + fundo kf-bg.
  // O conteúdo de baixo muda por página.
  return (
    <div className="min-h-screen flex flex-col bg-kf-bg text-kf-ink relative">
      {/* Imagem desfocada atrás do topo (estética Goomer) — some ao rolar */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-72 sm:h-80 overflow-hidden pointer-events-none"
      >
        <img
          src="https://assets.olaclick.app/companies/products/images/800/2ec71a1b-7d95-4290-a8ec-c2e5435d5508.png"
          alt=""
          className="h-full w-full object-cover blur-2xl scale-110 opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#E2DDCF]/40 via-[#E2DDCF]/75 to-[#E2DDCF]" />
      </div>

      <div className="relative z-10">
        <StoreHeader />
      </div>
      <main className="relative z-10 flex-1 pb-[calc(var(--kf-nav-h)+2.5rem)] md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <CookieBanner />
      <BottomDock />
    </div>
  );
}
