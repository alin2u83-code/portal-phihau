import React from 'react';
import { Rol } from '../types';
import { Button, Card } from './ui';
import { ShieldCheckIcon, UsersIcon, UserCircleIcon, CheckCircleIcon } from './icons';

// --- Helper Functions (adapted from RoleSelectionPage) ---
const getRoleDisplayName = (role: any) => {
    switch(role.rol_denumire) {
        case 'SUPER_ADMIN_FEDERATIE': return 'Super Admin Federație';
        case 'Admin': return 'Admin General';
        case 'Admin Club': return `Admin - ${role.club?.nume || 'Club Nedefinit'}`;
        case 'Instructor': return `Instructor - ${role.club?.nume || 'Club Nedefinit'}`;
        case 'Sportiv': return `Sportiv - ${role.sportiv?.nume || ''} ${role.sportiv?.prenume || ''}`;
        default: return role.rol_denumire;
    }
};

const getRoleDescription = (role: any) => {
    switch(role.rol_denumire) {
        case 'SUPER_ADMIN_FEDERATIE': return 'Acces total la nivel de federație.';
        case 'Admin': return 'Acces administrativ general.';
        case 'Admin Club': return `Management complet pentru ${role.club?.nume || 'club'}.`;
        case 'Instructor': return `Management sportivi și prezențe la ${role.club?.nume || 'club'}.`;
        case 'Sportiv': return 'Accesează portalul personal de sportiv.';
        default: return 'Selectează acest profil pentru a continua.';
    }
};

const getRoleIcon = (roleName: Rol['nume']) => {
    switch(roleName) {
        case 'SUPER_ADMIN_FEDERATIE':
        case 'Admin':
            return ShieldCheckIcon;
        case 'Admin Club':
        case 'Instructor':
            return UsersIcon;
        case 'Sportiv':
            return UserCircleIcon;
        default:
            return UsersIcon;
    }
};

// --- Sub-component: RoleCard ---
interface RoleCardProps {
    role: any;
    isActive: boolean;
    onClick: () => void;
    isLoading: boolean;
}

const RoleCard: React.FC<RoleCardProps> = ({ role, isActive, onClick, isLoading }) => {
    const Icon = getRoleIcon(role.rol_denumire);
    return (
        <div 
            onClick={!isActive && !isLoading ? onClick : undefined}
            className={`relative p-6 rounded-lg border-2 transition-all duration-300 ${isActive ? 'bg-brand-secondary/20 border-brand-secondary shadow-glow-secondary' : 'bg-slate-800 border-slate-700 hover:border-slate-500 cursor-pointer'}`}
        >
            {isActive && (
                <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-bold text-brand-secondary bg-green-900/50 px-2 py-1 rounded-full">
                    <CheckCircleIcon className="w-4 h-4" />
                    Activ
                </div>
            )}
            <Icon className={`w-10 h-10 mb-3 ${isActive ? 'text-brand-secondary' : 'text-slate-400'}`} />
            <h3 className="text-xl font-bold text-white">{getRoleDisplayName(role)}</h3>
            <p className="text-sm text-slate-400 mt-1 min-h-[40px]">{getRoleDescription(role)}</p>
        </div>
    );
};


// --- Main Component ---
interface IdentitySwitcherProps {
    userRoles: any[];
    activeRoleContext: any;
    onSwitchRole: (roleContext: any) => void;
    isSwitchingRole: boolean;
}

export const IdentitySwitcher: React.FC<IdentitySwitcherProps> = ({ userRoles, activeRoleContext, onSwitchRole, isSwitchingRole }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userRoles.map((role, index) => {
                // A unique key for a context is a combination of sportiv_id and role_name
                const roleKey = `${role.sportiv_id}-${role.rol_denumire}`;
                const isActive = activeRoleContext?.sportiv_id === role.sportiv_id && activeRoleContext?.rol_denumire === role.rol_denumire;
                
                return (
                    <RoleCard
                        key={roleKey}
                        role={role}
                        isActive={isActive}
                        onClick={() => onSwitchRole(role)}
                        isLoading={isSwitchingRole}
                    />
                );
            })}
             {userRoles.length === 0 && (
                <p className="text-slate-400 italic text-center col-span-full py-8">
                    Nu sunt definite roluri multiple pentru acest utilizator.
                </p>
            )}
        </div>
    );
};
