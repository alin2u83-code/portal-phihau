import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { User, Club, View } from '../types';
import { Permissions } from '../hooks/usePermissions';
import { useError } from './ErrorProvider';
import { AdminProfileQuickAccess } from './AdminProfileQuickAccess';
import { ChevronDownIcon, PaletteIcon } from './icons';

const themes = {
    'Deep Navy': {
        '--main-bg': '#0a192f',
        '--card-bg': '#112240',
        '--card-mobile-bg': '#1d2d50',
        '--input-bg': '#334155',
        '--text-primary': '#e2e8f0',
        '--text-secondary': '#94a3b8',
        '--border-color': '#1e293b',
        '--border-color-light': '#334155',
        '--brand-primary': '#3D3D99',
        '--brand-secondary': '#4DBCE9',
    },
    'Classic Martial Art': {
        '--main-bg': '#F5EFE6',
        '--card-bg': '#E8DFCA',
        '--card-mobile-bg': '#E8DFCA',
        '--input-bg': '#F5EFE6',
        '--text-primary': '#2d2d2d',
        '--text-secondary': '#5a5a5a',
        '--border-color': '#D3C5AA',
        '--border-color-light': '#D3C5AA',
        '--brand-primary': '#8C1C13',
        '--brand-secondary': '#BF4342',
    },
    'High Contrast': {
        '--main-bg': '#000000',
        '--card-bg': '#1A1A1A',
        '--card-mobile-bg': '#2A2A2A',
        '--input-bg': '#333333',
        '--text-primary': '#FFFFFF',
        '--text-secondary': '#CCCCCC',
        '--border-color': '#444444',
        '--border-color-light': '#555555',
        '--brand-primary': '#00FF00',
        '--brand-secondary': '#33FF33',
    },
};

const QwanKiDoLogo = () => (
    <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="var(--main-bg)" stroke="var(--brand-secondary)" strokeWidth="4"/>
        <path d="M50 20 L30 70 L70 70 Z" fill="var(--brand-secondary)" transform="rotate(60 50 50)" />
        <path d="M50 20 L30 70 L70 70 Z" fill="var(--brand-primary)" transform="rotate(-60 50 50)" />
    </svg>
);


interface TopNavigationBarProps {
    currentUser: User;
    onNavigate: (view: View) => void;
    onLogout: () => void;
    permissions: Permissions;
    clubs: Club[];
    setClubs: React.Dispatch<React.SetStateAction<Club[]>>;
}

export const TopNavigationBar: React.FC<TopNavigationBarProps> = ({ currentUser, onNavigate, onLogout, permissions, clubs, setClubs }) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const [loadingTheme, setLoadingTheme] = useState(false);
    const { showError, showSuccess } = useError();

    const canChangeTheme = permissions.isSuperAdmin || permissions.isAdminClub;

    const updateTheme = async (themeName: keyof typeof themes) => {
        if (!currentUser.club_id || !canChangeTheme) return;
        setLoadingTheme(true);

        const newConfig = themes[themeName];

        const { error } = await supabase
            .from('cluburi')
            .update({ theme_config: newConfig })
            .eq('id', currentUser.club_id);

        setLoadingTheme(false);

        if (error) {
            showError("Eroare la schimbarea temei", error);
        } else {
            setClubs(prevClubs =>
                prevClubs.map(club =>
                    club.id === currentUser.club_id ? { ...club, theme_config: newConfig } : club
                )
            );
            showSuccess("Tema a fost actualizată", `Tema "${themeName}" a fost aplicată.`);
            setIsThemeMenuOpen(false);
        }
    };
    
    const initials = (currentUser.nume?.[0] || '') + (currentUser.prenume?.[0] || '');

    return (
        <header className="sticky top-0 z-20 bg-[var(--main-bg)]/80 backdrop-blur-sm border-b border-[var(--border-color)]">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3">
                    <QwanKiDoLogo />
                    <span className="font-bold text-white hidden sm:block">Portal Qwan Ki Do</span>
                </div>
                
                <div className="flex items-center gap-4">
                    {canChangeTheme && (
                         <div className="relative">
                            <button
                                onClick={() => setIsThemeMenuOpen(p => !p)}
                                className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white"
                                title="Schimbă Tema Vizuală"
                            >
                                <PaletteIcon className="w-5 h-5" />
                            </button>
                            {isThemeMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-slate-700 ring-1 ring-black ring-opacity-5 z-50">
                                    <div className="py-1">
                                        {Object.keys(themes).map(themeName => (
                                            <button
                                                key={themeName}
                                                onClick={() => updateTheme(themeName as keyof typeof themes)}
                                                disabled={loadingTheme}
                                                className="w-full text-left block px-4 py-2 text-sm text-slate-200 hover:bg-brand-primary hover:text-white"
                                            >
                                                {themeName}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="relative">
                        <button
                            onClick={() => setIsProfileMenuOpen(p => !p)}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/50"
                        >
                            <div className="w-8 h-8 rounded-full bg-brand-secondary flex items-center justify-center text-white font-bold text-sm">
                                {initials}
                            </div>
                            <div className="hidden sm:block text-left">
                                <p className="text-sm font-semibold text-white truncate">{currentUser.nume} {currentUser.prenume}</p>
                            </div>
                            <ChevronDownIcon className={`hidden sm:block w-5 h-5 text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                         {isProfileMenuOpen && (
                            <div className="absolute right-0 mt-2">
                                <AdminProfileQuickAccess 
                                    user={currentUser} 
                                    onNavigate={(view) => { onNavigate(view); setIsProfileMenuOpen(false); }}
                                    onLogout={onLogout}
                                    isExpanded={true}
                                    isSuperAdmin={permissions.isSuperAdmin}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};
