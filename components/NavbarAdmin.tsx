import React, { useState, useRef, useEffect } from 'react';
import { User, View, Permissions, Rol } from '../types';
import { ChevronDownIcon, CogIcon, ArrowRightOnRectangleIcon, HomeIcon, SitemapIcon, UserCircleIcon } from './icons';

interface NavbarAdminProps {
    currentUser: User;
    permissions: Permissions;
    onNavigate: (view: View) => void;
    onLogout: () => void;
}

const getPrimaryRoleName = (permissions: Permissions): string => {
    if (permissions.isSuperAdmin) return 'Super Admin';
    if (permissions.isAdmin) return 'Admin';
    if (permissions.isAdminClub) return 'Admin Club';
    if (permissions.isInstructor) return 'Instructor';
    if (permissions.isSportiv) return 'Sportiv';
    return 'Utilizator';
};

const MenuItem: React.FC<{ label: string; icon: React.ElementType; onClick: () => void }> = ({ label, icon: Icon, onClick }) => (
    <button onClick={onClick} className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 hover:text-slate-900 rounded-md transition-colors">
        <Icon className="w-5 h-5 mr-3 text-slate-500" />
        <span>{label}</span>
    </button>
);

export const NavbarAdmin: React.FC<NavbarAdminProps> = ({ currentUser, permissions, onNavigate, onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const initials = `${currentUser.prenume?.[0] || ''}${currentUser.nume?.[0] || ''}`.toUpperCase();
    const primaryRole = getPrimaryRoleName(permissions);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNavigate = (view: View) => {
        onNavigate(view);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(p => !p)}
                className="flex items-center gap-3 p-1 rounded-full hover:opacity-90 transition-opacity"
            >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base border-2 border-slate-300 ${permissions.isAdminClub ? 'bg-red-700' : 'bg-brand-primary'}`}>
                    {initials}
                </div>
                
                <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-white truncate max-w-[150px]">{currentUser.prenume} {currentUser.nume?.[0]}.</p>
                    {permissions.isAdminClub ? (
                        <p className="text-[10px] text-amber-400 font-bold">[ADMIN CLUB]</p>
                    ) : (
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">{primaryRole}</p>
                    )}
                </div>

                <ChevronDownIcon className={`hidden sm:block w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-100 rounded-lg shadow-2xl border border-slate-300 z-50 animate-fade-in-down">
                    <div className="p-3 border-b border-slate-300">
                        <p className="text-sm font-semibold text-slate-900 truncate">{currentUser.nume} {currentUser.prenume}</p>
                        <p className="text-xs text-slate-600 truncate">{currentUser.email}</p>
                    </div>
                    
                    <div className="p-2 space-y-1">
                        {permissions.isSportiv && (
                             <MenuItem label="Portalul Meu" icon={UserCircleIcon} onClick={() => handleNavigate('my-portal')} />
                        )}
                        {permissions.hasAdminAccess && (
                            <MenuItem label="Dashboard Admin" icon={HomeIcon} onClick={() => handleNavigate('dashboard')} />
                        )}
                        {permissions.isMultiContextAdmin && (
                             <MenuItem label="Schimbă Context" icon={SitemapIcon} onClick={() => handleNavigate('admin-console')} />
                        )}
                        <MenuItem label="Setări Cont" icon={CogIcon} onClick={() => handleNavigate('account-settings')} />
                    </div>

                    <div className="p-2 border-t border-slate-300">
                         <button onClick={onLogout} className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-100 hover:text-red-800 rounded-md transition-colors">
                            <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                            <span>Deconectare</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
