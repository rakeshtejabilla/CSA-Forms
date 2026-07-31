import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../context/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('SUPER_ADMIN' | 'ORG_ADMIN' | 'ENUMERATOR')[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { token, user } = useAuthStore();
  const location = useLocation();

  if (!token) {
    // Redirect to login page but save the current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // If the user's role is not authorized, redirect them to the dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
