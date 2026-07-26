import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

// Auth pages (eager loaded — needed immediately)
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import MfaVerifyPage from '@/pages/auth/MfaVerifyPage';

// Layout components
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import { ToastContextProvider, Toaster } from '@/components/ui/toast';

// Auth store
import { useAuthStore } from '@/stores/auth.store';

// Owner pages (lazy loaded)
const OwnerDashboard = lazy(() => import('@/pages/owner/DashboardPage'));
const ProductsPage = lazy(() => import('@/pages/owner/ProductsPage'));
const ProductFormPage = lazy(() => import('@/pages/owner/ProductFormPage'));
const CategoriesPage = lazy(() => import('@/pages/owner/CategoriesPage'));
const InventoryPage = lazy(() => import('@/pages/owner/InventoryPage'));
const SuppliersPage = lazy(() => import('@/pages/owner/SuppliersPage'));
const TeamPage = lazy(() => import('@/pages/owner/TeamPage'));
const SchedulePage = lazy(() => import('@/pages/owner/SchedulePage'));
const AuditLogPage = lazy(() => import('@/pages/owner/AuditLogPage'));
const SettingsPage = lazy(() => import('@/pages/owner/SettingsPage'));
const ProfilePage = lazy(() => import('@/pages/owner/ProfilePage'));
const SalesPage = lazy(() => import('@/pages/owner/SalesPage'));
const FinancePage = lazy(() => import('@/pages/owner/FinancePage'));
const PromotionsPage = lazy(() => import('@/pages/owner/PromotionsPage'));
const CustomersPage = lazy(() => import('@/pages/owner/CustomersPage'));
const ReportsPage = lazy(() => import('@/pages/owner/ReportsPage'));
const AIDashboardPage = lazy(() => import('@/pages/owner/AIDashboardPage'));
const DeliveryPage = lazy(() => import('@/pages/owner/DeliveryPage'));

// Manager pages (lazy loaded)
const ManagerDashboard = lazy(() => import('@/pages/manager/DashboardPage'));

// Staff pages (lazy loaded)
const StaffDashboard = lazy(() => import('@/pages/staff/DashboardPage'));
const POSPage = lazy(() => import('@/pages/staff/POSPage'));

// Fallback spinner shown while lazy chunks load
function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Root redirect: authenticated users go to their role dashboard; others go to login
function RootRedirect() {
  const { user, isAuthenticated } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  if (!hydrated) return <PageLoader />;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role.toUpperCase()) {
    case 'OWNER':
      return <Navigate to="/owner/dashboard" replace />;
    case 'MANAGER':
      return <Navigate to="/manager/dashboard" replace />;
    case 'STAFF':
      return <Navigate to="/staff/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default function App() {
  return (
    <ToastContextProvider>
      <BrowserRouter>
      <Toaster />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Root */}
          <Route path="/" element={<RootRedirect />} />

          {/* ── Auth routes (public) ─────────────────────────────── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/mfa" element={<MfaVerifyPage />} />

          {/* ── Owner routes ──────────────────────────────────────── */}
          <Route
            path="/owner"
            element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<OwnerDashboard />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id/edit" element={<ProductFormPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="audit-log" element={<AuditLogPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="promotions" element={<PromotionsPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="ai" element={<AIDashboardPage />} />
            <Route path="delivery" element={<DeliveryPage />} />
          </Route>

          {/* ── Manager routes ────────────────────────────────────── */}
          <Route
            path="/manager"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'MANAGER']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ManagerDashboard />} />
          </Route>

          {/* ── Staff routes ──────────────────────────────────────── */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'STAFF']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StaffDashboard />} />
            <Route path="pos" element={<POSPage />} />
          </Route>

          {/* Catch-all → root redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </ToastContextProvider>
  );
}
