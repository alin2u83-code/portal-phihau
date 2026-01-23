import React, { useState, useMemo, useEffect } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Locatie, Plata, PretConfig, NoteExamen } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon, SaveIcon } from './icons';
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

interface SesiuneFormProps { isOpen: boolean; onClose: () => void; onSave: (sesiune: Partial<SesiuneExamen>) => Promise<void>; sesiuneToEdit: SesiuneExamen | null; locatii: Locatie[]; setLocatii: React.Dispatch<React.SetStateAction<Locatie[]>>; }
const SesiuneForm: React.FC<SesiuneFormProps> = ({ isOpen, onClose, onSave, sesiuneToEdit, locatii, setLocatii }) => {
  const [formState, setFormState] = useState<Partial<SesiuneExamen>>({ data: new Date().toISOString().split('T')[0], locatie_id: '', comisia: [] });
  const [loading, setLoading] = useState(false);
  const [isLocatieModalOpen, setIsLocatieModalOpen] = useState(false);
  const { showError, showSuccess } = useError();

  useEffect(() => {
      if (sesiuneToEdit) {
          // FIX: The `comisia` property is expected to be an array, but might be a string in older data. This ensures it's always handled as an array.
          const comisiaAsAny = sesiuneToEdit.comisia as any;
          const comisieArray = Array.isArray(comisiaAsAny) ? comisiaAsAny : (typeof comisiaAsAny === 'string' ? comisiaAsAny.split(',').map(s => s.trim()).filter(Boolean) : []);
          setFormState({ ...sesiuneToEdit, comisia: comisieArray });
      } else {
          setFormState({ data: new Date().toISOString().split('T')[0], locatie_id: '', comisia: [] });
      }
  }, [sesiuneToEdit, isOpen]);
  
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

const Stepper: React.FC<{ value: number; onChange: (newValue: number) => void }> = ({ value, onChange }) => {
    const step = (amount: number) => onChange(Math.max(0, Math.min(10, value + amount)));
    return (
        <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" className="!p-1 h-6 w-6" onClick={() => step(-1)}>-</Button>
            <span className="font-bold text-lg w-8 text-center">{value}</span>
            <Button size="sm" variant="secondary" className="!p-1 h-6 w-6" onClick={() => step(1)}>+</Button>
        </div>
    );
};

const NotareExamen: React.FC<{
    participanti: (InscriereExamen & { sportiv?: Sportiv; grad?: Grad })[];
    note: NoteExamen[];
    setNote: React.Dispatch<React.SetStateAction<NoteExamen[]>>;
}> = ({ participanti, note, setNote }) => {
    const [localNotes, setLocalNotes] = useState<Record<string, Partial<Omit<NoteExamen, 'id' | 'inscriere_id'>>>>({});
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();

    useEffect(() => {
        const initialNotes: Record<string, Partial<Omit<NoteExamen, 'id' | 'inscriere_id'>>> = {};
        participanti.forEach(p => {
            const existingNote = note.find(n => n.inscriere_id === p.id);
            initialNotes[p.id] = {
                nota_tehnica: existingNote?.nota_tehnica ?? null,
                nota_forta: existingNote?.nota_forta ?? null,
                nota_viteza: existingNote?.nota_viteza ?? null,
                nota_atitudine: existingNote?.nota_atitudine ?? null,
            };
        });
        setLocalNotes(initialNotes);
    }, [participanti, note]);

    const handleNoteChange = (inscriereId: string, field: keyof Omit<NoteExamen, 'id' | 'inscriere_id'>, value: string) => {
        const numValue = value === '' ? null : Math.max(0, Math.min(10, parseFloat(value)));
        setLocalNotes(prev => ({
            ...prev,
            [inscriereId]: { ...prev[inscriereId], [field]: numValue }
        }));
    };

    const handleSaveNotes = async () => {
        if (!supabase) { showError("Eroare Configurare", "Client Supabase neconfigurat."); return; }
        setLoading(true);

        const upsertData = Object.entries(localNotes)
            .map(([inscriere_id, noteValues]) => ({
                inscriere_id,
                ...noteValues
            }));
            
        const { data, error } = await supabase.from('note_examene').upsert(upsertData, { onConflict: 'inscriere_id' }).select();

        setLoading(false);
        if (error) {
            showError("Eroare la Salvarea Notelor", error);
        } else if (data) {
            setNote(prev => {
                const updatedNotes = new Map(prev.map(n => [n.inscriere_id, n]));
                data.forEach(d => updatedNotes.set(d.inscriere_id, d as NoteExamen));
                return Array.from(updatedNotes.values());
            });
            showSuccess("Succes!", "Notele au fost salvate.");
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Notare Detaliată</h2>
                <Button onClick={handleSaveNotes} variant="success" isLoading={loading}><SaveIcon className="w-4 h-4 mr-2"/> Salvează Note</Button>
            </div>
            <div className="hidden md:block">
                <table className="w-full text-left text-sm">
                    <thead><tr className="bg-slate-700/50">
                        <th className="p-2">Nr.</th><th className="p-2">Nume Prenume</th><th className="p-2">Grad Susținut</th>
                        <th className="p-2 w-24 text-center">Tehnică</th><th className="p-2 w-24 text-center">Forță</th>
                        <th className="p-2 w-24 text-center">Viteză</th><th className="p-2 w-24 text-center">Atitudine</th>
                        <th className="p-2 w-28 text-center font-bold">Medie</th>
                    </tr></thead>
                    <tbody>{participanti.map((p, idx) => {
                        const note = localNotes[p.id] || {};
                        const n = [note.nota_tehnica, note.nota_forta, note.nota_viteza, note.nota_atitudine];
                        const media = n.every(val => typeof val === 'number') ? (n.reduce((acc, val) => acc + (val || 0), 0) / 4).toFixed(2) : 'N/A';
                        return <tr key={p.id} className="border-b border-slate-700">
                            <td className="p-2">{idx+1}.</td><td className="p-2 font-semibold">{p.sportiv?.nume} {p.sportiv?.prenume}</td><td>{p.grad?.nume}</td>
                            <td><Input label="" type="number" step="0.5" min="0" max="10" value={note.nota_tehnica ?? ''} onChange={e => handleNoteChange(p.id, 'nota_tehnica', e.target.value)} className="text-center"/></td>
                            <td><Input label="" type="number" step="0.5" min="0" max="10" value={note.nota_forta ?? ''} onChange={e => handleNoteChange(p.id, 'nota_forta', e.target.value)} className="text-center"/></td>
                            <td><Input label="" type="number" step="0.5" min="0" max="10" value={note.nota_viteza ?? ''} onChange={e => handleNoteChange(p.id, 'nota_viteza', e.target.value)} className="text-center"/></td>
                            <td><Input label="" type="number" step="0.5" min="0" max="10" value={note.nota_atitudine ?? ''} onChange={e => handleNoteChange(p.id, 'nota_atitudine', e.target.value)} className="text-center"/></td>
                            <td className="p-2 text-center font-bold text-lg text-brand-secondary">{media}</td>
                        </tr>
                    })}</tbody>
                </table>
            </div>
            <div className="md:hidden space-y-4">{participanti.map((p, idx) => {
                const note = localNotes[p.id] || {};
                const n = [note.nota_tehnica, note.nota_forta, note.nota_viteza, note.nota_atitudine];
                const media = n.every(val => typeof val === 'number') ? (n.reduce((acc, val) => acc + (val || 0), 0) / 4).toFixed(2) : 'N/A';
                return <Card key={p.id} className="bg-slate-800"><p className="font-bold">{idx+1}. {p.sportiv?.nume} {p.sportiv?.prenume} - <span className="text-brand-secondary">{p.grad?.nume}</span></p><div className="mt-4 grid grid-cols-2 gap-4">
                    {(Object.keys(note) as (keyof typeof note)[]).map(key => <div key={key} className="flex justify-between items-center"><span className="text-sm capitalize">{key.split('_')[1]}</span><Stepper value={note[key] ?? 0} onChange={val => handleNoteChange(p.id, key, String(val))}/></div>)}
                </div><div className="mt-4 pt-3 border-t border-slate-700 flex justify-between items-center"><span className="font-bold">Media Generală</span><span className="font-bold text-lg text-brand-secondary">{media}</span></div></Card>
            })}</div>
        </div>
    );
};


// --- NOUA VIZUALIZARE DE DETALIU PENTRU SESIUNE ---
const DetaliiSesiuneSimplificat: React.FC<{
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
    note: NoteExamen[];
    setNote: React.Dispatch<React.SetStateAction<NoteExamen[]>>;
}> = ({ sesiune, inscrieri, setInscrieri, sportivi, setSportivi, grade, allInscrieri, locatii, plati, setPlati, preturiConfig, note, setNote }) => {
    const [activeTab, setActiveTab] = useState<'inscriere' | 'notare'>('inscriere');

    const participantiCuDetalii = useMemo(() => {
        return inscrieri.map(i => ({
            ...i,
            sportiv: sportivi.find(s => s.id === i.sportiv_id),
            grad: grade.find(g => g.id === i.grad_vizat_id)
        }))
        .sort((a, b) => {
            const gradeOrderDiff = (b.grad?.ordine ?? 0) - (a.grad?.ordine ?? 0);
            if (gradeOrderDiff !== 0) {
                return gradeOrderDiff;
            }
            const nameA = `${a.sportiv?.nume || ''} ${a.sportiv?.prenume || ''}`;
            const nameB = `${b.sportiv?.nume || ''} ${b.sportiv?.prenume || ''}`;
            return nameA.localeCompare(nameB);
        });
    }, [inscrieri, sportivi, grade]);

    return (
        <Card>
            <h3 className="text-2xl font-bold text-white">{locatii.find(l => l.id === sesiune.locatie_id)?.nume} - {new Date(sesiune.data + 'T00:00:00').toLocaleDateString('ro-RO')}</h3>
            <p className="text-slate-400">Comisia: {Array.isArray(sesiune.comisia) ? sesiune.comisia.join(', ') : sesiune.comisia}</p>
            
            <div className="border-b border-slate-700 mt-6 mb-6">
                <button
                    onClick={() => setActiveTab('inscriere')}
                    className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeTab === 'inscriere' ? 'bg-slate-700/50 text-brand-secondary' : 'text-white/70 hover:text-white'}`}
                >
                    Înscriere & Rezultate
                </button>
                 <button
                    onClick={() => setActiveTab('notare')}
                    className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeTab === 'notare' ? 'bg-slate-700/50 text-brand-secondary' : 'text-white/70 hover:text-white'}`}
                >
                    Notare Detaliată
                </button>
            </div>

            <div>
                {activeTab === 'inscriere' && (
                    <ManagementInscrieri
                        sesiune={sesiune}
                        sportivi={sportivi}
                        setSportivi={setSportivi}
                        allInscrieri={allInscrieri}
                        grade={grade}
                        setInscrieri={setInscrieri}
                        plati={plati}
                        setPlati={setPlati}
                        preturiConfig={preturiConfig}
                    />
                )}
                {activeTab === 'notare' && (
                    // FIX: Removed unused 'sesiune' prop from NotareExamen component call to fix TypeScript error.
                    <NotareExamen
                        participanti={participantiCuDetalii}
                        note={note}
                        setNote={setNote}
                    />
                )}
            </div>
        </Card>
    );
};

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
    note: NoteExamen[];
    setNote: React.Dispatch<React.SetStateAction<NoteExamen[]>>;
}

export const GestiuneExamene: React.FC<GestiuneExameneProps> = ({ onBack, sesiuni, setSesiuni, inscrieri, setInscrieri, sportivi, setSportivi, grade, locatii, setLocatii, plati, setPlati, preturiConfig, note, setNote }) => {
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
            <DetaliiSesiuneSimplificat 
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
                note={note}
                setNote={setNote}
            />
        </div>
     );
  }

  const sortedSesiuni = [...sesiuni].sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  return ( 
    <div>
      <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
      <div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-white">Gestiune Sesiuni Examen</h1><Button onClick={() => { setSesiuneToEdit(null); setIsFormOpen(true); }} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Sesiune</Button></div>
      <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Data</th><th className="p-4 font-semibold">Locația</th><th className="p-4 font-semibold">Înscriși</th><th className="p-4 font-semibold text-right">Acțiuni</th></tr></thead>
            <tbody className="divide-y divide-slate-700">
                {sortedSesiuni.map(s => ( <tr key={s.id} className="hover:bg-slate-700/50"><td className="p-4 font-medium cursor-pointer" onClick={() => setSelectedSesiuneId(s.id)}>{new Date(s.data+'T00:00:00').toLocaleDateString('ro-RO')}</td><td className="p-4 cursor-pointer" onClick={() => setSelectedSesiuneId(s.id)}>{locatii.find(l => l.id === s.locatie_id)?.nume || 'N/A'}</td><td className="p-4">{inscrieri.filter(p => p.sesiune_id === s.id).length}</td><td className="p-4 w-32"><div className="flex items-center justify-end space-x-2"><Button onClick={() => { setSesiuneToEdit(s); setIsFormOpen(true); }} variant="primary" size="sm"><EditIcon /></Button><Button onClick={() => setSesiuneToDelete(s)} variant="danger" size="sm"><TrashIcon /></Button></div></td></tr> ))}
                {sortedSesiuni.length === 0 && <tr><td colSpan={4}><p className="p-4 text-center text-slate-400">Nicio sesiune programată.</p></td></tr>}
            </tbody>
        </table>
      </div>
      <SesiuneForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveSesiune} sesiuneToEdit={sesiuneToEdit} locatii={locatii} setLocatii={setLocatii} />
      <ConfirmDeleteModal isOpen={!!sesiuneToDelete} onClose={() => setSesiuneToDelete(null)} onConfirm={() => { if(sesiuneToDelete) confirmDeleteSesiune(sesiuneToDelete.id) }} tableName="Sesiuni (și toate înscrierile asociate)" isLoading={isDeleting} />
    </div> 
  );
};

export { GestiuneExamene as ExameneManagement };
