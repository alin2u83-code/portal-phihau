import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, View, Plata, Rol } from '../types';
import { ChevronDownIcon } from './icons';
import { usePermissions } from '../hooks/usePermissions';

interface NavbarAdminProps {
    currentUser: User;
    onNavigate: (view: View) => void;
    onLogout: () => void;
    plati: Plata[];
}

export const NavbarAdmin: React.FC<NavbarAdminProps> = ({ currentUser, onNavigate, onLogout, plati }) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const activeRole = useMemo((): Rol['nume'] => {
        if (currentUser?.roluri && currentUser.roluri.length > 0) {
            const roleWeights: Record<Rol['nume'], number> = { 'SUPER_ADMIN_FEDERATIE': 5, 'Admin': 4, 'Admin Club': 3, 'Instructor': 2, 'Sportiv': 1 };
            return [...currentUser.roluri].sort((a, b) => (roleWeights[b.nume] || 0) - (roleWeights[a.nume] || 0))[0]?.nume || 'Sportiv';
        }
        return 'Sportiv';
    }, [currentUser]);
    // FIX: The usePermissions hook expects only one argument (the user object).
    const permissions = usePermissions(currentUser);
    
    const hasOverduePayments = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        return plati.some(p => p.status === 'Neachitat' && new Date(p.data) < today);
    }, [plati]);

    const initials = (currentUser.nume?.[0] || '') + (currentUser.prenume?.[0] || '');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
            <div className="flex items-center justify-end h-16 px-4 sm:px-6 lg:px-8">
                 <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsProfileMenuOpen(p => !p)}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/50"
                    >
                        <div className="relative">
                             <div className="w-8 h-8 rounded-full bg-brand-secondary flex items-center justify-center text-white font-bold text-sm cursor-pointer">
                                {initials}
                            </div>
                             {hasOverduePayments && (
                                <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-slate-900"></span>
                             )}
                        </div>
                        <div className="hidden sm:block text-left">
                            <p className="text-sm font-semibold text-white truncate">{currentUser.nume} {currentUser.prenume}</p>
                            <p className="text-xs text-slate-400 truncate">{currentUser.roluri.map(r => r.nume).join(', ')}</p>
                        </div>
                        <ChevronDownIcon className={`hidden sm:block w-5 h-5 text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                     {isProfileMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-[var(--bg-card)] shadow-lg ring-1 ring-black ring-opacity-5 border border-[var(--border-color)] focus:outline-none z-30 animate-fade-in-down">
                            <div className="py-1">
                                <button
                                    onClick={() => {
                                        onNavigate('account-settings');
                                        setIsProfileMenuOpen(false);
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                                >
                                    Setări Cont
                                </button>
                                <button
                                    onClick={() => {
                                        onLogout();
                                        setIsProfileMenuOpen(false);
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-600/20 hover:text-red-300"
                                >
                                    Deconectare
                                </button>
                            </div>
                        </div>
                     )}
                 </div>
            </div>
        </header>
    );
};
