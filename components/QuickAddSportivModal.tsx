import React, { useState } from 'react';
import { Sportiv, Plata, TipAbonament } from '../types';
import { Modal, Button, Input } from './ui';
import { BirthDateInput } from './BirthDateInput';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface QuickAddSportivModalProps {
    isOpen: boolean;
    onClose: () => void;
    grupaId: string | null;
    antrenamentId: string;
    tipuriAbonament: TipAbonament[];
    onSaveSuccess: (newSportiv: Sportiv, newPlata: Plata | null) => void;
}

const initialFormState = {
    nume: '',
    prenume: '',
    data_nasterii: '',
};

export const QuickAddSportivModal: React.FC<QuickAddSportivModalProps> = ({ isOpen, onClose, grupaId, antrenamentId, tipuriAbonament, onSaveSuccess }) => {
    const [formState, setFormState] = useState(initialFormState);
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormState(p => ({ ...p, [e.target.name]: e.target.value }));
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

        const newSportivData: Omit<Sportiv, 'id' | 'roluri'> = {
            nume: formState.nume,
            prenume: formState.prenume,
            data_nasterii: formState.data_nasterii,
            data_inscrierii: new Date().toISOString().split('T')[0],
            grupa_id: grupaId,
            status: 'Activ',
            email: null,
            cnp: null,
            club_provenienta: 'Phi Hau Iași',
            familie_id: null,
            tip_abonament_id: tipuriAbonament.find(ab => ab.numar_membri === 1)?.id || null, // Default to individual
            participa_vacanta: false,
        };

        try {
            // 1. Insert sportiv
            const { data: sportivData, error: sportivError } = await supabase
                .from('sportivi')
                .insert(newSportivData)
                .select()
                .single();
            if (sportivError) throw sportivError;
            const newSportiv = { ...sportivData, roluri: [] } as Sportiv;

            // NOTĂ: Nu mai inserăm în 'prezenta_antrenament' aici. 
            // handleQuickAddSave din pagina părinte va adăuga acest sportiv la selecția locală, 
            // iar butonul final de "Save" va face legătura în baza de date.

            // 2. Generate first subscription payment
            let newPlata: Plata | null = null;
            const abonamentConfig = tipuriAbonament.find(ab => ab.numar_membri === 1);
            if (abonamentConfig) {
                const lunaText = new Date().toLocaleString('ro-RO', { month: 'long', year: 'numeric' });
                const newPlataData: Omit<Plata, 'id'> = {
                    sportiv_id: newSportiv.id,
                    familie_id: null,
                    suma: abonamentConfig.pret,
                    data: new Date().toISOString().split('T')[0],
                    status: 'Neachitat',
                    descriere: `Abonament ${abonamentConfig.denumire} ${lunaText}`,
                    tip: 'Abonament',
                    observatii: 'Generat automat la prima prezență.'
                };
                const { data: plataData, error: plataError } = await supabase.from('plati').insert(newPlataData).select().single();
                if (plataError) {
                    showError("Avertisment", `Sportiv adăugat la prezență, dar a eșuat generarea automată a abonamentului: ${plataError.message}`);
                } else {
                    newPlata = plataData as Plata;
                }
            }

            showSuccess("Succes!", `${newSportiv.nume} ${newSportiv.prenume} a fost adăugat.`);
            onSaveSuccess(newSportiv, newPlata);
            onClose();
            setFormState(initialFormState);
        } catch (err: any) {
            showError("Eroare la Salvare", err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Adaugă Sportiv Nou / Vizitator">
            <form onSubmit={handleSubmit} className="space-y-6">
                <p className="text-sm text-slate-400">Introduceți datele minimale pentru a adăuga un sportiv nou direct la acest antrenament. Profilul complet poate fi editat ulterior.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Nume" name="nume" value={formState.nume} onChange={handleChange} required autoCapitalize="words" />
                    <Input label="Prenume" name="prenume" value={formState.prenume} onChange={handleChange} required autoCapitalize="words" />
                </div>
                <BirthDateInput label="Data Nașterii" value={formState.data_nasterii} onChange={handleDateChange} required />
                <div className="flex flex-col sm:flex-row justify-end pt-4 gap-3 border-t border-slate-700 mt-6">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="w-full sm:w-auto order-2 sm:order-1">Anulează</Button>
                    <Button type="submit" variant="primary" isLoading={loading} className="w-full sm:w-auto order-1 sm:order-2">Adaugă Sportiv</Button>
                </div>
            </form>
        </Modal>
    );
};