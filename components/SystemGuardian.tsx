
import React, { useEffect } from 'react';
import { User, Permissions } from '../types';
import { federationTheme, applyTheme, Theme } from '../themes';
import { FEDERATIE_ID } from '../constants';

const LoadingScreen: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-deep-navy text-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mb-4"></div>
        <h1 className="text-2xl font-bold text-white">Inițializare Sesiune...</h1>
        <p className="mt-2 text-slate-400">Se verifică profilul și permisiunile...</p>
    </div>
);

interface SystemGuardianProps {
    children: React.ReactNode;
    isLoading: boolean;
    currentUser: User | null;
    permissions: Permissions;
    error: string | null;
}

export const SystemGuardian: React.FC<SystemGuardianProps> = ({ children, isLoading, currentUser, permissions, error }) => {
    useEffect(() => {
        if (currentUser) {
            if (currentUser.cluburi?.theme_config) {
                applyTheme(currentUser.cluburi.theme_config as Partial<Theme>);
            } else if (permissions.isFederationAdmin || currentUser.club_id === FEDERATIE_ID) {
                applyTheme(federationTheme);
            } else {
                applyTheme(); // Default to federation theme if no other is specified
            }
        } else {
            applyTheme(federationTheme); // Theme for login screen
        }
    }, [currentUser, permissions.isFederationAdmin]);

    if (error) {
        return <div className="p-8 text-center text-red-400">Eroare de sistem: {error}</div>;
    }
    
    if (isLoading) {
        return <LoadingScreen />;
    }

    return <>{children}</>;
};
