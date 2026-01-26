import React, { useState, useEffect, useMemo } from 'react';
import { User, Rol, Club } from '../types';
import { Button } from './ui';
import { ShieldCheckIcon } from './icons';
import { FEDERATIE_ID } from '../constants';

interface RoleSwitcherProps {
    currentUser: User | null;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    allRoles: Rol[];
    clubs: Club[];
}

const TEST_ROLES: Rol['nume'][] = ['SUPER_ADMIN_FEDERATIE', 'Admin Club', 'Instructor'];

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ currentUser, setCurrentUser, allRoles, clubs }) => {
    const [originalUser, setOriginalUser] = useState<User | null>(null);

    useEffect(() => {
        if (currentUser && !originalUser) {
            setOriginalUser(JSON.parse(JSON.stringify(currentUser)));
        }
    }, [currentUser, originalUser]);
    
    const handleSwitchRole = (roleName: Rol['nume']) => {
        if (!currentUser || !originalUser) return;
        
        const targetRole = allRoles.find(r => r.nume === roleName);
        if (!targetRole) {
            console.error(`[RoleSwitcher] Rolul "${roleName}" nu a fost găsit în lista de roluri.`);
            return;
        }

        const newUser = { ...currentUser, roluri: [targetRole] };

        if ((roleName === 'Admin Club' || roleName === 'Instructor') && (!newUser.club_id || newUser.club_id === FEDERATIE_ID)) {
             const firstClub = clubs.find(c => c.id !== FEDERATIE_ID);
             if (firstClub) {
                 newUser.club_id = firstClub.id;
                 newUser.cluburi = firstClub;
             }
        }
        
        if (roleName === 'SUPER_ADMIN_FEDERATIE') {
            const fedClub = clubs.find(c => c.id === FEDERATIE_ID);
            newUser.club_id = FEDERATIE_ID;
            if(fedClub) newUser.cluburi = fedClub;
        }

        setCurrentUser(newUser);
    };

    const handleReset = () => {
        if (originalUser) {
            setCurrentUser(originalUser);
        }
    };
    
    const currentMockRole = useMemo(() => {
        if (!currentUser || !originalUser) return 'Original';
        if (JSON.stringify(currentUser.roluri) === JSON.stringify(originalUser.roluri)) {
             return 'Original';
        }
        return currentUser.roluri[0]?.nume || 'Necunoscut';
    }, [currentUser, originalUser]);

    // FIX: Property 'env' does not exist on type 'ImportMeta'. Cast to any to access Vite env variables.
    if (!(import.meta as any).env.DEV || !currentUser) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-[9999] bg-[var(--bg-card)] p-3 rounded-lg border-2 border-dashed border-amber-500 shadow-2xl w-72">
            <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2 mb-2">
                <ShieldCheckIcon className="w-5 h-5"/>
                Role Switcher (DEV)
            </h4>
            <p className="text-xs text-slate-400 mb-3">Rol Simulat: <strong className="text-white">{currentMockRole}</strong></p>

            <div className="grid grid-cols-2 gap-2">
                {TEST_ROLES.map(roleName => (
                    <Button 
                        key={roleName}
                        size="sm"
                        variant={currentMockRole === roleName ? 'primary' : 'secondary'}
                        onClick={() => handleSwitchRole(roleName)}
                        className="text-xs !justify-start"
                    >
                       {roleName}
                    </Button>
                ))}
            </div>
            <Button 
                onClick={handleReset}
                variant="secondary"
                size="sm"
                className="w-full mt-2 text-xs"
                disabled={currentMockRole === 'Original'}
            >
                Resetare la Rolul Original
            </Button>
        </div>
    );
};
