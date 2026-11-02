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
  /** nefolosit: iconița preia culoarea sidebar-ului */
  iconColorClass?: string;
  roleLabel?: string;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = (props) => {
  const { isExpanded, canSwitchRoles, isSwitchingRole, isRoleSwitcherOpen, setIsRoleSwitcherOpen, userRoles, activeRoleContext, onSwitchRole, contextName, HeaderIcon, roleLabel } = props;

  return (
    <div className="relative p-2">
      <button
        type="button"
        className={`w-full flex items-center gap-3 px-3 min-h-11 lg:min-h-10 rounded-lg text-left transition-colors hover:bg-[color-mix(in_srgb,var(--t-sidebar-text)_10%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-input-focus-ring)] ${!isExpanded ? 'justify-center' : ''} ${!canSwitchRoles ? 'cursor-default' : 'cursor-pointer'}`}
        style={{ color: 'var(--t-sidebar-text)' }}
        onClick={() => canSwitchRoles && setIsRoleSwitcherOpen(!isRoleSwitcherOpen)}
        disabled={!canSwitchRoles || isSwitchingRole}
        aria-expanded={canSwitchRoles ? isRoleSwitcherOpen : undefined}
        aria-label={!isExpanded ? contextName : undefined}
        title={!isExpanded ? contextName : undefined}
      >
        <HeaderIcon className="w-5 h-5 shrink-0" />
        {isExpanded && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{contextName}</p>
            {roleLabel && <p className="text-xs font-semibold truncate opacity-70">{roleLabel}</p>}
          </div>
        )}
        {isExpanded && canSwitchRoles && <ChevronDownIcon className={`w-4 h-4 shrink-0 transition-transform ${isRoleSwitcherOpen ? 'rotate-180' : ''}`} />}
      </button>
      {isRoleSwitcherOpen && canSwitchRoles && (
        <div className="absolute top-full left-2 right-2 z-10 mt-1 bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl shadow-lg p-2 animate-fade-in-down">
          <p className="text-xs font-semibold px-2 pb-1 text-[var(--t-text-muted)]">Alege context</p>
          <div className="space-y-1">
            {(userRoles || [])
              .filter(role => role.id !== activeRoleContext?.id)
              .map((role) => {
                const Icon = getRoleIcon(role.roluri?.nume);
                return (
                  <button
                    type="button"
                    key={role.id}
                    onClick={() => { onSwitchRole(role); setIsRoleSwitcherOpen(false); }}
                    className="w-full flex items-center gap-3 px-2 min-h-11 rounded-lg text-sm text-left text-[var(--t-text)] hover:bg-[var(--t-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--t-input-focus-ring)]"
                  >
                    <Icon className="w-5 h-5 shrink-0 text-[var(--t-text-muted)]" />
                    <span className="truncate">{getRoleDisplayName(role)}</span>
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
