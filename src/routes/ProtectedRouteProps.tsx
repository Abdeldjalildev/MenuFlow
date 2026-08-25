import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

type StaffRole = 'SuperAdmin' | 'Admin' | 'Cashier' | 'Kitchen' | 'Delivery';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: StaffRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const storedRole = localStorage.getItem('userRole');
  const userRole: StaffRole | null =
    storedRole && ['SuperAdmin', 'Admin', 'Cashier', 'Kitchen', 'Delivery'].includes(storedRole)
      ? (storedRole as StaffRole)
      : null;
  const location = useLocation();

  // Verify the Firebase Auth session is active before trusting the local role.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  // Block rendering while auth state is still being determined.
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // No valid Firebase session: force re-authentication.
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but role is missing or invalid in localStorage: force re-login.
  if (!userRole) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated with a valid session but wrong role for this route.
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    if (userRole === 'SuperAdmin') return <Navigate to="/super-admin" replace />;
    return <Navigate to="/merchant/overview" replace />;
  }

  return <>{children}</>;
};