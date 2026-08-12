import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.js';
import Footer from './Footer.js';
import CartDrawer from './CartDrawer.js';
import CookieBanner from './CookieBanner.js';
import PwaInstall from './PwaInstall.js';
import BottomDock from './BottomDock.js';

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 dark:text-gray-100">
      <Header />
      {/* pb reserves space for fixed mobile dock */}
      <main className="flex-1 pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>
      {/* Home already has brand footer blocks; keep site footer on other pages */}
      {!isHome && <Footer />}
      <CartDrawer />
      <CookieBanner />
      <PwaInstall />
      <BottomDock />
    </div>
  );
}
