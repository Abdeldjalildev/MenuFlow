import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { auth } from '../firebase';
import {
  parseTrustedAuthzClaims,
  roleDestination,
  type MenuFlowRole,
} from '../services/authz';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: MenuFlowRole[];
}

interface AuthzState {
  loading: boolean;
  authenticated: boolean;
  role: MenuFlowRole | null;
}

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
        const trustedClaims = parseTrustedAuthzClaims(tokenResult.claims);

        if (mounted) {
          setAuthz({
            loading: false,
            authenticated: trustedClaims !== null,
            role: trustedClaims?.role ?? null,
          });
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
    return <Navigate to={roleDestination(authz.role)} replace />;
  }

  return <>{children}</>;
};
