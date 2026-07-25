import { type ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'OWNER':
      return '/owner/dashboard';
    case 'MANAGER':
      return '/manager/dashboard';
    case 'STAFF':
      return '/staff/dashboard';
    default:
      return '/login';
  }
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Wait for Zustand persist to finish rehydrating from localStorage
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    // If already hydrated (e.g. navigating within app), resolve immediately
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  // Show nothing while waiting for hydration — avoids flash-redirect to /login
  if (!hydrated) return null;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role as UserRole)) {
    return <Navigate to={getDashboardPath(user.role as UserRole)} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
