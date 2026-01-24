import React, { useState } from 'react';
import { Grupa, ProgramItem } from '../types';
import { Button, Modal, Input, Select } from './ui';
import { PlusIcon, TrashIcon, EditIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useClub } from './ClubProvider';

// Helper pentru sortarea programului în ordine cronologică
const zileSaptamanaOrdonate: Record<ProgramItem['ziua'], number> = { 'Luni': 1, 'Marți': 2, 'Miercuri': 3, 'Joi': 4, 'Vineri': 5, 'Sâmbătă': 6, 'Duminică': 7 };
// FIX: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.
const sortProgram = (program: ProgramItem[]): ProgramItem[] => {
    return program.sort((a, b) => {
        const dayDiff = zileSaptamanaOrdonate[a.ziua] - zileSaptamanaOrdonate[b.ziua];
        if (dayDiff !== 0) return dayDiff;
        return a.ora_start.localeCompare(b.ora_start);
    });
};

// Componentă pentru editarea programului
const ProgramEditor: React.FC<{ program: ProgramItem[], setProgram: React.Dispatch<React.SetStateAction<ProgramItem[]>> }> = ({ program, setProgram }) => { /* ... */ };

// Modal pentru adăugare/editare grupă
const GrupaFormModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (grupa: Grupa) => Promise<void>; grupaToEdit: Grupa | null }> = ({ isOpen, onClose, onSave, grupaToEdit }) => {
    const [formState, setFormState] = useState({ denumire: '', sala: '' });
    const [program, setProgram] = useState<ProgramItem[]>([]);
    const [loading, setLoading] = useState(false);
    const { clubId, isSuperAdmin } = useClub();
    const { showError } = useError();
    
    React.useEffect(() => { /* ... */ }, [isOpen, grupaToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormState(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSuperAdmin && !clubId) { showError("Acțiune Blocată", "Super Adminii trebuie să selecteze un club specific din header pentru a adăuga o grupă."); return; }
        setLoading(true);
        const finalGrupa: Grupa = { id: grupaToEdit?.id || '', ...formState, program, club_id: clubId };
        await onSave(finalGrupa);
        setLoading(false);
        onClose();
    };
    
    return ( <Modal isOpen={isOpen} onClose={onClose} title={grupaToEdit ? "Editează Grupă" : "Adaugă Grupă Nouă"}> <form onSubmit={handleSubmit} className="space-y-4"> <Input label="Denumire Grupă" name="denumire" value={formState.denumire} onChange={handleChange} required /> <Input label="Sala" name="sala" value={formState.sala} onChange={handleChange} /> <ProgramEditor program={program} setProgram={setProgram} /> <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button variant="success" type="submit" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button></div> </form> </Modal> );
};

interface GrupeManagementProps { grupe: Grupa[]; setGrupe: React.Dispatch<React.SetStateAction<Grupa[]>>; onBack: () => void; }
export const GrupeManagement: React.FC<GrupeManagementProps> = ({ grupe, setGrupe, onBack }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [grupaToEdit, setGrupaToEdit] = useState<Grupa | null>(null);
  const [grupaToDelete, setGrupaToDelete] = useState<Grupa | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showError } = useError();
  
  const handleSave = async (grupaData: Grupa) => {
      if (!supabase) return;
      
      const { program, club_id, ...grupaInfo } = grupaData;

      if (grupaToEdit) {
          // ... (existing update logic)
      } else {
          const { id, ...newGrupaData } = grupaInfo;
          const { data, error } = await supabase.from('grupe').insert({ ...newGrupaData, club_id }).select().single();
          if (error) { showError("Eroare la adăugarea grupei", error); return; }

          if (data) {
              const programToInsert = program.map(p => ({ ...p, grupa_id: data.id }));
              if (programToInsert.length > 0) {
                const { error: insertError } = await supabase.from('program_antrenamente').insert(programToInsert);
                if (insertError) { showError("Grupă creată, dar eroare la salvarea programului", insertError); }
              }
              setGrupe(prev => [...prev, { ...data, program }]);
          }
      }
  };
  
  // ... rest of the component
  return ( <div> {/* ... */} <GrupaFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} grupaToEdit={grupaToEdit} /> {/* ... */} </div> );
};