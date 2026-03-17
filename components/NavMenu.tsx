import React from 'react';
import { View, Permissions } from '../types';
import { useNavigation } from '../contexts/NavigationContext';
import { adminMenu, instructorMenu, sportivMenu, MenuItem } from './menuConfig';
import { ShieldCheckIcon } from './icons';
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
}> = ({ item, isExpanded, isActive, onNavigate, badgeCount }) => {
    if (!item.view) return null;
    return (
        <div 
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
        
        return (
            <NavItem 
                key={item.label} 
                item={item} 
                isExpanded={isExpanded} 
                isActive={item.view === activeView} 
                onNavigate={onNavigate} 
                badgeCount={badgeCount}
            />
        );
      })}
      {permissions?.isFederationAdmin && (
        <NavItem 
            item={{ label: 'Admin Dashboard', view: 'admin-dashboard', icon: ShieldCheckIcon }}
            isExpanded={isExpanded} 
            isActive={'admin-dashboard' === activeView} 
            onNavigate={onNavigate} 
        />
      )}
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
    </nav>
  );
};
