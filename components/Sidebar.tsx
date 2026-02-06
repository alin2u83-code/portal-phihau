import React, { useState, useEffect, useMemo } from 'react';
import { User, View, Club, Permissions, Rol } from '../types';
import { sportivMenu, adminMenu, MenuItem, SubMenuItem } from './menuConfig';
import { ArrowRightOnRectangleIcon, Bars3Icon, ChevronDownIcon, ShieldCheckIcon, UserCircleIcon } from './icons';
import { Select, Button } from './ui';
import { FEDERATIE_ID, FEDERATIE_NAME, ROLES } from '../constants';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
// FIX: Import useLocalStorage hook
import { useLocalStorage } from '../hooks/useLocalStorage';

// Sub-component for navigation items
const NavItem: React.FC<{
    item: MenuItem;
    isExpanded: boolean;
}> = ({ item, isExpanded }) => {
    const location = useLocation();
    const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);

    const hasSubmenu = item.submenu && item.submenu.length > 0;

    const isActive = useMemo(() => {
        if (hasSubmenu) {
            return item.submenu?.some(sub => location.pathname === `/${sub.view}`);
        }
        return location.pathname === `/${item.view}`;
    }, [location.pathname, item]);

    useEffect(() => {
        if (isActive) {
            setIsSubmenuOpen(true);
        }
    }, [isActive]);

    const handleClick = (e: React.MouseEvent) => {
        if (hasSubmenu) {
            e.preventDefault();
            setIsSubmenuOpen(prev => !prev);
        }
    };
    
    const NavLinkContent = (
         <div className={`flex items-center p-2.5 text-white rounded-md cursor-pointer transition-colors w-full ${isActive ? "bg-[var(--accent)] text-white shadow-lg" : "hover:bg-white/10"}`} title={!isExpanded ? item.label : ''}>
            <item.icon className={`h-6 w-6 shrink-0 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
            {isExpanded && <span className="flex-1 font-semibold text-sm">{item.label}</span>}
            {isExpanded && hasSubmenu && <ChevronDownIcon className={`w-5 h-5 transition-transform ${isSubmenuOpen ? 'rotate-180' : ''}`} />}
        </div>
    );

    return (
        <div>
            {item.view ? (
                <NavLink to={item.view} onClick={handleClick}>
                   {NavLinkContent}
                </NavLink>
            ) : (
                <div onClick={handleClick}>
                    {NavLinkContent}
                </div>
            )}
            
            {isExpanded && hasSubmenu && isSubmenuOpen && (
                <div className="pl-6 mt-1 space-y-1">
                    {item.submenu?.map(subItem => (
                        <NavLink 
                            key={subItem.view} 
                            to={subItem.view} 
                            className={({ isActive }) => 
                                `block p-2 text-sm rounded-md cursor-pointer ${isActive ? 'bg-[var(--accent)]/50 font-bold text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`
                            }
                        >
                            {subItem.label}
                        </NavLink>
                    ))}
                </div>
            )}
        </div>
    );
};


// Main Sidebar Component
interface SidebarProps {
    currentUser: User;
    clubs: Club[];
    globalClubFilter: string | null;
    setGlobalClubFilter: React.Dispatch<React.SetStateAction<string | null>>;
    permissions: Permissions;
    activeRole: string;
    canSwitchRoles: boolean;
    onSwitchRole: (roleContext: any) => void;
    isSwitchingRole: boolean;
    grade: any[];
    userRoles: any[];
    activeRoleContext: any;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, clubs, globalClubFilter, setGlobalClubFilter, permissions, activeRole, canSwitchRoles, onSwitchRole, isSwitchingRole, grade, userRoles, activeRoleContext }) => {
    const { logout } = useAuthStore();
    const [isExpanded, setIsExpanded] = useLocalStorage('phi-hau-sidebar-expanded', true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    
    const { menuToDisplay, contextName, borderClass } = useMemo(() => {
        let menu: MenuItem[];
        let name: string;
        let border: string;

        // FIX: Removed .toUpperCase() to match the updated case-sensitive ROLES constants.
        const normalizedRole = activeRole || 'Sportiv';

        const filterMenuItems = (items: (MenuItem | SubMenuItem)[]): any[] => {
            return items.map(item => {
                if (item.permission && !item.permission(permissions)) return null;
                if ('submenu' in item && item.submenu) {
                    const filteredSubmenu = filterMenuItems(item.submenu);
                    if (filteredSubmenu.length > 0) return { ...item, submenu: filteredSubmenu };
                    return null;
                }
                return item;
            }).filter(Boolean);
        };

        if (permissions.hasAdminAccess) {
            menu = filterMenuItems(adminMenu);
            switch (normalizedRole) {
                case ROLES.SUPER_ADMIN_FEDERATIE: case ROLES.ADMIN: name = 'Federație'; border = 'border-amber-400'; break;
                case ROLES.ADMIN_CLUB: name = currentUser.cluburi?.nume || 'Club Nesetat'; border = 'border-blue-500'; break;
                case ROLES.INSTRUCTOR: name = currentUser.cluburi?.nume || 'Club Nesetat'; border = 'border-sky-500'; break;
                default: name = 'Admin'; border = 'border-slate-500'; break;
            }
        } else {
            menu = sportivMenu;
            name = 'Portal Sportiv';
            border = 'border-green-500';
        }
        
        return { menuToDisplay: menu, contextName: name, borderClass: border };
    }, [activeRole, currentUser.cluburi?.nume, permissions]);


    const adminRoleToSwitchTo = useMemo(() => {
        if (!currentUser || !permissions.hasAdminAccess || !userRoles) return null;
        const roleOrder: string[] = ['SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR'];
        for (const roleName of roleOrder) {
            const context = userRoles.find(r => (r.rol_key || '').toUpperCase() === roleName);
            if (context) return context;
        }
        return userRoles.find(r => r.rol_key === 'ADMIN_CLUB') || null;
    }, [currentUser, permissions, userRoles]);

    const sidebarContent = (
        <div className="flex flex-col h-full bg-[var(--bg-card)] text-white shadow-xl">
            <div className={`h-20 flex flex-col items-center justify-center p-2 border-b border-white/10 text-center ${isExpanded ? 'px-4' : 'px-1'}`}>
                 <ShieldCheckIcon className={`w-8 h-8 shrink-0 ${activeRole === 'SUPER_ADMIN_FEDERATIE' || activeRole === 'Admin' ? 'text-amber-400' : 'text-blue-400'}`} />
                {isExpanded && (<><h2 className="text-xs font-bold text-slate-400 mt-1 uppercase">Mod Lucru</h2><p className="text-sm font-bold text-white truncate w-full">{contextName}</p></>)}
            </div>
            
            {permissions.isFederationAdmin && isExpanded && (
                <div className="px-3 py-2 border-b border-white/10">
                    <Select label="Filtrează Club" value={globalClubFilter || ''} onChange={(e) => setGlobalClubFilter(e.target.value || '')} className="!py-1 text-xs w-full">
                        <option value="">Toate Cluburile</option>
                        {clubs.map(c => <option key={c.id} value={c.id}>{c.id === FEDERATIE_ID ? FEDERATIE_NAME : c.nume}</option>)}
                    </Select>
                </div>
            )}

            <nav className="flex-1 px-2 py-4 space-y-1.5 overflow-y-auto">
                {menuToDisplay.map(item => <NavItem key={item.label} item={item} isExpanded={isExpanded} />)}
                {currentUser?.email === 'alin2u83@gmail.com' && <NavItem item={{ label: 'Admin Console', view: 'admin-console', icon: ShieldCheckIcon }} isExpanded={isExpanded} />}
            </nav>

             <div className="p-3 border-t border-white/10">
                <button onClick={logout} title={!isExpanded ? "Deconectare" : ""} className={`w-full flex items-center p-2.5 rounded-md transition-colors text-left text-red-400 hover:bg-red-600/20 hover:text-red-300`}>
                    <ArrowRightOnRectangleIcon className={`h-6 w-6 shrink-0 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
                    {isExpanded && <span className="text-sm font-semibold truncate">Deconectare</span>}
                </button>
            </div>
        </div>
    );

    return (
        <>
            <button className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-slate-800/50 rounded-md text-white" onClick={() => setIsMobileOpen(true)}><Bars3Icon className="w-6 h-6" /></button>
            <div className={`fixed inset-0 z-40 bg-black/60 transition-opacity lg:hidden ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileOpen(false)} />
            <aside className={`fixed top-0 left-0 z-50 h-full w-64 transition-transform duration-300 ease-in-out lg:hidden border-r-4 ${borderClass} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>{sidebarContent}</aside>
            <aside className={`hidden lg:block fixed top-0 left-0 h-full z-30 transition-all duration-300 border-r-4 ${borderClass} ${isExpanded ? 'w-64' : 'w-20'}`}>{sidebarContent}</aside>
            <button className={`hidden lg:block fixed top-4 z-40 p-1 bg-white/10 rounded-full text-white hover:bg-[var(--accent)] transition-all duration-300 ${isExpanded ? 'left-[15.2rem]' : 'left-[4.2rem]'}`} onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Restrânge meniul" : "Extinde meniul"}><ChevronDownIcon className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : '-rotate-90'}`} /></button>
        </>
    );
};