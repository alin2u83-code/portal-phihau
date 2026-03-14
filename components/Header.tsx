import React from 'react';
import { View, User, Permissions } from '../types';
import { useNavigation } from '../contexts/NavigationContext';
import { Button } from './ui';
import { ArrowLeftIcon } from './icons';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';
import { useIsMobile } from '../hooks/useIsMobile';

interface HeaderProps {
    onBack: () => void;
    currentUser: User;
    permissions?: Permissions;
    onLogout: () => void;
    isSidebarExpanded: boolean;
    userRoles?: any[];
    onSwitchRole?: (context: any) => void;
}

const ROOT_VIEWS: View[] = ['dashboard', 'my-portal', 'federation-dashboard', 'admin-dashboard'];

export const Header: React.FC<HeaderProps> = ({ 
    onBack, 
    currentUser, 
    permissions, 
    onLogout, 
    isSidebarExpanded,
    userRoles,
    onSwitchRole
}) => {
    const { activeView, setActiveView } = useNavigation();
    const isRootView = ROOT_VIEWS.includes(activeView);
    const isMobile = useIsMobile();

    return (
        <header 
            className={`fixed top-0 right-0 h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md transition-all duration-300 ${isSidebarExpanded ? 'md:left-64' : 'md:left-20'} left-0 z-40 shadow-sm`}
        >
            {/* Left: Logo/Title & Back Button */}
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                {!isRootView && (
                    <Button 
                        onClick={onBack} 
                        variant="secondary" 
                        size="sm" 
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm flex items-center gap-1 md:gap-2 transition-all"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        <span className="hidden md:inline">Înapoi</span>
                    </Button>
                )}
                <div className="font-bold text-white tracking-tight text-base md:text-lg truncate">
                    {isMobile ? 'Portal' : 'Qwan Ki Do Club'}
                </div>
            </div>

            {/* Right: Notifications & User Menu */}
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                {currentUser && <NotificationBell currentUser={currentUser} />}
                
                <div className="h-6 w-[1px] bg-slate-800 hidden md:block mx-1"></div>

                <UserMenu 
                    currentUser={currentUser} 
                    permissions={permissions} 
                    onNavigate={setActiveView} 
                    onLogout={onLogout} 
                    userRoles={userRoles}
                    onSwitchRole={onSwitchRole}
                />
            </div>
        </header>
    );
};
