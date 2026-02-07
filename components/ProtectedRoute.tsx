import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Permissions } from '../types';

const LoadingScreen: React.FC = () => (
    <div className="flex items-center justify-center h-full p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-primary"></div>
    </div>
);

export const ProtectedRoute: React.FC<{ children: React.ReactNode, permissions: Permissions }> = ({ children, permissions }) => {
    const { isLoading } = useAuthStore();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!permissions.hasAdminAccess) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
