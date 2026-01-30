import React, { useState, useEffect, useMemo } from 'react';
import { User, View, Plata, Club, Permissions } from '../types';
import { federationAdminMenu, clubAdminMenu, instructorMenu, sportivMenu, MenuItem } from './menuConfig';
import { ArrowRightOnRectangleIcon, Bars3Icon, ChevronDownIcon, ShieldCheckIcon } from './icons';
import { Select } from './ui';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';

// Sub-component for individual navigation items
const NavItem: React.FC<{
    item: MenuItem;
    isExpanded: boolean;
    isActive: boolean;
    onNavigate: (view: View) => void;
    activeView: View;
}> = ({ item, isExpanded, isActive, onNavigate, activeView }) => {
    const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);

    useEffect(() => {
        // Automatically open submenu if one of its items is active
        if (isActive) {
            setIsSubmenuOpen(true);
        }
    }, [isActive]);

    const hasSubmenu = item.submenu && item.submenu.length > 0;

    const handleClick = () => {
        if (hasSubmenu) {
            setIsSubmenuOpen(!isSubmenuOpen);
        } else if (item.view) {
            onNavigate(item.view);
        }
    };

    const baseClasses = "flex items-center p-2.5 text-white rounded-md cursor-pointer transition-colors duration-200 w-full";
    const activeClasses = isActive ? "bg-[var(--accent)] text-white shadow-lg" : "hover:bg-white/10";

    return (
        <div>
            <div
                onClick={handleClick}
                className={`${baseClasses} ${activeClasses}`}
                title={!isExpanded ? item.label : ''}
            >
                <item.icon className={`h-6 w-6 shrink-0 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
                {isExpanded && <span className="flex-1 font-semibold text-sm">{item.label}</span>}
                {isExpanded && hasSubmenu && (
                    <ChevronDownIcon className={`w-5 h-5 transition-transform ${isSubmenuOpen ? 'rotate-180' : ''}`} />
                )}
            </div>
            {isExpanded && hasSubmenu && isSubmenuOpen && (
                <div className="pl-6 mt-1 space-y-1">
                    {item.submenu?.map(subItem => (
                        <div
                            key={subItem.view}
                            onClick={() => onNavigate(subItem.view)}
                            className={`block p-2 text-sm rounded-md cursor-pointer transition-colors ${subItem.view === activeView ? 'bg-[var(--accent)]/50 font-bold text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                        >
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
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, onNavigate, onLogout, activeView, isExpanded, setIsExpanded, clubs, globalClubFilter, setGlobalClubFilter, permissions }) => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    
    // Select the correct menu based on user permissions
    const menu = useMemo(() => {
        if (permissions.isFederationAdmin) return federationAdminMenu;
        if (permissions.isAdminClub) return clubAdminMenu;
        if (permissions.isInstructor) return instructorMenu;
        return sportivMenu;
    }, [permissions]);

    const handleNavigate = (view: View) => {
        onNavigate(view);
        setIsMobileOpen(false);
    };
    
    const contextName = useMemo(() => {
        if (permissions.isFederationAdmin) {
            if (globalClubFilter) {
                const club = clubs.find(c => c.id === globalClubFilter);
                return club ? club.nume : 'Federație';
            }
            return 'Federație';
        }
        return currentUser.cluburi?.nume || 'Club Nesetat';
    }, [permissions, currentUser, globalClubFilter, clubs]);

    // Main content of the sidebar
    const sidebarContent = (
        <div className="flex flex-col h-full bg-[var(--bg-card)] text-white shadow-xl">
            <div className={`h-20 flex flex-col items-center justify-center p-2 border-b border-white/10 text-center ${isExpanded ? 'px-4' : 'px-1'}`}>
                <ShieldCheckIcon className={`w-8 h-8 shrink-0 ${permissions.isFederationAdmin ? 'text-amber-400' : 'text-blue-400'}`} />
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

            <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
                {menu.map(item => {
                     const isActive = item.view === activeView || (item.submenu?.some(s => s.view === activeView) ?? false);
                     return <NavItem key={item.label} item={item} isExpanded={isExpanded} isActive={isActive} onNavigate={handleNavigate} activeView={activeView} />
                })}
                 {permissions.isAdmin && (
                    <div className="pt-2 mt-2 border-t border-amber-500/30">
                        <NavItem
                            item={{ label: 'CONSOLA ADMIN', icon: ShieldCheckIcon, view: 'admin-console' }}
                            isExpanded={isExpanded}
                            isActive={activeView === 'admin-console'}
                            onNavigate={handleNavigate}
                            activeView={activeView}
                        />
                    </div>
                )}
            </nav>

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

    const borderClass = permissions.isFederationAdmin ? 'border-amber-400' : 'border-blue-500';

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