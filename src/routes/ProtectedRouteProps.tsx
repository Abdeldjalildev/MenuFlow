import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import type { StaffRole } from '../types/firestore';
import { STAFF_ROLES } from '../types/firestore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: StaffRole[];
}

const isStaffRole = (value: unknown): value is StaffRole =>
  typeof value === 'string' && STAFF_ROLES.includes(value as StaffRole);

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const [authState, setAuthState] = useState<{
    ready: boolean;
    authenticated: boolean;
    role: StaffRole | null;
  }>({ ready: false, authenticated: false, role: null });
  const location = useLocation();

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (active) {
          setAuthState({ ready: true, authenticated: false, role: null });
        }
        return;
      }

      try {
        const tokenResult = await user.getIdTokenResult();
        const role = isStaffRole(tokenResult.claims.role) ? tokenResult.claims.role : null;

        if (active) {
          setAuthState({ ready: true, authenticated: true, role });
        }
      } catch (error) {
        console.error('Failed to read the authenticated user claims:', error);
        if (active) {
          setAuthState({ ready: true, authenticated: true, role: null });
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (!authState.ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!authState.authenticated || !authState.role) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(authState.role)) {
    if (authState.role === 'SuperAdmin') return <Navigate to="/super-admin" replace />;
    if (authState.role === 'Admin') return <Navigate to="/merchant/overview" replace />;
    if (authState.role === 'Cashier') return <Navigate to="/cashier" replace />;
    if (authState.role === 'Kitchen') return <Navigate to="/kitchen" replace />;
    return <Navigate to="/delivery" replace />;
  }

  return <>{children}</>;
};
