import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { CartProvider } from './context/CartContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import Layout from './components/Layout.js';
import Home from './pages/Home.js';
import Login from './pages/Login.js';
import Register from './pages/Register.js';
import Menu from './pages/Menu.js';
import Checkout from './pages/Checkout.js';
import OrderConfirmation from './pages/OrderConfirmation.js';
import NotFound from './pages/NotFound.js';
import './i18n/index.js';
import './index.css';

// Route-level code splitting: low-use pages load on demand, shrinking the
// initial bundle. Home/Menu/Checkout/OrderConfirmation/Login stay eager
// (critical path: browse → cart → checkout → confirmation).
const Locations = React.lazy(() => import('./pages/Locations.js'));
const Account = React.lazy(() => import('./pages/Account.js'));
const Reservations = React.lazy(() => import('./pages/Reservations.js'));
const Gallery = React.lazy(() => import('./pages/Gallery.js'));
const OrderHistory = React.lazy(() => import('./pages/OrderHistory.js'));
const OrderStatus = React.lazy(() => import('./pages/OrderStatus.js'));
const AuthCallback = React.lazy(() => import('./pages/AuthCallback.js'));
const ResetPassword = React.lazy(() => import('./pages/ResetPasswordPage.js'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy.js'));
const Impressum = React.lazy(() => import('./pages/Impressum.js'));
const DesignSystem = React.lazy(() => import('./pages/DesignSystem.js'));
const DriverLogin = React.lazy(() => import('./pages/driver/Login.js'));
const DriverDashboard = React.lazy(() => import('./pages/driver/Dashboard.js'));
const DriverOrderDetail = React.lazy(() => import('./pages/driver/OrderDetail.js'));
const DriverHistory = React.lazy(() => import('./pages/driver/History.js'));
const DriverProfile = React.lazy(() => import('./pages/driver/Profile.js'));

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-kf-primary rounded-full animate-spin" role="status" aria-label="Carregando" />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <CartProvider>
        <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order/:id" element={<OrderConfirmation />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/account" element={<Account />} />
            <Route path="/account/orders" element={<OrderHistory />} />
            <Route path="/orders/:id" element={<OrderStatus />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/design-system" element={<DesignSystem />} />
        <Route path="*" element={<NotFound />} />
          </Route>

          {/* Driver app — standalone, mobile-first (own auth, no storefront layout) */}
          <Route path="/driver/login" element={<DriverLogin />} />
          <Route path="/driver" element={<DriverDashboard />} />
          <Route path="/driver/orders/:id" element={<DriverOrderDetail />} />
          <Route path="/driver/history" element={<DriverHistory />} />
          <Route path="/driver/profile" element={<DriverProfile />} />
        </Routes>
        </Suspense>
        </CartProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
