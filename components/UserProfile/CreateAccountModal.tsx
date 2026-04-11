import React, { useState, useEffect } from 'react';
import { Sportiv, User, Rol } from '../../types';
import { Modal, Input, Button, CredentialeContModal } from '../ui';
import { useError } from '../ErrorProvider';
import { useRoleAssignment } from '../../hooks/useRoleAssignment';

export const CreateAccountModal: React.FC<{
    sportiv: Sportiv;
    onClose: () => void;
    onAccountCreated: () => void;
    currentUser: User;
    allRoles: Rol[];
}> = ({ sportiv, onClose, onAccountCreated, currentUser, allRoles }) => {
    const { showError } = useError();
    const [form, setForm] = useState({ email: '', parola: '' });
    const [credentiale, setCredentiale] = useState<{ email: string; parola: string } | null>(null);
    const { createAccountAndAssignRole, loading } = useRoleAssignment(currentUser, allRoles);

    useEffect(() => {
        const sanitize = (str: string) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
        const nume = sanitize(sportiv.nume);
        const prenume = sanitize(sportiv.prenume);
        const defaultEmail = sportiv.email || `${nume}.${prenume}@phihau.ro`;
        const defaultPassword = `${nume}.1234!`;
        setForm({ email: defaultEmail, parola: defaultPassword });
    }, [sportiv]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.email || !form.parola) {
            showError("Date Incomplete", "Emailul și parola sunt obligatorii.");
            return;
        }

        const sportivRole = allRoles.find(r => r.nume === 'SPORTIV');
        if (!sportivRole) {
            showError("Eroare", "Rolul 'SPORTIV' nu a fost găsit.");
            return;
        }

        const result = await createAccountAndAssignRole(form.email, form.parola, sportiv, [sportivRole]);
        if (result.success) {
            onAccountCreated();
            setCredentiale({ email: form.email, parola: result.generatedPassword ?? form.parola });
        } else {
            showError("Eroare", result.error || "A apărut o eroare la crearea contului.");
        }
    };

    if (credentiale) {
        return (
            <CredentialeContModal
                isOpen={true}
                onClose={() => { setCredentiale(null); onClose(); }}
                email={credentiale.email}
                parola={credentiale.parola}
                numeSportiv={`${sportiv.prenume} ${sportiv.nume}`}
            />
        );
    }

    return (
        <Modal isOpen={true} onClose={onClose} title={`Generează Cont pentru ${sportiv.nume}`}>
            <form onSubmit={handleSave} className="space-y-4">
                <Input label="Email de Autentificare" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                <Input label="Parolă Inițială" value={form.parola} onChange={e => setForm(p => ({ ...p, parola: e.target.value }))} required />
                <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" isLoading={loading}>Generează și Asociază</Button>
                </div>
            </form>
        </Modal>
    );
};
