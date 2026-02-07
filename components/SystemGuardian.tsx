import React, { useState, useEffect } from 'react';
import { User, Permissions } from '../types';
import { clubTheme, federationTheme, applyTheme, Theme } from '../themes';
import { FEDERATIE_ID } from '../constants';

// --- Sub-componente interne ---

const DiagnosticScreen: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center p-4">
        <svg className="animate-spin h-8 w-8 text-[var(--brand-primary)] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h1 className="text-2xl font-bold text-white">Diagnosticare Club Phi Hau...</h1>
        <p className="mt-2 text-slate-400">Se verifică profilul și permisiunile...</p>
    </div>
);

const ErrorScreen: React.FC<{ message: string }> = ({ message }) => (
     <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center p-8 bg-red-900/30 rounded-lg border border-red-700/50">
        <h1 className="text-2xl font-bold text-red-300">Eroare de Sistem</h1>
        <p className="mt-2 text-red-200">{message}</p>
    </div>
);

// --- Componenta Principală ---

interface SystemGuardianProps {
    children: React.ReactNode;
    isLoading: boolean;
    currentUser: User | null;
    permissions: Permissions;
    error: string | null;
}

export const SystemGuardian: React.FC<SystemGuardianProps> = ({ children, isLoading, currentUser, permissions, error }) => {
    const [showLoadingScreen, setShowLoadingScreen] = useState(false);
    
    useEffect(() => {
        if (currentUser) {
            // Priority: Theme from DB
            if (currentUser.cluburi?.theme_config) {
                applyTheme(currentUser.cluburi.theme_config as Partial<Theme>);
            }
            // Fallback: Federation theme for federation users
            else if (permissions.isFederationAdmin || currentUser.club_id === FEDERATIE_ID) {
                applyTheme(federationTheme);
            }
            // Fallback: Default club theme for others
            else {
                applyTheme(clubTheme);
            }
        } else {
            // Theme for login screen
            applyTheme(federationTheme);
        }

        const timer = setTimeout(() => {
            if (isLoading) {
                setShowLoadingScreen(true);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [isLoading, currentUser, permissions.isFederationAdmin]);

    if (error) {
        return <ErrorScreen message={error} />;
    }
    
    if (!isLoading) {
        return <>{children}</>;
    }

    if (showLoadingScreen) {
        return <DiagnosticScreen />;
    }

    return null;
};