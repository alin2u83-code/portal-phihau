import React, { useEffect, useMemo, ReactNode } from 'react';
import { User, Rol, View } from '../types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: Rol['nume'][];
  redirectPath: View;
  currentUser: User | null;
  activeRole: Rol['nume'] | null;
  onNavigate: (view: View) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectPath,
  currentUser,
  activeRole,
  onNavigate,
}) => {
  const hasAdminPrivileges = useMemo(() => {
      if (!currentUser?.roluri) return false;
      const adminRoles = new Set(['SUPER_ADMIN_FEDERATIE', 'Admin', 'Admin Club', 'ADMIN_CLUB']);
      return currentUser.roluri.some(r => adminRoles.has(r.nume));
    }, [currentUser?.roluri]);

  const hasRequiredRole = useMemo(() => {
    if (!activeRole) return false;
    return allowedRoles.includes(activeRole);
  }, [activeRole, allowedRoles]);

  const isAuthorized = hasAdminPrivileges || hasRequiredRole;

  useEffect(() => {
    if (!isAuthorized) {
      // Redirect logic is handled here to avoid side-effects in render
      onNavigate(redirectPath);
    }
  }, [isAuthorized, onNavigate, redirectPath]);

  if (!isAuthorized) {
    // Render nothing while the redirection is happening
    return null;
  }

  return <>{children}</>;
};
