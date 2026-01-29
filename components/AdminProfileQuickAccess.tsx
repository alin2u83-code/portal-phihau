import React from 'react';
import { User, View, Rol } from '../types';
import { CogIcon, UserCircleIcon, ArrowRightOnRectangleIcon } from './icons';
import { IdentitySwitcher } from './IdentitySwitcher';

interface AdminProfileQuickAccessProps {
  user: User;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  isExpanded: boolean;
  isSuperAdmin: boolean;
  activeRole: Rol['nume'];
  onSwitchRole: (roleName: Rol['nume']) => void;
  isSwitchingRole: boolean;
}

export const AdminProfileQuickAccess: React.FC<AdminProfileQuickAccessProps> = ({ user, onNavigate, onLogout, isExpanded, isSuperAdmin, activeRole, onSwitchRole, isSwitchingRole }) => {
    // Determină poziționarea pe baza modului de afișare (sidebar sau navbar)
    const positionClasses = isExpanded 
        ? "absolute bottom-full mb-2 w-64 right-0" // Sidebar extins SAU Navbar
        : "absolute bottom-full mb-2 w-64 left-0"; // Sidebar restrâns

    return (
        <div 
            className={`${positionClasses} rounded-md shadow-lg bg-slate-700 ring-1 ring-black ring-opacity-5 z-50 animate-fade-in-down`}
        >
            <div className="py-1">
                <div className="px-4 py-3 border-b border-slate-600">
                    <p className="text-sm font-semibold text-white truncate">{user.nume} {user.prenume}</p>
                    <p className="text-xs text-slate-400 truncate">{(user.roluri || []).map(r => r.nume).join(', ')}</p>
                </div>
                
                {user.roluri.length > 1 && (
                    <IdentitySwitcher 
                        currentUser={user} 
                        activeRole={activeRole} 
                        onSwitch={onSwitchRole} 
                        loading={isSwitchingRole} 
                    />
                )}

                <div className="py-1">
                    {isSuperAdmin && (
                        <button
                            onClick={() => onNavigate('setari-club')}
                            className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-300 hover:bg-brand-primary hover:text-white transition-colors"
                        >
                            <CogIcon className="w-5 h-5 mr-3" />
                            Configurare Federație
                        </button>
                    )}
                </div>
                <div className="py-1 border-t border-slate-600">
                     <button
                        onClick={onLogout}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-600/20 hover:text-red-300 transition-colors"
                    >
                        <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                        Deconectare
                    </button>
                </div>
            </div>
        </div>
    );
};