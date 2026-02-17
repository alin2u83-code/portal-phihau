import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, View, Club, Permissions, Rol, Grad } from '../types';
import { adminMenu, instructorMenu, sportivMenu, MenuItem } from './menuConfig';
import { ArrowRightOnRectangleIcon, Bars3Icon, ChevronDownIcon, ShieldCheckIcon, UserCircleIcon } from './icons';
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
    onSwitchRole: (roleName: Rol['nume']) => void;
    isSwitchingRole: boolean;
    grade: Grad[];
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const { currentUser, onNavigate, onLogout, activeView, isExpanded, setIsExpanded, clubs, globalClubFilter, setGlobalClubFilter, permissions, activeRole } = props;
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleNavigate = (view: View) => {
        onNavigate(view);
        setIsMobileOpen(false);
    };
    
    const { menuToDisplay, contextName, borderClass, headerIcon: HeaderIcon } = useMemo(() => {
        let menu, name, border, icon;
        const normalizedRole = (activeRole || 'Sportiv').replace(/ /g, '_').toUpperCase();

        switch (normalizedRole) {
            case ROLES.SUPER_ADMIN_FEDERATIE:
            case ROLES.ADMIN:
                menu = adminMenu; name = 'Federație'; border = 'border-amber-400'; icon = ShieldCheckIcon;
                break;
            case ROLES.ADMIN_CLUB:
                menu = adminMenu; name = currentUser.cluburi?.nume || 'Club'; border = 'border-blue-500'; icon = ShieldCheckIcon;
                break;
            case ROLES.INSTRUCTOR:
                menu = instructorMenu; name = currentUser.cluburi?.nume || 'Club'; border = 'border-sky-500'; icon = ShieldCheckIcon;
                break;
            case ROLES.SPORTIV:
            default:
                menu = sportivMenu; name = 'Portal Sportiv'; border = 'border-green-500'; icon = UserCircleIcon;
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

    const sidebarContent = (
        <div className="flex flex-col h-full bg-[var(--bg-card)] text-white shadow-xl">
            <div className={`h-20 flex flex-col items-center justify-center p-2 border-b border-white/10 text-center ${isExpanded ? 'px-4' : 'px-1'}`}>
                <HeaderIcon className={`w-8 h-8 shrink-0 ${iconColorClass}`} />
                {isExpanded && (<>
                    <h2 className="text-xs font-bold text-slate-400 mt-1 uppercase">Mod Lucru</h2>
                    <p className="text-sm font-bold text-white truncate w-full">{contextName}</p>
                </>)}
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
