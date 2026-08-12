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

  // Home = King Food v3 entry shell (own header/drawer/splash)
  if (isHome) {
    return (
      <div className="bg-black text-white">
        <Outlet />
        <CartDrawer />
        <PwaInstall />
        <BottomDock />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 dark:text-gray-100">
      <Header />
      <main className="flex-1 pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <CookieBanner />
      <PwaInstall />
      <BottomDock />
    </div>
  );
}
