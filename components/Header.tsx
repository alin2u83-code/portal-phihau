import React from 'react';
import { View, User, Permissions } from '../types';
import { useNavigation } from '../contexts/NavigationContext';
import { Button, Select } from './ui';
import { ArrowLeftIcon } from './icons';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';
import { useIsMobile } from '../hooks/useIsMobile';
import { useClubAccess } from '../hooks/useClubAccess';
import { useData } from '../contexts/DataContext';

interface HeaderProps {
    onBack: () => void;
    currentUser: User;
    permissions: Permissions;
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
    const { allowedClubs } = useClubAccess();
    const { activeClubId, setGlobalClubFilter, clubs } = useData();

    return (
        <header 
            className={`fixed top-0 right-0 h-16 flex items-center justify-between px-4 border-b border-white/10 bg-[#3D3D99] transition-all duration-300 ${isSidebarExpanded ? 'md:left-64' : 'md:left-20'} left-0 z-40 shadow-md`}
        >
            <div className="flex-1 flex items-center gap-4">
                {!isRootView && !isMobile && (
                    <Button 
                        onClick={onBack} 
                        variant="secondary" 
                        size="sm" 
                        className="bg-slate-700/50 hover:bg-slate-600/50 text-white border-none shadow-sm flex items-center gap-2 transition-all"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        <span>Înapoi</span>
                    </Button>
                )}
                
                {allowedClubs.length > 1 && (
                    <div className="hidden md:flex items-center gap-2">
                         <span className="text-xs font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">Club Activ:</span>
                         <Select 
                            value={activeClubId || ''} 
                            onChange={(e) => setGlobalClubFilter(e.target.value)}
                            className="!py-1 !text-sm w-48 bg-slate-800/50 border-slate-600 focus:ring-indigo-500 text-white"
                        >
                            {clubs
                                .filter(c => allowedClubs.includes(c.id))
                                .map(c => (
                                    <option key={c.id} value={c.id}>{c.nume}</option>
                                ))
                            }
                        </Select>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 md:gap-4">
                {currentUser && <NotificationBell currentUser={currentUser} />}
                
                <div className="h-8 w-[1px] bg-white/20 hidden md:block mx-1"></div>

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
