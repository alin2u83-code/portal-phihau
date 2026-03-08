import React, { useState, useEffect } from 'react';
import { Sportiv, User, Rol } from '../types';
import { Button, Modal } from './ui';
import { useError } from './ErrorProvider';
import { useRoleAssignment } from '../hooks/useRoleAssignment';

interface SportivAccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    sportiv: Sportiv | null;
    allRoles: Rol[];
    currentUser: User;
    onOpenCreateAccount?: (sportiv: Sportiv) => void;
}

export const SportivAccountSettingsModal: React.FC<SportivAccountSettingsModalProps> = ({
    isOpen, onClose, sportiv, allRoles, currentUser, onOpenCreateAccount
}) => {
    const [newRoleIds, setNewRoleIds] = useState<string[]>([]);
    const { showError } = useError();
    const { updateRoles, getAvailableRoles, loading } = useRoleAssignment(currentUser, allRoles);

    useEffect(() => {
        if (sportiv) {
            setNewRoleIds((sportiv.roluri || []).map(r => r.id));
        }
    }, [sportiv]);

    const availableRolesForAssignment = getAvailableRoles();

    const handleRoleChange = (roleId: string, isChecked: boolean) => {
        setNewRoleIds(prev => isChecked ? [...new Set([...prev, roleId])] : prev.filter(id => id !== roleId));
    };

    const handleSaveRole = async () => {
        if (!sportiv) { showError("Eroare", "Niciun sportiv selectat."); return; }
        if (!sportiv.user_id) {
            showError("Eroare", "Acest sportiv nu are un cont de utilizator asociat. Nu se pot asigna roluri.");
            return;
        }

        const updatedRoles = await updateRoles(sportiv, newRoleIds);
        if (updatedRoles) {
            onClose();
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
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button variant="success" onClick={handleSaveRole} isLoading={loading}>Salvează Roluri</Button>
                </div>
            </div>
        </Modal>
    );
};
