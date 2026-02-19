import React, { useState, useEffect, useMemo } from 'react';
import { Sportiv, User, Rol } from '../types';
import { Button, Modal } from './ui';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { UserPlusIcon } from './icons';

interface SportivAccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    sportiv: Sportiv | null;
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    allRoles: Rol[];
    currentUser: User;
    onOpenCreateAccount: (sportiv: Sportiv) => void;
}

export const SportivAccountSettingsModal: React.FC<SportivAccountSettingsModalProps> = ({
    isOpen, onClose, sportiv, setSportivi, allRoles, currentUser, onOpenCreateAccount
}) => {
    const [newRoleIds, setNewRoleIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCreateAccountPrompt, setShowCreateAccountPrompt] = useState(false);
    const { showError, showSuccess } = useError();

    useEffect(() => {
        if (isOpen && sportiv) {
            setNewRoleIds((sportiv.roluri || []).map(r => r.id));
            setShowCreateAccountPrompt(false); // Reset prompt on open/change
        }
    }, [isOpen, sportiv]);

    const roleWeights: Record<Rol['nume'], number> = useMemo(() => ({
        'SUPER_ADMIN_FEDERATIE': 5,
        'Admin': 4,
        'Admin Club': 3,
        'Instructor': 2,
        'Sportiv': 1,
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
            setShowCreateAccountPrompt(true);
            return;
        }

        setLoading(true);
        const targetUserMaxWeight = Math.max(0, ...(sportiv.roluri || []).map(r => roleWeights[r.nume] || 0));
        if (currentUserMaxWeight <= targetUserMaxWeight && currentUser.id !== sportiv.id) {
             showError("Permisiune Refuzată", "Nu puteți modifica rolurile unui utilizator cu privilegii egale sau mai mari.");
             setLoading(false);
             return;
        }

        const assignedRolesWeight = newRoleIds.map(roleId => roleWeights[allRoles.find(r => r.id === roleId)?.nume || 'Sportiv'] || 0);
        if (assignedRolesWeight.some(weight => weight > currentUserMaxWeight)) {
            showError("Permisiune Refuzată", "Nu puteți acorda un rol cu privilegii mai mari decât rolul dumneavoastră.");
            setLoading(false);
            return;
        }

        let finalRoleIds = [...newRoleIds];
        const sportivRole = allRoles.find(r => r.nume === 'Sportiv');
        if (finalRoleIds.length === 0 && sportivRole) {
            finalRoleIds.push(sportivRole.id);
        }
        
        try {
            const rolesToUpsert = finalRoleIds.map(roleId => {
                const role = allRoles.find(r => r.id === roleId);
                if (!role) return null;
                return {
                    user_id: sportiv.user_id,
                    rol_denumire: role.nume,
                    club_id: sportiv.club_id,
                    sportiv_id: sportiv.id,
                };
            }).filter((r): r is NonNullable<typeof r> => r !== null);

            const roleDenumiriToKeep = rolesToUpsert.map(r => r.rol_denumire);

            if (rolesToUpsert.length > 0) {
                const { error: upsertError } = await supabase
                    .from('utilizator_roluri_multicont')
                    .upsert(rolesToUpsert, { onConflict: 'user_id,sportiv_id,rol_denumire' });
                if (upsertError) throw upsertError;
            }

            const deleteQuery = supabase.from('utilizator_roluri_multicont').delete().eq('sportiv_id', sportiv.id);
            if (roleDenumiriToKeep.length > 0) {
                deleteQuery.not('rol_denumire', 'in', `(${roleDenumiriToKeep.map(r => `'${r}'`).join(',')})`);
            }
            const { error: deleteError } = await deleteQuery;
            if (deleteError) throw deleteError;

            const updatedRoles = allRoles.filter(r => finalRoleIds.includes(r.id));
            setSportivi(prev => prev.map(s => s.id === sportiv.id ? { ...s, roluri: updatedRoles } : s));

            showSuccess("Succes", `Rolurile pentru ${sportiv.nume} au fost salvate!`);
            onClose();
        } catch (error: any) {
            showError("Eroare la schimbarea rolului", error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!sportiv) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Gestionează Roluri: ${sportiv.nume} ${sportiv.prenume}`}>
            {showCreateAccountPrompt ? (
                 <div className="text-center p-4">
                    <p className="text-amber-300 text-sm bg-amber-900/50 p-3 rounded-md mb-6">
                        Acest sportiv nu are un cont de utilizator asociat. Creați unul pentru a putea salva rolurile.
                    </p>
                    <Button 
                        variant="primary" 
                        className="w-full md:w-auto"
                        onClick={() => {
                            onOpenCreateAccount(sportiv);
                            onClose();
                        }}
                    >
                        <UserPlusIcon className="w-5 h-5 mr-2" />
                        Creează Cont Utilizator
                    </Button>
                </div>
            ) : (
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
                        <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                        <Button variant="success" onClick={handleSaveRole} isLoading={loading}>Salvează Roluri</Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
