import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import AdminLayout from './components/AdminLayout.js';
import RequireRole from './components/RequireRole.js';
import RequirePermission from './components/RequirePermission.js';
import './index.css';

// Route-level code splitting: each page is loaded on demand, shrinking the
// initial bundle (was a single ~1 MB chunk). Login/AcceptInvite stay eager so
// the unauthenticated entry renders immediately.
const Login = lazy(() => import('./pages/Login.js'));
const AcceptInvite = lazy(() => import('./pages/AcceptInvite.js'));
const Dashboard = lazy(() => import('./pages/Dashboard.js'));
const Manage = lazy(() => import('./pages/Manage.js'));
const LojaHub = lazy(() => import('./pages/LojaHub.js'));
const VenderHub = lazy(() => import('./pages/VenderHub.js'));
const PedidosHub = lazy(() => import('./pages/PedidosHub.js'));
const LocationList = lazy(() => import('./pages/LocationList.js'));
const LocationForm = lazy(() => import('./pages/LocationForm.js'));
const CategoryList = lazy(() => import('./pages/CategoryList.js'));
const CategoryForm = lazy(() => import('./pages/CategoryForm.js'));
const MenuRing = lazy(() => import('./pages/MenuRing.js'));
const MenuItemForm = lazy(() => import('./pages/MenuItemForm.js'));
const TableList = lazy(() => import('./pages/TableList.js'));
const OrderList = lazy(() => import('./pages/OrderList.js'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetail.js'));
const CouponList = lazy(() => import('./pages/CouponList.js'));
const CouponForm = lazy(() => import('./pages/CouponForm.js'));
const ReviewList = lazy(() => import('./pages/ReviewList.js'));
const KitchenDisplay = lazy(() => import('./pages/KitchenDisplay.js'));
const AutomationRuleList = lazy(() => import('./pages/AutomationRuleList.js'));
const AutomationRuleForm = lazy(() => import('./pages/AutomationRuleForm.js'));
const DeliveryZoneList = lazy(() => import('./pages/DeliveryZoneList.js'));
const CustomerLoyalty = lazy(() => import('./pages/CustomerLoyalty.js'));
const LegalPageList = lazy(() => import('./pages/LegalPageList.js'));
const LegalPageForm = lazy(() => import('./pages/LegalPageForm.js'));
const CookieCategoryList = lazy(() => import('./pages/CookieCategoryList.js'));
const ConsentLog = lazy(() => import('./pages/ConsentLog.js'));
const DesignLanding = lazy(() => import('./pages/DesignLanding.js'));
const DesignBuilder = lazy(() => import('./pages/DesignBuilder.js'));
const DesignBranding = lazy(() => import('./pages/DesignBranding.js'));
const DesignTheme = lazy(() => import('./pages/DesignTheme.js'));
const DesignTemplates = lazy(() => import('./pages/DesignTemplates.js'));
const DesignGallery = lazy(() => import('./pages/DesignGallery.js'));
const DesignMedia = lazy(() => import('./pages/DesignMedia.js'));
const StaffList = lazy(() => import('./pages/StaffList.js'));
const StaffInvite = lazy(() => import('./pages/StaffInvite.js'));
const StaffEdit = lazy(() => import('./pages/StaffEdit.js'));
const Settings = lazy(() => import('./pages/Settings.js'));
const DeveloperMetrics = lazy(() => import('./pages/DeveloperMetrics.js'));
const Reports = lazy(() => import('./pages/Reports.js'));
const AuditLog = lazy(() => import('./pages/AuditLog.js'));
const SettingsGeneral = lazy(() => import('./pages/SettingsGeneral.js'));
const SettingsOrder = lazy(() => import('./pages/SettingsOrder.js'));
const SettingsMail = lazy(() => import('./pages/SettingsMail.js'));
const SettingsPayments = lazy(() => import('./pages/SettingsPayments.js'));
const SettingsReviews = lazy(() => import('./pages/SettingsReviews.js'));
const SettingsAdvanced = lazy(() => import('./pages/SettingsAdvanced.js'));
const SettingsPrint = lazy(() => import('./pages/SettingsPrint.js'));
const SettingsLoyalty = lazy(() => import('./pages/SettingsLoyalty.js'));
const SettingsPrinters = lazy(() => import('./pages/SettingsPrinters.js'));
const OptionGroupLibrary = lazy(() => import('./pages/OptionGroupLibrary.js'));

function PageFallback() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label="Carregando" />
    </div>
  );
}

function AppRoutes() {
  const { token, user, loading, login, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!token || !user) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="*" element={<Login onLogin={login} />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <AdminLayout onLogout={logout}>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* All roles */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/loja" element={<LojaHub />} />
          <Route path="/manage" element={<Manage />} />
          <Route path="/vender" element={<VenderHub />} />
          <Route path="/pedidos" element={<PedidosHub />} />
          <Route path="/reports" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><Reports /></RequireRole>} />
          <Route path="/orders" element={<RequirePermission perms={['orders.view']}><OrderList /></RequirePermission>} />
          <Route path="/orders/:id" element={<RequirePermission perms={['orders.view']}><OrderDetailPage /></RequirePermission>} />
          <Route path="/reviews" element={<RequirePermission perms={['reviews.view']}><ReviewList /></RequirePermission>} />
          <Route path="/kitchen" element={<RequirePermission perms={['kitchen.view']}><KitchenDisplay /></RequirePermission>} />

          {/* MANAGER+ */}
          <Route path="/locations" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><LocationList /></RequireRole>} />
          <Route path="/locations/new" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><LocationForm /></RequireRole>} />
          <Route path="/locations/:id" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><LocationForm /></RequireRole>} />
          <Route path="/locations/:locationId/tables" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><TableList /></RequireRole>} />
          <Route path="/locations/:locationId/delivery-zones" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><DeliveryZoneList /></RequireRole>} />
          <Route path="/menu" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><MenuRing /></RequireRole>} />
          <Route path="/menu/categories" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><CategoryList /></RequireRole>} />
          <Route path="/menu/categories/new" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><CategoryForm /></RequireRole>} />
          <Route path="/menu/categories/:id" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><CategoryForm /></RequireRole>} />
          <Route path="/menu/items" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><Navigate to="/menu" replace /></RequireRole>} />
          <Route path="/menu/items/new" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><RequirePermission perms={['menu.create']}><MenuItemForm /></RequirePermission></RequireRole>} />
          <Route path="/menu/items/:id" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><RequirePermission perms={['menu.edit']}><MenuItemForm />
          <Route path="/menu/option-groups" element={<OptionGroupLibrary />} /></RequirePermission></RequireRole>} />
          <Route path="/coupons" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><RequirePermission perms={['coupons.view']}><CouponList /></RequirePermission></RequireRole>} />
          <Route path="/coupons/new" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><CouponForm /></RequireRole>} />
          <Route path="/coupons/:id" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><CouponForm /></RequireRole>} />
          <Route path="/automation" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><RequirePermission perms={['automation.view']}><AutomationRuleList /></RequirePermission></RequireRole>} />
          <Route path="/automation/new" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><AutomationRuleForm /></RequireRole>} />
          <Route path="/automation/:id" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><AutomationRuleForm /></RequireRole>} />
          <Route path="/loyalty" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><RequirePermission perms={['loyalty.view']}><CustomerLoyalty /></RequirePermission></RequireRole>} />
          <Route path="/design" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><Navigate to="/design/builder" replace /></RequireRole>} />
          <Route path="/design/builder" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><DesignBuilder /></RequireRole>} />
          <Route path="/design/landing" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><DesignLanding /></RequireRole>} />
          <Route path="/design/branding" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><DesignBranding /></RequireRole>} />
          <Route path="/design/theme" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><DesignTheme /></RequireRole>} />
          <Route path="/design/templates" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><DesignTemplates /></RequireRole>} />
          <Route path="/design/gallery" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><DesignGallery /></RequireRole>} />
          <Route path="/design/media" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><DesignMedia /></RequireRole>} />
          <Route path="/legal" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><Navigate to="/legal/pages" replace /></RequireRole>} />
          <Route path="/legal/pages" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><LegalPageList /></RequireRole>} />
          <Route path="/legal/pages/:slug" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><LegalPageForm /></RequireRole>} />
          <Route path="/legal/cookies" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><CookieCategoryList /></RequireRole>} />
          <Route path="/legal/consent" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><ConsentLog /></RequireRole>} />

          {/* Settings — MANAGER+ (sub-pages have their own role checks) */}
          <Route path="/settings" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><Settings /></RequireRole>} />
          <Route path="/settings/general" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><SettingsGeneral /></RequireRole>} />
          <Route path="/settings/order" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><SettingsOrder /></RequireRole>} />
          <Route path="/settings/mail" element={<RequireRole roles={['SUPER_ADMIN']}><SettingsMail /></RequireRole>} />
          <Route path="/settings/payment" element={<RequireRole roles={['SUPER_ADMIN']}><SettingsPayments /></RequireRole>} />
          <Route path="/settings/review" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><SettingsReviews /></RequireRole>} />
          <Route path="/settings/loyalty" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><SettingsLoyalty /></RequireRole>} />
          <Route path="/settings/advanced" element={<RequireRole roles={['SUPER_ADMIN']}><SettingsAdvanced /></RequireRole>} />
          <Route path="/settings/print" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><SettingsPrint /></RequireRole>} />
          <Route path="/settings/printers" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><SettingsPrinters /></RequireRole>} />

          {/* Developer — MANAGER+ for metrics, SUPER_ADMIN for audit */}
          <Route path="/developer" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><Navigate to="/developer/metrics" replace /></RequireRole>} />
          <Route path="/developer/metrics" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><DeveloperMetrics /></RequireRole>} />
          <Route path="/developer/audit-log" element={<RequireRole roles={['SUPER_ADMIN']}><AuditLog /></RequireRole>} />

          {/* SUPER_ADMIN only */}
          <Route path="/staff" element={<RequireRole roles={['SUPER_ADMIN']}><StaffList /></RequireRole>} />
          <Route path="/staff/invite" element={<RequireRole roles={['SUPER_ADMIN']}><StaffInvite /></RequireRole>} />
          <Route path="/staff/:id" element={<RequireRole roles={['SUPER_ADMIN']}><StaffEdit /></RequireRole>} />
        </Routes>
      </Suspense>
    </AdminLayout>
  );
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
