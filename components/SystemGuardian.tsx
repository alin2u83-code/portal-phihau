import React, { useState, useEffect } from 'react';
import { User, Permissions } from '../types';
import { clubTheme, federationTheme, applyTheme, Theme } from '../themes';
import { FEDERATIE_ID } from '../constants';
import { Button } from './ui';

// --- Sub-componente interne ---

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

const AccessDeniedScreen: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center p-8 bg-red-900/30 rounded-lg border border-red-700/50">
        <svg className="w-16 h-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h1 className="text-2xl font-bold text-red-300">Acces Refuzat</h1>
        <p className="mt-2 text-red-200">Nu aveți permisiunile necesare pentru a accesa aceste date sau acest club.</p>
        <Button variant="secondary" onClick={() => window.location.href = '/'} className="mt-6">
            Înapoi la Dashboard
        </Button>
    </div>
);

const ErrorScreen: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center p-8 bg-red-900/30 rounded-lg border border-red-700/50">
        <h1 className="text-2xl font-bold text-red-300">Eroare de Sistem</h1>
        <p className="mt-2 text-red-200">{message}</p>
        <Button variant="secondary" onClick={() => window.location.reload()} className="mt-6">
            Reîncearcă
        </Button>
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
    permissions?: Permissions;
    error: string | null;
    onRetry?: () => void;
}

export const SystemGuardian: React.FC<SystemGuardianProps> = ({ children, isLoading, currentUser, permissions, error, onRetry }) => {
    const [showLoadingScreen, setShowLoadingScreen] = useState(false);
    const [isTimedOut, setIsTimedOut] = useState(false);
    
    useEffect(() => {
        if (currentUser) {
            // Priority: Theme from DB
            if (currentUser.cluburi?.theme_config) {
                applyTheme(currentUser.cluburi.theme_config as Partial<Theme>);
            }
            // Fallback: Federation theme for federation users
            else if (permissions?.isFederationAdmin || currentUser.club_id === FEDERATIE_ID) {
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

        const timeoutTimer = setTimeout(() => {
            if (isLoading) {
                setIsTimedOut(true);
            }
        }, 5000);

        return () => {
            clearTimeout(timer);
            clearTimeout(timeoutTimer);
        };
    }, [isLoading, currentUser, permissions?.isFederationAdmin]);

    if (error) {
        if (error.includes('Contul de utilizator nu este legat')) {
            return <ProfileLinkErrorScreen />;
        }
        if (error.includes('Acces Refuzat') || error.includes('403') || error.includes('RLS')) {
            return <AccessDeniedScreen />;
        }
        return <ErrorScreen message={error} />;
    }
    
    if (!isLoading) {
        return <>{children}</>;
    }

    if (isTimedOut) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-screen text-center p-8 bg-slate-900">
                <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full">
                    <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Sincronizare Întârziată</h1>
                    <p className="text-slate-400 mb-8">
                        Încărcarea permisiunilor durează mai mult decât de obicei. Acest lucru se poate întâmpla din cauza unei conexiuni slabe sau a unei sesiuni expirate.
                    </p>
                    <div className="space-y-3">
                        <Button 
                            className="w-full bg-violet-600 hover:bg-violet-700 text-white py-6 text-lg"
                            onClick={() => {
                                setIsTimedOut(false);
                                if (onRetry) onRetry();
                                else window.location.reload();
                            }}
                        >
                            Retry Sync
                        </Button>
                        <Button 
                            variant="secondary" 
                            className="w-full text-slate-400 hover:text-white"
                            onClick={() => window.location.reload()}
                        >
                            Refresh Page
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (showLoadingScreen) {
        return <DiagnosticScreen />;
    }

    return null;
};
