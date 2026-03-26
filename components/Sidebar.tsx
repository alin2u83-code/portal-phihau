import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, View, Club, Permissions, Rol, Grad } from '../types';
import { useNavigation } from '../contexts/NavigationContext';
import { adminMenu, adminClubMenu, instructorMenu, sportivMenu, MenuItem } from './menuConfig';
import { ArrowRightOnRectangleIcon, Bars3Icon, ChevronDownIcon, ShieldCheckIcon, UserCircleIcon } from './icons';
import { RoleSwitcher } from './RoleSwitcher';
import { NavMenu } from './NavMenu';
import { ROLES } from '../constants';

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
    isMobileOpen: boolean;
    setIsMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const UserAvatar: React.FC<{ user: User; size?: 'sm' | 'md' }> = ({ user, size = 'md' }) => {
    const initials = `${(user.prenume || '?')[0]}${(user.nume || '?')[0]}`.toUpperCase();
    const colors = [
        'from-indigo-500 to-purple-600',
        'from-sky-500 to-blue-600',
        'from-emerald-500 to-teal-600',
        'from-amber-500 to-orange-600',
        'from-rose-500 to-pink-600',
    ];
    const colorIdx = (user.email || user.id || '').charCodeAt(0) % colors.length;
    const sizeClass = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';

    return (
        <div className={`${sizeClass} rounded-full bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center font-bold text-white shrink-0 ring-2 ring-slate-800`}>
            {initials}
        </div>
    );
};

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const { currentUser, onLogout, isExpanded, setIsExpanded, clubs, permissions, activeRole, canSwitchRoles, onSwitchRole, isSwitchingRole, userRoles, isMobileOpen, setIsMobileOpen } = props;
    const { activeView, setActiveView } = useNavigation();
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

    const { menuToDisplay, contextName, headerIcon: HeaderIcon } = useMemo(() => {
        let menu: MenuItem[], name: string, icon: React.ElementType;
        const normalizedRole = (activeRole || 'SPORTIV').replace(/ /g, '_').toUpperCase() as Rol['nume'];

        switch (normalizedRole) {
            case ROLES.SUPER_ADMIN_FEDERATIE:
            case ROLES.ADMIN:
                menu = adminMenu;
                name = 'Federație';
                icon = ShieldCheckIcon;
                break;
            case ROLES.ADMIN_CLUB:
                menu = adminClubMenu;
                name = currentUser.cluburi?.nume || 'Club';
                icon = ShieldCheckIcon;
                break;
            case ROLES.INSTRUCTOR:
                menu = instructorMenu;
                name = currentUser.cluburi?.nume || 'Club';
                icon = ShieldCheckIcon;
                break;
            case ROLES.SPORTIV:
            default:
                menu = sportivMenu;
                name = 'Portal Sportiv';
                icon = UserCircleIcon;
                break;
        }
        return { menuToDisplay: menu, contextName: name, headerIcon: icon };
    }, [activeRole, currentUser.cluburi?.nume]);

    const iconColorClass = useMemo(() => 'text-sky-400', []);
    const activeRoleContext = useMemo(() => userRoles.find(r => r.is_primary), [userRoles]);

    const roleLabel = useMemo(() => {
        const norm = (activeRole || 'SPORTIV').replace(/ /g, '_').toUpperCase();
        const map: Record<string, string> = {
            SUPER_ADMIN_FEDERATIE: 'Super Admin',
            ADMIN: 'Admin',
            ADMIN_CLUB: 'Admin Club',
            INSTRUCTOR: 'Instructor',
            SPORTIV: 'Sportiv',
        };
        return map[norm] || activeRole;
    }, [activeRole]);

    const roleColor = useMemo(() => {
        const norm = (activeRole || 'SPORTIV').replace(/ /g, '_').toUpperCase();
        const map: Record<string, string> = {
            SUPER_ADMIN_FEDERATIE: 'text-purple-400 bg-purple-500/10',
            ADMIN: 'text-purple-400 bg-purple-500/10',
            ADMIN_CLUB: 'text-sky-400 bg-sky-500/10',
            INSTRUCTOR: 'text-emerald-400 bg-emerald-500/10',
            SPORTIV: 'text-indigo-400 bg-indigo-500/10',
        };
        return map[norm] || 'text-slate-400 bg-slate-700/50';
    }, [activeRole]);

    const buildSidebarContent = (effectiveExpanded: boolean) => (
        <div data-tutorial="sidebar" className="flex flex-col h-full text-slate-200 shadow-2xl">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 pointer-events-none" />
            <div className="absolute inset-0 border-r border-slate-800/80 pointer-events-none" />

            {/* App Logo & Name */}
            <div
                className={`relative p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors ${!effectiveExpanded ? 'justify-center' : ''}`}
                onClick={() => handleNavigate('dashboard')}
            >
                <div className="relative shrink-0">
                    <QwanKiDoLogo className="h-10 w-10" iconClassName="w-6 h-6" />
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
                </div>
                {effectiveExpanded && (
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-bold text-white text-sm tracking-tight truncate">Qwan Ki Do</span>
                        <span className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-widest truncate">Management</span>
                    </div>
                )}
            </div>

            <div className="relative h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent mx-2" />

            <div ref={roleSwitcherRef} className="relative">
                <RoleSwitcher
                    isExpanded={effectiveExpanded}
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
                isExpanded={effectiveExpanded}
                permissions={permissions}
                menuToDisplay={menuToDisplay}
                onNavigate={handleNavigate}
            />

            {/* User profile + logout at bottom */}
            <div className="relative mt-auto">
                <div className="h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent mx-2 mb-2" />
                <div className={`mx-2 mb-2 p-2 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center gap-2.5 ${effectiveExpanded ? '' : 'justify-center'}`}>
                    <UserAvatar user={currentUser} size="md" />
                    {effectiveExpanded && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{currentUser.prenume} {currentUser.nume}</p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${roleColor}`}>{roleLabel}</span>
                        </div>
                    )}
                    {effectiveExpanded && (
                        <button
                            onClick={onLogout}
                            title="Deconectare"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                            <ArrowRightOnRectangleIcon className="h-4 w-4" />
                        </button>
                    )}
                </div>
                {!effectiveExpanded && (
                    <div className="px-2 mb-2">
                        <button
                            onClick={onLogout}
                            title="Deconectare"
                            className="w-full flex items-center justify-center p-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-slate-700/40"
                        >
                            <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    const isMobileNavEligible = menuToDisplay.length <= 6;

    return (
        <>
            <div className={`fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm transition-opacity md:hidden ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileOpen(false)} />

            <aside className={`fixed top-0 left-0 z-50 h-full w-72 transition-transform duration-300 ease-in-out md:hidden shadow-2xl relative overflow-hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {buildSidebarContent(true)}
            </aside>

            <aside className={`hidden md:block fixed top-0 left-0 h-full z-30 transition-all duration-300 relative overflow-hidden ${isExpanded ? 'w-64' : 'w-20'}`}>
                {buildSidebarContent(isExpanded)}
            </aside>

            {/* Desktop Toggle Button */}
            <button
                className={`hidden md:flex items-center justify-center fixed top-6 z-40 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full text-slate-400 hover:text-white hover:bg-amber-500/20 hover:border-amber-500/50 transition-all duration-300 shadow-md ${isExpanded ? 'left-[15.2rem]' : 'left-[4.2rem]'}`}
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Restrânge meniul" : "Extinde meniul"}
            >
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
                                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <item.icon className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : ''}`} />
                                    <span className="text-[10px] font-medium truncate w-full text-center px-1">{item.label}</span>
                                </button>
                            );
                        })}

                        <button
                            onClick={() => setIsMobileOpen(true)}
                            className="flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors text-slate-500 hover:text-slate-300"
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
