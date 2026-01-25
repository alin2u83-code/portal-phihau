import React, { useState } from 'react';
import { Grupa, ProgramItem, User, Club } from '../types';
import { Button, Modal, Input, Select } from './ui';
import { PlusIcon, TrashIcon, EditIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

// Helper pentru sortarea programului în ordine cronologică
const zileSaptamanaOrdonate: Record<ProgramItem['ziua'], number> = { 'Luni': 1, 'Marți': 2, 'Miercuri': 3, 'Joi': 4, 'Vineri': 5, 'Sâmbătă': 6, 'Duminică': 7 };
const sortProgram = (program: ProgramItem[]): ProgramItem[] => {
    return [...program].sort((a, b) => {
        const ziCompare = zileSaptamanaOrdonate[a.ziua] - zileSaptamanaOrdonate[b.ziua];
        if (ziCompare !== 0) return ziCompare;
        return a.ora_start.localeCompare(b.ora_start);
    });
};

// Componentă pentru editarea programului
const ProgramEditor: React.FC<{ program: ProgramItem[], setProgram: React.Dispatch<React.SetStateAction<ProgramItem[]>> }> = ({ program, setProgram }) => {
    const zileSaptamana: ProgramItem['ziua'][] = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
    // FIX: The state for a new item should not be a full ProgramItem, as it lacks an ID.
    const [newItem, setNewItem] = useState<Omit<ProgramItem, 'id'>>({ ziua: 'Luni', ora_start: '18:00', ora_sfarsit: '19:30', is_activ: true });

    // FIX: Generate a temporary unique ID when adding a new item to the program list.
    const handleAdd = () => { setProgram(p => [...p, { ...newItem, id: `new-${Date.now()}-${Math.random()}`}]); };
    const handleRemove = (itemToRemoveRef: ProgramItem) => {
        setProgram(p => p.filter(item => item !== itemToRemoveRef));
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setNewItem(prev => ({ ...prev, [e.target.name]: e.target.value as any })) };
    
    const handleToggle = (itemToToggleRef: ProgramItem) => {
        setProgram(p => p.map(item =>
            item === itemToToggleRef
            ? { ...item, is_activ: !(item.is_activ ?? true) }
            : item
        ));
    };

    const sortedProgram = sortProgram(program);

    return ( <div className="space-y-4"> <div> <h4 className="text-lg font-semibold mb-2 text-white">Program Curent</h4> {sortedProgram.length > 0 ? ( sortedProgram.map((item, index) => ( 
    <div key={index} className="flex items-center gap-3 bg-slate-700 p-2 rounded mb-2">
        <input
            type="checkbox"
            checked={item.is_activ ?? true}
            onChange={() => handleToggle(item)}
            className="form-checkbox h-5 w-5 shrink-0 rounded bg-slate-800 border-slate-600 text-brand-secondary focus:ring-brand-secondary cursor-pointer"
            title={ (item.is_activ ?? true) ? "Dezactivează acest interval" : "Activează acest interval" }
        />
        <span className={`font-semibold flex-grow ${ (item.is_activ ?? true) ? 'text-white' : 'text-slate-500 line-through'}`}>{item.ziua}: {item.ora_start} - {item.ora_sfarsit}</span>
        <Button type="button" size="sm" variant="danger" onClick={() => handleRemove(item)}><TrashIcon /></Button> 
    </div> ))) : <p className="text-slate-400">Niciun interval adăugat.</p>} </div> <div className="p-4 bg-slate-900/50 rounded-lg space-y-2"> <h4 className="text-md font-semibold text-white">Adaugă Interval Nou</h4> <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end"> <Select label="Ziua" name="ziua" value={newItem.ziua} onChange={handleChange}> {zileSaptamana.map(zi => <option key={zi} value={zi}>{zi}</option>)} </Select> <Input label="Ora Start" type="time" name="ora_start" value={newItem.ora_start} onChange={handleChange} /> <Input label="Ora Sfârșit" type="time" name="ora_sfarsit" value={newItem.ora_sfarsit} onChange={handleChange} /> <Button type="button" variant="info" onClick={handleAdd}><PlusIcon /></Button> </div> </div> </div> );
};

// Modal pentru adăugare/editare grupă
const GrupaFormModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (grupa: Grupa) => Promise<void>; grupaToEdit: Grupa | null; currentUser: User; clubs: Club[]; }> = ({ isOpen, onClose, onSave, grupaToEdit, currentUser, clubs }) => {
    const [formState, setFormState] = useState({ denumire: '', sala: '', club_id: '' });
    const [program, setProgram] = useState<ProgramItem[]>([]);
    const [loading, setLoading] = useState(false);
    const { showError } = useError();
    const isFederationAdmin = currentUser.roluri.some(r => r.nume === 'Super Admin' || r.nume === 'Admin');

    React.useEffect(() => {
        if (isOpen) {
            setFormState({ 
                denumire: grupaToEdit?.denumire || '', 
                sala: grupaToEdit?.sala || '',
                club_id: grupaToEdit?.club_id || (isFederationAdmin ? '' : currentUser.club_id || '')
            });
            setProgram(grupaToEdit?.program || []);
        }
    }, [isOpen, grupaToEdit, currentUser, isFederationAdmin]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormState(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isFederationAdmin && !formState.club_id) {
            showError("Validare eșuată", "Super Adminii trebuie să selecteze un club.");
            return;
        }
        setLoading(true);
        const finalGrupa: Grupa = { 
            id: grupaToEdit?.id || '', 
            denumire: formState.denumire,
            sala: formState.sala,
            program: program,
            club_id: formState.club_id || null
        };
        await onSave(finalGrupa);
        setLoading(false);
        onClose();
    };
    
    return ( <Modal isOpen={isOpen} onClose={onClose} title={grupaToEdit ? "Editează Grupă" : "Adaugă Grupă Nouă"}> <form onSubmit={handleSubmit} className="space-y-4"> <Input label="Denumire Grupă" name="denumire" value={formState.denumire} onChange={handleChange} required />
    {isFederationAdmin && (
        <Select label="Club" name="club_id" value={formState.club_id} onChange={handleChange} required>
            <option value="">Selectează club...</option>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
        </Select>
    )}
    <Input label="Sala" name="sala" value={formState.sala} onChange={handleChange} /> <ProgramEditor program={program} setProgram={setProgram} /> <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button variant="success" type="submit" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button></div> </form> </Modal> );
};


interface GrupeManagementProps { 
    grupe: Grupa[]; 
    setGrupe: React.Dispatch<React.SetStateAction<Grupa[]>>; 
    onBack: () => void; 
    currentUser: User;
    clubs: Club[];
}
export const GrupeManagement: React.FC<GrupeManagementProps> = ({ grupe, setGrupe, onBack, currentUser, clubs }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [grupaToEdit, setGrupaToEdit] = useState<Grupa | null>(null);
  const [grupaToDelete, setGrupaToDelete] = useState<Grupa | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showError } = useError();
  
  const handleSave = async (grupaData: Grupa) => {
      if (!supabase) return;
      
      const { program, ...grupaInfo } = grupaData;

      if (grupaToEdit) {
          const { data, error } = await supabase.from('grupe').update(grupaInfo).eq('id', grupaToEdit.id).select().single();
          if (error) { showError("Eroare la actualizarea grupei", error); return; }

          const { error: deleteError } = await supabase.from('program_antrenamente').delete().eq('grupa_id', grupaToEdit.id).is('data', null);
          if (deleteError) { showError("Eroare la sincronizarea programului (1/2)", deleteError); return; }

          const programToInsert = program.map(p => ({ ...p, grupa_id: grupaToEdit.id }));
          if (programToInsert.length > 0) {
            const { error: insertError } = await supabase.from('program_antrenamente').insert(programToInsert);
            if (insertError) { showError("Eroare la sincronizarea programului (2/2)", insertError); return; }
          }
          if (data) setGrupe(prev => prev.map(g => g.id === grupaToEdit.id ? { ...data, program } : g));
      } else {
          const { id, ...newGrupaData } = grupaInfo;
          const { data, error } = await supabase.from('grupe').insert(newGrupaData).select().single();
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
  
  const handleOpenAdd = () => { setGrupaToEdit(null); setIsModalOpen(true); };
  const handleOpenEdit = (grupa: Grupa) => { setGrupaToEdit(grupa); setIsModalOpen(true); };

  const confirmDelete = async (grupaId: string) => {
    if (!supabase) return;
    setIsDeleting(true);
    try {
        const { data: sportiviData, error: sportiviError } = await supabase.from('sportivi').select('id').eq('grupa_id', grupaId).limit(1);
        if(sportiviError) throw new Error(`Verificare eșuată: ${sportiviError.message}`);
        if(sportiviData && sportiviData.length > 0) {
            showError("Ștergere Blocată", "Această grupă nu poate fi ștearsă deoarece are sportivi asignați. Mutați sportivii în altă grupă mai întâi.");
            throw new Error("Deletion blocked due to assigned athletes.");
        }
        
        const { error: programError } = await supabase.from('program_antrenamente').delete().eq('grupa_id', grupaId);
        if (programError) throw programError;
        
        const { error: grupaError } = await supabase.from('grupe').delete().eq('id', grupaId);
        if (grupaError) throw grupaError;
        
        setGrupe(prev => prev.filter(g => g.id !== grupaId));
    } catch (err: any) {
        if (err.message !== "Deletion blocked due to assigned athletes.") {
            showError("Eroare la ștergerea grupei", err);
        }
    } finally {
        setIsDeleting(false);
        setGrupaToDelete(null);
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
                        {sortProgram(grupa.program).map((p, i) => <span key={i} className={`text-xs font-semibold px-2 py-1 rounded-full ${p.is_activ ?? true ? 'bg-slate-600 text-slate-200' : 'bg-slate-800 text-slate-500 line-through'}`}>{p.ziua} {p.ora_start}-{p.ora_sfarsit}</span>)}
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
      <GrupaFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} grupaToEdit={grupaToEdit} currentUser={currentUser} clubs={clubs} />
      <ConfirmDeleteModal isOpen={!!grupaToDelete} onClose={() => setGrupaToDelete(null)} onConfirm={() => { if(grupaToDelete) confirmDelete(grupaToDelete.id) }} tableName="Grupe" isLoading={isDeleting} />
    </div>
  );
};