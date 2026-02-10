import React from 'react';
import { View, User, Permissions } from '../types';
import { Button } from './ui';
import { ArrowLeftIcon } from './icons';
import { NotificationBell } from './NotificationBell';
import { NavbarAdmin } from './NavbarAdmin';

interface HeaderProps {
    activeView: View;
    onBack: () => void;
    currentUser: User;
    permissions: Permissions;
    onNavigate: (view: View) => void;
    onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeView, onBack, currentUser, permissions, onNavigate, onLogout }) => {
    const isDashboard = activeView === 'dashboard' || activeView === 'my-portal';
    const isMobile = window.innerWidth < 1024; // lg breakpoint

    return (
        <header 
            className="fixed top-0 left-0 right-0 bg-[var(--bg-main)]/80 backdrop-blur-sm z-40 h-16 flex items-center justify-between px-4 border-b border-[var(--border-color)]"
        >
            <div className="flex-1">
                {!isDashboard && !isMobile && (
                    <Button onClick={onBack} variant="secondary" size="sm" className="bg-slate-700/50 hover:bg-slate-600/50 animate-fade-in-down">
                        <ArrowLeftIcon className="w-5 h-5 mr-2" />
                        Meniu Principal
                    </Button>
                )}
            </div>

            <div className="flex items-center gap-4">
                {currentUser && permissions.hasAdminAccess && <NotificationBell currentUser={currentUser} />}
                {currentUser && (
                    <NavbarAdmin 
                        currentUser={currentUser} 
                        permissions={permissions} 
                        onNavigate={onNavigate} 
                        onLogout={onLogout} 
                    />
                )}
            </div>
        </header>
    );
};
