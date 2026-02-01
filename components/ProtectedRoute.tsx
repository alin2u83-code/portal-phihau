import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Permissions } from '../types';

interface ProtectedRouteProps {
  permissions: Permissions;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ permissions }) => {
  if (!permissions.hasAdminAccess) {
    // Redirect them to the /my-portal page, but save the current location they were
    // trying to go to. This allows us to send them along to that page after they login,
    // which is a nicer user experience than dropping them off on the home page.
    return <Navigate to="/my-portal" replace />;
  }

  return <Outlet />;
};
