import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, View, Club, Permissions, Rol, Grad } from '../types';
import { adminMenu, instructorMenu, sportivMenu, MenuItem } from './menuConfig';
import { ArrowRightOnRectangleIcon, Bars3Icon, ChevronDownIcon, ShieldCheckIcon, UserCircleIcon, UsersIcon } from './icons';
import { Select } from './ui';
import { FEDERATIE_ID, FEDERATIE_NAME, ROLES } from '../constants';

const NavItem: React.FC<{
    item: MenuItem;
    isExpanded: boolean;
    isActive: boolean;
    onNavigate: (view: View) => void;
}> = ({ item, isExpanded, isActive, onNavigate }) => {
    if (!item.view) return null;
    return (
        <div onClick={() => onNavigate(item.view!)} className={`flex items-center p-2.5 text-white rounded-md cursor-pointer transition-colors w-full ${isActive ? "bg-[var(--accent)] text-white shadow-lg" : "hover:bg-white/10"}`} title={!isExpanded ? item.label : ''}>
            <item.icon className={`h-6 w-6 shrink-0 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
            {isExpanded && <span className="flex-1 font-semibold text-sm">{item.label}</span>}
        </div>
    );
};

// Helper Functions for Role Switcher
const getRoleDisplayName = (role: any): string => {
    switch(role.roluri?.nume) {
        case 'SUPER_ADMIN_FEDERATIE': return 'Super Admin Federație';
        case 'ADMIN': return 'Admin General';
        case 'ADMIN_CLUB': return `Admin - ${role.club?.nume || 'Club Nedefinit'}`;
        case 'INSTRUCTOR': return `Instructor - ${role.club?.nume || 'Club Nedefinit'}`;
        case 'SPORTIV': return `Sportiv - ${role.sportiv?.nume || ''} ${role.sportiv?.prenume || ''}`;
        default: return role.roluri?.nume;
    }
};

const getRoleIcon = (roleName: Rol['nume']): React.ElementType => {
    switch(roleName) {
        case 'SUPER_ADMIN_FEDERATIE':
        case 'ADMIN':
        case 'ADMIN_CLUB':
            return ShieldCheckIcon;
        case 'INSTRUCTOR':
            return UsersIcon;
        case 'SPORTIV':
            return UserCircleIcon;
        default:
            return UsersIcon;
    }
};


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
                border = 'border-amber-400';
                icon = ShieldCheckIcon;
                break;
            case ROLES.INSTRUCTOR:
                menu = instructorMenu;
                name = currentUser.cluburi?.nume || 'Club';
                border = 'border-sky-500';
                icon = ShieldCheckIcon;
                break;
            case ROLES.SPORTIV:
            default:
                menu = sportivMenu;
                name = 'Portal Sportiv';
                border = 'border-green-500';
                icon = UserCircleIcon;
                break;
        }
        return { menuToDisplay: menu, contextName: name, borderClass: border, headerIcon: icon };
    }, [activeRole, currentUser.cluburi?.nume]);


    const iconColorClass = useMemo(() => {
        if (borderClass.includes('amber')) return 'text-amber-400';
        if (borderClass.includes('blue')) return 'text-blue-400';
        if (borderClass.includes('sky')) return 'text-sky-400';
        if (borderClass.includes('green')) return 'text-green-400';
        return 'text-slate-400';
    }, [borderClass]);
    
    const activeRoleContext = useMemo(() => userRoles.find(r => r.is_primary), [userRoles]);

    const sidebarContent = (
        <div className="flex flex-col h-full bg-[var(--bg-card)] text-white shadow-xl">
            <div ref={roleSwitcherRef} className="relative p-2">
                 <button
                    className={`w-full p-3 bg-black/30 rounded-lg border-2 border-amber-400/50 hover:border-amber-400 flex items-center text-left transition-all duration-300 shadow-lg ${!canSwitchRoles && 'cursor-default'}`}
                    onClick={() => canSwitchRoles && setIsRoleSwitcherOpen(p => !p)}
                    disabled={!canSwitchRoles || isSwitchingRole}
                >
                    <HeaderIcon className={`w-8 h-8 shrink-0 ${iconColorClass}`} />
                    {isExpanded && (
                        <div className="flex-grow ml-3 overflow-hidden">
                            <p className="text-xs text-amber-300 font-bold uppercase">Context Activ</p>
                            <p className="text-md font-bold text-white truncate w-full">{contextName}</p>
                        </div>
                    )}
                    {isExpanded && canSwitchRoles && <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform shrink-0 ${isRoleSwitcherOpen ? 'rotate-180' : ''}`} />}
                </button>
                {isRoleSwitcherOpen && canSwitchRoles && (
                    <div className="absolute top-full left-2 right-2 z-10 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-lg p-2 animate-fade-in-down">
                        <p className="text-xs font-bold text-slate-500 px-2 pb-1">Alege context</p>
                        <div className="space-y-1">
                        {(userRoles || [])
                            .filter(role => role.id !== activeRoleContext?.id)
                            .map((role) => {
                                const Icon = getRoleIcon(role.roluri?.nume);
                                return (
                                <button
                                    key={role.id}
                                    onClick={() => { onSwitchRole(role); setIsRoleSwitcherOpen(false); }}
                                    className="w-full flex items-center p-2 rounded-md text-sm text-left hover:bg-slate-700 min-h-[60px]"
                                >
                                    <Icon className="w-5 h-5 mr-2 text-slate-400" />
                                    <span className="text-white truncate">{getRoleDisplayName(role)}</span>
                                </button>
                                );
                            })
                        }
                        </div>
                    </div>
                )}
            </div>
            
            <nav className="flex-1 px-2 py-4 space-y-1.5 overflow-y-auto">
                {menuToDisplay.map(item => (
                    <NavItem key={item.label} item={item} isExpanded={isExpanded} isActive={item.view === activeView} onNavigate={handleNavigate} />
                ))}
            </nav>

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
