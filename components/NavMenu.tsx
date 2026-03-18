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
                <div
                    onClick={() => isExpanded && setIsSubmenuOpen(o => !o)}
                    className={`flex items-center p-2.5 rounded-md cursor-pointer transition-all duration-200 w-full relative group ${
                        hasActiveChild
                        ? "bg-sky-500/10 text-sky-400"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                    title={!isExpanded ? item.label : ''}
                >
                    <item.icon className={`h-5 w-5 shrink-0 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
                    {isExpanded && <>
                        <span className="flex-1 font-semibold text-sm">{item.label}</span>
                        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isSubmenuOpen ? 'rotate-180' : ''}`} />
                    </>}
                </div>
                {isExpanded && isSubmenuOpen && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700 pl-3">
                        {item.submenu.map(sub => (
                            <div
                                key={sub.view}
                                onClick={() => onNavigate(sub.view)}
                                className={`flex items-center p-2 rounded-md cursor-pointer text-sm transition-all duration-150 ${
                                    activeView === sub.view
                                    ? "text-sky-400 bg-sky-500/10"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                                }`}
                            >
                                {sub.label}
                            </div>
                        ))}
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
            className={`flex items-center p-2.5 rounded-md cursor-pointer transition-all duration-200 w-full relative group ${
                isActive
                ? "bg-sky-500/10 text-sky-400 border-l-2 border-sky-500 shadow-[0_0_15px_-5px_rgba(14,165,233,0.3)]"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
            title={!isExpanded ? item.label : ''}
        >
            <div className="relative">
                <item.icon className={`h-5 w-5 shrink-0 transition-transform duration-200 ${isExpanded ? 'mr-3' : 'mx-auto'} ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
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
          className={`flex items-center p-2.5 rounded-md cursor-pointer transition-all duration-200 w-full group ${
              'debug' === activeView
              ? "bg-sky-500/10 text-sky-400 border-l-2 border-sky-500 shadow-[0_0_15px_-5px_rgba(14,165,233,0.3)]"
              : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
          }`}
          title={!isExpanded ? 'Debug' : ''}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 shrink-0 transition-transform duration-200 ${isExpanded ? 'mr-3' : 'mx-auto'} ${'debug' === activeView ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {isExpanded && <span className="flex-1 font-semibold text-sm">Debug</span>}
        </div>
      )}
    </nav>
  );
};
