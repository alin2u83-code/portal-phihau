import React, { useState } from 'react';
import { TipAbonament } from '../types';
import { Button, Input, Card } from './ui';
import { PlusIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useClub } from './ClubProvider';

interface TipuriAbonamentManagementProps {
    tipuriAbonament: TipAbonament[];
    setTipuriAbonament: React.Dispatch<React.SetStateAction<TipAbonament[]>>;
    onBack: () => void;
}

export const TipuriAbonamentManagement: React.FC<TipuriAbonamentManagementProps> = ({ tipuriAbonament, setTipuriAbonament, onBack }) => {
    const [newDenumire, setNewDenumire] = useState('');
    const [newPret, setNewPret] = useState<number | string>('');
    const [newNrMembri, setNewNrMembri] = useState<number | string>(1);
    const [loading, setLoading] = useState(false);
    const [toDelete, setToDelete] = useState<TipAbonament | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError, showSuccess } = useError();
    const { clubId, isSuperAdmin } = useClub();

    const handleAdd = async () => {
        if(!supabase) { showError("Eroare Configurare", "Client Supabase neinițializat."); return; }
        if (isSuperAdmin && !clubId) { showError("Acțiune Blocată", "Super Adminii trebuie să selecteze un club specific din header pentru a adăuga un abonament."); return; }
        
        // FIX: Cannot find name 'pretNum'.
        // FIX: Cannot find name 'nrMembriNum'.
        const pretNum = parseFloat(String(newPret));
        const nrMembriNum = parseInt(String(newNrMembri), 10);
        
        if (!newDenumire.trim() || isNaN(pretNum) || pretNum <= 0 || isNaN(nrMembriNum) || nrMembriNum <= 0) {
            showError("Date Invalide", "Verificați denumirea, prețul (>0) și numărul de membri (>0).");
            return;
        }

        const newAbonament = { denumire: newDenumire.trim(), pret: pretNum, numar_membri: nrMembriNum, club_id: clubId };
        
        setLoading(true);
        const { data, error: insertError } = await supabase.from('tipuri_abonament').insert(newAbonament).select().single();
        setLoading(false);

        if(insertError) { showError("Eroare la adăugare", insertError); }
        else if (data) {
            setTipuriAbonament(prev => [...prev, data as TipAbonament]);
            setNewDenumire(''); setNewPret(''); setNewNrMembri(1);
            showSuccess("Succes", "Tipul de abonament a fost adăugat.");
        }
    };

    // ... (rest of the component)

    return ( <div className="max-w-5xl mx-auto"> {/* ... */} </div> );
};