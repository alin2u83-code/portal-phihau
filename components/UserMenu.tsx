import React, { useState, useEffect, useRef } from 'react';
import { User, Permissions, View } from '../types';
import { ChevronDownIcon, CogIcon, ArrowRightOnRectangleIcon, HomeIcon, SitemapIcon, UserCircleIcon, ShieldCheckIcon, ClockIcon } from './icons';
import { useEsteProprietar } from '../hooks/useEsteProprietar';

interface UserMenuProps {
  currentUser: User;
  permissions?: Permissions;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  userRoles?: any[];
  onSwitchRole?: (context: any) => void;
}

const getPrimaryRoleName = (permissions?: Permissions): string => {
    if (!permissions) return 'Utilizator';
    if (permissions.isSuperAdmin) return 'Super Admin';
    if (permissions.isAdmin) return 'Admin';
    if (permissions.isAdminClub) return 'Admin Club';
    if (permissions.isInstructor) return 'Instructor';
    if (permissions.isSportiv) return 'Sportiv';
    return 'Utilizator';
};

const MenuItem: React.FC<{ label: string; icon: React.ElementType; onClick: () => void; danger?: boolean }> = ({ label, icon: Icon, onClick, danger }) => (
    <button
        role="menuitem"
        onClick={onClick}
        className="flex items-center w-full min-h-11 lg:min-h-9 px-3 text-sm font-semibold rounded-lg transition-colors hover:bg-[var(--t-surface-2)]"
        style={{ color: danger ? 'var(--t-status-danger)' : 'var(--t-text)' }}
    >
        <Icon className="w-5 h-5 mr-3" style={{ color: danger ? 'var(--t-status-danger)' : 'var(--t-text-muted)' }} />
        <span>{label}</span>
    </button>
);

export const UserMenu: React.FC<UserMenuProps> = ({ currentUser, permissions, onNavigate, onLogout, userRoles = [], onSwitchRole }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const esteProprietar = useEsteProprietar();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const initials = `${currentUser.prenume?.[0] || ''}${currentUser.nume?.[0] || ''}`.toUpperCase();
  const primaryRole = getPrimaryRoleName(permissions);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleNavigate = (view: View) => {
    onNavigate(view);
    setIsDropdownOpen(false);
  };

  const handleRoleSwitch = (roleContext: any) => {
      if (onSwitchRole) {
          onSwitchRole(roleContext);
      }
      setIsDropdownOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(p => !p)}
        aria-haspopup="menu"
        aria-expanded={isDropdownOpen}
        aria-label="Meniu utilizator"
        className="flex items-center gap-2 rounded-lg transition-colors hover:bg-[var(--t-surface-2)]"
      >
        <div
          className="h-11 w-11 lg:h-9 lg:w-9 rounded-full flex items-center justify-center text-sm font-semibold"
          style={{ background: 'color-mix(in srgb, var(--t-primary) 15%, transparent)', color: 'var(--t-primary)' }}
        >
          {initials}
        </div>

        <div className="hidden md:block text-left">
          <p className="text-sm font-semibold truncate max-w-[150px] leading-tight" style={{ color: 'var(--t-text)' }}>{currentUser.prenume}</p>
          <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--t-text-muted)' }}>{primaryRole}</p>
        </div>

        <ChevronDownIcon className={`hidden md:block w-4 h-4 mr-1 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--t-text-muted)' }} />
      </button>
      {isDropdownOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 bg-[var(--t-surface)] rounded-xl shadow-lg border border-[var(--t-border)] z-50 animate-fade-in-down max-h-[80vh] overflow-y-auto"
        >
          <div className="p-3 border-b border-[var(--t-border)]">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--t-text)' }}>{currentUser.nume} {currentUser.prenume}</p>
            <p className="text-xs truncate" style={{ color: 'var(--t-text-muted)' }}>{currentUser.email}</p>
          </div>

          {userRoles.length > 1 && (
              <div className="p-2 border-b border-[var(--t-border)]">
                  <p className="text-xs font-semibold px-3 mb-1" style={{ color: 'var(--t-text-muted)' }}>Schimbă rolul</p>
                  {userRoles.map((roleCtx) => {
                      const roleName = Array.isArray(roleCtx.roluri) ? roleCtx.roluri[0]?.nume : roleCtx.roluri?.nume;
                      const clubName = roleCtx.club?.nume || 'Federație';
                      const isPrimary = roleCtx.is_primary;
                      return (
                          <button
                              key={roleCtx.id}
                              role="menuitem"
                              aria-current={isPrimary ? 'true' : undefined}
                              onClick={() => handleRoleSwitch(roleCtx)}
                              className={`flex flex-col w-full min-h-11 lg:min-h-9 justify-center px-3 text-sm text-left rounded-lg transition-colors hover:bg-[var(--t-surface-2)] ${isPrimary ? 'bg-[var(--t-surface-2)]' : ''}`}
                              style={{ color: 'var(--t-text)' }}
                          >
                              <span className="flex items-center gap-2 font-semibold">
                                  <ShieldCheckIcon className="w-4 h-4" style={{ color: isPrimary ? 'var(--t-primary)' : 'var(--t-text-muted)' }} />
                                  {roleName}
                              </span>
                              <span className="text-xs ml-6 truncate" style={{ color: 'var(--t-text-muted)' }}>{clubName}</span>
                          </button>
                      );
                  })}
              </div>
          )}

          <div className="p-2 space-y-1">
            {permissions?.isSportiv && (
              <MenuItem label="Portalul Meu" icon={UserCircleIcon} onClick={() => handleNavigate('my-portal')} />
            )}
            {permissions?.hasAdminAccess && (
              <MenuItem label="Acasă" icon={HomeIcon} onClick={() => handleNavigate('dashboard')} />
            )}
            {permissions?.isMultiContextAdmin && (
              <MenuItem label="Schimbă Context" icon={SitemapIcon} onClick={() => handleNavigate('admin-console')} />
            )}
            <MenuItem label="Setări Cont" icon={CogIcon} onClick={() => handleNavigate('account-settings')} />
            <MenuItem label="Protecția datelor" icon={ShieldCheckIcon} onClick={() => handleNavigate('protectia-datelor')} />
            {permissions?.hasAdminAccess && (
              <MenuItem label="Istoric Activitate" icon={ClockIcon} onClick={() => handleNavigate('istoric-activitate')} />
            )}
            {esteProprietar && (
              <MenuItem label="Conturi cluburi (competiție)" icon={ShieldCheckIcon} onClick={() => handleNavigate('conturi-cluburi')} />
            )}
          </div>

          <div className="p-2 border-t border-[var(--t-border)]">
            <MenuItem label="Deconectare" icon={ArrowRightOnRectangleIcon} onClick={onLogout} danger />
          </div>
        </div>
      )}
    </div>
  );
};
