import React, { useState, useMemo, useEffect } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Locatie, Plata, PretConfig, User, Club, DecontFederatie } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ManagementInscrieri } from './ManagementInscrieri';

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

interface LocatieFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (locatieData: { nume: string; adresa: string }) => Promise<void>;
}
const LocatieFormModal: React.FC<LocatieFormProps> = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({ nume: '', adresa: '' });
  const [loading, setLoading] = useState(false);
  const { showError } = useError();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nume.trim()) {
        showError("Validare eșuată", "Numele locației este obligatoriu.");
        return;
    }
    setLoading(true);
    await onSave({ nume: form.nume.trim(), adresa: form.adresa.trim() });
    setLoading(false);
    setForm({ nume: '', adresa: '' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adaugă Locație Nouă">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nume Locație" name="nume" value={form.nume} onChange={handleChange} required />
        <Input label="Adresă (Opțional)" name="adresa" value={form.adresa} onChange={handleChange} />
        <div className="flex justify-end pt-4 space-x-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
          <Button variant="success" type="submit" isLoading={loading}>Salvează Locația</Button>
        </div>
      </form>
    </Modal>
  );
};

interface SesiuneFormProps { isOpen: boolean; onClose: () => void; onSave: (sesiune: Partial<SesiuneExamen>) => Promise<void>; sesiuneToEdit: SesiuneExamen | null; locatii: Locatie[]; setLocatii: React.Dispatch<React.SetStateAction<Locatie[]>>; clubs: Club[]; currentUser: User; }
const SesiuneForm: React.FC<SesiuneFormProps> = ({ isOpen, onClose, onSave, sesiuneToEdit, locatii, setLocatii, clubs, currentUser }) => {
  const [formState, setFormState] = useState<Partial<SesiuneExamen>>({ data: new Date().toISOString().split('T')[0], locatie_id: '', comisia: [] });
  const [loading, setLoading] = useState(false);
  const [isLocatieModalOpen, setIsLocatieModalOpen] = useState(false);
  const { showError, showSuccess } = useError();
  const isSuperAdmin = useMemo(() => currentUser.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'Admin'), [currentUser]);

  useEffect(() => {
      if (sesiuneToEdit) {
          const comisiaAsAny = sesiuneToEdit.comisia as any;
          const comisieArray = Array.isArray(comisiaAsAny) ? comisiaAsAny : (typeof comisiaAsAny === 'string' ? comisiaAsAny.split(',').map(s => s.trim()).filter(Boolean) : []);
          setFormState({ ...sesiuneToEdit, comisia: comisieArray });
      } else {
          setFormState({ 
              data: new Date().toISOString().split('T')[0], 
              locatie_id: '', 
              comisia: [],
              club_id: isSuperAdmin ? '' : currentUser.club_id
          });
      }
  }, [sesiuneToEdit, isOpen, isSuperAdmin, currentUser.club_id]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormState(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); await onSave(formState); setLoading(false); onClose(); };

  const handleSaveLocatie = async (locatieData: { nume: string, adresa: string }) => {
        if (!supabase) { showError("Eroare", "Client Supabase neconfigurat."); return; }
        const { data, error } = await supabase.from('nom_locatii').insert(locatieData).select().single();
        if (error) { showError("Eroare la salvare locație", error); } 
        else if (data) {
            setLocatii(prev => [...prev, data]);
            setFormState(p => ({ ...p, locatie_id: data.id }));
            setIsLocatieModalOpen(false);
            showSuccess("Succes", "Locația a fost adăugată.");
        }
    };

  return ( <>
  <Modal isOpen={isOpen} onClose={onClose} title={sesiuneToEdit ? "Editează Sesiune Examen" : "Adaugă Sesiune Nouă"}>
    <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Data Examenului" name="data" type="date" value={formState.data} onChange={handleChange} required />
        {isSuperAdmin && (
            <Select label="Club Organizator" name="club_id" value={formState.club_id || ''} onChange={handleChange}>
                <option value="">Federație (eveniment central)</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
            </Select>
        )}
        <div className="flex items-end gap-2">
            <div className="flex-grow">
                 <Select label="Locația" name="locatie_id" value={formState.locatie_id || ''} onChange={handleChange} required>
                    <option value="">Selectează locația...</option>
                    {locatii.map(l => <option key={l.id} value={l.id}>{l.nume}</option>)}
                </Select>
            </div>
            <Button type="button" variant="secondary" onClick={() => setIsLocatieModalOpen(true)} className="h-[38px] aspect-square p-0" title="Adaugă locație nouă"><PlusIcon className="w-5 h-5"/></Button>
        </div>
        <ComisieEditor membri={formState.comisia || []} setMembri={(newMembri) => setFormState(p => ({ ...p, comisia: newMembri }))} />
        <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button variant="success" type="submit" isLoading={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button></div>
    </form>
  </Modal>
  <LocatieFormModal isOpen={isLocatieModalOpen} onClose={() => setIsLocatieModalOpen(false)} onSave={handleSaveLocatie} />
  </> );
};

// --- NOUA VIZUALIZARE DE DETALIU PENTRU SESIUNE ---
interface DetaliiSesiuneProps {
    sesiune: SesiuneExamen;
    inscrieri: InscriereExamen[];
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    grade: Grad[];
    allInscrieri: InscriereExamen[];
    locatii: Locatie[];
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    preturiConfig: PretConfig[];
    setSesiuni: React.Dispatch<React.SetStateAction<SesiuneExamen[]>>;
    setDeconturiFederatie: React.Dispatch<React.SetStateAction<DecontFederatie[]>>;
    onViewSportiv: (sportiv: Sportiv) => void;
}
const DetaliiSesiune: React.FC<DetaliiSesiuneProps> = (props) => {
    const { showError, showSuccess } = useError();
    const [isFinalizing, setIsFinalizing] = useState(false);

    const handleFinalizeExam = async () => {
        if (!window.confirm("Această acțiune este ireversibilă. Se va marca examenul ca finalizat și se va genera decontul pentru federație. Doriți să continuați?")) {
            return;
        }
        setIsFinalizing(true);
        try {
            // Presupunem că RPC-ul 'finalizeaza_examen' există și a fost creat în baza de date.
            const { data, error } = await supabase.rpc('finalizeaza_examen', { p_sesiune_id: props.sesiune.id });
            if (error) throw error;

            props.setSesiuni(prev => prev.map(s => s.id === props.sesiune.id ? { ...s, status: 'Finalizat' } : s));
            
            if(data) {
                props.setDeconturiFederatie(prev => [...prev, data]);
            }
            showSuccess("Examen Finalizat", "Decontul a fost generat și trimis către federație.");
        } catch (err: any) {
            showError("Eroare la finalizare", `Funcția RPC 'finalizeaza_examen' nu a putut fi executată. Asigurați-vă că există în baza de date. Detalii: ${err.message}`);
        } finally {
            setIsFinalizing(false);
        }
    };
    
    return (
        <Card>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-2xl font-bold text-white">{props.locatii.find(l => l.id === props.sesiune.locatie_id)?.nume} - {new Date(props.sesiune.data + 'T00:00:00').toLocaleDateString('ro-RO')}</h3>
                    <p className="text-slate-400 mb-2">Comisia: {Array.isArray(props.sesiune.comisia) ? props.sesiune.comisia.join(', ') : props.sesiune.comisia}</p>
                     {props.sesiune.status === 'Finalizat' ? (
                        <span className="px-3 py-1 text-sm font-bold text-green-300 bg-green-900/50 border border-green-700/50 rounded-full">Finalizat</span>
                    ) : (
                        <span className="px-3 py-1 text-sm font-bold text-sky-300 bg-sky-900/50 border border-sky-700/50 rounded-full">Programat</span>
                    )}
                </div>
                {props.sesiune.status !== 'Finalizat' && (
                    <Button variant="success" onClick={handleFinalizeExam} isLoading={isFinalizing}>
                        Finalizează & Generează Decont
                    </Button>
                )}
            </div>
            
            <ManagementInscrieri {...props} />
        </Card>
    );
};

// --- COMPONENTA PRINCIPALĂ (REFActorizată) ---
interface GestiuneExameneProps { 
    currentUser: User;
    clubs: Club[];
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
    deconturiFederatie: DecontFederatie[];
    setDeconturiFederatie: React.Dispatch<React.SetStateAction<DecontFederatie[]>>;
    onViewSportiv: (sportiv: Sportiv) => void;
}

export const GestiuneExamene: React.FC<GestiuneExameneProps> = ({ currentUser, clubs, onBack, sesiuni, setSesiuni, inscrieri, setInscrieri, sportivi, setSportivi, grade, locatii, setLocatii, plati, setPlati, preturiConfig, deconturiFederatie, setDeconturiFederatie, onViewSportiv }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sesiuneToEdit, setSesiuneToEdit] = useState<SesiuneExamen | null>(null);
  const [sesiuneToDelete, setSesiuneToDelete] = useState<SesiuneExamen | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedSesiuneId, setSelectedSesiuneId] = useLocalStorage<string | null>('phi-hau-selected-sesiune-id', null);
  const { showError, showSuccess } = useError();
  
  const selectedSesiune = useMemo(() => selectedSesiuneId ? sesiuni.find(e => e.id === selectedSesiuneId) || null : null, [selectedSesiuneId, sesiuni]);

  const handleBackToList = () => setSelectedSesiuneId(null);

  const handleSaveSesiune = async (sesiuneData: Partial<SesiuneExamen>) => {
    const locatieSelectata = locatii.find(l => l.id === sesiuneData.locatie_id);
    const dataToSave: Partial<SesiuneExamen> = {
        ...sesiuneData,
        localitate: locatieSelectata ? locatieSelectata.nume : 'Necunoscută',
        club_id: sesiuneData.club_id === '' ? null : sesiuneData.club_id
    };

    if (sesiuneToEdit) {
        const { data, error } = await supabase.from('sesiuni_examene').update(dataToSave).eq('id', sesiuneToEdit.id).select().single();
        if (error) { showError("Eroare la actualizare", error); } else if (data) { setSesiuni(prev => prev.map(e => e.id === data.id ? data as SesiuneExamen : e)); showSuccess("Succes", "Sesiunea a fost actualizată."); }
    } else {
        const { data, error } = await supabase.from('sesiuni_examene').insert(dataToSave).select().single();
        if (error) { showError("Eroare la adăugare", error); } else if (data) { setSesiuni(prev => [...prev, data as SesiuneExamen]); showSuccess("Succes", "Sesiunea a fost creată."); }
    }
  };

  const confirmDeleteSesiune = async (id: string) => {
    setIsDeleting(true);
    try {
        const { error: inscrieriError } = await supabase.from('inscrieri_examene').delete().eq('sesiune_id', id);
        if(inscrieriError) throw inscrieriError;
        setInscrieri(prev => prev.filter(p => p.sesiune_id !== id));
        
        const { error: sesiuneError } = await supabase.from('sesiuni_examene').delete().eq('id', id);
        if(sesiuneError) throw sesiuneError;
        setSesiuni(prev => prev.filter(e => e.id !== id));
        handleBackToList();
        showSuccess("Succes", "Sesiunea și înscrierile asociate au fost șterse.");
    } catch (err: any) {
        showError("Eroare la ștergere", err);
    } finally {
        setIsDeleting(false);
        setSesiuneToDelete(null);
    }
  };

  if (selectedSesiune) {
     return (
        <div>
            <Button onClick={handleBackToList} className="mb-4" variant="secondary"><ArrowLeftIcon /> Înapoi la listă</Button>
            <DetaliiSesiune 
                sesiune={selectedSesiune} 
                inscrieri={inscrieri.filter(p => p.sesiune_id === selectedSesiune.id)} 
                setInscrieri={setInscrieri} 
                sportivi={sportivi} 
                setSportivi={setSportivi}
                grade={grade} 
                allInscrieri={inscrieri}
                locatii={locatii}
                plati={plati}
                setPlati={setPlati}
                preturiConfig={preturiConfig}
                setSesiuni={setSesiuni}
                setDeconturiFederatie={setDeconturiFederatie}
                onViewSportiv={onViewSportiv}
            />
        </div>
     );
  }

  const sortedSesiuni = [...sesiuni].sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  return ( 
    <div>
      <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
      <div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-white">Gestiune Sesiuni Examen</h1><Button onClick={() => { setSesiuneToEdit(null); setIsFormOpen(true); }} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Sesiune</Button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedSesiuni.map(s => ( 
            <Card key={s.id} className="sesiune-card flex flex-col cursor-pointer group hover:border-brand-secondary/50 transition-all duration-300" onClick={() => setSelectedSesiuneId(s.id)}>
                <div className="flex-grow">
                    <div className="flex justify-between items-start">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${s.status === 'Finalizat' ? 'bg-green-600/30 text-green-300' : 'bg-sky-600/30 text-sky-300'}`}>
                            {s.status || 'Programat'}
                        </span>
                        <span className="text-sm font-bold text-slate-300">{new Date(s.data+'T00:00:00').toLocaleDateString('ro-RO')}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-3 group-hover:text-brand-secondary transition-colors">{locatii.find(l => l.id === s.locatie_id)?.nume || 'Locație Nespecificată'}</h3>
                    <p className="text-xs text-slate-400">{s.club_id ? (clubs.find(c => c.id === s.club_id)?.nume || 'Club Necunoscut') : 'Eveniment Federație'}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                    <div className="text-sm">
                        <span className="font-bold text-white">{inscrieri.filter(p => p.sesiune_id === s.id).length}</span>
                        <span className="text-slate-400"> participanți</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setSesiuneToEdit(s); setIsFormOpen(true); }}><EditIcon className="w-4 h-4" /></Button>
                        <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setSesiuneToDelete(s); }}><TrashIcon className="w-4 h-4" /></Button>
                    </div>
                </div>
            </Card>
        ))}
        {sortedSesiuni.length === 0 && <p className="col-span-full p-4 text-center text-slate-400">Nicio sesiune programată.</p>}
      </div>
      <SesiuneForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveSesiune} sesiuneToEdit={sesiuneToEdit} locatii={locatii} setLocatii={setLocatii} clubs={clubs} currentUser={currentUser} />
      <ConfirmDeleteModal isOpen={!!sesiuneToDelete} onClose={() => setSesiuneToDelete(null)} onConfirm={() => { if(sesiuneToDelete) confirmDeleteSesiune(sesiuneToDelete.id) }} tableName="Sesiuni (și toate înscrierile asociate)" isLoading={isDeleting} />
    </div> 
  );
};

export { GestiuneExamene as ExameneManagement };