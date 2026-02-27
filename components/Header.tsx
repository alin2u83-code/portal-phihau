import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, User, Permissions, Rol } from '../types';
import { Button } from './ui';
import { ArrowLeftIcon, ChevronDownIcon, CogIcon, ArrowRightOnRectangleIcon, HomeIcon, SitemapIcon, UserCircleIcon } from './icons';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';
import { useIsMobile } from '../hooks/useIsMobile';




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

    return (
        <header 
            className={`fixed top-0 right-0 h-16 flex items-center justify-between px-4 border-b border-white/10 bg-[#3D3D99] transition-all duration-300 ${isSidebarExpanded ? 'md:left-64' : 'md:left-20'} left-0 z-40`}
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
                
                <UserMenu 
                    currentUser={currentUser} 
                    permissions={permissions} 
                    onNavigate={onNavigate} 
                    onLogout={onLogout} 
                />
            </div>
        </header>
    );
};