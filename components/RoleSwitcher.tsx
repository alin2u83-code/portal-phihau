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

const TEST_CONFIG: { name: Rol['nume']; color: string; label: string }[] = [
    { name: 'SUPER_ADMIN_FEDERATIE', color: 'bg-red-600 hover:bg-red-700', label: '🔴 FRQKD Admin' },
    { name: 'Admin Club', color: 'bg-blue-600 hover:bg-blue-700', label: '🔵 Phi Hau Admin' },
    { name: 'Instructor', color: 'bg-green-600 hover:bg-green-700', label: '🟢 Instructor' },
    { name: 'Sportiv', color: 'bg-amber-500 hover:bg-amber-600', label: '🟡 Sportiv' },
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

        const newUser = JSON.parse(JSON.stringify(originalUser));
        newUser.roluri = [targetRole];
        newUser.rol = targetRole.nume; // Also update the simple 'rol' property for compatibility

        if ((roleName === 'Admin Club' || roleName === 'Instructor') && (!newUser.club_id || newUser.club_id === FEDERATIE_ID)) {
             const firstClub = clubs.find(c => c.id !== FEDERATIE_ID);
             if (firstClub) {
                 newUser.club_id = firstClub.id;
                 newUser.cluburi = firstClub;
             }
        } else if (roleName === 'SUPER_ADMIN_FEDERATIE' || roleName === 'Admin') {
            const fedClub = clubs.find(c => c.id === FEDERATIE_ID);
            newUser.club_id = FEDERATIE_ID;
            if (fedClub) newUser.cluburi = fedClub;
        } else if (roleName === 'Sportiv') {
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

    if (!currentUser || currentUser.email !== DEV_EMAIL) {
        return null;
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-black/80 backdrop-blur-sm p-1.5 border-b border-amber-500 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5 text-amber-400"/>
                     <div className="text-xs text-white hidden md:block">
                        <span className="font-bold text-amber-400">DEV TOOLBAR</span>
                        <span className="text-slate-400 ml-2">Rol Activ:</span>
                        <span className="font-semibold ml-1">{currentSimulatedRole || 'Original'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {TEST_CONFIG.map(role => (
                        <Button
                            key={role.name}
                            size="sm"
                            onClick={() => handleSwitchRole(role.name)}
                            className={`!text-xs !px-2 ${role.color} ${currentSimulatedRole === role.name ? 'ring-2 ring-white' : ''}`}
                            title={`Simulează rolul: ${role.name}`}
                        >
                           <span className="hidden sm:inline">{role.label.split(' ')[1]}</span>
                           <span className="sm:hidden">{role.label.split(' ')[0]}</span>
                        </Button>
                    ))}
                </div>
                <Button 
                    onClick={handleReset}
                    variant="secondary"
                    size="sm"
                    className="!text-xs !px-2"
                    disabled={!currentSimulatedRole}
                    title="Reset to Original Role"
                >
                    <RotateCcw className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
};