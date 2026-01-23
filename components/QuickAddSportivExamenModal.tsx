import React, { useState } from 'react';
import { Sportiv, Grad } from '../types';
import { Modal, Button, Input, Select } from './ui';
import { BirthDateInput } from './BirthDateInput';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface QuickAddSportivExamenModalProps {
    isOpen: boolean;
    onClose: () => void;
    grades: Grad[];
    onSaveSuccess: (newSportiv: Sportiv) => void;
}

const initialFormState = {
    nume: '',
    prenume: '',
    data_nasterii: '',
    grad_actual_id: null as string | null,
};

export const QuickAddSportivExamenModal: React.FC<QuickAddSportivExamenModalProps> = ({ isOpen, onClose, grades, onSaveSuccess }) => {
    const [formState, setFormState] = useState(initialFormState);
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(p => ({ ...p, [name]: value === '' ? null : value }));
    };

    const handleDateChange = (value: string) => {
        setFormState(p => ({ ...p, data_nasterii: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.nume || !formState.prenume || !formState.data_nasterii) {
            showError("Date Incomplete", "Numele, prenumele și data nașterii sunt obligatorii.");
            return;
        }
        setLoading(true);

        const newSportivData: Partial<Sportiv> = {
            nume: formState.nume,
            prenume: formState.prenume,
            data_nasterii: formState.data_nasterii,
            grad_actual_id: formState.grad_actual_id,
            data_inscrierii: new Date().toISOString().split('T')[0],
            status: 'Activ',
            email: null,
            cnp: null,
            familie_id: null,
            tip_abonament_id: null,
            participa_vacanta: false,
        };

        try {
            const { data, error } = await supabase
                .from('sportivi')
                .insert(newSportivData)
                .select('*, roluri(id, nume)')
                .single();

            if (error) throw error;
            
            const newSportiv = { ...data, roluri: data.roluri || [] };

            showSuccess("Succes!", `${newSportiv.nume} ${newSportiv.prenume} a fost adăugat.`);
            onSaveSuccess(newSportiv as Sportiv);
            setFormState(initialFormState);
        } catch (err: any) {
            showError("Eroare la Salvare", err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const sortedGrades = [...grades].sort((a,b) => a.ordine - b.ordine);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Adaugă Sportiv Nou">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-slate-400">Introduceți datele minimale pentru a adăuga un sportiv nou. Profilul complet poate fi editat ulterior.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input label="Nume" name="nume" value={formState.nume} onChange={handleChange} required />
                    <Input label="Prenume" name="prenume" value={formState.prenume} onChange={handleChange} required />
                </div>
                <BirthDateInput label="Data Nașterii" value={formState.data_nasterii} onChange={handleDateChange} required />
                <Select label="Gradul Actual (opțional)" name="grad_actual_id" value={formState.grad_actual_id || ''} onChange={handleChange}>
                    <option value="">Începător (fără grad)</option>
                    {sortedGrades.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
                </Select>
                <div className="flex justify-end pt-4 gap-2 border-t border-slate-700 mt-6">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="primary" isLoading={loading}>Adaugă și Înscrie</Button>
                </div>
            </form>
        </Modal>
    );
};