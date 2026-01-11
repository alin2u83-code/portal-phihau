import React, { useState } from 'react';
// FIX: Replaced non-existent type 'ProgramItem' with 'Orar' from types.
import { Grupa, Orar } from '../types';
import { Button, Modal, Input, Select, ConfirmationModal } from './ui';
import { PlusIcon, TrashIcon, EditIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';

// Helper pentru sortarea programului în ordine cronologică
// FIX: Use 'Orar' type.
const zileSaptamanaOrdonate: Record<Orar['ziua'], number> = {
    'Luni': 1,
    'Marți': 2,
    'Miercuri': 3,
    'Joi': 4,
    'Vineri': 5,
    'Sâmbătă': 6,
    'Duminică': 7
};

// FIX: Use 'Orar' type.
const sortProgram = (program: Orar[]): Orar[] => {
    return [...program].sort((a, b) => {
        const ziCompare = zileSaptamanaOrdonate[a.ziua] - zileSaptamanaOrdonate[b.ziua];
        if (ziCompare !== 0) {
            return ziCompare;
        }
        return a.ora_start.localeCompare(b.ora_start);
    });
};

// Componentă pentru editarea programului
// FIX: Use 'Orar' type for props.
const ProgramEditor: React.FC<{ program: Orar[], setProgram: React.Dispatch<React.SetStateAction<Orar[]>> }> = ({ program, setProgram }) => {
    // FIX: Use 'Orar' type.
    const zileSaptamana: Orar['ziua'][] = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
    // FIX: Use a partial type for the new item form state.
    const [newItem, setNewItem] = useState<Omit<Orar, 'id' | 'grupa_id'>>({ ziua: 'Luni', ora_start: '18:00', ora_sfarsit: '19:30' });

    // FIX: Create a full 'Orar' object when adding a new item to the program.
    const handleAdd = () => {
        const completeItem: Orar = {
            ...newItem,
            id: '', // Will be set by DB
            grupa_id: '' // Will be set on save
        };
        setProgram(p => [...p, completeItem]);
    };
    const handleRemove = (index: number) => { 
        const sorted = sortProgram(program);
        const itemToRemove = sorted[index];
        // Elimină elementul pe baza referinței obiectului pentru a evita ștergerea duplicatelor
        setProgram(p => p.filter(item => item !== itemToRemove));
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setNewItem(prev => ({ ...prev, [e.target.name]: e.target.value as any })) };
    
    const sortedProgram = sortProgram(program);

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-lg font-semibold mb-2 text-white">Program Curent</h4>
                {sortedProgram.length > 0 ? ( sortedProgram.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 bg-slate-700 p-2 rounded mb-2">
                        <span className="font-semibold flex-grow">{item.ziua}: {item.ora_start} - {item.ora_sfarsit}</span>
                        <Button type="button" size="sm" variant="danger" onClick={() => handleRemove(index)}><TrashIcon /></Button>
                    </div>
                ))) : <p className="text-slate-400">Niciun interval adăugat.</p>}
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg space-y-2">
                 <h4 className="text-md font-semibold text-white">Adaugă Interval Nou</h4>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                    <Select label="Ziua" name="ziua" value={newItem.ziua} onChange={handleChange}>
                        {zileSaptamana.map(zi => <option key={zi} value={zi}>{zi}</option>)}
                    </Select>
                    <Input label="Ora Start" type="time" name="ora_start" value={newItem.ora_start} onChange={handleChange} />
                    <Input label="Ora Sfârșit" type="time" name="ora_sfarsit" value={newItem.ora_sfarsit} onChange={handleChange} />
                    <Button type="button" variant="info" onClick={handleAdd}><PlusIcon /></Button>
                 </div>
            </div>
        </div>
    );
};

// Modal pentru adăugare/editare grupă
const GrupaFormModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (grupa: Grupa) => Promise<void>; grupaToEdit: Grupa | null }> = ({ isOpen, onClose, onSave, grupaToEdit }) => {
    const [formState, setFormState] = useState({ denumire: '', sala: '' });
    // FIX: Use 'Orar' type for program state.
    const [program, setProgram] = useState<Orar[]>([]);
    const [loading, setLoading] = useState(false);
    
    React.useEffect(() => {
        if (isOpen) {
            setFormState({ denumire: grupaToEdit?.denumire || '', sala: grupaToEdit?.sala || '' });
            // FIX: Use 'orar' property instead of non-existent 'program'.
            setProgram(grupaToEdit?.orar || []);
        }
    }, [isOpen, grupaToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormState(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // FIX: Use 'orar' property to match the 'Grupa' type.
        const finalGrupa: Grupa = {
            id: grupaToEdit?.id || '', // ID-ul va fi setat la salvarea în DB dacă e grupă nouă
            ...formState,
            orar: program
        };
        await onSave(finalGrupa);
        setLoading(false);
        onClose();
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={grupaToEdit ? "Editează Grupă" : "Adaugă Grupă Nouă"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Denumire Grupă" name="denumire" value={formState.denumire} onChange={handleChange} required />
                <Input label="Sala" name="sala" value={formState.sala} onChange={handleChange} />
                <ProgramEditor program={program} setProgram={setProgram} />
                <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button variant="success" type="submit" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button></div>
            </form>
        </Modal>
    );
};


interface GrupeManagementProps { grupe: Grupa[]; setGrupe: React.Dispatch<React.SetStateAction<Grupa[]>>; onBack: () => void; }
export const GrupeManagement: React.FC<GrupeManagementProps> = ({ grupe, setGrupe, onBack }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [grupaToEdit, setGrupaToEdit] = useState<Grupa | null>(null);
  const [grupaToDelete, setGrupaToDelete] = useState<Grupa | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const handleSave = async (grupaData: Grupa) => {
      if (!supabase) return;
      
      // FIX: Use 'orar' property instead of non-existent 'program'.
      const { orar, ...grupaInfo } = grupaData;

      if (grupaToEdit) { // Editare
          const { data, error } = await supabase.from('grupe').update(grupaInfo).eq('id', grupaToEdit.id).select().single();
          if (error) { alert(`Eroare la actualizarea grupei: ${error.message}`); return; }

          // Sincronizează programul
          const { error: deleteError } = await supabase.from('program_antrenamente').delete().eq('grupa_id', grupaToEdit.id);
          if (deleteError) { alert(`Eroare la sincronizarea programului (1/2): ${deleteError.message}`); return; }

          const programToInsert = orar.map(p => ({ ...p, grupa_id: grupaToEdit.id }));
          const { error: insertError } = await supabase.from('program_antrenamente').insert(programToInsert);
          if (insertError) { alert(`Eroare la sincronizarea programului (2/2): ${insertError.message}`); return; }

          if (data) setGrupe(prev => prev.map(g => g.id === grupaToEdit.id ? { ...data, orar } : g));

      } else { // Adăugare
          const { id, ...newGrupaData } = grupaInfo; // Exclude ID-ul, va fi generat de DB
          const { data, error } = await supabase.from('grupe').insert(newGrupaData).select().single();
          if (error) { alert(`Eroare la adăugarea grupei: ${error.message}`); return; }

          if (data) {
              const newGrupaId = data.id;
              const programToInsert = orar.map(p => ({ ...p, grupa_id: newGrupaId }));
              const { error: insertError } = await supabase.from('program_antrenamente').insert(programToInsert);
              if (insertError) { alert(`Grupă creată, dar eroare la salvarea programului: ${insertError.message}`); }
              
              setGrupe(prev => [...prev, { ...data, orar }]);
          }
      }
  };
  
  const handleOpenAdd = () => { setGrupaToEdit(null); setIsModalOpen(true); };
  const handleOpenEdit = (grupa: Grupa) => { setGrupaToEdit(grupa); setIsModalOpen(true); };

  const confirmDelete = async () => {
    if (!supabase || !grupaToDelete) return;
    setDeleteLoading(true);
    // Șterge întâi programul asociat (foreign key constraint)
    const { error: programError } = await supabase.from('program_antrenamente').delete().eq('grupa_id', grupaToDelete.id);
    if (programError) { 
        alert(`Eroare la ștergerea programului asociat: ${programError.message}`); 
        setDeleteLoading(false);
        setGrupaToDelete(null);
        return; 
    }
    
    // Apoi șterge grupa
    const { error: grupaError } = await supabase.from('grupe').delete().eq('id', grupaToDelete.id);
    if (grupaError) { 
        alert(`Eroare la ștergerea grupei: ${grupaError.message}`); 
    } else {
        setGrupe(prev => prev.filter(g => g.id !== grupaToDelete.id));
    }
    setDeleteLoading(false);
    setGrupaToDelete(null);
  };

  return (
    <div>
       <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Management Grupe & Orar</h1>
        <Button onClick={handleOpenAdd} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Grupă</Button>
      </div>
      <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Denumire</th><th className="p-4 font-semibold">Sală</th><th className="p-4 font-semibold">Program</th><th className="p-4 font-semibold text-right">Acțiuni</th></tr></thead>
          <tbody className="divide-y divide-slate-700">
            {grupe.map(grupa => (
              <tr key={grupa.id}>
                <td className="p-4 font-medium">{grupa.denumire}</td>
                <td className="p-4">{grupa.sala}</td>
                <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                        {/* FIX: Use 'orar' property instead of non-existent 'program'. */}
                        {sortProgram(grupa.orar).map((p, i) => <span key={i} className="bg-slate-600 text-slate-200 text-xs font-semibold px-2 py-1 rounded-full">{p.ziua} {p.ora_start}-{p.ora_sfarsit}</span>)}
                    </div>
                </td>
                <td className="p-2 text-right w-32">
                    <div className="flex justify-end gap-2">
                        <Button onClick={() => handleOpenEdit(grupa)} variant="primary" size="sm"><EditIcon /></Button>
                        <Button onClick={() => setGrupaToDelete(grupa)} variant="danger" size="sm"><TrashIcon /></Button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {grupe.length === 0 && <p className="p-4 text-center text-slate-400">Nicio grupă definită.</p>}
      </div>
      <GrupaFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} grupaToEdit={grupaToEdit} />
      <ConfirmationModal
        isOpen={!!grupaToDelete}
        onClose={() => setGrupaToDelete(null)}
        onConfirm={confirmDelete}
        title="Confirmare Ștergere Grupă"
        message="Sunteți sigur că doriți să ștergeți această înregistrare? Această acțiune este ireversibilă."
        loading={deleteLoading}
      />
    </div>
  );
};
