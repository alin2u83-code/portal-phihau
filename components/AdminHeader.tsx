import React, { useState, useMemo } from 'react';
import { User, View, Plata } from '../types';
import { ChevronDownIcon } from './icons';
import { AdminProfileQuickAccess } from './AdminProfileQuickAccess';
import { Permissions } from '../hooks/usePermissions';

interface AdminHeaderProps {
    currentUser: User;
    onNavigate: (view: View) => void;
    onLogout: () => void;
    plati: Plata[];
    permissions: Permissions;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ currentUser, onNavigate, onLogout, plati, permissions }) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    
    const hasOverduePayments = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        return plati.some(p => p.status === 'Neachitat' && new Date(p.data) < today);
    }, [plati]);

    const initials = (currentUser.nume?.[0] || '') + (currentUser.prenume?.[0] || '');

    return (
        <header className="sticky top-0 z-20 bg-[var(--bg-card)]/80 backdrop-blur-sm border-b border-[var(--border-color)]">
            <div className="flex items-center justify-end h-16 px-4 sm:px-6 lg:px-8">
                 <div className="relative">
                    <div
                        className="flex items-center rounded-lg bg-blue-700 border border-dashed border-blue-400 hover:bg-blue-600 transition-colors"
                        title="User profile information"
                    >
                        <div
                            onClick={() => onNavigate('dashboard')}
                            role="link"
                            tabIndex={0}
                            className="flex flex-grow items-center gap-2 cursor-pointer p-2"
                            onKeyDown={(e) => e.key === 'Enter' && onNavigate('dashboard')}
                        >
                            <div className="relative">
                                 <div className="w-8 h-8 rounded-full bg-brand-secondary flex items-center justify-center text-white font-bold text-sm">
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
                        </div>
                        <button
                            onClick={() => setIsProfileMenuOpen(p => !p)}
                            className="ml-2 flex-shrink-0 p-2 border-l border-dashed border-blue-400"
                            aria-label="Open user menu"
                        >
                            <ChevronDownIcon className={`w-5 h-5 text-slate-200 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                     {isProfileMenuOpen && (
                        <AdminProfileQuickAccess 
                            user={currentUser} 
                            onNavigate={(view) => { onNavigate(view); setIsProfileMenuOpen(false); }}
                            onLogout={onLogout}
                            isExpanded={true}
                            isSuperAdmin={permissions.isSuperAdmin}
                        />
                    )}
                 </div>
            </div>
        </header>
    );
};