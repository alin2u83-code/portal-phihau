import React, { useState, useEffect } from 'react';
import { View, Permissions } from '../types';
import { useNavigation } from '../contexts/NavigationContext';
import { MenuItem, SubMenuItem } from './menuConfig';
import { ChevronDownIcon } from './icons';
import { useNotifications } from '../contexts/NotificationContext';

interface NavMenuProps {
  isExpanded: boolean;
  permissions?: Permissions;
  menuToDisplay: MenuItem[];
  onNavigate: (view: View) => void;
  /** apelat când se apasă un grup în modul restrâns, ca sidebar-ul să se extindă */
  onExpandSidebar?: () => void;
}

const ITEM_BASE = 'flex items-center w-full gap-3 px-3 min-h-11 lg:min-h-10 rounded-lg text-sm text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-input-focus-ring)]';
const SUB_BASE = 'flex items-center w-full px-3 min-h-11 lg:min-h-9 rounded-lg text-sm text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-input-focus-ring)]';
const HOVER = 'hover:bg-[color-mix(in_srgb,var(--t-sidebar-text)_10%,transparent)]';
const ACTIVE_STYLE: React.CSSProperties = { background: 'var(--t-sidebar-active)', color: 'var(--t-sidebar-active-fg)' };
const IDLE_STYLE: React.CSSProperties = { color: 'var(--t-sidebar-text)' };

const isViewActive = (entry: { view?: View; aliases?: View[] }, activeView: View | string) =>
    entry.view === activeView || !!entry.aliases?.includes(activeView as View);

const NotifPill: React.FC<{ count: number }> = ({ count }) => (
    <span className="bg-[var(--t-status-danger)] text-white text-xs font-semibold px-2 rounded-full min-w-[20px] text-center">
        {count > 9 ? '9+' : count}
    </span>
);

const NotifDot: React.FC<{ className?: string }> = ({ className = '' }) => (
    <span className={`w-2 h-2 rounded-full bg-[var(--t-status-danger)] ${className}`} aria-hidden="true" />
);

const NavItem: React.FC<{
    item: MenuItem;
    isExpanded: boolean;
    permissions?: Permissions;
    onNavigate: (view: View) => void;
    onExpandSidebar?: () => void;
    unreadCount: number;
    activeView: View | string;
    openSubmenu: string | null;
    setOpenSubmenu: (label: string | null) => void;
}> = ({ item, isExpanded, permissions, onNavigate, onExpandSidebar, unreadCount, activeView, openSubmenu, setOpenSubmenu }) => {
    const badgeFor = (view?: View) => (view === 'notificari' ? unreadCount : 0);
    const titleAttr = !isExpanded ? item.label : undefined;

    // Grup cu submeniu
    if (item.submenu && item.submenu.length > 0) {
        const visibleSub: SubMenuItem[] = item.submenu.filter(s => !s.requires || permissions?.[s.requires]);
        if (visibleSub.length === 0) return null;

        const isOpen = openSubmenu === item.label;
        const hasActiveChild = visibleSub.some(s => isViewActive(s, activeView));
        const groupHasNotif = visibleSub.some(s => badgeFor(s.view) > 0);
        const showCaptions = visibleSub.length > 5;
        const tutorialAttr = visibleSub.some(s => s.view === 'plati-hub') ? 'nav-plati' : undefined;
        // Restrâns: copiii nu se văd, deci antetul poartă starea activă
        const highlightHeader = hasActiveChild && !isExpanded;

        return (
            <div>
                <button
                    type="button"
                    data-tutorial={tutorialAttr}
                    aria-expanded={isExpanded ? isOpen : undefined}
                    aria-label={titleAttr}
                    title={titleAttr}
                    onClick={() => {
                        if (!isExpanded) {
                            onExpandSidebar?.();
                            setOpenSubmenu(item.label);
                        } else {
                            setOpenSubmenu(isOpen ? null : item.label);
                        }
                    }}
                    className={`${ITEM_BASE} ${isExpanded ? '' : 'justify-center'} ${hasActiveChild ? 'font-semibold' : 'font-normal'} ${HOVER}`}
                    style={highlightHeader ? ACTIVE_STYLE : IDLE_STYLE}
                >
                    <span className="relative shrink-0">
                        <item.icon className="w-5 h-5" />
                        {!isExpanded && groupHasNotif && <NotifDot className="absolute -top-1 -right-1" />}
                    </span>
                    {isExpanded && (
                        <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {groupHasNotif && !isOpen && <NotifDot />}
                            <ChevronDownIcon className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </>
                    )}
                </button>

                {isExpanded && isOpen && (
                    <div className="mt-1 ml-8 space-y-1">
                        {visibleSub.map(sub => {
                            const isSubActive = isViewActive(sub, activeView);
                            const subBadge = badgeFor(sub.view);
                            return (
                                <React.Fragment key={sub.view}>
                                    {showCaptions && sub.section && (
                                        <div className="px-3 pt-2 text-xs font-semibold opacity-70" style={IDLE_STYLE}>{sub.section}</div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => onNavigate(sub.view)}
                                        aria-current={isSubActive ? 'page' : undefined}
                                        className={`${SUB_BASE} gap-2 ${isSubActive ? 'font-semibold' : `font-normal ${HOVER}`}`}
                                        style={isSubActive ? ACTIVE_STYLE : IDLE_STYLE}
                                    >
                                        <span className="flex-1 truncate">{sub.label}</span>
                                        {subBadge > 0 && <NotifPill count={subBadge} />}
                                    </button>
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    if (!item.view) return null;

    const isActive = isViewActive(item, activeView);
    const badgeCount = badgeFor(item.view);
    const tutorialAttr = item.view === 'sportivi' ? 'nav-sportivi'
        : item.view === 'examene' ? 'nav-examene'
        : (item.view === 'prezenta' || item.view === 'prezenta-instructor' || item.aliases?.includes('prezenta') || item.aliases?.includes('prezenta-instructor')) ? 'nav-prezenta'
        : item.view === 'plati-hub' ? 'nav-plati'
        : undefined;

    return (
        <button
            type="button"
            data-tutorial={tutorialAttr}
            onClick={() => onNavigate(item.view!)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={titleAttr}
            title={titleAttr}
            className={`${ITEM_BASE} ${isExpanded ? '' : 'justify-center'} ${isActive ? 'font-semibold' : `font-normal ${HOVER}`}`}
            style={isActive ? ACTIVE_STYLE : IDLE_STYLE}
        >
            <span className="relative shrink-0">
                <item.icon className="w-5 h-5" />
                {!isExpanded && badgeCount > 0 && <NotifDot className="absolute -top-1 -right-1" />}
            </span>
            {isExpanded && <span className="flex-1 truncate">{item.label}</span>}
            {isExpanded && badgeCount > 0 && <NotifPill count={badgeCount} />}
        </button>
    );
};

export const NavMenu: React.FC<NavMenuProps> = (props) => {
    const { isExpanded, permissions, menuToDisplay, onNavigate, onExpandSidebar } = props;
    const { activeView } = useNavigation();
    const { unreadCount } = useNotifications();

    const groupOfActive = () =>
        menuToDisplay.find(item => item.submenu?.some(s => isViewActive(s, activeView)))?.label ?? null;

    const [openSubmenu, setOpenSubmenu] = useState<string | null>(groupOfActive);

    // La navigare, grupul cu view-ul activ se redeschide
    useEffect(() => {
        const label = groupOfActive();
        if (label) setOpenSubmenu(label);
    }, [activeView, menuToDisplay]);

    return (
        <nav aria-label="Navigare principală" className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-1">
            {menuToDisplay.map(item => (
                <NavItem
                    key={item.label}
                    item={item}
                    isExpanded={isExpanded}
                    permissions={permissions}
                    onNavigate={onNavigate}
                    onExpandSidebar={onExpandSidebar}
                    unreadCount={unreadCount}
                    activeView={activeView}
                    openSubmenu={openSubmenu}
                    setOpenSubmenu={setOpenSubmenu}
                />
            ))}
        </nav>
    );
};
