import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { NavbarAdmin } from '../NavbarAdmin';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import ErrorBoundary from '../ErrorBoundary';

export const AppLayout: React.FC = () => {
    const { userDetails, logout } = useAuthStore();
    const { plati } = useAppStore();
    const navigate = useNavigate();

    if (!userDetails) {
        // This should theoretically not be reached due to routing guards in App.tsx
        return null;
    }

    return (
        <div className="flex flex-col min-h-screen bg-[var(--bg-main)] text-slate-200">
            <NavbarAdmin 
                currentUser={userDetails} 
                onLogout={logout} 
                plati={plati}
            />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                 <ErrorBoundary onNavigate={() => navigate('/')}>
                    <Outlet />
                </ErrorBoundary>
            </main>
        </div>
    );
};
