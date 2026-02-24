import React, { useState, useEffect, useRef } from 'react';
import { User, Permissions } from '../types';
import { clubTheme, federationTheme, applyTheme, Theme } from '../themes';
import { FEDERATIE_ID } from '../constants';
import { Button } from './ui';

// --- Sub-componente interne ---

const RoleSelectionPrompt: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 text-white">
        <h1 className="text-2xl font-bold mb-4">Selecție Rol Necesara</h1>
        <p className="text-center mb-6">Nu s-a putut determina rolul activ. Vă rugăm să selectați un rol pentru a continua.</p>
        <Button onClick={onRetry} variant="primary" className="px-6 py-3 text-lg">Reîncearcă Sincronizarea</Button>
    </div>
);

const DiagnosticScreen: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center p-4">
        <svg className="animate-spin h-8 w-8 text-[var(--brand-primary)] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h1 className="text-2xl font-bold text-white">Se pregătește aplicația...</h1>
        <p className="mt-2 text-slate-400">Urmează să fii logat în contul tău...</p>
    </div>
);

const ErrorScreen: React.FC<{ message: string }> = ({ message }) => (
     <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center p-8 bg-red-900/30 rounded-lg border border-red-700/50">
        <h1 className="text-2xl font-bold text-red-300">Eroare de Sistem</h1>
        <p className="mt-2 text-red-200">{message}</p>
    </div>
);

const ProfileLinkErrorScreen: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-red-900/30 rounded-lg border border-red-700/50 max-w-lg">
            <h1 className="text-2xl font-bold text-red-300">Eroare de Asociere Cont</h1>
            <p className="mt-2 text-red-200">
                Contul de utilizator nu este legat de un profil de sportiv. Acest lucru se poate întâmpla din cauza unei întârzieri de sincronizare.
            </p>
            <Button variant="secondary" onClick={() => {
                localStorage.clear();
                window.location.reload();
            }} className="mt-6">
                Încearcă din nou
            </Button>
        </div>
    </div>
);


// --- Componenta Principală ---

interface SystemGuardianProps {
    children: React.ReactNode;
    isLoading: boolean;
    currentUser: User | null;
    permissions: Permissions;
    error: string | null;
    activeRole: string | null;
    onRedirectToRoleSelection: () => void;
}

export const SystemGuardian: React.FC<SystemGuardianProps> = ({ children, isLoading, currentUser, permissions, error, activeRole, onRedirectToRoleSelection }) => {
    const [showLoadingScreen, setShowLoadingScreen] = useState(false);
    const [showRetryButton, setShowRetryButton] = useState(false);
    const timeoutId = useRef<NodeJS.Timeout | null>(null);
    
    useEffect(() => {
        if (currentUser) {
            if (currentUser.cluburi?.theme_config) {
                applyTheme(currentUser.cluburi.theme_config as Partial<Theme>);
            } else if (permissions.isFederationAdmin || currentUser.club_id === FEDERATIE_ID) {
                applyTheme(federationTheme);
            } else {
                applyTheme(clubTheme);
            }
        } else {
            applyTheme(federationTheme);
        }

        // Clear any existing timeout
        if (timeoutId.current) {
            clearTimeout(timeoutId.current);
        }

        if (isLoading) {
            // Set a timeout to show loading screen after 500ms
            timeoutId.current = setTimeout(() => {
                setShowLoadingScreen(true);
            }, 500);

            // Set another timeout to show retry button and redirect if activeRole is still null after 5 seconds
            timeoutId.current = setTimeout(() => {
                if (activeRole === null) {
                    setShowRetryButton(true);
                    onRedirectToRoleSelection(); // Redirect to role selection page
                }
            }, 5000); // 5 seconds timeout
        } else {
            setShowLoadingScreen(false);
            setShowRetryButton(false);
        }

        return () => {
            if (timeoutId.current) {
                clearTimeout(timeoutId.current);
            }
        };
    }, [isLoading, currentUser, permissions.isFederationAdmin, activeRole, onRedirectToRoleSelection]);

    if (error) {
        if (error.includes('Contul de utilizator nu este legat')) {
            return <ProfileLinkErrorScreen />;
        }
        return <ErrorScreen message={error} />;
    }
    
    if (activeRole === null && showRetryButton) {
        return <RoleSelectionPrompt onRetry={onRedirectToRoleSelection} />;
    }

    if (!isLoading) {
        return <>{children}</>;
    }

    if (showLoadingScreen) {
        return <DiagnosticScreen />;
    }

    return null;
};