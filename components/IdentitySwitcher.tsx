import React from 'react';
import { User, Rol } from '../types';
import { Button } from './ui';
import { ShieldCheckIcon, UserCircleIcon, UsersIcon } from './icons';

interface IdentitySwitcherProps {
    currentUser: User;
    activeRole: Rol['nume'];
    onSwitch: (roleName: Rol['nume']) => void;
    loading: boolean;
}

const roleIcons: Record<Rol['nume'], React.ElementType> = {
    'SUPER_ADMIN_FEDERATIE': ShieldCheckIcon,
    'Admin': ShieldCheckIcon,
    'Admin Club': UsersIcon,
    'Instructor': UsersIcon,
    'Sportiv': UserCircleIcon,
};

export const IdentitySwitcher: React.FC<IdentitySwitcherProps> = ({ currentUser, activeRole, onSwitch, loading }) => {
    // Sortează rolurile după importanță pentru o afișare ordonată
    const roleWeights: Record<Rol['nume'], number> = { 'SUPER_ADMIN_FEDERATIE': 5, 'Admin': 4, 'Admin Club': 3, 'Instructor': 2, 'Sportiv': 1 };
    const sortedRoles = [...(currentUser.roluri || [])].sort((a, b) => (roleWeights[b.nume] || 0) - (roleWeights[a.nume] || 0));

    return (
        <div className="py-1 border-t border-b border-slate-600">
            <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Schimbă Context</div>
            <div className="space-y-1 px-2">
                {sortedRoles.map(role => {
                    const Icon = roleIcons[role.nume] || UserCircleIcon;
                    const isActive = role.nume === activeRole;
                    return (
                        <Button
                            key={role.id}
                            variant={isActive ? 'primary' : 'secondary'}
                            onClick={() => onSwitch(role.nume)}
                            className={`w-full !justify-start !text-sm ${isActive ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-600'}`}
                            isLoading={loading && isActive}
                            disabled={loading}
                        >
                            <Icon className="w-5 h-5 mr-3" />
                            {role.nume.replace(/_/g, ' ')}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
};