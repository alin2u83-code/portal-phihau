import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, View, Club, Permissions, Rol, Grad } from '../types';
import { useNavigation } from '../contexts/NavigationContext';
import { adminMenu, adminClubMenu, instructorMenu, sportivMenu, MenuItem } from './menuConfig';
import { ArrowRightOnRectangleIcon, ChevronDownIcon, ShieldCheckIcon, UserCircleIcon } from './icons';
import { RoleSwitcher } from './RoleSwitcher';
import { NavMenu } from './NavMenu';
import { BottomNav } from './layout/BottomNav';
import { ROLES } from '../constants';
import { useQuickAccess } from '../hooks/useQuickAccess';

import { QwanKiDoLogo } from './Logo';
import { ROOT_VIEWS } from './Header';

interface SidebarProps {
    currentUser: User;
    onLogout: () => void;
    isExpanded: boolean;
    setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
    clubs: Club[];
    permissions?: Permissions;
    activeRole: string;
    activeRoleContext?: any;
    canSwitchRoles: boolean;
    onSwitchRole: (context: any) => void;
    isSwitchingRole: boolean;
    grade: Grad[];
    userRoles: any[];
    isMobileOpen: boolean;
    setIsMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
    /** nefolosit: tema se schimbă din Header > ThemeDropdown */
    onOpenThemeEditor?: () => void;
}

const SECTION_BORDER = 'color-mix(in srgb, var(--t-sidebar-text) 15%, transparent)';
const HOVER = 'hover:bg-[color-mix(in_srgb,var(--t-sidebar-text)_10%,transparent)]';
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-input-focus-ring)]';

const UserAvatar: React.FC<{ user: User }> = ({ user }) => {
    const initials = `${(user.prenume || '?')[0]}${(user.nume || '?')[0]}`.toUpperCase();
    return (
        <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
            style={{ background: 'color-mix(in srgb, var(--t-primary) 15%, transparent)', color: 'var(--t-primary)' }}
        >
            {initials}
        </div>
    );
};

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const { currentUser, onLogout, isExpanded, setIsExpanded, permissions, activeRole, activeRoleContext, canSwitchRoles, onSwitchRole, isSwitchingRole, userRoles, isMobileOpen, setIsMobileOpen } = props;
    const { navigateRoot, navigateTrail } = useNavigation();
    const { trackView } = useQuickAccess(currentUser.id || 'anonymous');
    const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);
    const mobileRoleSwitcherRef = useRef<HTMLDivElement>(null);
    const desktopRoleSwitcherRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            const inMobile = mobileRoleSwitcherRef.current?.contains(target);
            const inDesktop = desktopRoleSwitcherRef.current?.contains(target);
            if (!inMobile && !inDesktop) {
                setIsRoleSwitcherOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside as EventListener);
        document.addEventListener('touchstart', handleClickOutside as EventListener, { passive: true });
        return () => {
            document.removeEventListener('mousedown', handleClickOutside as EventListener);
            document.removeEventListener('touchstart', handleClickOutside as EventListener);
        };
    }, []);

    const handleNavigate = (view: View) => {
        // Paginile de start resetează traseul; restul îl păstrează (revenire ușoară de unde ai plecat)
        if (ROOT_VIEWS.includes(view)) navigateRoot(view);
        else {
            navigateTrail(view);
            trackView(view); // alimentează "Recente"
        }
        setIsMobileOpen(false);
    };

    const { menuToDisplay, contextName, headerIcon: HeaderIcon } = useMemo(() => {
        let menu: MenuItem[], name: string, icon: React.ElementType;
        const normalizedRole = (activeRole || 'SPORTIV').replace(/ /g, '_').toUpperCase() as Rol['nume'];
        const clubName = activeRoleContext?.club?.nume || currentUser.cluburi?.nume;

        switch (normalizedRole) {
            case ROLES.SUPER_ADMIN_FEDERATIE:
            case ROLES.ADMIN:
                menu = adminMenu;
                name = 'Federație';
                icon = ShieldCheckIcon;
                break;
            case ROLES.ADMIN_CLUB:
                menu = adminClubMenu;
                name = clubName || 'Club';
                icon = ShieldCheckIcon;
                break;
            case ROLES.INSTRUCTOR:
                menu = instructorMenu;
                name = clubName || 'Club';
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
    }, [activeRole, activeRoleContext, currentUser.cluburi?.nume]);

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

    const logoutButton = (
        <button
            type="button"
            onClick={onLogout}
            aria-label="Deconectare"
            title="Deconectare"
            className={`flex items-center justify-center shrink-0 min-h-11 min-w-11 lg:min-h-9 lg:min-w-9 rounded-lg transition-colors ${HOVER} ${FOCUS}`}
            style={{ color: 'var(--t-sidebar-text)' }}
        >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
        </button>
    );

    const buildSidebarContent = (effectiveExpanded: boolean, switcherRef: React.RefObject<HTMLDivElement>) => (
        <div
            data-tutorial="sidebar"
            className="flex flex-col h-full min-h-0"
            style={{ background: 'var(--t-sidebar-bg)', color: 'var(--t-sidebar-text)' }}
        >
            {/* App Logo & Name */}
            <button
                type="button"
                aria-label="Acasă"
                className={`h-16 shrink-0 px-4 flex items-center gap-3 border-b text-left transition-colors ${HOVER} ${FOCUS} ${!effectiveExpanded ? 'justify-center' : ''}`}
                style={{ borderColor: SECTION_BORDER }}
                onClick={() => handleNavigate('dashboard')}
            >
                <QwanKiDoLogo className="h-8 w-8 shrink-0" />
                {effectiveExpanded && <span className="text-base font-semibold truncate">Qwan Ki Do</span>}
            </button>

            <div ref={switcherRef} className="relative border-b" style={{ borderColor: SECTION_BORDER }}>
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
                    roleLabel={roleLabel}
                />
            </div>

            <NavMenu
                isExpanded={effectiveExpanded}
                permissions={permissions}
                menuToDisplay={menuToDisplay}
                onNavigate={handleNavigate}
                onExpandSidebar={() => setIsExpanded(true)}
            />

            {/* Utilizator + deconectare */}
            <div className="shrink-0 border-t p-2" style={{ borderColor: SECTION_BORDER }}>
                {effectiveExpanded ? (
                    <div className="flex items-center gap-3 px-3">
                        <UserAvatar user={currentUser} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{currentUser.nume} {currentUser.prenume}</p>
                            <p className="text-xs font-semibold truncate opacity-70">{roleLabel}</p>
                        </div>
                        {logoutButton}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        <div title={`${currentUser.nume} ${currentUser.prenume}`}><UserAvatar user={currentUser} /></div>
                        {logoutButton}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            <div className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 motion-reduce:transition-none lg:hidden ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileOpen(false)} />

            <aside className={`fixed top-0 left-0 z-50 h-full w-72 transition-transform duration-200 ease-out motion-reduce:transition-none lg:hidden overflow-hidden ${isMobileOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full'}`}>
                {buildSidebarContent(true, mobileRoleSwitcherRef)}
            </aside>

            <aside
                className={`hidden lg:block fixed top-0 left-0 h-full z-30 transition-all duration-200 motion-reduce:transition-none border-r ${isExpanded ? 'w-64' : 'w-20'}`}
                style={{ borderColor: 'var(--t-header-border)' }}
            >
                <div className="h-full overflow-hidden">
                    {buildSidebarContent(isExpanded, desktopRoleSwitcherRef)}
                </div>
                <button
                    type="button"
                    className={`absolute -right-3 top-5 z-10 flex items-center justify-center w-6 h-6 rounded-full border border-[var(--t-border)] transition-colors ${FOCUS}`}
                    style={{ background: 'var(--t-sidebar-bg)', color: 'var(--t-sidebar-text)' }}
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-label={isExpanded ? 'Restrânge meniul' : 'Extinde meniul'}
                    title={isExpanded ? 'Restrânge meniul' : 'Extinde meniul'}
                >
                    <ChevronDownIcon className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : '-rotate-90'}`} />
                </button>
            </aside>

            <BottomNav activeRole={activeRole} menu={menuToDisplay} onNavigate={handleNavigate} onOpenMenu={() => setIsMobileOpen(true)} />
        </>
    );
};
