import React, { useState, useMemo, useEffect } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Locatie, Plata, PretConfig, User, Club, DecontFederatie, View, IstoricGrade } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ManagementInscrieri } from './ManagementInscrieri';
import { HartaExamene } from './HartaExamene';

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
  const [formState, setFormState] = useState<Partial<SesiuneExamen>>({ data: new Date().toISOString().split('T')[0], nume: 'Vara', locatie_id: '', comisia: [] });
  const [loading, setLoading] = useState(false);
  const [isLocatieModalOpen, setIsLocatieModalOpen] = useState(false);
  const { showError, showSuccess } = useError();
  const isSuperAdmin = useMemo(() => currentUser.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN'), [currentUser]);

  useEffect(() => {
      if (sesiuneToEdit) {
          const comisiaAsAny = sesiuneToEdit.comisia as any;
          const comisieArray = Array.isArray(comisiaAsAny) ? comisiaAsAny : (typeof comisiaAsAny === 'string' ? comisiaAsAny.split(',').map(s => s.trim()).filter(Boolean) : []);
          setFormState({ ...sesiuneToEdit, comisia: comisieArray });
      } else {
          setFormState({ 
              data: new Date().toISOString().split('T')[0], 
              nume: 'Vara',
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
        const { data, error } = await supabase.from('nom_locatii').insert(locatieData).select().maybeSingle();
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
        <div className="grid grid-cols-2 gap-4">
            <Input label="Data Examenului" name="data" type="date" value={formState.data} onChange={handleChange} required />
            <Select label="Sesiune" name="nume" value={formState.nume || 'Vara'} onChange={handleChange} required>
                <option value="Vara">Vara</option>
                <option value="Iarna">Iarna</option>
            </Select>
        </div>
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
const DetaliiSesiune: React.FC<{
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
    istoricGrade: IstoricGrade[];
    setIstoricGrade: React.Dispatch<React.SetStateAction<IstoricGrade[]>>;
    onViewSportiv: (sportiv: Sportiv) => void;
}> = (props) => {
    const { showError, showSuccess } = useError();
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; variant: 'warning' | 'info' }>({
        title: '',
        message: '',
        variant: 'info'
    });

    const handleFinalizeClick = () => {
        const admisiCount = props.inscrieri.filter(i => i.rezultat === 'Admis').length;
        if (admisiCount === 0) {
            setConfirmConfig({
                title: 'Atenție: Niciun sportiv Admis',
                message: "Niciun sportiv nu este marcat ca 'Admis'. Dacă nu ați salvat rezultatele, vă rugăm să o faceți înainte de a finaliza examenul. Doriți să continuați finalizarea oricum?",
                variant: 'warning'
            });
        } else {
            setConfirmConfig({
                title: 'Confirmare Finalizare Examen',
                message: "Această acțiune este ireversibilă. Se va marca examenul ca finalizat și se vor actualiza gradele sportivilor admiși. Doriți să continuați?",
                variant: 'info'
            });
        }
        setShowConfirmModal(true);
    };

    const handleFinalizeExam = async () => {
        setShowConfirmModal(false);
        setIsFinalizing(true);
        try {
            const sesiuneId = props.sesiune.id;
            
            // 1. Update sesiuni_examene status
            const { error: updateSesiuneError } = await supabase
                .from('sesiuni_examene')
                .update({ status: 'Finalizat' })
                .eq('id', sesiuneId);
            
            if (updateSesiuneError) throw updateSesiuneError;

            let totalSportivi = 0;
            const updatedSportiviIds = new Set<string>();
            const newIstoricEntries: IstoricGrade[] = [];
            
            // 2. Process each inscriere
            for (const inscriere of props.inscrieri) {
                if (inscriere.rezultat === 'Admis') {
                    // VALIDARE STRICTĂ grad_id (grad_sustinut_id)
                    let targetGradId = inscriere.grad_sustinut_id;
                    
                    if (!targetGradId || targetGradId === 'undefined' || targetGradId === 'null') {
                        // Fallback to current grade if available
                        if (inscriere.grad_actual_id) {
                            targetGradId = inscriere.grad_actual_id;
                        } else {
                            showError("Atenție", `Grad invalid pentru sportivul ${inscriere.sportiv_nume || inscriere.sportiv_id}. Se sare peste actualizarea gradului.`);
                            continue; // Skip this record
                        }
                    }

                    // Check if istoric_grade exists
                    const { data: existingIstoric } = await supabase
                        .from('istoric_grade')
                        .select('id')
                        .eq('sportiv_id', inscriere.sportiv_id)
                        .eq('grad_id', targetGradId)
                        .eq('sesiune_examen_id', sesiuneId)
                        .maybeSingle();
                    
                    if (!existingIstoric) {
                        // Arhivare note în observații
                        const notesStr = inscriere.note_detaliate 
                            ? Object.entries(inscriere.note_detaliate).map(([k, v]) => `${k}: ${v}`).join(', ')
                            : '';

                        // Insert istoric_grade
                        const { data: newIstoricData, error: insertIstoricError } = await supabase
                            .from('istoric_grade')
                            .insert({
                                sportiv_id: inscriere.sportiv_id,
                                grad_id: targetGradId,
                                data_obtinere: props.sesiune.data || props.sesiune.data_examen || new Date().toISOString().split('T')[0],
                                sesiune_examen_id: sesiuneId,
                                observatii: notesStr ? `Note examen: ${notesStr}` : 'Promovat prin examen'
                            })
                            .select()
                            .maybeSingle();
                        
                        if (insertIstoricError) throw insertIstoricError;
                        if (newIstoricData) newIstoricEntries.push(newIstoricData as IstoricGrade);
                        updatedSportiviIds.add(inscriere.sportiv_id);
                    }
                }
                totalSportivi++;
            }

            // Update local state for sportivi - the trigger will handle the DB update, 
            // but we update local state for immediate feedback
            if (updatedSportiviIds.size > 0) {
                props.setSportivi(prev => prev.map(s => {
                    if (updatedSportiviIds.has(s.id)) {
                        const inscriere = props.inscrieri.find(i => i.sportiv_id === s.id && i.rezultat === 'Admis');
                        if (inscriere) {
                            return { 
                                ...s, 
                                grad_actual_id: inscriere.grad_sustinut_id
                            };
                        }
                    }
                    return s;
                }));
            }
            if (newIstoricEntries.length > 0) {
                props.setIstoricGrade(prev => [...prev, ...newIstoricEntries]);
            }

            props.setSesiuni(prev => prev.map(s => s.id === props.sesiune.id ? { ...s, status: 'Finalizat' } : s));
            
            showSuccess("Examen Finalizat", "Examenul a fost finalizat și gradele au fost actualizate.");
        } catch (err: any) {
            showError("Eroare la finalizare", `A apărut o eroare la finalizarea examenului. Detalii: ${err.message || err}`);
        } finally {
            setIsFinalizing(false);
        }
    };
    
    return (
        <Card>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-2xl font-bold text-white">{props.sesiune.locatie_nume || props.locatii.find(l => l.id === props.sesiune.locatie_id)?.nume} - {new Date((props.sesiune.data || props.sesiune.data_examen || '').toString().slice(0, 10) + 'T00:00:00').toLocaleDateString('ro-RO')}</h3>
                    <p className="text-slate-400 mb-2">Comisia: {Array.isArray(props.sesiune.comisia) ? props.sesiune.comisia.join(', ') : props.sesiune.comisia}</p>
                     {props.sesiune.status === 'Finalizat' ? (
                        <span className="px-3 py-1 text-sm font-bold text-green-300 bg-green-900/50 border border-green-700/50 rounded-full">Finalizat</span>
                    ) : (
                        <span className="px-3 py-1 text-sm font-bold text-sky-300 bg-sky-900/50 border border-sky-700/50 rounded-full">Programat</span>
                    )}
                </div>
                {props.sesiune.status !== 'Finalizat' && (
                    <Button variant="success" onClick={handleFinalizeClick} isLoading={isFinalizing}>
                        Finalizează Examen
                    </Button>
                )}
            </div>
            
            <ManagementInscrieri {...props} />

            <Modal 
                isOpen={showConfirmModal} 
                onClose={() => setShowConfirmModal(false)} 
                title={confirmConfig.title}
            >
                <div className="space-y-6">
                    <div className={`p-4 rounded-xl border ${confirmConfig.variant === 'warning' ? 'bg-amber-900/20 border-amber-700/50 text-amber-200' : 'bg-sky-900/20 border-sky-700/50 text-sky-200'}`}>
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">{confirmConfig.variant === 'warning' ? '⚠️' : 'ℹ️'}</span>
                            <p className="text-sm leading-relaxed font-medium">
                                {confirmConfig.message}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button 
                            variant="secondary" 
                            onClick={() => setShowConfirmModal(false)}
                            className="flex-1"
                        >
                            Anulează
                        </Button>
                        <Button 
                            variant={confirmConfig.variant === 'warning' ? 'warning' : 'success'} 
                            onClick={handleFinalizeExam}
                            className="flex-1 shadow-lg shadow-emerald-900/20"
                        >
                            Confirmă Finalizarea
                        </Button>
                    </div>
                </div>
            </Modal>
        </Card>
    );
};

// --- COMPONENTA PRINCIPALĂ (REFActorizată) ---
interface RapoarteExamenProps { 
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
    istoricGrade: IstoricGrade[];
    setIstoricGrade: React.Dispatch<React.SetStateAction<IstoricGrade[]>>;
    onViewSportiv: (sportiv: Sportiv) => void;
}

export const RapoarteExamen: React.FC<RapoarteExamenProps> = ({ currentUser, clubs, onBack, sesiuni, setSesiuni, inscrieri, setInscrieri, sportivi, setSportivi, grade, locatii, setLocatii, plati, setPlati, preturiConfig, deconturiFederatie, setDeconturiFederatie, istoricGrade, setIstoricGrade, onViewSportiv }) => {
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
        const { data, error } = await supabase.from('sesiuni_examene').update(dataToSave).eq('id', sesiuneToEdit.id).select().maybeSingle();
        if (error) { showError("Eroare la actualizare", error); } else if (data) { 
            const { data: viewData, error: viewError } = await supabase.from('vedere_cluburi_sesiuni_examene').select('*').eq('id', data.id).maybeSingle();
            if (viewError) { showError("Eroare la actualizare", viewError); } else if (viewData) {
                setSesiuni(prev => prev.map(e => e.id === viewData.id ? viewData as SesiuneExamen : e)); showSuccess("Succes", "Sesiunea a fost actualizată."); 
            }
        }
    } else {
        const { data, error } = await supabase.from('sesiuni_examene').insert(dataToSave).select().maybeSingle();
        if (error) { showError("Eroare la adăugare", error); } else if (data) { 
            const { data: viewData, error: viewError } = await supabase.from('vedere_cluburi_sesiuni_examene').select('*').eq('id', data.id).maybeSingle();
            if (viewError) { showError("Eroare la adăugare", viewError); } else if (viewData) {
                setSesiuni(prev => [...prev, viewData as SesiuneExamen]); showSuccess("Succes", "Sesiunea a fost creată."); 
            }
        }
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
                istoricGrade={istoricGrade}
                setIstoricGrade={setIstoricGrade}
                onViewSportiv={onViewSportiv}
            />
        </div>
     );
  }

  const sortedSesiuni = [...sesiuni].sort((a,b) => new Date((b.data || b.data_examen || '').toString().slice(0, 10)).getTime() - new Date((a.data || a.data_examen || '').toString().slice(0, 10)).getTime());
  return ( 
    <div>
      <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
      <div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-white">Rapoarte Examen</h1><Button onClick={() => { setSesiuneToEdit(null); setIsFormOpen(true); }} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Sesiune</Button></div>
      
      <HartaExamene />
      
      <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden mt-6">
        <table className="w-full text-left">
            <thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Data</th><th className="p-4 font-semibold">Locația</th><th className="p-4 font-semibold">Înscriși</th><th className="p-4 font-semibold text-right">Acțiuni</th></tr></thead>
            <tbody className="divide-y divide-slate-700">
                {sortedSesiuni.map(s => ( <tr key={s.id} className="hover:bg-slate-700/50"><td className="p-4 font-medium cursor-pointer" onClick={() => setSelectedSesiuneId(s.id)}>{new Date((s.data || s.data_examen || '').toString().slice(0, 10)+'T00:00:00').toLocaleDateString('ro-RO')}</td><td className="p-4 cursor-pointer" onClick={() => setSelectedSesiuneId(s.id)}>{s.locatie_nume || locatii.find(l => l.id === s.locatie_id)?.nume || 'N/A'}</td><td className="p-4">{inscrieri.filter(p => p.sesiune_id === s.id).length}</td><td className="p-4 w-32"><div className="flex items-center justify-end space-x-2"><Button onClick={() => { setSesiuneToEdit(s); setIsFormOpen(true); }} variant="primary" size="sm"><EditIcon /></Button><Button onClick={() => setSesiuneToDelete(s)} variant="danger" size="sm"><TrashIcon /></Button></div></td></tr> ))}
                {sortedSesiuni.length === 0 && <tr><td colSpan={4}><p className="p-4 text-center text-slate-400">Nicio sesiune programată.</p></td></tr>}
            </tbody>
        </table>
      </div>
      <SesiuneForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveSesiune} sesiuneToEdit={sesiuneToEdit} locatii={locatii} setLocatii={setLocatii} clubs={clubs} currentUser={currentUser} />
      <ConfirmDeleteModal isOpen={!!sesiuneToDelete} onClose={() => setSesiuneToDelete(null)} onConfirm={() => { if(sesiuneToDelete) confirmDeleteSesiune(sesiuneToDelete.id) }} tableName="Sesiuni (și toate înscrierile asociate)" isLoading={isDeleting} />
    </div> 
  );
};
