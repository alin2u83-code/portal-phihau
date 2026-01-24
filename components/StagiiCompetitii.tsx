import React, { useState, useMemo } from 'react';
import { Eveniment, Rezultat, Sportiv, Plata, PretConfig, Participare, Examen, Grad } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { getPretValabil } from '../utils/pricing';
import { supabase } from '../supabaseClient';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useClub } from './ClubProvider';

// ... (EvenimentDetail component remains the same)

// --- Componenta Principală ---
interface StagiiCompetitiiProps { type: 'Stagiu' | 'Competitie'; evenimente: Eveniment[]; setEvenimente: React.Dispatch<React.SetStateAction<Eveniment[]>>; rezultate: Rezultat[]; setRezultate: React.Dispatch<React.SetStateAction<Rezultat[]>>; sportivi: Sportiv[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; preturiConfig: PretConfig[]; participari: Participare[]; examene: Examen[]; grade: Grad[]; onBack: () => void; }
export const StagiiCompetitiiManagement: React.FC<StagiiCompetitiiProps> = ({ type, evenimente, setEvenimente, rezultate, setRezultate, sportivi, setPlati, preturiConfig, participari, examene, grade, onBack }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [evToEdit, setEvToEdit] = useState<Eveniment | null>(null);
    const [evToDelete, setEvToDelete] = useState<Eveniment | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedEvenimentId, setSelectedEvenimentId] = useLocalStorage<string | null>(`phi-hau-selected-${type}`, null);
    const { showError, showSuccess } = useError();
    const { clubId, isSuperAdmin } = useClub();
    
    const filteredEvenimente = useMemo(() => evenimente.filter(ev => ev.tip === type), [evenimente, type]);
    const selectedEveniment = useMemo(() => selectedEvenimentId ? filteredEvenimente.find(e => e.id === selectedEvenimentId) || null : null, [selectedEvenimentId, filteredEvenimente]);

    const handleSave = async (evData: Omit<Eveniment, 'id'>) => {
        if (isSuperAdmin && !clubId) { showError("Acțiune Blocată", "Super Adminii trebuie să selecteze un club specific din header pentru a adăuga un eveniment."); return; }
        const dataToSave = { ...evData, club_id: evToEdit ? evToEdit.club_id : clubId };

        if (evToEdit) {
            const { data, error } = await supabase.from('evenimente').update(dataToSave).eq('id', evToEdit.id).select().single();
            if (error) { showError("Eroare la actualizare", error); } else if (data) { setEvenimente(prev => prev.map(e => e.id === data.id ? data : e)); showSuccess("Succes", `${type} actualizat.`); }
        } else {
            const { data, error } = await supabase.from('evenimente').insert(dataToSave).select().single();
            if (error) { showError("Eroare la adăugare", error); } else if (data) { setEvenimente(prev => [...prev, data]); showSuccess("Succes", `${type} adăugat.`); }
        }
    };
    
    const confirmDelete = async (id: string) => { /* ... */ };

    // ... (rest of the component)
    return ( <div><Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button><div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-white">Gestiune {type === 'Stagiu' ? 'Stagii' : 'Competiții'}</h1><Button onClick={() => { setEvToEdit(null); setIsFormOpen(true); }} variant="info"><PlusIcon className="w-5 h-5 mr-2" /> Adaugă {type}</Button></div>{/*...*/}</div> );
};