import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('SuperAdmin' | 'Admin' | 'Cashier' | 'Kitchen' | 'Delivery')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const userRole = localStorage.getItem('userRole');
  const location = useLocation();

  // Verify the Firebase Auth session is active before trusting the local role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  // Block rendering while auth state is still being determined
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // No valid Firebase session: force re-authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but role is missing from localStorage: force re-login
  if (!userRole) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated with valid session but wrong role for this route
  if (allowedRoles && !allowedRoles.includes(userRole as any)) {
    if (userRole === 'SuperAdmin') return <Navigate to="/super-admin" replace />;
    return <Navigate to="/merchant/overview" replace />;
  }

  return <>{children}</>;
};