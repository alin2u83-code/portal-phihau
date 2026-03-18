import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, View, Club, Permissions, Rol, Grad } from '../types';
import { useNavigation } from '../contexts/NavigationContext';
import { adminMenu, instructorMenu, sportivMenu, MenuItem } from './menuConfig';
import { ArrowRightOnRectangleIcon, Bars3Icon, ChevronDownIcon, ShieldCheckIcon, UserCircleIcon, UsersIcon, BuildingOfficeIcon } from './icons';
import { RoleSwitcher } from './RoleSwitcher';
import { NavMenu } from './NavMenu';
import { Select } from './ui';
import { FEDERATIE_ID, FEDERATIE_NAME, ROLES } from '../constants';

import { QwanKiDoLogo } from './Logo';

interface SidebarProps {
    currentUser: User;
    onLogout: () => void;
    isExpanded: boolean;
    setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    clubs: Club[];
    permissions?: Permissions;
    activeRole: string;
    canSwitchRoles: boolean;
    onSwitchRole: (context: any) => void;
    isSwitchingRole: boolean;
    grade: Grad[];
    userRoles: any[];
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const { currentUser, onLogout, isExpanded, setIsExpanded, clubs, permissions, activeRole, canSwitchRoles, onSwitchRole, isSwitchingRole, userRoles } = props;
    const { activeView, setActiveView } = useNavigation();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);
    const roleSwitcherRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(event.target as Node)) {
                setIsRoleSwitcherOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNavigate = (view: View) => {
        setActiveView(view);
        setIsMobileOpen(false);
    };
    
    const { menuToDisplay, contextName, borderClass, headerIcon: HeaderIcon } = useMemo(() => {
        let menu: MenuItem[], name: string, border: string, icon: React.ElementType;
        const normalizedRole = (activeRole || 'SPORTIV').replace(/ /g, '_').toUpperCase() as Rol['nume'];

        switch (normalizedRole) {
            case ROLES.SUPER_ADMIN_FEDERATIE:
            case ROLES.ADMIN:
                menu = adminMenu;
                name = 'Federație';
                border = 'border-amber-500';
                icon = ShieldCheckIcon;
                break;
            case ROLES.ADMIN_CLUB:
                menu = adminMenu;
                name = currentUser.cluburi?.nume || 'Club';
                border = 'border-sky-500';
                icon = ShieldCheckIcon;
                break;
            case ROLES.INSTRUCTOR:
                menu = instructorMenu;
                name = currentUser.cluburi?.nume || 'Club';
                border = 'border-emerald-500';
                icon = ShieldCheckIcon;
                break;
            case ROLES.SPORTIV:
            default:
                menu = sportivMenu;
                name = 'Portal Sportiv';
                border = 'border-indigo-500';
                icon = UserCircleIcon;
                break;
        }
        return { menuToDisplay: menu, contextName: name, borderClass: border, headerIcon: icon };
    }, [activeRole, currentUser.cluburi?.nume]);


    const iconColorClass = useMemo(() => {
        return 'text-sky-400';
    }, []);
    
    const activeRoleContext = useMemo(() => userRoles.find(r => r.is_primary), [userRoles]);

    const sidebarContent = (
        <div data-tutorial="sidebar" className="flex flex-col h-full bg-slate-900 text-slate-200 shadow-xl border-r border-slate-800">
            {/* App Logo & Name */}
            <div 
                className={`p-4 flex items-center gap-3 border-b border-slate-800/50 cursor-pointer hover:bg-white/5 transition-colors ${!isExpanded ? 'justify-center' : ''}`}
                onClick={() => handleNavigate('dashboard')}
            >
                <QwanKiDoLogo className="h-10 w-10 shrink-0" iconClassName="w-6 h-6" />
                {isExpanded && (
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-bold text-white text-sm tracking-tight truncate">Qwan Ki Do</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider truncate">Management</span>
                    </div>
                )}
            </div>

            <div ref={roleSwitcherRef}>
                <RoleSwitcher
                    isExpanded={isExpanded}
                    canSwitchRoles={canSwitchRoles}
                    isSwitchingRole={isSwitchingRole}
                    isRoleSwitcherOpen={isRoleSwitcherOpen}
                    setIsRoleSwitcherOpen={setIsRoleSwitcherOpen}
                    userRoles={userRoles}
                    activeRoleContext={activeRoleContext}
                    onSwitchRole={onSwitchRole}
                    contextName={contextName}
                    HeaderIcon={HeaderIcon}
                    iconColorClass={iconColorClass}
                />
            </div>

            {/* Club Selector for Federation Admins */}
            
            <NavMenu
                isExpanded={isExpanded}
                permissions={permissions}
                menuToDisplay={menuToDisplay}
                onNavigate={handleNavigate}
            />

             <div className="p-3 border-t border-slate-800/50 mt-auto">
                <button 
                    onClick={onLogout} 
                    title={!isExpanded ? "Deconectare" : ""} 
                    className={`w-full flex items-center p-2.5 rounded-md transition-all duration-200 text-left group ${
                        isExpanded ? 'hover:bg-red-500/10 text-slate-400 hover:text-red-400' : 'text-red-400 hover:bg-red-500/10'
                    }`}
                >
                    <ArrowRightOnRectangleIcon className={`h-5 w-5 shrink-0 transition-transform duration-200 ${isExpanded ? 'mr-3' : 'mx-auto'} group-hover:translate-x-1`} />
                    {isExpanded && <span className="text-sm font-medium truncate">Deconectare</span>}
                </button>
            </div>
        </div>
    );

    const isMobileNavEligible = menuToDisplay.length <= 6; // Sportiv and Instructor menus

    return (
        <>
            {/* Mobile Header/Hamburger - Only show if not using bottom nav or if we want it as a fallback */}
            {!isMobileNavEligible && (
                <button className="md:hidden fixed top-3 left-3 z-50 p-2 bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-md text-slate-200 shadow-lg" onClick={() => setIsMobileOpen(true)}>
                    <Bars3Icon className="w-6 h-6" />
                </button>
            )}

            {/* Mobile Sidebar Overlay */}
            <div className={`fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm transition-opacity md:hidden ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileOpen(false)} />
            
            {/* Mobile Sidebar */}
            <aside className={`fixed top-0 left-0 z-50 h-full w-72 transition-transform duration-300 ease-in-out md:hidden border-r border-slate-800 shadow-2xl ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {sidebarContent}
            </aside>
            
            {/* Desktop Sidebar */}
            <aside className={`hidden md:block fixed top-0 left-0 h-full z-30 transition-all duration-300 ${isExpanded ? 'w-64' : 'w-20'}`}>
                {sidebarContent}
            </aside>
            
            {/* Desktop Toggle Button */}
            <button className={`hidden md:flex items-center justify-center fixed top-6 z-40 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-300 shadow-md ${isExpanded ? 'left-[15.2rem]' : 'left-[4.2rem]'}`} onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Restrânge meniul" : "Extinde meniul"}>
                <ChevronDownIcon className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : '-rotate-90'}`} />
            </button>

            {/* Mobile Bottom Navigation */}
            {isMobileNavEligible && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.3)] pb-safe">
                    <div className="flex justify-around items-center h-16 px-2">
                        {menuToDisplay.slice(0, 4).map((item, idx) => {
                            const isActive = item.view === activeView;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => item.view && handleNavigate(item.view)}
                                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <item.icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                                    <span className="text-[10px] font-medium truncate w-full text-center px-1">{item.label}</span>
                                </button>
                            );
                        })}
                        
                        {/* More Menu Button */}
                        <button
                            onClick={() => setIsMobileOpen(true)}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors text-slate-500 hover:text-slate-300`}
                        >
                            <Bars3Icon className="w-6 h-6" />
                            <span className="text-[10px] font-medium">Mai mult</span>
                        </button>
                    </div>
                </nav>
            )}
        </>
    );
};
