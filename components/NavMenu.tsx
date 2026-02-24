import React from 'react';
import { View, Permissions } from '../types';
import { adminMenu, instructorMenu, sportivMenu, MenuItem } from './menuConfig';
import { ShieldCheckIcon } from './icons';

interface NavMenuProps {
  isExpanded: boolean;
  activeView: View;
  onNavigate: (view: View) => void;
  permissions: Permissions;
  menuToDisplay: MenuItem[];
}

const NavItem: React.FC<{ 
    item: MenuItem;
    isExpanded: boolean;
    isActive: boolean;
    onNavigate: (view: View) => void;
}> = ({ item, isExpanded, isActive, onNavigate }) => {
    if (!item.view) return null;
    return (
        <div onClick={() => onNavigate(item.view!)} className={`flex items-center p-2.5 text-white rounded-md cursor-pointer transition-colors w-full ${isActive ? "bg-[var(--accent)] text-white shadow-lg" : "hover:bg-white/10"}`} title={!isExpanded ? item.label : ''}>
            <item.icon className={`h-6 w-6 shrink-0 ${isExpanded ? 'mr-3' : 'mx-auto'}`} />
            {isExpanded && <span className="flex-1 font-semibold text-sm">{item.label}</span>}
        </div>
    );
};

export const NavMenu: React.FC<NavMenuProps> = (props) => {
  const { isExpanded, activeView, onNavigate, permissions, menuToDisplay } = props;

  return (
    <nav className="flex-1 px-2 py-4 space-y-1.5 overflow-y-auto">
      {menuToDisplay.map(item => (
        <NavItem key={item.label} item={item} isExpanded={isExpanded} isActive={item.view === activeView} onNavigate={onNavigate} />
      ))}
      {permissions.isFederationAdmin && (
        <NavItem 
            item={{ label: 'Admin Dashboard', view: 'admin-dashboard', icon: ShieldCheckIcon }}
            isExpanded={isExpanded} 
            isActive={'admin-dashboard' === activeView} 
            onNavigate={onNavigate} 
        />
      )}
      <div onClick={() => onNavigate('debug')} className={`flex items-center p-2.5 text-white rounded-md cursor-pointer transition-colors w-full ${'debug' === activeView ? "bg-[var(--accent)] text-white shadow-lg" : "hover:bg-white/10"}`} title={!isExpanded ? 'Debug' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 shrink-0 ${isExpanded ? 'mr-3' : 'mx-auto'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {isExpanded && <span className="flex-1 font-semibold text-sm">Debug</span>}
      </div>
    </nav>
  );
};
