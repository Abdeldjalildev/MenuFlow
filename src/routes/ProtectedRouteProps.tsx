import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('SuperAdmin' | 'Admin' | 'Cashier' | 'Kitchen' | 'Delivery')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const userRole = localStorage.getItem('userRole');
  const location = useLocation();

  // 1. التحقق مما إذا كان المستخدم مسجل دخول أصلاً
  if (!userRole) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. التحقق مما إذا كان لديه صلاحية الوصول للصفحة المطلوبة
  if (allowedRoles && !allowedRoles.includes(userRole as any)) {
    // توجيه المستخدم إلى الصفحة الرئيسية للصلاحية الخاصة به إذا حاول دخول مكان ليس له
    if (userRole === 'SuperAdmin') return <Navigate to="/super-admin" replace />;
    return <Navigate to="/merchant/overview" replace />; // تم التصحيح هنا ليتوافق مع المسار الجديد
  }

  return <>{children}</>;
};