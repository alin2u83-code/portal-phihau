import React, { useState, useMemo, useEffect } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Locatie, Plata, PretConfig, User, Club, DecontFederatie, View, IstoricGrade } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon, UserCircleIcon, ClipboardListIcon } from './icons';
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            // Map sportiv_id → targetGradId rezolvat, pentru update local corect
            const sportiviGradMap = new Map<string, string>();

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

                    // Actualizează grad_actual_id în DB dacă noul grad e superior celui curent
                    // Aceasta este pasul care lipsea și cauza bug-ul: sportivi.grad_actual_id
                    // rămânea la valoarea veche în baza de date după finalizarea examenului.
                    const newGrade = props.grade?.find(g => g.id === targetGradId);
                    const currentGrade = props.grade?.find(g => g.id === inscriere.grad_actual_id);
                    if ((newGrade?.ordine ?? 0) > (currentGrade?.ordine ?? -1)) {
                        const { error: gradUpdateError } = await supabase
                            .from('sportivi')
                            .update({ grad_actual_id: targetGradId })
                            .eq('id', inscriere.sportiv_id);
                        if (gradUpdateError) throw gradUpdateError;
                        sportiviGradMap.set(inscriere.sportiv_id, targetGradId);
                    }
                }
                totalSportivi++;
            }

            // Update local state for sportivi (UI feedback imediat)
            if (sportiviGradMap.size > 0 || updatedSportiviIds.size > 0) {
                props.setSportivi(prev => prev.map(s => {
                    const resolvedGradId = sportiviGradMap.get(s.id);
                    if (resolvedGradId) {
                        return { ...s, grad_actual_id: resolvedGradId };
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
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-white">{props.sesiune.locatie_nume || props.locatii.find(l => l.id === props.sesiune.locatie_id)?.nume} - {new Date((props.sesiune.data || props.sesiune.data_examen || '').toString().slice(0, 10) + 'T00:00:00').toLocaleDateString('ro-RO')}</h3>
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

// --- RAPORT SPORTIVI ---
interface RaportRow {
    inscriere_id: string;
    sportiv_id: string;
    sportiv_nume: string;
    sportiv_prenume: string;
    club_id?: string | null;
    club_nume: string | null;
    grad_sustinut: string | null;
    grad_ordine: number | null;
    rezultat: string | null;
    data_examen: string | null;
    locatie_nume: string | null;
    sesiune_id: string;
    status_inscriere: string | null;
    sesiune_nume?: string;
}

type SortField = 'sportiv' | 'grad' | 'data' | 'rezultat' | 'club';
type SortDir = 'asc' | 'desc';

const RaportInscrieri: React.FC<{ sesiuni: SesiuneExamen[]; grade: Grad[]; currentUser: User; initialSportivId?: string | null; sportivi: Sportiv[]; onViewSportiv: (sportiv: Sportiv) => void; onViewSesiune: (sesiuneId: string) => void }> = ({ sesiuni, grade, currentUser, initialSportivId, sportivi, onViewSportiv, onViewSesiune }) => {
    const [rows, setRows] = useState<RaportRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterNume, setFilterNume] = useState('');
    const [filterGrad, setFilterGrad] = useState('');
    const [filterRezultat, setFilterRezultat] = useState('');
    const [filterDataDe, setFilterDataDe] = useState('');
    const [filterDataPana, setFilterDataPana] = useState('');
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [sortField, setSortField] = useState<SortField>('data');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const { showError, showSuccess } = useError();

    // Aplică filtrul de club pentru non-admin-federatie
    const isFedAdmin = currentUser.roluri.some(r =>
        ['SUPER_ADMIN_FEDERATIE', 'ADMIN'].includes(r.nume.toUpperCase().replace(/\s+/g, '_'))
    );
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<RaportRow | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formState, setFormState] = useState<{ sesiune_id: string; grad_sustinut_id: string; rezultat: string; status_inscriere: string }>({ sesiune_id: '', grad_sustinut_id: '', rezultat: 'Neprezentat', status_inscriere: 'Validat' });
    const [savingForm, setSavingForm] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            let query = supabase
                .from('vedere_detalii_examen')
                .select('inscriere_id, sportiv_id, sportiv_nume, sportiv_prenume, club_nume, grad_sustinut, grad_ordine, rezultat, data_examen, locatie_nume, sesiune_id, status_inscriere, club_id');
            // Filtrează după club pentru non-admini-federatie
            if (!isFedAdmin && currentUser.club_id) {
                query = (query as any).eq('club_id', currentUser.club_id);
            }
            const { data, error } = await query;
            if (error) { showError('Eroare la raport', error.message); setLoading(false); return; }
            const withSesiune = (data || []).map(r => ({
                ...r,
                sesiune_nume: sesiuni.find(s => s.id === r.sesiune_id)?.nume || '',
            }));
            setRows(withSesiune);
            setLoading(false);
        };
        fetch();
    }, [sesiuni, showError, isFedAdmin, currentUser.club_id]);

    useEffect(() => {
        if (initialSportivId) setFilterNume('__sportiv_id__' + initialSportivId);
    }, [initialSportivId]);

    const handleSort = (field: SortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const filtered = useMemo(() => {
        let r = rows;
        if (filterNume.startsWith('__sportiv_id__')) {
            const id = filterNume.replace('__sportiv_id__', '');
            r = r.filter(x => x.sportiv_id === id);
        } else if (filterNume) {
            const q = filterNume.toLowerCase();
            r = r.filter(x => `${x.sportiv_nume} ${x.sportiv_prenume}`.toLowerCase().includes(q));
        }
        if (filterGrad) r = r.filter(x => String(x.grad_ordine) === filterGrad);
        if (filterRezultat) r = r.filter(x => x.rezultat === filterRezultat);
        if (filterDataDe) r = r.filter(x => x.data_examen && x.data_examen >= filterDataDe);
        if (filterDataPana) r = r.filter(x => x.data_examen && x.data_examen <= filterDataPana);
        return [...r].sort((a, b) => {
            let va: string, vb: string;
            if (sortField === 'sportiv') { va = `${a.sportiv_nume} ${a.sportiv_prenume}`; vb = `${b.sportiv_nume} ${b.sportiv_prenume}`; }
            else if (sortField === 'grad') { va = String(a.grad_ordine ?? 999); vb = String(b.grad_ordine ?? 999); }
            else if (sortField === 'data') { va = a.data_examen || ''; vb = b.data_examen || ''; }
            else if (sortField === 'rezultat') { va = a.rezultat || ''; vb = b.rezultat || ''; }
            else { va = a.club_nume || ''; vb = b.club_nume || ''; }
            return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        });
    }, [rows, filterNume, filterGrad, filterRezultat, filterDataDe, filterDataPana, sortField, sortDir]);

    const SortBtn: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
        <button onClick={() => handleSort(field)} className="flex items-center gap-1 font-semibold hover:text-blue-300 transition-colors">
            {label}
            <span className="text-xs">{sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
        </button>
    );

    const handleExport = () => {
        const header = 'Nume,Prenume,Club,Grad,Rezultat,Data,Sesiune,Locatie\n';
        const csvRows = filtered.map(r =>
            [r.sportiv_nume, r.sportiv_prenume, r.club_nume || '', r.grad_sustinut || '', r.rezultat || '', r.data_examen || '', r.sesiune_nume || '', r.locatie_nume || '']
            .map(v => `"${v}"`).join(',')
        );
        const blob = new Blob(['\uFEFF' + header + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'raport_examene.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const refreshRows = async () => {
        let query = supabase
            .from('vedere_detalii_examen')
            .select('inscriere_id, sportiv_id, sportiv_nume, sportiv_prenume, club_nume, grad_sustinut, grad_ordine, rezultat, data_examen, locatie_nume, sesiune_id, status_inscriere, club_id');
        if (!isFedAdmin && currentUser.club_id) {
            query = (query as any).eq('club_id', currentUser.club_id);
        }
        const { data, error } = await query;
        if (!error) setRows((data || []).map(r => ({ ...r, sesiune_nume: sesiuni.find(s => s.id === r.sesiune_id)?.nume || '' })));
    };

    const handleEdit = (row: RaportRow) => {
        const grad = grade.find(g => g.nume === row.grad_sustinut);
        setEditingRow(row);
        setFormState({ sesiune_id: row.sesiune_id, grad_sustinut_id: grad?.id || '', rezultat: row.rezultat || 'Neprezentat', status_inscriere: row.status_inscriere || 'Validat' });
        setIsAdding(false);
        setIsFormOpen(true);
    };

    const handleAdd = () => {
        setEditingRow(null);
        setFormState({ sesiune_id: '', grad_sustinut_id: '', rezultat: 'Neprezentat', status_inscriere: 'Validat' });
        setIsAdding(true);
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!formState.sesiune_id || !formState.grad_sustinut_id) { showError('Validare', 'Selectează sesiunea și gradul.'); return; }
        setSavingForm(true);
        try {
            if (editingRow) {
                const { error } = await supabase.from('inscrieri_examene')
                    .update({ grad_sustinut_id: formState.grad_sustinut_id, rezultat: formState.rezultat, sesiune_id: formState.sesiune_id, status_inscriere: formState.status_inscriere })
                    .eq('id', editingRow.inscriere_id);
                if (error) throw new Error(error.message);
            } else {
                if (!initialSportivId) { showError('Eroare', 'Sportivul nu e identificat.'); return; }
                const { error } = await supabase.from('inscrieri_examene').insert({
                    sportiv_id: initialSportivId,
                    sesiune_id: formState.sesiune_id,
                    grad_sustinut_id: formState.grad_sustinut_id,
                    grad_actual_id: null,
                    club_id: currentUser.club_id || null,
                    varsta_la_examen: 0,
                    rezultat: formState.rezultat,
                    status_inscriere: 'Validat',
                });
                if (error) throw new Error(error.message);
            }
            await refreshRows();
            setIsFormOpen(false);
            showSuccess('Succes', 'Examenul a fost salvat.');
        } catch (err: any) {
            showError('Eroare', err.message);
        } finally {
            setSavingForm(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        const { error } = await supabase.from('inscrieri_examene').delete().eq('id', id);
        setDeletingId(null);
        setConfirmDeleteId(null);
        if (error) { showError('Eroare', error.message); return; }
        setRows(prev => prev.filter(r => r.inscriere_id !== id));
        showSuccess('Succes', 'Examenul a fost șters.');
    };

    const activeFilterCount = [filterNume, filterGrad, filterRezultat, filterDataDe, filterDataPana].filter(Boolean).length;

    const filterContent = (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {initialSportivId ? (
                <div className="text-sm text-blue-300 font-medium py-2 col-span-full">
                    Filtrat pe sportiv selectat
                </div>
            ) : (
                <Input label="Caută sportiv" value={filterNume} onChange={e => setFilterNume(e.target.value)} placeholder="Nume sau prenume..." />
            )}
            <Select label="Grad" value={filterGrad} onChange={e => setFilterGrad(e.target.value)}>
                <option value="">Toate gradele</option>
                {[...grade].sort((a, b) => a.ordine - b.ordine).map(g => <option key={g.id} value={String(g.ordine)}>{g.nume}</option>)}
            </Select>
            <Select label="Rezultat" value={filterRezultat} onChange={e => setFilterRezultat(e.target.value)}>
                <option value="">Toate rezultatele</option>
                <option value="Admis">Admis</option>
                <option value="Respins">Respins</option>
                <option value="Neprezentat">Neprezentat</option>
            </Select>
            <Input label="Data de la" type="date" value={filterDataDe} onChange={e => setFilterDataDe(e.target.value)} />
            <Input label="Data până la" type="date" value={filterDataPana} onChange={e => setFilterDataPana(e.target.value)} />
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Filtre collapse pe mobil */}
            <div className="sm:hidden rounded-lg bg-slate-800/50 overflow-hidden">
                <button
                    onClick={() => setFiltersExpanded(prev => !prev)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white"
                >
                    <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        Filtre
                        {activeFilterCount > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-amber-500 text-black">
                                {activeFilterCount}
                            </span>
                        )}
                    </span>
                    <svg
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {filtersExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-700">
                        <div className="pt-3 space-y-3">
                            {filterContent}
                        </div>
                        <button
                            onClick={() => setFiltersExpanded(false)}
                            className="mt-3 w-full py-2 rounded-lg bg-amber-500 text-black text-sm font-bold"
                        >
                            Aplică filtre →
                        </button>
                    </div>
                )}
            </div>
            {/* Filtre normale pe sm+ */}
            <div className="hidden sm:block">
                {filterContent}
            </div>
            <div className="flex justify-between items-center">
                <p className="text-sm text-slate-400">{filtered.length} înregistrări</p>
                <div className="flex gap-2">
                    {initialSportivId && <Button variant="info" onClick={handleAdd} size="sm"><PlusIcon className="w-4 h-4 mr-1" />Adaugă examen</Button>}
                    <Button variant="secondary" onClick={handleExport} size="sm">Export CSV</Button>
                </div>
            </div>
            {loading ? (
                <p className="text-center text-slate-400 py-8">Se încarcă...</p>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className="hidden md:block bg-slate-800 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-700 text-slate-300">
                                    <tr>
                                        <th className="p-3"><SortBtn field="sportiv" label="Sportiv" /></th>
                                        <th className="p-3"><SortBtn field="club" label="Club" /></th>
                                        <th className="p-3"><SortBtn field="grad" label="Grad" /></th>
                                        <th className="p-3"><SortBtn field="rezultat" label="Rezultat" /></th>
                                        <th className="p-3"><SortBtn field="data" label="Data" /></th>
                                        <th className="p-3 hidden lg:table-cell">Sesiune</th>
                                        <th className="p-3 hidden lg:table-cell">Locație</th>
                                        <th className="p-3 text-right">Acțiuni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {filtered.map(r => {
                                        const val = r.rezultat || r.status_inscriere;
                                        const cls = r.rezultat === 'Admis' ? 'bg-green-500/20 text-green-400'
                                            : r.rezultat === 'Respins' ? 'bg-red-500/20 text-red-400'
                                            : r.status_inscriere === 'In asteptare' ? 'bg-yellow-500/20 text-yellow-400'
                                            : 'bg-slate-600 text-slate-300';
                                        return (
                                            <tr key={r.inscriere_id} className="hover:bg-slate-700/40">
                                                <td className="p-3 font-medium text-white">{r.sportiv_nume} {r.sportiv_prenume}</td>
                                                <td className="p-3 text-slate-300">{r.club_nume || '—'}</td>
                                                <td className="p-3 text-slate-300">{r.grad_sustinut || '—'}</td>
                                                <td className="p-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{val || '—'}</span></td>
                                                <td className="p-3 text-slate-300">{r.data_examen ? new Date(r.data_examen + 'T00:00:00').toLocaleDateString('ro-RO') : '—'}</td>
                                                <td className="p-3 text-slate-300 hidden lg:table-cell">{r.sesiune_nume || '—'}</td>
                                                <td className="p-3 text-slate-400 hidden lg:table-cell">{r.locatie_nume || '—'}</td>
                                                <td className="p-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="secondary" size="sm" onClick={() => { const s = sportivi.find(x => x.id === r.sportiv_id); if (s) onViewSportiv(s); }} title="Profil sportiv"><UserCircleIcon className="w-3.5 h-3.5" /></Button>
                                                        <Button variant="secondary" size="sm" onClick={() => onViewSesiune(r.sesiune_id)} title="Mergi la examen"><ClipboardListIcon className="w-3.5 h-3.5" /></Button>
                                                        <Button variant="primary" size="sm" onClick={() => handleEdit(r)} title="Editează"><EditIcon className="w-3.5 h-3.5" /></Button>
                                                        <Button variant="danger" size="sm" onClick={() => setConfirmDeleteId(r.inscriere_id)} isLoading={deletingId === r.inscriere_id} title="Șterge"><TrashIcon className="w-3.5 h-3.5" /></Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filtered.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-slate-400">Nicio înregistrare găsită.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-3">
                        {filtered.length === 0 && (
                            <p className="text-center text-slate-400 py-6 italic">Nicio înregistrare găsită.</p>
                        )}
                        {filtered.map(r => {
                            const val = r.rezultat || r.status_inscriere;
                            const cls = r.rezultat === 'Admis' ? 'bg-green-500/20 text-green-400'
                                : r.rezultat === 'Respins' ? 'bg-red-500/20 text-red-400'
                                : r.status_inscriere === 'In asteptare' ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-slate-600 text-slate-300';
                            return (
                                <div key={r.inscriere_id} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-white font-semibold text-sm truncate">{r.sportiv_nume} {r.sportiv_prenume}</p>
                                            <p className="text-slate-400 text-xs mt-0.5 truncate">{r.grad_sustinut || '—'} · {r.locatie_nume || '—'}</p>
                                        </div>
                                        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{val || '—'}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-slate-500">
                                            {r.data_examen ? new Date(r.data_examen + 'T00:00:00').toLocaleDateString('ro-RO') : '—'}
                                            {r.sesiune_nume ? ` · ${r.sesiune_nume}` : ''}
                                        </span>
                                        <div className="flex gap-1">
                                            <Button variant="secondary" size="sm" onClick={() => { const s = sportivi.find(x => x.id === r.sportiv_id); if (s) onViewSportiv(s); }} title="Profil sportiv"><UserCircleIcon className="w-3.5 h-3.5" /></Button>
                                            <Button variant="secondary" size="sm" onClick={() => onViewSesiune(r.sesiune_id)} title="Mergi la examen"><ClipboardListIcon className="w-3.5 h-3.5" /></Button>
                                            <Button variant="primary" size="sm" onClick={() => handleEdit(r)} title="Editează"><EditIcon className="w-3.5 h-3.5" /></Button>
                                            <Button variant="danger" size="sm" onClick={() => setConfirmDeleteId(r.inscriere_id)} isLoading={deletingId === r.inscriere_id} title="Șterge"><TrashIcon className="w-3.5 h-3.5" /></Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={isAdding ? 'Adaugă Examen' : 'Editează Examen'}>
                <div className="space-y-4">
                    <Select label="Sesiunea" name="sesiune_id" value={formState.sesiune_id} onChange={e => setFormState(p => ({ ...p, sesiune_id: e.target.value }))} required>
                        <option value="">Selectează sesiunea...</option>
                        {sesiuni.map(s => <option key={s.id} value={s.id}>{s.data ? new Date(s.data + 'T00:00:00').toLocaleDateString('ro-RO') : ''} — {s.nume} {s.locatie_nume || ''}</option>)}
                    </Select>
                    <Select label="Grad" name="grad_sustinut_id" value={formState.grad_sustinut_id} onChange={e => setFormState(p => ({ ...p, grad_sustinut_id: e.target.value }))} required>
                        <option value="">Selectează gradul...</option>
                        {grade.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
                    </Select>
                    <Select label="Rezultat" name="rezultat" value={formState.rezultat} onChange={e => setFormState(p => ({ ...p, rezultat: e.target.value }))}>
                        <option value="Admis">Admis</option>
                        <option value="Respins">Respins</option>
                        <option value="Neprezentat">Neprezentat</option>
                    </Select>
                    <Select label="Status Înregistrare" name="status_inscriere" value={formState.status_inscriere} onChange={e => setFormState(p => ({ ...p, status_inscriere: e.target.value }))}>
                        <option value="Validat">Validat</option>
                        <option value="In asteptare">In asteptare</option>
                    </Select>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setIsFormOpen(false)} disabled={savingForm}>Anulează</Button>
                        <Button variant="success" onClick={handleSave} isLoading={savingForm}>Salvează</Button>
                    </div>
                </div>
            </Modal>
            <ConfirmDeleteModal
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={() => { if (confirmDeleteId) handleDelete(confirmDeleteId); }}
                tableName="înregistrarea examenului"
                isLoading={!!deletingId}
            />
        </div>
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
    initialSportivId?: string | null;
}

export const RapoarteExamen: React.FC<RapoarteExamenProps> = ({ currentUser, clubs, onBack, sesiuni, setSesiuni, inscrieri, setInscrieri, sportivi, setSportivi, grade, locatii, setLocatii, plati, setPlati, preturiConfig, deconturiFederatie, setDeconturiFederatie, istoricGrade, setIstoricGrade, onViewSportiv, initialSportivId }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sesiuneToEdit, setSesiuneToEdit] = useState<SesiuneExamen | null>(null);
  const [sesiuneToDelete, setSesiuneToDelete] = useState<SesiuneExamen | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedSesiuneId, setSelectedSesiuneId] = useLocalStorage<string | null>('phi-hau-selected-sesiune-id', null);
  const [activeTab, setActiveTab] = useState<'sesiuni' | 'raport'>('sesiuni');
  const { showError, showSuccess } = useError();

  useEffect(() => {
      if (initialSportivId) setActiveTab('raport');
  }, [initialSportivId]);

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
            const { data: viewData, error: viewError } = await supabase.from('sesiuni_examene').select('*').eq('id', data.id).maybeSingle();
            const finalData = viewData || data;
            setSesiuni(prev => prev.map(e => e.id === finalData.id ? finalData as SesiuneExamen : e)); 
            showSuccess("Succes", "Sesiunea a fost actualizată."); 
        }
    } else {
        const { data, error } = await supabase.from('sesiuni_examene').insert(dataToSave).select().maybeSingle();
        if (error) { showError("Eroare la adăugare", error); } else if (data) { 
            const { data: viewData, error: viewError } = await supabase.from('sesiuni_examene').select('*').eq('id', data.id).maybeSingle();
            const finalData = viewData || data;
            setSesiuni(prev => [...prev, finalData as SesiuneExamen]); 
            showSuccess("Succes", "Sesiunea a fost creată."); 
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
      <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1 w-fit mb-6">
          <button
              onClick={() => setActiveTab('sesiuni')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'sesiuni' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
              Sesiuni
          </button>
          <button
              onClick={() => setActiveTab('raport')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'raport' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
              Raport Sportivi
          </button>
      </div>
      {activeTab === 'sesiuni' && (
        <div>
          <div className="flex justify-between items-center mb-6"><h1 className="text-2xl md:text-3xl font-bold text-white">Rapoarte Examen</h1><Button onClick={() => { setSesiuneToEdit(null); setIsFormOpen(true); }} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Sesiune</Button></div>

          <HartaExamene />

          {/* Desktop table */}
          <div className="hidden md:block bg-slate-800 rounded-lg shadow-lg overflow-hidden mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Data</th><th className="p-4 font-semibold">Locația</th><th className="p-4 font-semibold">Înscriși</th><th className="p-4 font-semibold text-right">Acțiuni</th></tr></thead>
                  <tbody className="divide-y divide-slate-700">
                      {sortedSesiuni.map(s => ( <tr key={s.id} className="hover:bg-slate-700/50"><td className="p-4 font-medium cursor-pointer" onClick={() => setSelectedSesiuneId(s.id)}>{new Date((s.data || s.data_examen || '').toString().slice(0, 10)+'T00:00:00').toLocaleDateString('ro-RO')}</td><td className="p-4 cursor-pointer" onClick={() => setSelectedSesiuneId(s.id)}>{s.locatie_nume || locatii.find(l => l.id === s.locatie_id)?.nume || 'N/A'}</td><td className="p-4">{inscrieri.filter(p => p.sesiune_id === s.id).length}</td><td className="p-4 w-32"><div className="flex items-center justify-end space-x-2"><Button onClick={() => { setSesiuneToEdit(s); setIsFormOpen(true); }} variant="primary" size="sm"><EditIcon /></Button><Button onClick={() => setSesiuneToDelete(s)} variant="danger" size="sm"><TrashIcon /></Button></div></td></tr> ))}
                      {sortedSesiuni.length === 0 && <tr><td colSpan={4}><p className="p-4 text-center text-slate-400">Nicio sesiune programată.</p></td></tr>}
                  </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden mt-6 space-y-3">
              {sortedSesiuni.length === 0 && (
                  <p className="text-center text-slate-400 py-6 italic">Nicio sesiune programată.</p>
              )}
              {sortedSesiuni.map(s => {
                  const nrInscrisi = inscrieri.filter(p => p.sesiune_id === s.id).length;
                  const locatieNume = s.locatie_nume || locatii.find(l => l.id === s.locatie_id)?.nume || 'N/A';
                  const dataText = new Date((s.data || s.data_examen || '').toString().slice(0, 10)+'T00:00:00').toLocaleDateString('ro-RO');
                  return (
                      <div key={s.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4"
                          onClick={() => setSelectedSesiuneId(s.id)}>
                          <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                  <p className="text-white font-semibold truncate">{locatieNume}</p>
                                  <p className="text-slate-400 text-sm mt-0.5">{dataText}</p>
                              </div>
                              <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${s.status === 'Finalizat' ? 'bg-green-500/20 text-green-400' : 'bg-sky-500/20 text-sky-400'}`}>
                                  {s.status || 'Programat'}
                              </span>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                              <span className="text-sm text-slate-400">{nrInscrisi} participanți</span>
                              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                  <Button onClick={() => { setSesiuneToEdit(s); setIsFormOpen(true); }} variant="primary" size="sm"><EditIcon /></Button>
                                  <Button onClick={() => setSesiuneToDelete(s)} variant="danger" size="sm"><TrashIcon /></Button>
                              </div>
                          </div>
                      </div>
                  );
              })}
          </div>
          <SesiuneForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveSesiune} sesiuneToEdit={sesiuneToEdit} locatii={locatii} setLocatii={setLocatii} clubs={clubs} currentUser={currentUser} />
          <ConfirmDeleteModal isOpen={!!sesiuneToDelete} onClose={() => setSesiuneToDelete(null)} onConfirm={() => { if(sesiuneToDelete) confirmDeleteSesiune(sesiuneToDelete.id) }} tableName="Sesiuni (și toate înscrierile asociate)" isLoading={isDeleting} />
        </div>
      )}
      {activeTab === 'raport' && (
          <RaportInscrieri sesiuni={sesiuni} grade={grade} currentUser={currentUser} initialSportivId={initialSportivId} sportivi={sportivi} onViewSportiv={onViewSportiv} onViewSesiune={(id) => { setSelectedSesiuneId(id); setActiveTab('sesiuni'); }} />
      )}
    </div>
  );
};
