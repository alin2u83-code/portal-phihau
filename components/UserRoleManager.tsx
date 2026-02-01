import React, { useState, useMemo, useEffect } from 'react';
import { Rol, Club, Permissions, User } from '../types';
import { Card, Select, Button } from './ui';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ShieldCheckIcon } from './icons';

interface ManagedUser {
    user_id: string;
    sportiv_id: string;
    club_id: string | null;
    displayName: string;
}

interface UserRoleManagerProps {
    roles: Rol[];
    clubs: Club[];
    currentUser: User;
    permissions: Permissions;
}

export const UserRoleManager: React.FC<UserRoleManagerProps> = ({ roles, clubs, currentUser, permissions }) => {
    const { showError, showSuccess } = useError();
    const [loading, setLoading] = useState(false);
    const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
    
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRoleName, setSelectedRoleName] = useState('');

    useEffect(() => {
        async function loadUsers() {
            if (!supabase) return;
            // Get all unique user contexts
            const { data, error } = await supabase.from('utilizator_roluri_multicont').select('user_id, club_id, sportiv_id');
            if (error) { showError("Eroare la preluarea utilizatorilor din roluri", error.message); return; }

            // Group by sportiv_id to get a unique list for the dropdown
            const userMap = new Map<string, ManagedUser>();
            for (const item of data) {
                if (!userMap.has(item.sportiv_id)) {
                    userMap.set(item.sportiv_id, {
                        user_id: item.user_id,
                        sportiv_id: item.sportiv_id,
                        club_id: item.club_id,
                        displayName: item.user_id, // Afișăm user_id ca fallback
                    });
                }
            }
            setManagedUsers(Array.from(userMap.values()));
        }
        loadUsers();
    }, [showError]);


    const availableUsers = useMemo(() => {
        // Un Admin Club poate gestiona doar utilizatorii din clubul său.
        if (permissions.isFederationAdmin) {
            return managedUsers;
        }
        return managedUsers.filter(u => u.club_id === currentUser.club_id);
    }, [managedUsers, currentUser.club_id, permissions.isFederationAdmin]);

    const availableRoles = useMemo(() => {
        // Un Admin Club nu poate acorda roluri mai mari decât al său.
        const roleWeights: Record<Rol['nume'], number> = { 'SUPER_ADMIN_FEDERATIE': 5, 'Admin': 4, 'Admin Club': 3, 'Instructor': 2, 'Sportiv': 1 };
        const maxWeight = Math.max(0, ...currentUser.roluri.map(r => roleWeights[r.nume] || 0));
        return roles.filter(r => (roleWeights[r.nume] || 0) <= maxWeight);
    }, [roles, currentUser.roluri]);
    
    /**
     * Funcția `updateContext` citește valorile selectate din starea componentei
     * și apelează o funcție RPC din Supabase pentru a actualiza contextul utilizatorului.
     */
    const updateContext = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedUserId || !selectedRoleName) {
            showError("Date lipsă", "Vă rugăm selectați un utilizator și un rol.");
            return;
        }

        // selectedUserId este acum sportiv_id
        const targetUser = managedUsers.find(u => u.sportiv_id === selectedUserId);
        if (!targetUser) {
            showError("Eroare", "Utilizatorul selectat nu a fost găsit.");
            return;
        }

        setLoading(true);

        try {
            // Presupunem că există o funcție RPC `update_user_context`
            // care primește (user_id, rol_denumire, club_id)
            const { error: rpcError } = await supabase.rpc('update_user_context', {
                p_user_id: targetUser.user_id, // Trebuie să fie ID-ul din auth.users
                p_rol_denumire: selectedRoleName,
                p_club_id: targetUser.club_id
            });

            if (rpcError) throw rpcError;

            showSuccess("Context Actualizat", `Contextul pentru utilizatorul selectat a fost setat la ${selectedRoleName}.`);

        } catch (err: any) {
            showError("Eroare la actualizare", err.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheckIcon className="w-6 h-6 text-brand-secondary" />
                Manager Roluri Utilizator
            </h3>
            <form onSubmit={updateContext} className="space-y-4">
                 <p className="text-xs text-slate-400">
                    Acest instrument permite setarea unui context specific pentru un utilizator. 
                    Funcționalitatea reală depinde de implementarea RPC-ului `update_user_context` în baza de date.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Selectează Utilizator (după ID)"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                    >
                        <option value="" disabled>Alege un utilizator...</option>
                        {availableUsers.map(user => (
                            <option key={user.sportiv_id} value={user.sportiv_id}>
                                {user.displayName.substring(0,8)}...
                            </option>
                        ))}
                    </Select>
                    <Select
                        label="Atribuie Rol"
                        value={selectedRoleName}
                        onChange={(e) => setSelectedRoleName(e.target.value)}
                    >
                        <option value="" disabled>Alege un rol...</option>
                        {availableRoles.map(role => (
                            <option key={role.id} value={role.nume}>
                                {role.nume}
                            </option>
                        ))}
                    </Select>
                </div>
                <div className="flex justify-end pt-4 border-t border-slate-700">
                    <Button type="submit" variant="primary" isLoading={loading}>
                        Actualizează Context
                    </Button>
                </div>
            </form>
        </Card>
    );
};
