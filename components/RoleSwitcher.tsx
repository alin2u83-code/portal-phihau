import React, { useState, useEffect, useMemo } from 'react';
import { User, Rol, Club } from '../types';
import { Button } from './ui';
import { ShieldCheckIcon, RotateCcw } from 'lucide-react';
import { FEDERATIE_ID } from '../constants';

interface DevRoleSwitcherProps {
    currentUser: User | null;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    allRoles: Rol[];
    clubs: Club[];
}

const TEST_CONFIG: { name: Rol['nume']; color: string }[] = [
    { name: 'SUPER_ADMIN_FEDERATIE', color: 'bg-red-600 hover:bg-red-700' },
    { name: 'Admin Club', color: 'bg-blue-600 hover:bg-blue-700' },
    { name: 'Instructor', color: 'bg-green-600 hover:bg-green-700' },
    { name: 'Sportiv', color: 'bg-amber-500 hover:bg-amber-600' },
];

const DEV_EMAIL = 'admin@phihau.ro'; 

export const RoleSwitcher: React.FC<DevRoleSwitcherProps> = ({ currentUser, setCurrentUser, allRoles, clubs }) => {
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
            console.error(`[DevRoleSwitcher] Rolul "${roleName}" nu a fost găsit.`);
            return;
        }

        // Create a fresh copy from the original to avoid nested state changes
        const newUser = JSON.parse(JSON.stringify(originalUser));
        newUser.roluri = [targetRole];

        // Assign appropriate club for the role
        if ((roleName === 'Admin Club' || roleName === 'Instructor') && (!newUser.club_id || newUser.club_id === FEDERATIE_ID)) {
             const firstClub = clubs.find(c => c.id !== FEDERATIE_ID);
             if (firstClub) {
                 newUser.club_id = firstClub.id;
                 newUser.cluburi = firstClub;
             }
        } else if (roleName === 'SUPER_ADMIN_FEDERATIE') {
            const fedClub = clubs.find(c => c.id === FEDERATIE_ID);
            newUser.club_id = FEDERATIE_ID;
            if (fedClub) newUser.cluburi = fedClub;
        } else if (roleName === 'Sportiv') {
            // Revert to original club if it was changed
            newUser.club_id = originalUser.club_id;
            newUser.cluburi = originalUser.cluburi;
        }

        setCurrentUser(newUser);
    };

    const handleReset = () => {
        if (originalUser) {
            setCurrentUser(originalUser);
        }
    };
    
    const currentSimulatedRole = useMemo(() => {
        if (!currentUser || !originalUser || JSON.stringify(currentUser.roluri) === JSON.stringify(originalUser.roluri)) {
             return null;
        }
        return currentUser.roluri[0]?.nume;
    }, [currentUser, originalUser]);

    // This component is only for development and for a specific user.
    if (!currentUser || currentUser.email !== DEV_EMAIL) {
        return null;
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-slate-900/50 backdrop-blur-sm p-2 border-b-2 border-dashed border-amber-500 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5 text-amber-400"/>
                    <h4 className="text-sm font-bold text-amber-400 hidden sm:block">
                        Dev Role Switcher
                    </h4>
                </div>
                <div className="flex items-center gap-2">
                    {TEST_CONFIG.map(role => (
                        <Button
                            key={role.name}
                            size="sm"
                            onClick={() => handleSwitchRole(role.name)}
                            className={`!text-xs !px-2 sm:!px-3 ${role.color} ${currentSimulatedRole === role.name ? 'ring-2 ring-white' : ''}`}
                        >
                           {role.name}
                        </Button>
                    ))}
                </div>
                <Button 
                    onClick={handleReset}
                    variant="secondary"
                    size="sm"
                    className="!text-xs !px-2 sm:!px-3"
                    disabled={!currentSimulatedRole}
                    title="Reset to Original Role"
                >
                    <RotateCcw className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Reset</span>
                </Button>
            </div>
        </div>
    );
};