import React, { useState } from 'react';
import { Grupa, ProgramItem } from '../types';
import { Button, Modal, Input, Select } from './ui';
import { PlusIcon, TrashIcon, EditIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';

// Componentă pentru editarea programului
const ProgramEditor: React.FC<{ program: ProgramItem[], setProgram: React.Dispatch<React.SetStateAction<ProgramItem[]>> }> = ({ program, setProgram }) => {
    const zileSaptamana: ProgramItem['ziua'][] = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
    const [newItem, setNewItem] = useState<ProgramItem>({ ziua: 'Luni', ora_start: '18:00', ora_sfarsit: '19:30' });

    const handleAdd = () => { setProgram(p => [...p, newItem]); };
    const handleRemove = (index: number) => { setProgram(p => p.filter((_, i) => i !== index)); };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setNewItem(prev => ({ ...prev, [e.target.name]: e.target.value })) };
    
    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-lg font-semibold mb-2 text-white">Program Curent</h4>
                {program.length > 0 ? ( program.map((item, index) => (
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
    const [program, setProgram] = useState<ProgramItem[]>([]);
    const [loading, setLoading] = useState(false);
    
    React.useEffect(() => {
        if (isOpen) {
            setFormState({ denumire: grupaToEdit?.denumire || '', sala: grupaToEdit?.sala || '' });
            setProgram(grupaToEdit?.program || []);
        }
    }, [isOpen, grupaToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormState(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const finalGrupa: Grupa = {
            id: grupaToEdit?.id || '', // ID-ul va fi setat la salvarea în DB dacă e grupă nouă
            ...formState,
            program
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
  
  const handleSave = async (grupaData: Grupa) => {
      if (!supabase) return;
      
      const { program, ...grupaInfo } = grupaData;

      if (grupaToEdit) { // Editare
          const { data, error } = await supabase.from('grupe').update(grupaInfo).eq('id', grupaToEdit.id).select().single();
          if (error) { alert(`Eroare la actualizarea grupei: ${error.message}`); return; }

          // Sincronizează programul
          const { error: deleteError } = await supabase.from('program_antrenamente').delete().eq('grupa_id', grupaToEdit.id);
          if (deleteError) { alert(`Eroare la sincronizarea programului (1/2): ${deleteError.message}`); return; }

          const programToInsert = program.map(p => ({ ...p, grupa_id: grupaToEdit.id }));
          const { error: insertError } = await supabase.from('program_antrenamente').insert(programToInsert);
          if (insertError) { alert(`Eroare la sincronizarea programului (2/2): ${insertError.message}`); return; }

          if (data) setGrupe(prev => prev.map(g => g.id === grupaToEdit.id ? { ...data, program } : g));

      } else { // Adăugare
          const { data, error } = await supabase.from('grupe').insert(grupaInfo).select().single();
          if (error) { alert(`Eroare la adăugarea grupei: ${error.message}`); return; }

          if (data) {
              const newGrupaId = data.id;
              const programToInsert = program.map(p => ({ ...p, grupa_id: newGrupaId }));
              const { error: insertError } = await supabase.from('program_antrenamente').insert(programToInsert);
              if (insertError) { alert(`Grupă creată, dar eroare la salvarea programului: ${insertError.message}`); }
              
              setGrupe(prev => [...prev, { ...data, program }]);
          }
      }
  };
  
  const handleOpenAdd = () => { setGrupaToEdit(null); setIsModalOpen(true); };
  const handleOpenEdit = (grupa: Grupa) => { setGrupaToEdit(grupa); setIsModalOpen(true); };

  const handleDelete = async (grupaId: string) => {
    if (!supabase) return;
    if (window.confirm("Ești sigur că vrei să ștergi această grupă? Sportivii alocați vor rămâne fără grupă.")) {
        // Șterge întâi programul asociat (foreign key constraint)
        const { error: programError } = await supabase.from('program_antrenamente').delete().eq('grupa_id', grupaId);
        if (programError) { alert(`Eroare la ștergerea programului asociat: ${programError.message}`); return; }
        
        // Apoi șterge grupa
        const { error: grupaError } = await supabase.from('grupe').delete().eq('id', grupaId);
        if (grupaError) { alert(`Eroare la ștergerea grupei: ${grupaError.message}`); return; }
        
        setGrupe(prev => prev.filter(g => g.id !== grupaId));
    }
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
                        {grupa.program.map((p, i) => <span key={i} className="bg-slate-600 text-slate-200 text-xs font-semibold px-2 py-1 rounded-full">{p.ziua} {p.ora_start}-{p.ora_sfarsit}</span>)}
                    </div>
                </td>
                <td className="p-2 text-right">
                    <div className="flex justify-end gap-2">
                        <Button onClick={() => handleOpenEdit(grupa)} variant="primary" size="sm"><EditIcon /></Button>
                        <Button onClick={() => handleDelete(grupa.id)} variant="danger" size="sm"><TrashIcon /></Button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {grupe.length === 0 && <p className="p-4 text-center text-slate-400">Nicio grupă definită.</p>}
      </div>
      <GrupaFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} grupaToEdit={grupaToEdit} />
    </div>
  );
};