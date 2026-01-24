import React, { useState } from 'react';
import { Familie, Sportiv, TipAbonament } from '../types';
import { Button, Input, Card, Select } from './ui';
import { PlusIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useClub } from './ClubProvider';

interface FamiliiManagementProps {
    familii: Familie[];
    setFamilii: React.Dispatch<React.SetStateAction<Familie[]>>;
    sportivi: Sportiv[];
    onBack?: () => void;
    isEmbedded?: boolean;
    tipuriAbonament: TipAbonament[];
}

export const FamiliiManagement: React.FC<FamiliiManagementProps> = ({ familii, setFamilii, sportivi, onBack, isEmbedded = false, tipuriAbonament }) => {
    const [newNume, setNewNume] = useState('');
    const [loading, setLoading] = useState(false);
    const [toDelete, setToDelete] = useState<Familie | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError, showSuccess } = useError();
    const { clubId, isSuperAdmin } = useClub();

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) { showError("Eroare Configurare", "Conexiunea la baza de date nu a putut fi stabilită."); return; }
        const trimmedName = newNume.trim();
        if (!trimmedName) { showError("Validare Eșuată", "Numele familiei este obligatoriu."); return; }
        if (familii.some(f => f.nume.toLowerCase() === trimmedName.toLowerCase())) { showError("Conflict", "O familie cu acest nume există deja."); return; }
        if (isSuperAdmin && !clubId) { showError("Acțiune Blocată", "Super Adminii trebuie să selecteze un club specific din header pentru a adăuga o familie."); return; }
        
        setLoading(true);
        const { data, error } = await supabase.from('familii').insert({ nume: trimmedName, club_id: clubId }).select().single();
        setLoading(false);

        if (error) { showError("Eroare la adăugare", error);
        } else if (data) {
            setFamilii(prev => [...prev, data as Familie]);
            setNewNume('');
            showSuccess('Succes', 'Familia a fost adăugată cu succes.');
        }
    };

    const handleEdit = async (id: string, updates: Partial<Familie>) => {
        if (!supabase) { showError("Eroare Configurare", "Conexiunea la baza de date nu a putut fi stabilită."); return; }
        // ... (existing edit logic)
    };

    const confirmDelete = async (id: string) => {
        if (!supabase) return;
        // ... (existing delete logic)
    };

    return (
        <div>
            {!isEmbedded && onBack && <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>}
            {/* ... rest of the component is unchanged */}
            <form onSubmit={handleAdd}>
                <div className="grid grid-cols-1">
                    <Input label="Nume Familie" value={newNume} onChange={e => setNewNume(e.target.value)} placeholder="Ex: Popescu" required/>
                </div>
                <div className="flex justify-end mt-4">
                    <Button type="submit" variant="info" isLoading={loading}>
                        <PlusIcon className="w-5 h-5 mr-2"/> Adaugă
                    </Button>
                </div>
            </form>
        </div>
    );
};