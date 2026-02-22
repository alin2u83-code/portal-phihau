import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, User, Rol } from '../types';
import { Button, Modal } from './ui';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface SportivAccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    sportiv: Sportiv | null;
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    allRoles: Rol[];
    setAllRoles: React.Dispatch<React.SetStateAction<Rol[]>>;
    currentUser: User;
}

export const SportivAccountSettingsModal: React.FC<SportivAccountSettingsModalProps> = ({
    isOpen, onClose, sportiv, setSportivi, allRoles, currentUser
}) => {
    const [newRoleIds, setNewRoleIds] = useState<string[]>([]);
    const { showError, showSuccess } = useError();

    useEffect(() => {
        if (sportiv) {
            setNewRoleIds((sportiv.roluri || []).map(r => r.id));
        }
    }, [sportiv]);

    const roleWeights: Record<Rol['nume'], number> = useMemo(() => ({
        'SUPER_ADMIN_FEDERATIE': 5,
        'ADMIN': 4,
        'ADMIN_CLUB': 3,
        'INSTRUCTOR': 2,
        'SPORTIV': 1,
    }), []);

    const currentUserMaxWeight = useMemo(() =>
        Math.max(0, ...currentUser.roluri.map(r => roleWeights[r.nume] || 0)),
        [currentUser.roluri, roleWeights]
    );

    const availableRolesForAssignment = useMemo(() =>
        allRoles.filter(r => (roleWeights[r.nume] || 0) <= currentUserMaxWeight),
        [allRoles, currentUserMaxWeight, roleWeights]
    );

    const handleRoleChange = (roleId: string, isChecked: boolean) => {
        setNewRoleIds(prev => isChecked ? [...new Set([...prev, roleId])] : prev.filter(id => id !== roleId));
    };

    const handleSaveRole = async () => {
        if (!supabase) { showError("Eroare", "Conexiunea la baza de date nu a putut fi stabilită."); return; }
        if (!sportiv) { showError("Eroare", "Niciun sportiv selectat."); return; }
        if (!sportiv.user_id) {
            showError("Eroare", "Acest sportiv nu are un cont de utilizator asociat. Nu se pot asigna roluri.");
            return;
        }

        const targetUserMaxWeight = Math.max(0, ...(sportiv.roluri || []).map(r => roleWeights[r.nume] || 0));
        if (currentUserMaxWeight <= targetUserMaxWeight && currentUser.id !== sportiv.id) {
             showError("Permisiune Refuzată", "Nu puteți modifica rolurile unui utilizator cu privilegii egale sau mai mari.");
             return;
        }

        const assignedRolesWeight = newRoleIds.map(roleId => roleWeights[allRoles.find(r => r.id === roleId)?.nume || 'SPORTIV'] || 0);
        if (assignedRolesWeight.some(weight => weight > currentUserMaxWeight)) {
            showError("Permisiune Refuzată", "Nu puteți acorda un rol cu privilegii mai mari decât rolul dumneavoastră.");
            return;
        }

        let finalRoleIds = [...newRoleIds];
        const sportivRole = allRoles.find(r => r.nume === 'SPORTIV');
        if (finalRoleIds.length === 0 && sportivRole) {
            finalRoleIds.push(sportivRole.id);
        }

        try {
            await supabase.from('utilizator_roluri_multicont').delete().eq('sportiv_id', sportiv.id);

            const rolesToInsert = finalRoleIds.map(roleId => {
                const role = allRoles.find(r => r.id === roleId);
                if (!role) return null;
                return {
                    user_id: sportiv.user_id,
                    rol_denumire: role.nume,
                    club_id: sportiv.club_id,
                    sportiv_id: sportiv.id,
                };
            }).filter(Boolean);

            if (rolesToInsert.length > 0) {
                const { error: insertError } = await supabase.from('utilizator_roluri_multicont').insert(rolesToInsert as any[]);
                if (insertError) throw insertError;
            }

            const updatedRoles = allRoles.filter(r => finalRoleIds.includes(r.id));
            setSportivi(prev => prev.map(s => s.id === sportiv.id ? { ...s, roluri: updatedRoles } : s));

            showSuccess("Succes", `Rolurile pentru ${sportiv.nume} au fost salvate!`);
            onClose();
        } catch (error: any) {
            showError("Eroare la schimbarea rolului", error.message);
        }
    };

    if (!sportiv) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Gestionează Roluri: ${sportiv.nume} ${sportiv.prenume}`}>
            <div className="space-y-4">
                <div className="flex flex-wrap gap-x-6 gap-y-3 p-2">
                    {availableRolesForAssignment.map(role => (
                        <label key={role.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-primary-600 focus:ring-primary-500"
                                checked={newRoleIds.includes(role.id)}
                                onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                            />
                            <span>{role.nume}</span>
                        </label>
                    ))}
                </div>
                <div className="flex justify-end pt-4 border-t border-slate-700 gap-2">
                    <Button variant="secondary" onClick={onClose}>Anulează</Button>
                    <Button variant="success" onClick={handleSaveRole}>Salvează Roluri</Button>
                </div>
            </div>
        </Modal>
    );
};
