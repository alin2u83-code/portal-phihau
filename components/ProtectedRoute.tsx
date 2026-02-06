import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Card } from './ui';

const QwanKiDoLogo: React.FC = () => (
    <div className="mx-auto mb-6 h-20 w-20 flex items-center justify-center rounded-full bg-slate-700 border-2 border-slate-600">
        <svg viewBox="0 0 100 100" className="w-12 h-12 text-amber-400">
            <path d="M50 10 L90 50 L50 90 L10 50 Z" stroke="currentColor" strokeWidth="8" fill="none" />
            <circle cx="50" cy="50" r="15" fill="currentColor" />
        </svg>
    </div>
);

const LoadingScreen: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <Card className="text-center p-8 bg-transparent border-none shadow-none">
            <QwanKiDoLogo />
            <h1 className="text-xl font-bold text-white mt-4">Verificare permisiuni...</h1>
            <svg className="animate-spin h-6 w-6 text-[var(--brand-primary)] mt-4 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </Card>
    </div>
);

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAdmin, isLoading, user } = useAuthStore();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin) {
        return <Navigate to="/dashboard-sportiv" replace />;
    }

    return <>{children}</>;
};
