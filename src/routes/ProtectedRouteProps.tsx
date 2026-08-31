import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { auth } from '../firebase';

type StaffRole = 'SuperAdmin' | 'Admin' | 'Cashier' | 'Kitchen' | 'Delivery';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: StaffRole[];
}

interface AuthzState {
  loading: boolean;
  authenticated: boolean;
  role: StaffRole | null;
}

const isStaffRole = (value: unknown): value is StaffRole =>
  typeof value === 'string' &&
  ['SuperAdmin', 'Admin', 'Cashier', 'Kitchen', 'Delivery'].includes(value);

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const [authz, setAuthz] = useState<AuthzState>({
    loading: true,
    authenticated: false,
    role: null,
  });
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (mounted) {
          setAuthz({ loading: false, authenticated: false, role: null });
        }
        return;
      }

      try {
        const tokenResult = await getIdTokenResult(user);
        const role = isStaffRole(tokenResult.claims.role)
          ? tokenResult.claims.role
          : null;

        if (mounted) {
          setAuthz({ loading: false, authenticated: true, role });
        }
      } catch (error) {
        console.error('Unable to verify Firebase authorization claims:', error);
        if (mounted) {
          setAuthz({ loading: false, authenticated: false, role: null });
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  if (authz.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!authz.authenticated || !authz.role) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(authz.role)) {
    if (authz.role === 'SuperAdmin') {
      return <Navigate to="/super-admin" replace />;
    }
    return <Navigate to="/merchant/overview" replace />;
  }

  return <>{children}</>;
};
