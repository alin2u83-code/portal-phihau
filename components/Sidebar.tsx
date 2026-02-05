import React, { useState, useEffect, useMemo } from 'react';
import { User, View, Club, Permissions, Rol } from '../types';
import { instructorMenu, sportivMenu, clubAdminMenu, federationAdminMenu, MenuItem } from './menuConfig';
import { ArrowRightOnRectangleIcon, Bars3Icon, ChevronDownIcon, ShieldCheckIcon, UserCircleIcon } from './icons';
import { Select } from './ui';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';

// Sub-component for navigation items
const NavItem: React.FC<{
    item: MenuItem;
    isExpanded: boolean;
    isActive: boolean;
    onNavigate: (view: View) => void;
    activeView: View;
}> = ({ item, isExpanded, isActive, onNavigate, activeView }) => {
    if (!item) return null; // Safety check

    const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);

    useEffect(() => {
        if (isActive) setIsSubmenuOpen(true);
    }, [isActive]);

    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const handleClick = () => {
        if (hasSubmenu) setIsSubmenuOpen(!isSubmenuOpen);
        else if (item.view) onNavigate(item.view);
    };

    return (
        <div>
            <div onClick={handleClick} className={`flex items-center p-2.5 text-white rounded-md cursor-pointer transition-colors w-full ${isActive ? "bg-[var(--accent)] text-white shadow-lg" : "hover:bg-white/10"}`} title={!isExpanded ? item.label : ''}>
                <item.icon className={`h-6 w-6 shrink-0 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
                {isExpanded && <span className="flex-1 font-semibold text-sm">{item.label}</span>}
                {isExpanded && hasSubmenu && <ChevronDownIcon className={`w-5 h-5 transition-transform ${isSubmenuOpen ? 'rotate-180' : ''}`} />}
            </div>
            {isExpanded && hasSubmenu && isSubmenuOpen && (
                <div className="pl-6 mt-1 space-y-1">
                    {item.submenu?.map(subItem => (
                        <div key={subItem.view} onClick={() => onNavigate(subItem.view)} className={`block p-2 text-sm rounded-md cursor-pointer ${subItem.view === activeView ? 'bg-[var(--accent)]/50 font-bold text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}>
                            {subItem.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


// Main Sidebar Component
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
    grade: any[]; // Assuming grade structure is not needed here
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, onNavigate, onLogout, activeView, isExpanded, setIsExpanded, clubs, globalClubFilter, setGlobalClubFilter, permissions, activeRole, canSwitchRoles, onSwitchRole, isSwitchingRole }) => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleNavigate = (view: View) => {
        onNavigate(view);
        setIsMobileOpen(false);
    };
    
    const { menuToDisplay, contextName, borderClass } = useMemo(() => {
        let menu: MenuItem[];
        let name: string;
        let border: string;

        // Safety mechanism: If role is not set but user has admin access, show a default admin menu.
        if (!activeRole && permissions.hasAdminAccess) {
            menu = clubAdminMenu;
            name = 'Context Invalid';
            border = 'border-red-500'; // Highlight the error state
            return { menuToDisplay: menu, contextName: name, borderClass: border };
        }

        // Normalize to uppercase for robust matching
        const upperCaseRole = activeRole?.toUpperCase() || 'SPORTIV';

        switch (upperCaseRole) {
            case 'SUPER_ADMIN_FEDERATIE':
            case 'ADMIN':
                menu = federationAdminMenu;
                name = 'Federație';
                border = 'border-amber-400';
                break;
            case 'ADMIN CLUB': // 'Admin Club'.toUpperCase() -> 'ADMIN CLUB'
                menu = clubAdminMenu;
                name = currentUser.cluburi?.nume || 'Club Nesetat';
                border = 'border-blue-500';
                break;
            case 'INSTRUCTOR':
                menu = instructorMenu;
                name = currentUser.cluburi?.nume || 'Club Nesetat';
                border = 'border-sky-500';
                break;
            case 'SPORTIV':
            default:
                menu = sportivMenu;
                name = 'Portal Sportiv';
                border = 'border-green-500';
                break;
        }
        return { menuToDisplay: menu, contextName: name, borderClass: border };
    }, [activeRole, currentUser.cluburi?.nume, permissions.hasAdminAccess]);

    const adminRoleToSwitchTo = useMemo(() => {
        if (!currentUser || !permissions.hasAdminAccess) return null;
        const allUserRoles = currentUser.roluri || [];
        const roleOrder: Rol['nume'][] = ['SUPER_ADMIN_FEDERATIE', 'Admin', 'Admin Club', 'Instructor'];
        for (const roleName of roleOrder) {
            if (allUserRoles.some(r => r.nume === roleName)) {
                return roleName;
            }
        }
        return 'Admin Club';
    }, [currentUser, permissions]);

    // Main content of the sidebar
    const sidebarContent = (
        <div className="flex flex-col h-full bg-[var(--bg-card)] text-white shadow-xl">
            <div className={`h-20 flex flex-col items-center justify-center p-2 border-b border-white/10 text-center ${isExpanded ? 'px-4' : 'px-1'}`}>
                <ShieldCheckIcon className={`w-8 h-8 shrink-0 ${activeRole === 'SUPER_ADMIN_FEDERATIE' || activeRole === 'Admin' ? 'text-amber-400' : 'text-blue-400'}`} />
                {isExpanded && (
                    <>
                        <h2 className="text-xs font-bold text-slate-400 mt-1 uppercase">Mod Lucru</h2>
                        <p className="text-sm font-bold text-white truncate w-full">{contextName}</p>
                    </>
                )}
            </div>
            
            {permissions.isFederationAdmin && isExpanded && (
                <div className="px-3 py-2 border-b border-white/10">
                    <Select
                        label="Filtrează Club"
                        value={globalClubFilter || ''}
                        onChange={(e) => setGlobalClubFilter(e.target.value || '')}
                        className="!py-1 text-xs w-full"
                    >
                        <option value="">Toate Cluburile</option>
                        {clubs.map(c => <option key={c.id} value={c.id}>{c.id === FEDERATIE_ID ? FEDERATIE_NAME : c.nume}</option>)}
                    </Select>
                </div>
            )}

            <nav className="flex-1 px-2 py-4 space-y-1.5 overflow-y-auto">
                {permissions.hasAdminAccess && activeRole === 'Sportiv' && adminRoleToSwitchTo && (
                    <div onClick={() => onSwitchRole(adminRoleToSwitchTo)} className="flex items-center p-2.5 text-white rounded-md cursor-pointer bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/50 mb-4 transition-colors" title={!isExpanded ? "Comută la Panoul Administrativ" : ''}>
                        <ShieldCheckIcon className={`h-6 w-6 shrink-0 text-amber-300 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
                        {isExpanded && <span className="flex-1 font-semibold text-sm">Panou Administrativ</span>}
                    </div>
                )}
                
                {menuToDisplay.map(item => {
                     const isActive = item.view === activeView || (item.submenu?.some(s => s.view === activeView) ?? false);
                     return <NavItem key={item.label} item={item} isExpanded={isExpanded} isActive={isActive} onNavigate={handleNavigate} activeView={activeView} />
                })}

                {currentUser?.email === 'alin2u83@gmail.com' && (
                    <div onClick={() => handleNavigate('admin-console')} className={`flex items-center p-2.5 text-white rounded-md cursor-pointer bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/50 mt-4 transition-colors`} title={!isExpanded ? "Admin Console" : ''}>
                        <ShieldCheckIcon className={`h-6 w-6 shrink-0 text-amber-300 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
                        {isExpanded && <span className="flex-1 font-semibold text-sm">Admin Console</span>}
                    </div>
                )}

                {permissions.isSportiv && permissions.hasAdminAccess && activeRole !== 'Sportiv' && (
                    <div onClick={() => onSwitchRole('Sportiv')} className="flex items-center p-2.5 text-white rounded-md cursor-pointer bg-green-600/20 hover:bg-green-600/40 border border-green-500/50 mt-4 transition-colors" title={!isExpanded ? "Comută la Portalul de Sportiv" : ''}>
                        <UserCircleIcon className={`h-6 w-6 shrink-0 text-green-300 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
                        {isExpanded && <span className="flex-1 font-semibold text-sm">Portal Sportiv</span>}
                    </div>
                )}
            </nav>

            {canSwitchRoles && permissions.hasAdminAccess && (
                <div className="px-3 py-2 border-t border-white/10">
                    <button
                        onClick={() => handleNavigate('admin-console')}
                        title={!isExpanded ? "Schimbă Context de Lucru" : ""}
                        className={`w-full flex items-center p-2.5 rounded-md transition-colors text-left bg-slate-700 hover:bg-slate-600 text-white`}
                    >
                        <ShieldCheckIcon className={`h-6 w-6 shrink-0 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
                        {isExpanded && <span className="text-sm font-semibold truncate">Schimbă Context</span>}
                    </button>
                </div>
            )}

             <div className="p-3 border-t border-white/10">
                <button
                    onClick={onLogout}
                    title={!isExpanded ? "Deconectare" : ""}
                    className={`w-full flex items-center p-2.5 rounded-md transition-colors text-left text-red-400 hover:bg-red-600/20 hover:text-red-300`}
                >
                    <ArrowRightOnRectangleIcon className={`h-6 w-6 shrink-0 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
                    {isExpanded && <span className="text-sm font-semibold truncate">Deconectare</span>}
                </button>
            </div>
        </div>
    );

    return (
        <>
            <button className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-slate-800/50 rounded-md text-white" onClick={() => setIsMobileOpen(true)}>
                <Bars3Icon className="w-6 h-6" />
            </button>
            
            <div
                className={`fixed inset-0 z-40 bg-black/60 transition-opacity lg:hidden ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileOpen(false)}
            />
            
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 transition-transform duration-300 ease-in-out lg:hidden border-r-4 ${borderClass} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {sidebarContent}
            </aside>
            
            <aside className={`hidden lg:block fixed top-0 left-0 h-full z-30 transition-all duration-300 border-r-4 ${borderClass} ${isExpanded ? 'w-64' : 'w-20'}`}>
                {sidebarContent}
            </aside>

            <button
                className={`hidden lg:block fixed top-4 z-40 p-1 bg-white/10 rounded-full text-white hover:bg-[var(--accent)] transition-all duration-300 ${isExpanded ? 'left-[15.2rem]' : 'left-[4.2rem]'}`}
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Restrânge meniul" : "Extinde meniul"}
             >
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : '-rotate-90'}`} />
            </button>
        </>
    );
};
