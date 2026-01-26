import React, { useState, useMemo } from 'react';
import { User, View, Plata } from '../types';
import { ChevronDownIcon } from './icons';
import { AdminProfileQuickAccess } from './AdminProfileQuickAccess';
import { usePermissions } from '../hooks/usePermissions';

interface NavbarAdminProps {
    currentUser: User;
    onNavigate: (view: View) => void;
    onLogout: () => void;
    plati: Plata[];
}

export const NavbarAdmin: React.FC<NavbarAdminProps> = ({ currentUser, onNavigate, onLogout, plati }) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const permissions = usePermissions(currentUser);
    
    const hasOverduePayments = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        return plati.some(p => p.status === 'Neachitat' && new Date(p.data) < today);
    }, [plati]);

    const initials = (currentUser.nume?.[0] || '') + (currentUser.prenume?.[0] || '');

    return (
        <header className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
            <div className="flex items-center justify-end h-16 px-4 sm:px-6 lg:px-8">
                 <div className="relative">
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
                        <AdminProfileQuickAccess 
                            user={currentUser} 
                            onNavigate={(view) => { onNavigate(view); setIsProfileMenuOpen(false); }}
                            onLogout={onLogout}
                            isExpanded={true} // Simulează meniul extins
                            isSuperAdmin={permissions.isSuperAdmin}
                        />
                    )}
                 </div>
            </div>
        </header>
    );
};