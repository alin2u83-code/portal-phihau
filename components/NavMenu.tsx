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
        <div onClick={() => onNavigate(item.view!)} className={`flex items-center p-2.5 text-white rounded-md cursor-pointer transition-colors w-full relative ${isActive ? "bg-[#4DBCE9] text-white shadow-lg" : "hover:bg-white/10"}`} title={!isExpanded ? item.label : ''}>
            <div className="relative">
                <item.icon className={`h-6 w-6 shrink-0 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
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
  const { unreadByType } = useNotifications();

  return (
    <nav className="flex-1 px-2 py-4 space-y-1.5 overflow-y-auto">
      {menuToDisplay.map(item => {
        const notifType = item.view ? VIEW_TO_NOTIF_TYPE[item.view] : undefined;
        const badgeCount = notifType ? unreadByType[notifType] : undefined;
        
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
      <div onClick={() => onNavigate('debug')} className={`flex items-center p-2.5 text-white rounded-md cursor-pointer transition-colors w-full ${'debug' === activeView ? "bg-[#4DBCE9] text-white shadow-lg" : "hover:bg-white/10"}`} title={!isExpanded ? 'Debug' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 shrink-0 ${isExpanded ? 'mr-3' : 'mx-auto'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {isExpanded && <span className="flex-1 font-semibold text-sm">Debug</span>}
      </div>
    </nav>
  );
};
