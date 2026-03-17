import React from 'react';
import { ChevronDownIcon } from './icons';
import { getRoleDisplayName, getRoleIcon } from '../hooks/useUserRoles';

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


export const RoleSwitcher: React.FC<RoleSwitcherProps> = (props) => {
  const { isExpanded, canSwitchRoles, isSwitchingRole, isRoleSwitcherOpen, setIsRoleSwitcherOpen, userRoles, activeRoleContext, onSwitchRole, contextName, HeaderIcon, iconColorClass } = props;

  return (
    <div className="relative p-2">
      <button
        className={`w-full p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-amber-500/50 flex items-center text-left transition-all duration-300 group ${!canSwitchRoles && 'cursor-default'}`}
        onClick={() => canSwitchRoles && setIsRoleSwitcherOpen(!isRoleSwitcherOpen)}
        disabled={!canSwitchRoles || isSwitchingRole}
      >
        <div className={`p-1.5 rounded-md bg-slate-900/80 border border-slate-800 shadow-inner transition-colors ${isRoleSwitcherOpen ? 'border-amber-500/50' : 'group-hover:border-amber-500/30'}`}>
            <HeaderIcon className={`w-6 h-6 shrink-0 ${iconColorClass}`} />
        </div>
        {isExpanded && (
          <div className="flex-grow ml-3 overflow-hidden">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Context Activ</p>
            <p className="text-sm font-bold text-white truncate w-full">{contextName}</p>
          </div>
        )}
        {isExpanded && canSwitchRoles && <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform shrink-0 ${isRoleSwitcherOpen ? 'rotate-180' : ''}`} />}
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
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center mr-3">
                                        <Icon className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <span className="text-white truncate font-medium">{getRoleDisplayName(role)}</span>
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
