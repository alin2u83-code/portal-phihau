import React, { useState, useMemo, useEffect } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Locatie, Plata, PretConfig } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ManagementInscrieri } from './ManagementInscrieri';
import { useClub } from './ClubProvider';

// --- SUB-COMPONENTE PENTRU MANAGEMENTUL SESIUNILOR (PĂSTRATE) ---

const ComisieEditor: React.FC<{
    membri: string[];
    setMembri: (membri: string[]) => void;
}> = ({ membri, setMembri }) => {
    const [newMembru, setNewMembru] = useState('');

    const handleAdd = () => {
        const trimmed = newMembru.trim();
        if (trimmed && !membri.includes(trimmed)) {
            setMembri([...membri, trimmed]);
            setNewMembru('');
        }
    };

    const handleRemove = (membruToRemove: string) => {
        setMembri(membri.filter(m => m !== membruToRemove));
    };

    return (
        <div>
            <label className="block text-[11px] uppercase font-bold text-slate-400 mb-2 ml-1">Membri Comisie</label>
            <div className="space-y-2 mb-3">
                {membri.map(membru => (
                    <div key={membru} className="bg-slate-700/50 p-2 rounded-md flex justify-between items-center text-sm">
                        <span className="font-medium text-white">{membru}</span>
                        <Button type="button" size="sm" variant="danger" onClick={() => handleRemove(membru)} className="!p-1.5 h-auto" title={`Elimină pe ${membru}`}>
                            <TrashIcon className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
                {membri.length === 0 && <p className="text-xs text-slate-500 italic text-center py-2">Niciun membru adăugat.</p>}
            </div>
            <div className="flex items-end gap-2">
                <div className="flex-grow">
                    <Input label="" value={newMembru} onChange={e => setNewMembru(e.target.value)} placeholder="Nume și prenume membru..." 
                        onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}/>
                </div>
                <Button type="button" variant="info" onClick={handleAdd} className="h-[38px] aspect-square p-0" title="Adaugă membru">
                    <PlusIcon className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
};

interface LocatieFormProps { isOpen: boolean; onClose: () => void; onSave: (locatieData: { nume: string; adresa: string; club_id: string | null }) => Promise<void>; }
const LocatieFormModal: React.FC<LocatieFormProps> = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({ nume: '', adresa: '' });
  const [loading, setLoading] = useState(false);
  const { showError } = useError();
  const { clubId, isSuperAdmin } = useClub();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nume.trim()) { showError("Validare eșuată", "Numele locației este obligatoriu."); return; }
    // Super admin must be viewing a specific club to add a location
    if (isSuperAdmin && !clubId) { showError("Acțiune Blocată", "Super Adminii trebuie să selecteze un club specific din header pentru a adăuga o locație."); return; }
    setLoading(true);
    await onSave({ nume: form.nume.trim(), adresa: form.adresa.trim(), club_id: clubId });
    setLoading(false);
    setForm({ nume: '', adresa: '' });
  };

  return ( <Modal isOpen={isOpen} onClose={onClose} title="Adaugă Locație Nouă"> <form onSubmit={handleSubmit} className="space-y-4"> <Input label="Nume Locație" name="nume" value={form.nume} onChange={handleChange} required /> <Input label="Adresă (Opțional)" name="adresa" value={form.adresa} onChange={handleChange} /> <div className="flex justify-end pt-4 space-x-2"> <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button> <Button variant="success" type="submit" isLoading={loading}>Salvează Locația</Button> </div> </form> </Modal> );
};

interface SesiuneFormProps { isOpen: boolean; onClose: () => void; onSave: (sesiune: Partial<SesiuneExamen> & { club_id: string | null }) => Promise<void>; sesiuneToEdit: SesiuneExamen | null; locatii: Locatie[]; setLocatii: React.Dispatch<React.SetStateAction<Locatie[]>>; }
const SesiuneForm: React.FC<SesiuneFormProps> = ({ isOpen, onClose, onSave, sesiuneToEdit, locatii, setLocatii }) => {
  const [formState, setFormState] = useState<Partial<SesiuneExamen>>({ data: new Date().toISOString().split('T')[0], locatie_id: '', comisia: [] });
  const [loading, setLoading] = useState(false);
  const [isLocatieModalOpen, setIsLocatieModalOpen] = useState(false);
  const { showError, showSuccess } = useError();
  const { clubId, isSuperAdmin } = useClub();

  useEffect(() => { /* ... (existing logic) */ }, [sesiuneToEdit, isOpen]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormState(p => ({ ...p, [e.target.name]: e.target.value }));
  
  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSuperAdmin && !clubId) { showError("Acțiune Blocată", "Super Adminii trebuie să selecteze un club specific din header pentru a adăuga o sesiune."); return; }
      setLoading(true);
      await onSave({ ...formState, club_id: clubId });
      setLoading(false);
      onClose();
  };

  const handleSaveLocatie = async (locatieData: { nume: string, adresa: string, club_id: string | null }) => {
    if (!supabase) { showError("Eroare", "Client Supabase neconfigurat."); return; }
    const { data, error } = await supabase.from('nom_locatii').insert(locatieData).select().single();
    if (error) { showError("Eroare la salvare locație", error); } 
    else if (data) { setLocatii(prev => [...prev, data]); setFormState(p => ({ ...p, locatie_id: data.id })); setIsLocatieModalOpen(false); showSuccess("Succes", "Locația a fost adăugată."); }
  };

  return ( <> <Modal isOpen={isOpen} onClose={onClose} title={sesiuneToEdit ? "Editează Sesiune Examen" : "Adaugă Sesiune Nouă"}> <form onSubmit={handleSubmit} className="space-y-4"> <Input label="Data Examenului" name="data" type="date" value={formState.data} onChange={handleChange} required /> <div className="flex items-end gap-2"> <div className="flex-grow"> <Select label="Locația" name="locatie_id" value={formState.locatie_id || ''} onChange={handleChange} required> <option value="">Selectează locația...</option> {locatii.map(l => <option key={l.id} value={l.id}>{l.nume}</option>)} </Select> </div> <Button type="button" variant="secondary" onClick={() => setIsLocatieModalOpen(true)} className="h-[38px] aspect-square p-0" title="Adaugă locație nouă"><PlusIcon className="w-5 h-5"/></Button> </div> <ComisieEditor membri={formState.comisia || []} setMembri={(newMembri) => setFormState(p => ({ ...p, comisia: newMembri }))} /> <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button variant="success" type="submit" isLoading={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button></div> </form> </Modal> <LocatieFormModal isOpen={isLocatieModalOpen} onClose={() => setIsLocatieModalOpen(false)} onSave={handleSaveLocatie} /> </> );
};

// ... Rest of the file
// --- COMPONENTA PRINCIPALĂ (REFActorizată) ---
interface GestiuneExameneProps { 
    onBack: () => void; 
    sesiuni: SesiuneExamen[]; 
    setSesiuni: React.Dispatch<React.SetStateAction<SesiuneExamen[]>>; 
    inscrieri: InscriereExamen[]; 
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>; 
    sportivi: Sportiv[]; 
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>; 
    grade: Grad[]; 
    locatii: Locatie[]; 
    setLocatii: React.Dispatch<React.SetStateAction<Locatie[]>>; 
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    preturiConfig: PretConfig[];
}

export const GestiuneExamene: React.FC<GestiuneExameneProps> = ({ onBack, sesiuni, setSesiuni, inscrieri, setInscrieri, sportivi, setSportivi, grade, locatii, setLocatii, plati, setPlati, preturiConfig }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sesiuneToEdit, setSesiuneToEdit] = useState<SesiuneExamen | null>(null);
  const [sesiuneToDelete, setSesiuneToDelete] = useState<SesiuneExamen | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedSesiuneId, setSelectedSesiuneId] = useLocalStorage<string | null>('phi-hau-selected-sesiune-id', null);
  const { showError, showSuccess } = useError();
  
  const selectedSesiune = useMemo(() => selectedSesiuneId ? sesiuni.find(e => e.id === selectedSesiuneId) || null : null, [selectedSesiuneId, sesiuni]);

  const handleBackToList = () => setSelectedSesiuneId(null);

  const handleSaveSesiune = async (sesiuneData: Partial<SesiuneExamen> & { club_id: string | null }) => {
    const locatieSelectata = locatii.find(l => l.id === sesiuneData.locatie_id);
    const dataToSave = {
        ...sesiuneData,
        localitate: locatieSelectata ? locatieSelectata.nume : 'Necunoscută'
    };

    if (sesiuneToEdit) {
        const { data, error } = await supabase.from('sesiuni_examene').update(dataToSave).eq('id', sesiuneToEdit.id).select().single();
        if (error) { showError("Eroare la actualizare", error); } else if (data) { setSesiuni(prev => prev.map(e => e.id === data.id ? data as SesiuneExamen : e)); showSuccess("Succes", "Sesiunea a fost actualizată."); }
    } else {
        const { data, error } = await supabase.from('sesiuni_examene').insert(dataToSave).select().single();
        if (error) { showError("Eroare la adăugare", error); } else if (data) { setSesiuni(prev => [...prev, data as SesiuneExamen]); showSuccess("Succes", "Sesiunea a fost creată."); }
    }
  };
  // ... rest of the component
  return ( 
    <div>
      <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
      <div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-white">Gestiune Sesiuni Examen</h1><Button onClick={() => { setSesiuneToEdit(null); setIsFormOpen(true); }} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Sesiune</Button></div>
      <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Data</th><th className="p-4 font-semibold">Locația</th><th className="p-4 font-semibold">Înscriși</th><th className="p-4 font-semibold text-right">Acțiuni</th></tr></thead>
            <tbody className="divide-y divide-slate-700">
                {sesiuni.sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map(s => ( <tr key={s.id} className="hover:bg-slate-700/50"><td className="p-4 font-medium cursor-pointer" onClick={() => setSelectedSesiuneId(s.id)}>{new Date(s.data+'T00:00:00').toLocaleDateString('ro-RO')}</td><td className="p-4 cursor-pointer" onClick={() => setSelectedSesiuneId(s.id)}>{locatii.find(l => l.id === s.locatie_id)?.nume || 'N/A'}</td><td className="p-4">{inscrieri.filter(p => p.sesiune_id === s.id).length}</td><td className="p-4 w-32"><div className="flex items-center justify-end space-x-2"><Button onClick={() => { setSesiuneToEdit(s); setIsFormOpen(true); }} variant="primary" size="sm"><EditIcon /></Button><Button onClick={() => setSesiuneToDelete(s)} variant="danger" size="sm"><TrashIcon /></Button></div></td></tr> ))}
                {sesiuni.length === 0 && <tr><td colSpan={4}><p className="p-4 text-center text-slate-400">Nicio sesiune programată.</p></td></tr>}
            </tbody>
        </table>
      </div>
      <SesiuneForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveSesiune} sesiuneToEdit={sesiuneToEdit} locatii={locatii} setLocatii={setLocatii} />
      <ConfirmDeleteModal isOpen={!!sesiuneToDelete} onClose={() => setSesiuneToDelete(null)} onConfirm={() => { if(sesiuneToDelete) alert("Delete logic needs implementation") }} tableName="Sesiuni (și toate înscrierile asociate)" isLoading={isDeleting} />
    </div> 
  );
};

export { GestiuneExamene as ExameneManagement };