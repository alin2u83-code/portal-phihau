import React, { useState, useEffect } from 'react';
import { User, Permissions } from '../types';
import { clubTheme, federationTheme, applyTheme, Theme } from '../themes';
import { FEDERATIE_ID } from '../constants';
import { Button } from './ui';
import { supabase } from '../supabaseClient';

// --- Sub-componente interne ---

const IncompleteProfileScreen: React.FC<{ currentUser: User | null }> = ({ currentUser }) => {
    const handleLogout = async () => {
        await supabase?.auth.signOut();
        window.location.reload();
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-main)]">
            <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-amber-900/30 rounded-lg border border-amber-700/50 max-w-lg animate-fade-in-down">
                <h1 className="text-2xl font-bold text-amber-300">Profil Neasociat</h1>
                <p className="mt-2 text-amber-200">
                    Contul tau ({currentUser?.email || 'email indisponibil'}) nu este încă asociat unui club.
                </p>
                <p className="mt-2 text-amber-200">
                    Contactează administratorul Phi Hau.
                </p>
                <Button variant="secondary" onClick={handleLogout} className="mt-6">
                    Logout
                </Button>
            </div>
        </div>
    );
};

const DiagnosticScreen: React.FC<{ timedOut?: boolean; error: string | null }> = ({ timedOut = false, error }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center p-4">
        <svg className="animate-spin h-8 w-8 text-[var(--brand-primary)] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h1 className="text-2xl font-bold text-white">Diagnosticare Club Phi Hau...</h1>
        {timedOut ? (
            <>
                <p className="mt-2 text-amber-400">Diagnosticarea durează mai mult decât de obicei...</p>
                {error && <pre className="mt-4 text-left text-xs bg-black/30 p-2 rounded overflow-auto text-red-300 max-w-full">{error}</pre>}
                <Button variant="danger" onClick={() => window.location.reload()} className="mt-6">
                    Forțează Resetare
                </Button>
            </>
        ) : (
            <p className="mt-2 text-slate-400">Se verifică profilul și permisiunile...</p>
        )}
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
                Contul de utilizator nu este legat de un profil de sportiv. Contactați administratorul Phi Hau.
            </p>
            <Button variant="secondary" onClick={() => window.location.reload()} className="mt-6">
                Reîmprospătează Pagina
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
}

export const SystemGuardian: React.FC<SystemGuardianProps> = ({ children, isLoading, currentUser, permissions, error }) => {
    const [showLoadingScreen, setShowLoadingScreen] = useState(false);
    const [timedOut, setTimedOut] = useState(false);
    
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

        let showLoadingTimer: number | undefined;
        let timeoutTimer: number | undefined;

        if (isLoading) {
            showLoadingTimer = window.setTimeout(() => {
                setShowLoadingScreen(true);
            }, 500);

            timeoutTimer = window.setTimeout(() => {
                setTimedOut(true);
            }, 7000); // Timeout a fost setat la 7 secunde
        }

        return () => {
            clearTimeout(showLoadingTimer);
            clearTimeout(timeoutTimer);
        };
    }, [isLoading, currentUser, permissions.isFederationAdmin]);
    
    if (error && error.startsWith('PROFIL_INCOMPLET')) {
        return <IncompleteProfileScreen currentUser={currentUser} />;
    }

    if (error && !isLoading) {
        if (error.includes('Contul de utilizator nu este legat')) {
            return <ProfileLinkErrorScreen />;
        }
        return <ErrorScreen message={error} />;
    }
    
    if (!isLoading) {
        return <>{children}</>;
    }

    if (showLoadingScreen) {
        return <DiagnosticScreen timedOut={timedOut} error={error} />;
    }

    return null;
};
