import React, { useState } from 'react';
import { Reducere } from '../types';
import { Button, Input, Card, Select } from './ui';
import { PlusIcon, TrashIcon, ArrowLeftIcon, EditIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useClub } from './ClubProvider';

interface ReduceriManagementProps {
    reduceri: Reducere[];
    setReduceri: React.Dispatch<React.SetStateAction<Reducere[]>>;
    onBack: () => void;
}

const initialFormState: Omit<Reducere, 'id'> = {
    nume: '',
    tip: 'procent',
    valoare: 0,
    este_activa: true,
    categorie_aplicabila: 'Toate'
};

export const ReduceriManagement: React.FC<ReduceriManagementProps> = ({ reduceri, setReduceri, onBack }) => {
    const [formState, setFormState] = useState(initialFormState);
    const [editingReducere, setEditingReducere] = useState<Reducere | null>(null);
    const [toDelete, setToDelete] = useState<Reducere | null>(null);
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError, showSuccess } = useError();
    const { clubId, isSuperAdmin } = useClub();
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { /* ... */ };
    
    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) { showError("Eroare Configurare", "Client Supabase neinițializat."); return; }
        if (!formState.nume.trim()) { showError("Validare Eșuată", "Numele este obligatoriu."); return; }
        if (isSuperAdmin && !clubId) { showError("Acțiune Blocată", "Super Adminii trebuie să selecteze un club specific din header pentru a adăuga o reducere."); return; }
        
        setLoading(true);
        const { data, error } = await supabase.from('reduceri').insert({ ...formState, club_id: clubId }).select().single();
        setLoading(false);
        
        if(error) { showError("Eroare la adăugare", error); }
        else if (data) {
            setReduceri(prev => [...prev, data as Reducere]);
            setFormState(initialFormState);
            showSuccess("Succes", "Reducerea a fost adăugată.");
        }
    };
    
    const handleSaveEdit = async () => { /* ... */ };
    const confirmDelete = async (id: string) => { /* ... */ };

    return ( <div className="max-w-5xl mx-auto space-y-6"> {/* ... */} </div> );
};