import React, { useState } from 'react';
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
}> = ({ item, isExpanded, isActive, onNavigate, badgeCount, activeView }) => {
    const [isSubmenuOpen, setIsSubmenuOpen] = useState(() =>
        !!item.submenu?.some(s => s.view === activeView)
    );

    // Item cu submeniu
    if (item.submenu && item.submenu.length > 0) {
        const hasActiveChild = item.submenu.some(s => s.view === activeView);
        return (
            <div>
                {/* Group header — același stil ca în AdminMasterMap */}
                <div
                    onClick={() => isExpanded && setIsSubmenuOpen(o => !o)}
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

                {/* Submeniu — card-uri compacte identice cu dashboard */}
                {isExpanded && isSubmenuOpen && (
                    <div className="mt-1 space-y-1 pl-1">
                        {item.submenu.map(sub => {
                            const isSubActive = activeView === sub.view;
                            return (
                                <div
                                    key={sub.view}
                                    onClick={() => onNavigate(sub.view)}
                                    className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 border text-sm ${
                                        isSubActive
                                        ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold"
                                        : "bg-slate-800/50 border-slate-700/40 text-slate-300 hover:bg-slate-700/60 hover:border-amber-400/30 hover:text-slate-100"
                                    }`}
                                >
                                    {/* Indicator activ */}
                                    {isSubActive && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4/5 bg-amber-400 rounded-r-full" />
                                    )}
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

  return (
    <nav className="flex-1 px-2 py-4 space-y-1.5 overflow-y-auto">
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
  );
};
