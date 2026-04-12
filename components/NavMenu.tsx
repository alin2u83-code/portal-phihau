import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Permissions } from '../types';
import { useNavigation } from '../contexts/NavigationContext';
import { adminMenu, instructorMenu, sportivMenu, MenuItem } from './menuConfig';
import { ShieldCheckIcon, ChevronDownIcon } from './icons';
import { useNotifications } from '../contexts/NotificationContext';

interface NavMenuProps {
  isExpanded: boolean;
  permissions?: Permissions;
  menuToDisplay: MenuItem[];
  onNavigate: (view: View) => void;
}

const VIEW_TO_NOTIF_TYPE: Record<string, string> = {
    'examene': 'examen',
    'plati-scadente': 'plata',
    'istoric-plati': 'plata',
    'prezenta': 'antrenament',
    'prezenta-instructor': 'antrenament',
    'notificari': 'system'
};

const NavItem: React.FC<{
    item: MenuItem;
    isExpanded: boolean;
    isActive: boolean;
    onNavigate: (view: View) => void;
    badgeCount?: number;
    activeView: View | string;
    openSubmenu: string | null;
    setOpenSubmenu: (label: string | null) => void;
}> = ({ item, isExpanded, isActive, onNavigate, badgeCount, activeView, openSubmenu, setOpenSubmenu }) => {
    const isSubmenuOpen = openSubmenu === item.label;

    // Item cu submeniu
    if (item.submenu && item.submenu.length > 0) {
        const hasActiveChild = item.submenu.some(s => s.view === activeView);
        return (
            <div>
                {/* Group header — același stil ca în AdminMasterMap */}
                <div
                    onClick={() => isExpanded && setOpenSubmenu(isSubmenuOpen ? null : item.label)}
                    className={`flex items-center p-2.5 rounded-lg cursor-pointer transition-all duration-200 w-full relative group border ${
                        hasActiveChild
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-slate-800/40 text-slate-400 border-slate-700/50 hover:bg-slate-800/70 hover:text-slate-200 hover:border-amber-400/20"
                    }`}
                    title={!isExpanded ? item.label : ''}
                >
                    <item.icon className={`h-5 w-5 shrink-0 text-amber-400 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
                    {isExpanded && <>
                        <span className="flex-1 font-semibold text-sm">{item.label}</span>
                        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isSubmenuOpen ? 'rotate-180' : ''}`} />
                    </>}
                </div>

                {/* Submeniu — indentate cu linie verticală de legătură */}
                {isExpanded && isSubmenuOpen && (
                    <div className="mt-1 ml-4 pl-3 border-l-2 border-amber-500/25 space-y-0.5">
                        {item.submenu.map(sub => {
                            const isSubActive = activeView === sub.view;
                            return (
                                <div
                                    key={sub.view}
                                    onClick={() => onNavigate(sub.view)}
                                    className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 text-sm ${
                                        isSubActive
                                        ? "bg-amber-500/15 text-amber-300 font-semibold"
                                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSubActive ? 'bg-amber-400' : 'bg-slate-600'}`} />
                                    {sub.label}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    if (!item.view) return null;
    const tutorialAttr = item.view === 'sportivi' ? 'nav-sportivi'
      : item.view === 'examene' ? 'nav-examene'
      : item.view === 'prezenta' || item.view === 'prezenta-instructor' ? 'nav-prezenta'
      : item.view === 'plati-scadente' ? 'nav-plati'
      : undefined;

    return (
        <div
            data-tutorial={tutorialAttr}
            onClick={() => onNavigate(item.view!)}
            className={`flex items-center p-2.5 rounded-lg cursor-pointer transition-all duration-200 w-full relative group border ${
                isActive
                ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                : "bg-slate-800/40 text-slate-400 border-slate-700/50 hover:bg-slate-800/70 hover:text-slate-200 hover:border-amber-400/20"
            }`}
            title={!isExpanded ? item.label : ''}
        >
            <div className="relative">
                <item.icon className={`h-5 w-5 shrink-0 text-amber-400 transition-transform duration-200 ${isExpanded ? 'mr-3' : 'mx-auto'} ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                {badgeCount !== undefined && badgeCount > 0 && !isExpanded && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
            </div>
            {isExpanded && <span className="flex-1 font-semibold text-sm">{item.label}</span>}
            {isExpanded && badgeCount !== undefined && badgeCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {badgeCount > 9 ? '9+' : badgeCount}
                </span>
            )}
        </div>
    );
};

export const NavMenu: React.FC<NavMenuProps> = (props) => {
  const { isExpanded, permissions, menuToDisplay, onNavigate } = props;
  const { activeView } = useNavigation();
  const { unreadCount } = useNotifications();

  const initialOpen = menuToDisplay.find(item => item.submenu?.some(s => s.view === activeView))?.label ?? null;
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(initialOpen);

  const navRef = useRef<HTMLElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 4);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateScrollState); ro.disconnect(); };
  }, [updateScrollState, menuToDisplay]);

  const scrollBy = (direction: 'up' | 'down') => {
    navRef.current?.scrollBy({ top: direction === 'up' ? -120 : 120, behavior: 'smooth' });
  };

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      {/* Scroll up button */}
      <button
        onClick={() => scrollBy('up')}
        className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-center h-6 bg-gradient-to-b from-slate-900 to-transparent transition-opacity duration-200 ${canScrollUp ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-label="Scroll sus"
      >
        <ChevronDownIcon className="w-4 h-4 text-amber-400 rotate-180" />
      </button>

    <nav ref={navRef} className="flex-1 px-2 py-4 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
      {menuToDisplay.map(item => {
        const badgeCount = item.view === 'notificari' ? unreadCount : undefined;
        const isActive = item.view ? item.view === activeView : false;

        return (
            <NavItem
                key={item.label}
                item={item}
                isExpanded={isExpanded}
                isActive={isActive}
                onNavigate={onNavigate}
                badgeCount={badgeCount}
                activeView={activeView}
                openSubmenu={openSubmenu}
                setOpenSubmenu={setOpenSubmenu}
            />
        );
      })}
      {permissions?.isFederationAdmin && (
        <NavItem
            item={{ label: 'Admin Dashboard', view: 'admin-dashboard', icon: ShieldCheckIcon }}
            isExpanded={isExpanded}
            isActive={'admin-dashboard' === activeView}
            onNavigate={onNavigate}
            activeView={activeView}
            openSubmenu={openSubmenu}
            setOpenSubmenu={setOpenSubmenu}
        />
      )}
      {permissions?.isSuperAdmin && (
        <div
          onClick={() => onNavigate('debug')}
          className={`flex items-center p-2.5 rounded-lg cursor-pointer transition-all duration-200 w-full group border ${
              'debug' === activeView
              ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
              : "bg-slate-800/40 text-slate-400 border-slate-700/50 hover:bg-slate-800/70 hover:text-slate-200 hover:border-amber-400/20"
          }`}
          title={!isExpanded ? 'Debug' : ''}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 shrink-0 text-amber-400 transition-transform duration-200 ${isExpanded ? 'mr-3' : 'mx-auto'} ${'debug' === activeView ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {isExpanded && <span className="flex-1 font-semibold text-sm">Debug</span>}
        </div>
      )}
    </nav>

      {/* Scroll down button */}
      <button
        onClick={() => scrollBy('down')}
        className={`absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center h-6 bg-gradient-to-t from-slate-900 to-transparent transition-opacity duration-200 ${canScrollDown ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-label="Scroll jos"
      >
        <ChevronDownIcon className="w-4 h-4 text-amber-400" />
      </button>
    </div>
  );
};
