import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, View, Club, Permissions, Rol, Grad } from '../types';
import { adminMenu, instructorMenu, sportivMenu, MenuItem } from './menuConfig';
import { ArrowRightOnRectangleIcon, Bars3Icon, ChevronDownIcon, ShieldCheckIcon, UserCircleIcon, UsersIcon } from './icons';
import { RoleSwitcher } from './RoleSwitcher';
import { NavMenu } from './NavMenu';
import { Select } from './ui';
import { FEDERATIE_ID, FEDERATIE_NAME, ROLES } from '../constants';







interface SidebarProps {
    currentUser: User;
    onNavigate: (view: View) => void;
    onLogout: () => void;
    activeView: View;
    isExpanded: boolean;
    setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    clubs: Club[];
    globalClubFilter: string | null;
    setGlobalClubFilter: React.Dispatch<React.SetStateAction<string | null>>;
    permissions: Permissions;
    activeRole: Rol['nume'];
    canSwitchRoles: boolean;
    onSwitchRole: (context: any) => void;
    isSwitchingRole: boolean;
    grade: Grad[];
    userRoles: any[];
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const { currentUser, onNavigate, onLogout, activeView, isExpanded, setIsExpanded, clubs, globalClubFilter, setGlobalClubFilter, permissions, activeRole, canSwitchRoles, onSwitchRole, isSwitchingRole, userRoles } = props;
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
        onNavigate(view);
        setIsMobileOpen(false);
    };
    
    const { menuToDisplay, contextName, borderClass, headerIcon: HeaderIcon } = useMemo(() => {
        let menu: MenuItem[], name: string, border: string, icon: React.ElementType;
        const normalizedRole = (activeRole || 'SPORTIV').replace(/ /g, '_').toUpperCase() as Rol['nume'];

        switch (normalizedRole) {
            case ROLES.SUPER_ADMIN_FEDERATIE:
            case ROLES.ADMIN_CLUB:
                menu = adminMenu;
                name = normalizedRole === ROLES.SUPER_ADMIN_FEDERATIE ? 'Federație' : currentUser.cluburi?.nume || 'Club';
                border = 'border-[#4DBCE9]';
                icon = ShieldCheckIcon;
                break;
            case ROLES.INSTRUCTOR:
                menu = instructorMenu;
                name = currentUser.cluburi?.nume || 'Club';
                border = 'border-[#4DBCE9]';
                icon = ShieldCheckIcon;
                break;
            case ROLES.SPORTIV:
            default:
                menu = sportivMenu;
                name = 'Portal Sportiv';
                border = 'border-[#4DBCE9]';
                icon = UserCircleIcon;
                break;
        }
        return { menuToDisplay: menu, contextName: name, borderClass: border, headerIcon: icon };
    }, [activeRole, currentUser.cluburi?.nume]);


    const iconColorClass = useMemo(() => {
        return 'text-[#4DBCE9]';
    }, []);
    
    const activeRoleContext = useMemo(() => userRoles.find(r => r.is_primary), [userRoles]);

    const sidebarContent = (
        <div className="flex flex-col h-full bg-[#3D3D99] text-white shadow-xl">
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
            
            <NavMenu
                isExpanded={isExpanded}
                activeView={activeView}
                onNavigate={handleNavigate}
                permissions={permissions}
                menuToDisplay={menuToDisplay}
            />

             <div className="p-3 border-t border-white/10">
                <button onClick={onLogout} title={!isExpanded ? "Deconectare" : ""} className="w-full flex items-center p-2.5 rounded-md transition-colors text-left text-red-400 hover:bg-red-600/20 hover:text-red-300">
                    <ArrowRightOnRectangleIcon className={`h-6 w-6 shrink-0 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
                    {isExpanded && <span className="text-sm font-semibold truncate">Deconectare</span>}
                </button>
            </div>
        </div>
    );

    return (
        <>
            <button className="md:hidden fixed top-3 left-3 z-50 p-2 bg-slate-800/50 rounded-md text-white" onClick={() => setIsMobileOpen(true)}>
                <Bars3Icon className="w-6 h-6" />
            </button>
            <div className={`fixed inset-0 z-40 bg-black/60 transition-opacity md:hidden ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileOpen(false)} />
            <aside className={`fixed top-0 left-0 z-50 h-full w-64 transition-transform duration-300 ease-in-out md:hidden border-r-4 ${borderClass} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {sidebarContent}
            </aside>
            <aside className={`hidden md:block fixed top-0 left-0 h-full z-30 transition-all duration-300 border-r-4 ${borderClass} ${isExpanded ? 'w-64' : 'w-20'}`}>
                {sidebarContent}
            </aside>
            <button className={`hidden md:block fixed top-4 z-40 p-1 bg-white/10 rounded-full text-white hover:bg-[var(--accent)] transition-all duration-300 ${isExpanded ? 'left-[15.2rem]' : 'left-[4.2rem]'}`} onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Restrânge meniul" : "Extinde meniul"}>
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : '-rotate-90'}`} />
            </button>
        </>
    );
};
