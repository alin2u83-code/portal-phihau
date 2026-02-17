import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, User, Permissions, Rol } from '../types';
import { Button } from './ui';
import { ArrowLeftIcon, ChevronDownIcon, CogIcon, ArrowRightOnRectangleIcon, HomeIcon, SitemapIcon, UserCircleIcon } from './icons';
import { NotificationBell } from './NotificationBell';
import { useIsMobile } from '../hooks/useIsMobile';

// Helper function from former NavbarAdmin.tsx
const getPrimaryRoleName = (permissions: Permissions): string => {
    if (permissions.isSuperAdmin) return 'Super Admin';
    if (permissions.isAdmin) return 'Admin';
    if (permissions.isAdminClub) return 'Admin Club';
    if (permissions.isInstructor) return 'Instructor';
    if (permissions.isSportiv) return 'Sportiv';
    return 'Utilizator';
};

// Helper component from former NavbarAdmin.tsx
const MenuItem: React.FC<{ label: string; icon: React.ElementType; onClick: () => void }> = ({ label, icon: Icon, onClick }) => (
    <button onClick={onClick} className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 hover:text-slate-900 rounded-md transition-colors">
        <Icon className="w-5 h-5 mr-3 text-slate-500" />
        <span>{label}</span>
    </button>
);


interface HeaderProps {
    activeView: View;
    onBack: () => void;
    currentUser: User;
    permissions: Permissions;
    onNavigate: (view: View) => void;
    onLogout: () => void;
    isSidebarExpanded: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activeView, onBack, currentUser, permissions, onNavigate, onLogout, isSidebarExpanded }) => {
    const isDashboard = activeView === 'dashboard' || activeView === 'my-portal';
    const isMobile = useIsMobile();

    // --- Logic from former NavbarAdmin.tsx ---
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const initials = `${currentUser.prenume?.[0] || ''}${currentUser.nume?.[0] || ''}`.toUpperCase();
    const primaryRole = getPrimaryRoleName(permissions);
    
    const isAdminContext = permissions.isSuperAdmin || permissions.isAdmin || permissions.isAdminClub;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNavigate = (view: View) => {
        onNavigate(view);
        setIsDropdownOpen(false);
    };

    return (
        <header 
            className={`fixed top-0 right-0 h-16 flex items-center justify-between px-4 border-b border-slate-700 bg-[#0a192f] transition-all duration-300 ${isSidebarExpanded ? 'md:left-64' : 'md:left-20'} left-0 z-40`}
        >
            <div className="flex-1">
                {!isDashboard && !isMobile && (
                    <Button onClick={onBack} variant="secondary" size="sm" className="bg-slate-700/50 hover:bg-slate-600/50 animate-fade-in-down">
                        <ArrowLeftIcon className="w-5 h-5 mr-2" />
                        Meniu Principal
                    </Button>
                )}
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                {currentUser && <NotificationBell currentUser={currentUser} />}
                
                {/* Merged NavbarAdmin component */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(p => !p)}
                        className="flex items-center gap-3 p-1 rounded-full hover:opacity-90 transition-opacity"
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg bg-slate-900 ring-2 ${isAdminContext ? 'ring-[#FFD700]' : 'ring-slate-500/50'}`}>
                            {initials}
                        </div>
                        
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-bold text-white truncate max-w-[150px]">
                                {currentUser.prenume} {currentUser.nume?.[0] || ''}.
                            </p>
                            <p className="text-xs text-slate-400">
                                [{primaryRole.toUpperCase()}]
                            </p>
                        </div>

                        <ChevronDownIcon className={`hidden md:block w-5 h-5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isDropdownOpen && (
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
            </div>
        </header>
    );
};