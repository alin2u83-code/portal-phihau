import React from 'react';
import { ChevronDownIcon, ShieldCheckIcon, UserCircleIcon, UsersIcon } from './icons';
import { Rol } from '../types';

interface RoleSwitcherProps {
  isExpanded: boolean;
  canSwitchRoles: boolean;
  isSwitchingRole: boolean;
  isRoleSwitcherOpen: boolean;
  setIsRoleSwitcherOpen: (isOpen: boolean) => void;
  userRoles: any[];
  activeRoleContext: any;
  onSwitchRole: (role: any) => void;
  contextName: string;
  HeaderIcon: React.ElementType;
  iconColorClass: string;
}

const getRoleDisplayName = (role: any): string => {
    switch(role.roluri?.nume) {
        case 'SUPER_ADMIN_FEDERATIE': return 'Super Admin Federație';
        case 'ADMIN': return 'Admin General';
        case 'ADMIN_CLUB': return `Admin - ${role.club?.nume || 'Club Nedefinit'}`;
        case 'INSTRUCTOR': return `Instructor - ${role.club?.nume || 'Club Nedefinit'}`;
        case 'SPORTIV': return `Sportiv - ${role.sportiv?.nume || ''} ${role.sportiv?.prenume || ''}`;
        default: return role.roluri?.nume;
    }
};

const getRoleIcon = (roleName: Rol['nume']): React.ElementType => {
    switch(roleName) {
        case 'SUPER_ADMIN_FEDERATIE':
        case 'ADMIN':
        case 'ADMIN_CLUB':
            return ShieldCheckIcon;
        case 'INSTRUCTOR':
            return UsersIcon;
        case 'SPORTIV':
            return UserCircleIcon;
        default:
            return UsersIcon;
    }
};

export const RoleSwitcher: React.FC<RoleSwitcherProps> = (props) => {
  const { isExpanded, canSwitchRoles, isSwitchingRole, isRoleSwitcherOpen, setIsRoleSwitcherOpen, userRoles, activeRoleContext, onSwitchRole, contextName, HeaderIcon, iconColorClass } = props;

  return (
    <div className="relative p-2">
      <button
        className={`w-full p-3 bg-black/30 rounded-lg border-2 border-amber-400/50 hover:border-amber-400 flex items-center text-left transition-all duration-300 shadow-lg ${!canSwitchRoles && 'cursor-default'}`}
        onClick={() => canSwitchRoles && setIsRoleSwitcherOpen(!isRoleSwitcherOpen)}
        disabled={!canSwitchRoles || isSwitchingRole}
      >
        <HeaderIcon className={`w-8 h-8 shrink-0 ${iconColorClass}`} />
        {isExpanded && (
          <div className="flex-grow ml-3 overflow-hidden">
            <p className="text-xs text-amber-300 font-bold uppercase">Context Activ</p>
            <p className="text-md font-bold text-white truncate w-full">{contextName}</p>
          </div>
        )}
        {isExpanded && canSwitchRoles && <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform shrink-0 ${isRoleSwitcherOpen ? 'rotate-180' : ''}`} />}
      </button>
      {isRoleSwitcherOpen && canSwitchRoles && (
        <div className="absolute top-full left-2 right-2 z-10 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-lg p-2 animate-fade-in-down">
          <p className="text-xs font-bold text-slate-500 px-2 pb-1">Alege context</p>
          <div className="space-y-1">
            {(userRoles || [])
              .filter(role => role.id !== activeRoleContext?.id)
              .map((role) => {
                const Icon = getRoleIcon(role.roluri?.nume);
                return (
                  <button
                    key={role.id}
                    onClick={() => { onSwitchRole(role); setIsRoleSwitcherOpen(false); }}
                    className="w-full flex items-center p-2 rounded-md text-sm text-left hover:bg-slate-700 min-h-[60px]"
                  >
                    <Icon className="w-5 h-5 mr-2 text-slate-400" />
                    <span className="text-white truncate">{getRoleDisplayName(role)}</span>
                  </button>
                );
              })
            }
          </div>
        </div>
      )}
    </div>
  );
};
