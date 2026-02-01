import React, { useState, useRef, useMemo } from 'react';
import { User, Rol, Club, Permissions } from '../types';
import { Card, Select, Button } from './ui';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ShieldCheckIcon } from './icons';

interface UserRoleManagerProps {
    users: User[];
    roles: Rol[];
    clubs: Club[];
    currentUser: User;
    permissions: Permissions;
}

export const UserRoleManager: React.FC<UserRoleManagerProps> = ({ users, roles, clubs, currentUser, permissions }) => {
    const { showError, showSuccess } = useError();
    const [loading, setLoading] = useState(false);

    // Folosim useRef pentru a accesa direct elementele DOM, conform solicitării.
    // Într-o aplicație complexă, pentru formulare controlate, `useState` este adesea preferat
    // pentru a lega valoarea la starea componentei și a reacționa la schimbări.
    // Aici, îl folosim pentru a demonstra citirea directă la submit.
    const userSelectRef = useRef<HTMLSelectElement>(null);
    const roleSelectRef = useRef<HTMLSelectElement>(null);

    const availableUsers = useMemo(() => {
        // Un Admin Club poate gestiona doar utilizatorii din clubul său.
        if (permissions.isFederationAdmin) {
            return users;
        }
        return users.filter(u => u.club_id === currentUser.club_id);
    }, [users, currentUser.club_id, permissions.isFederationAdmin]);

    const availableRoles = useMemo(() => {
        // Un Admin Club nu poate acorda roluri mai mari decât al său.
        const roleWeights: Record<Rol['nume'], number> = { 'SUPER_ADMIN_FEDERATIE': 5, 'Admin': 4, 'Admin Club': 3, 'Instructor': 2, 'Sportiv': 1 };
        const maxWeight = Math.max(0, ...currentUser.roluri.map(r => roleWeights[r.nume] || 0));
        return roles.filter(r => (roleWeights[r.nume] || 0) <= maxWeight);
    }, [roles, currentUser.roluri]);
    
    /**
     * Funcția `updateContext` citește valorile selectate folosind `useRef`
     * și apelează o funcție RPC din Supabase pentru a actualiza contextul utilizatorului.
     */
    const updateContext = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userSelectRef.current || !roleSelectRef.current) {
            showError("Eroare componentă", "Referințele către elementele formularului nu sunt disponibile.");
            return;
        }

        const selectedUserId = userSelectRef.current.value;
        const selectedRoleName = roleSelectRef.current.value;

        if (!selectedUserId || !selectedRoleName) {
            showError("Date lipsă", "Vă rugăm selectați un utilizator și un rol.");
            return;
        }

        const targetUser = users.find(u => u.id === selectedUserId);
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

            showSuccess("Context Actualizat", `Contextul pentru ${targetUser.nume} ${targetUser.prenume} a fost setat la ${selectedRoleName}.`);

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
                    <Select label="Selectează Utilizator" ref={userSelectRef} defaultValue="">
                        <option value="" disabled>Alege un utilizator...</option>
                        {availableUsers.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.nume} {user.prenume}
                            </option>
                        ))}
                    </Select>
                    <Select label="Atribuie Rol" ref={roleSelectRef} defaultValue="">
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
