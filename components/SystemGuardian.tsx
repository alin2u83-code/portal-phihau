import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Permissions } from '../hooks/usePermissions';
import { clubTheme, federationTheme, applyTheme } from '../themes';
import { FEDERATIE_ID } from '../constants';

// --- Sub-componente interne ---

const DiagnosticScreen: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center p-4">
        <svg className="animate-spin h-8 w-8 text-brand-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
        // Testul 3 (Bypass Super Admin): Aplică tema imediat pentru a preveni erorile.
        if (permissions.isFederationAdmin) {
            applyTheme(federationTheme);
        } else if (currentUser) {
            // Aplică tema specifică clubului pentru utilizatorii normali.
            applyTheme(currentUser.club_id === FEDERATIE_ID ? federationTheme : clubTheme);
        } else {
            // Tema de rezervă pentru pagina de login.
            applyTheme(federationTheme);
        }

        // Auto-Forward: Setează un timer. Dacă încărcarea durează mai mult de 500ms, afișează ecranul de diagnosticare.
        const timer = setTimeout(() => {
            if (isLoading) {
                setShowLoadingScreen(true);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [isLoading, permissions.isFederationAdmin, currentUser]);

    // Testul 2: Verifică dacă există o eroare la încărcarea profilului.
    if (error) {
        return <ErrorScreen message={error} />;
    }
    
    // Auto-Forward: Dacă încărcarea s-a terminat, randează conținutul.
    if (!isLoading) {
        return <>{children}</>;
    }

    // Afișează ecranul de diagnosticare dacă timer-ul a expirat.
    if (showLoadingScreen) {
        return <DiagnosticScreen />;
    }

    // Nu randa nimic în primele 500ms pentru a oferi o experiență fluidă la încărcări rapide.
    return null;
};
