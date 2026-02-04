import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Antrenament, Sportiv, Grupa, Plata, TipAbonament, AnuntPrezenta, ProgramItem, View, Grad } from '../types';
import { Button, Card, Input, Select, Modal } from './ui';
import { PlusIcon, ArrowLeftIcon, TrashIcon, EditIcon, XIcon, CheckIcon, ExclamationTriangleIcon, CalendarDaysIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ListaPrezentaAntrenament } from './ListaPrezentaAntrenament';

// --- Sub-componente ---

const AntrenamentForm: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Antrenament, 'id' | 'prezenta'>) => Promise<void>;
    antrenamentToEdit: Antrenament | null;
    grupe: Grupa[];
}> = ({ isOpen, onClose, onSave, antrenamentToEdit, grupe }) => {
    const getInitialState = () => ({
        data: antrenamentToEdit?.data || new Date().toISOString().split('T')[0],
        ora_start: antrenamentToEdit?.ora_start || '18:00',
        ora_sfarsit: antrenamentToEdit?.ora_sfarsit || '19:30',
        grupa_id: antrenamentToEdit?.grupa_id || null,
        tip: (antrenamentToEdit?.grupa_id ? 'Normal' : 'Vacanta') as 'Normal' | 'Vacanta',
    });
    
    const [formState, setFormState] = useState(getInitialState());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormState(getInitialState());
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, antrenamentToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value === '' ? null : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { tip, ...antrenamentData } = formState;
        const finalData = {
            ...antrenamentData,
            grupa_id: tip === 'Normal' ? antrenamentData.grupa_id : null,
            ziua: null,
            is_recurent: false,
        };
        await onSave(finalData);
        setLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={antrenamentToEdit ? "Editează Antrenament" : "Creează Antrenament Nou"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <Input label="Data" type="date" name="data" value={formState.data} onChange={handleChange} required />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Ora Start" type="time" name="ora_start" value={formState.ora_start} onChange={handleChange} required />
                    <Input label="Ora Sfârșit" type="time" name="ora_sfarsit" value={formState.ora_sfarsit ?? ''} onChange={handleChange} required />
                </div>
                 <Select label="Grupa" name="grupa_id" value={formState.grupa_id || ''} onChange={handleChange}>
                    <option value="">Antrenament Liber (Vacanță)</option>
                    {(grupe || []).map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                </Select>
                <div className="flex justify-end pt-4 space-x-2 border-t border-slate-700 mt-6">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button>
                </div>
            </form>
        </Modal>
    );
};

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-offset-2 focus:ring-offset-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-green-600' : 'bg-slate-600'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
);

interface AttendanceDetailProps {
    antrenament: Antrenament;
    onBack: () => void;
    setAntrenamente: React.Dispatch<React.SetStateAction<Antrenament[]>>;
    allSportivi: Sportiv[];
    allPlati: Plata[];
}

const AttendanceDetail: React.FC<AttendanceDetailProps> = ({ antrenament, onBack, setAntrenamente, allSportivi, allPlati }) => {
    const AthleteRow: React.FC<{
        sportiv: Sportiv;
        isPresent: boolean;
        isUpdating: boolean;
        hasViza: boolean;
        onToggle: (id: string) => void;
        onRemove?: (id: string) => void;
    }> = ({ sportiv, isPresent, isUpdating, hasViza, onToggle, onRemove }) => (
        <div className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${isPresent ? 'bg-green-900/30 border-green-700/50' : 'bg-slate-800/50 border-slate-700'}`}>
             <span className={`font-medium flex-grow flex items-center gap-2 ${hasViza ? 'text-white' : 'text-red-400'}`}>
                {!hasViza && <ExclamationTriangleIcon className="w-4 h-4" title="Viză medicală expirată!" />}
                {sportiv.nume} {sportiv.prenume}
            </span>
            <div className="flex items-center gap-2">
                <ToggleSwitch checked={isPresent} onChange={() => onToggle(sportiv.id)} disabled={isUpdating} />
                <span className={`font-bold text-sm ${isPresent ? 'text-green-300' : 'text-slate-500'}`}>{isPresent ? 'Prezent' : 'Absent'}</span>
            </div>
            {onRemove && (
                <Button size="sm" variant="danger" onClick={() => onRemove(sportiv.id)} className="!p-2 shrink-0" title="Elimină de la antrenament" disabled={isUpdating}>
                    <TrashIcon className="w-4 h-4" />
                </Button>
            )}
        </div>
    );

    const [groupAthletes, setGroupAthletes] = useState<Sportiv[]>([]);
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
    const [extraAthleteIds, setExtraAthleteIds] = useState<Set<string>>(new Set());
    const [selectedExternalId, setSelectedExternalId] = useState('');
    const { showError, showSuccess } = useError();

    const presentIds = useMemo(() => 
        new Set(antrenament.prezenta.filter(p => p.status === 'prezent').map(p => p.sportiv_id)),
        [antrenament.prezenta]
    );

    const hasValidMedicalCheck = useCallback((sportivId: string, plati: Plata[]): boolean => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const seasonStartYear = currentMonth >= 8 ? currentYear : currentYear - 1;
        const seasonStartDate = new Date(seasonStartYear, 8, 1);
        return (plati || []).some(p => p.sportiv_id === sportivId && p.tip === 'Taxa Anuala' && p.status === 'Achitat' && new Date(p.data) >= seasonStartDate);
    }, []);
    
    useEffect(() => {
        const initialExtraIds = new Set<string>();
        const groupAthleteIds = new Set<string>();
        
        if (antrenament.grupa_id) {
            const fetchedGroupAthletes = (allSportivi || []).filter(s => s.grupa_id === antrenament.grupa_id);
            setGroupAthletes(fetchedGroupAthletes.sort((a,b) => a.nume.localeCompare(b.nume)));
            fetchedGroupAthletes.forEach(s => groupAthleteIds.add(s.id));
        }

        antrenament.prezenta.forEach(p => {
            if (!groupAthleteIds.has(p.sportiv_id)) {
                initialExtraIds.add(p.sportiv_id);
            }
        });
        setExtraAthleteIds(initialExtraIds);
    }, [antrenament, allSportivi]);
    
    const updateLocalPresence = (updatedPresence: { sportiv_id: string; status: string | null }[]) => {
        setAntrenamente(prevAntrenamente => prevAntrenamente.map(a => 
            a.id === antrenament.id ? { ...a, prezenta: updatedPresence } : a
        ));
    };

    const handleTogglePresence = async (sportivId: string) => {
        const currentPresence = antrenament.prezenta.find(p => p.sportiv_id === sportivId);
        const newStatus = currentPresence?.status === 'prezent' ? 'absent' : 'prezent';

        setUpdatingIds(prev => new Set(prev).add(sportivId));
        try {
            const { data, error } = await supabase
                .from('prezenta_antrenament')
                .upsert({ antrenament_id: antrenament.id, sportiv_id: sportivId, status: newStatus }, { onConflict: 'antrenament_id, sportiv_id' })
                .select()
                .single();
            if (error) throw error;
            
            const newPresenceArray = [...antrenament.prezenta];
            const existingIndex = newPresenceArray.findIndex(p => p.sportiv_id === sportivId);
            if(existingIndex > -1) {
                newPresenceArray[existingIndex] = data;
            } else {
                newPresenceArray.push(data);
            }
            updateLocalPresence(newPresenceArray);
            showSuccess("Status salvat", `${allSportivi.find(s=>s.id === sportivId)?.nume} marcat ca ${newStatus}`);
        } catch(err: any) {
            showError("Eroare la salvare", err.message);
        } finally {
            setUpdatingIds(prev => {
                const next = new Set(prev);
                next.delete(sportivId);
                return next;
            });
        }
    };
    
    const handleBulkUpdate = async (newStatus: 'prezent' | 'absent') => {
        const sportiviIdsToUpdate = groupAthletes.map(s => s.id);
        setUpdatingIds(prev => new Set([...prev, ...sportiviIdsToUpdate]));
        
        const upsertData = sportiviIdsToUpdate.map(sportiv_id => ({
            antrenament_id: antrenament.id,
            sportiv_id,
            status: newStatus
        }));
        
        try {
            const { data, error } = await supabase
                .from('prezenta_antrenament')
                .upsert(upsertData, { onConflict: 'antrenament_id, sportiv_id' })
                .select();
            if (error) throw error;
            
            const updatedDataMap = new Map((data || []).map(p => [p.sportiv_id, p]));
            const newPresenceArray = antrenament.prezenta.filter(p => !sportiviIdsToUpdate.includes(p.sportiv_id));
            
            sportiviIdsToUpdate.forEach(id => {
                if(updatedDataMap.has(id)) newPresenceArray.push(updatedDataMap.get(id)!);
            });

            updateLocalPresence(newPresenceArray);
            showSuccess("Succes", `Toți sportivii din grupă au fost marcați ca ${newStatus}.`);
        } catch(err: any) {
            showError("Eroare la salvarea în masă", err.message);
        } finally {
             setUpdatingIds(new Set());
        }
    };

    const externalAthletesForSelect = useMemo(() => {
        const groupAthleteIds = new Set(groupAthletes.map(s => s.id));
        return (allSportivi || []).filter(s => s.status === 'Activ' && !groupAthleteIds.has(s.id) && !extraAthleteIds.has(s.id));
    }, [allSportivi, groupAthletes, extraAthleteIds]);

    const handleAddExternal = () => {
        if (!selectedExternalId) return;
        setExtraAthleteIds(prev => new Set(prev).add(selectedExternalId));
        setSelectedExternalId('');
    };
    
    const handleRemoveExternal = async (sportivIdToRemove: string) => {
        setUpdatingIds(prev => new Set(prev).add(sportivIdToRemove));
        try {
             const { error } = await supabase
                .from('prezenta_antrenament')
                .delete()
                .match({ antrenament_id: antrenament.id, sportiv_id: sportivIdToRemove });
            if (error) throw error;

            const newPresenceArray = antrenament.prezenta.filter(p => p.sportiv_id !== sportivIdToRemove);
            updateLocalPresence(newPresenceArray);
            setExtraAthleteIds(prev => {
                const next = new Set(prev);
                next.delete(sportivIdToRemove);
                return next;
            });
        } catch (err: any) {
            showError("Eroare la eliminare", err.message);
        } finally {
            setUpdatingIds(prev => {
                const next = new Set(prev);
                next.delete(sportivIdToRemove);
                return next;
            });
        }
    };

    const extraAthletesToDisplay = useMemo(() => {
        return Array.from(extraAthleteIds)
            .map(id => (allSportivi || []).find(s => s.id === id))
            .filter((s): s is Sportiv => s !== undefined);
    }, [allSportivi, extraAthleteIds]);

    return (
        <Card className="overflow-visible relative">
            <Button onClick={onBack} variant="secondary" className="mb-4"><ArrowLeftIcon /> Înapoi la Listă</Button>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-4 mb-1">
                        <h2 className="text-2xl font-bold text-white">Înregistrare Prezență</h2>
                        <span className="bg-green-600/50 text-green-200 text-lg font-bold px-3 py-1 rounded-full">
                            {presentIds.size} Prezenți
                        </span>
                    </div>
                    <p className="text-slate-400">Antrenament {antrenament.grupe?.denumire || 'Liber'} - {new Date(antrenament.data + 'T00:00:00').toLocaleDateString('ro-RO')} ora {antrenament.ora_start}</p>
                </div>
            </div>

            {groupAthletes.length > 0 && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                    <p className="text-sm font-bold text-slate-300 mr-auto">Prezență Rapidă:</p>
                    <Button variant="info" size="sm" onClick={() => handleBulkUpdate('prezent')} disabled={updatingIds.size > 0}>
                        <CheckIcon className="w-4 h-4 mr-2" /> Marchează Toți Prezenți
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleBulkUpdate('absent')} disabled={updatingIds.size > 0}>
                        <XIcon className="w-4 h-4 mr-2" /> Marchează Toți Absenți
                    </Button>
                </div>
            )}

            <div className="space-y-2">
                {groupAthletes.length > 0 ? groupAthletes.map(sportiv => {
                    const isPresent = presentIds.has(sportiv.id);
                    return (
                     <AthleteRow 
                        key={sportiv.id} 
                        sportiv={sportiv} 
                        isPresent={isPresent} 
                        isUpdating={updatingIds.has(sportiv.id)}
                        hasViza={hasValidMedicalCheck(sportiv.id, allPlati)} 
                        onToggle={handleTogglePresence}
                    />
                )}) : <p className="text-slate-400 italic text-center py-4">Niciun sportiv înscris în această grupă.</p>}
            </div>

             {extraAthletesToDisplay.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-700">
                    <h3 className="text-lg font-bold text-white mb-2">Participanți Externi</h3>
                    <div className="space-y-2">
                        {extraAthletesToDisplay.map(sportiv => {
                            const isPresent = presentIds.has(sportiv.id);
                            return (
                            <AthleteRow
                                key={sportiv.id}
                                sportiv={sportiv}
                                isPresent={isPresent}
                                isUpdating={updatingIds.has(sportiv.id)}
                                hasViza={hasValidMedicalCheck(sportiv.id, allPlati)}
                                onToggle={handleTogglePresence}
                                onRemove={handleRemoveExternal}
                            />
                        )})}
                    </div>
                </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-700">
                <h3 className="text-lg font-bold text-white mb-2">Adaugă Sportiv din Afara Grupei</h3>
                <div className="flex items-end gap-2">
                    <div className="flex-grow">
                        <Select label="Selectează Sportiv" value={selectedExternalId} onChange={e => setSelectedExternalId(e.target.value)} disabled={updatingIds.size > 0}>
                            <option value="">Alege...</option>
                            {externalAthletesForSelect.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
                        </Select>
                    </div>
                    <Button onClick={handleAddExternal} disabled={!selectedExternalId || updatingIds.size > 0} variant="info">
                        <PlusIcon className="w-5 h-5 mr-2" /> Adaugă
                    </Button>
                </div>
            </div>
        </Card>
    );
};


// --- Componenta Principală ---

export const PrezentaManagement: React.FC<{
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    antrenamente: Antrenament[];
    setAntrenamente: React.Dispatch<React.SetStateAction<Antrenament[]>>;
    grupe: Grupa[];
    grade: Grad[];
    onBack: () => void;
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    plati: Plata[];
    tipuriAbonament: TipAbonament[];
    anunturi: AnuntPrezenta[];
    onViewSportiv: (sportiv: Sportiv) => void;
    onNavigate: (view: View) => void;
}> = ({ sportivi, setSportivi, antrenamente, setAntrenamente, grupe, grade, onBack, plati, setPlati, tipuriAbonament, anunturi, onViewSportiv, onNavigate }) => {
    
    const [selectedAntrenamentId, setSelectedAntrenamentId] = useLocalStorage<string | null>('phi-hau-selected-antrenament-id', null);
    const selectedAntrenament = useMemo(() => (antrenamente || []).find(p => p.id === selectedAntrenamentId) || null, [antrenamente, selectedAntrenamentId]);

    const [viewingAnunturiFor, setViewingAnunturiFor] = useState<Antrenament | null>(null);

    const handleSetSelectedAntrenament = (antrenament: Antrenament) => {
        setSelectedAntrenamentId(antrenament ? antrenament.id : null);
    };

    const [antrenamentToEdit, setAntrenamentToEdit] = useState<Antrenament | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [antrenamentToDelete, setAntrenamentToDelete] = useState<Antrenament | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError, showSuccess } = useError();

    const initialFilters = { tip: '', data: new Date().toISOString().split('T')[0], grupa: '', ziua: '' };
    const [filters, setFilters] = useLocalStorage('phi-hau-prezenta-filters', initialFilters);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveAntrenament = async (antrenamentData: Omit<Antrenament, 'id' | 'prezenta'>) => {
        if (!supabase) return;
        if (antrenamentToEdit) {
            const { data, error } = await supabase.from('program_antrenamente').update(antrenamentData).eq('id', antrenamentToEdit.id).select('*, grupe(*), prezenta:prezenta_antrenament!antrenament_id(sportiv_id, status)').single();
            if (error) { showError("Eroare la actualizare", error.message); } 
            else if (data) { 
                const prezentaRaw = (data as any).prezenta;
                const prezentaArray = prezentaRaw ? (Array.isArray(prezentaRaw) ? prezentaRaw : [prezentaRaw]) : [];
                const formatted: Antrenament = { ...data, prezenta: prezentaArray };
                setAntrenamente(prev => prev.map(p => p.id === data.id ? formatted : p));
            }
        } else {
            const { data, error } = await supabase.from('program_antrenamente').insert(antrenamentData).select('*, grupe(*)').single();
            if (error) { showError("Eroare la creare", error.message); } 
            else if (data) { setAntrenamente(prev => [...prev, { ...data, prezenta: [] }]); }
        }
    };

    const confirmDeleteAntrenament = async (id: string) => {
        if (!supabase) return;
        setIsDeleting(true);
        try {
            await supabase.from('prezenta_antrenament').delete().eq('antrenament_id', id);
            await supabase.from('program_antrenamente').delete().eq('id', id);
            setAntrenamente(prev => prev.filter(p => p.id !== id));
            showSuccess("Succes", "Antrenamentul a fost șters.");
        } catch (err: unknown) {
            showError("Eroare la ștergere", err instanceof Error ? err.message : String(err));
        } finally {
            setIsDeleting(false);
            setAntrenamentToDelete(null);
        }
    };

    const handleOpenAdd = () => { setAntrenamentToEdit(null); setIsFormOpen(true); };
    
    const filteredAntrenamente = useMemo(() => {
        const zileSaptamanaJS = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
        return (antrenamente || [])
            .filter(a => {
                const trainingDayName = a.data ? zileSaptamanaJS[new Date(a.data + 'T00:00:00').getDay()] : null;
                return (
                    (!filters.data || a.data === filters.data) &&
                    (!filters.grupa || a.grupa_id === filters.grupa) &&
                    (!filters.ziua || trainingDayName === filters.ziua)
                )
            })
            .sort((a, b) => (a.ora_start || '').localeCompare(b.ora_start || ''));
    }, [antrenamente, filters]);

    if (viewingAnunturiFor) {
        return <ListaPrezentaAntrenament 
            antrenament={viewingAnunturiFor}
            onBack={() => setViewingAnunturiFor(null)}
            allAnunturi={anunturi}
            allSportivi={sportivi}
            grade={grade}
        />;
    }
    
    if (selectedAntrenament) {
        return <AttendanceDetail 
            antrenament={selectedAntrenament} 
            onBack={() => setSelectedAntrenamentId(null)} 
            setAntrenamente={setAntrenamente} 
            allSportivi={sportivi}
            allPlati={plati}
        />;
    }

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <div className="flex justify-between items-center mb-6">
                 <h1 className="text-3xl font-bold text-white">Înregistrare Prezențe</h1>
                <Button onClick={handleOpenAdd} variant="info"><PlusIcon className="w-5 h-5 mr-2" /> Antrenament Nou</Button>
            </div>

            <Card className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="flex items-end gap-1">
                        <Input label="Filtrează după Dată" name="data" type="date" value={filters.data} onChange={handleFilterChange} className="flex-grow"/>
                        <Button variant="secondary" size="sm" onClick={() => setFilters(prev => ({...prev, data: ''}))} className="h-[38px] !px-3" title="Șterge filtrul de dată">
                            <XIcon className="w-4 h-4"/>
                        </Button>
                    </div>
                    <Select label="Filtrează după Grupă" name="grupa" value={filters.grupa} onChange={handleFilterChange}>
                        <option value="">Toate Grupele</option>
                        {(grupe || []).map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                    </Select>
                     <Select label="Filtrează după Zi" name="ziua" value={filters.ziua} onChange={handleFilterChange}>
                        <option value="">Toate Zilele</option>
                        {['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'].map(zi => <option key={zi} value={zi}>{zi}</option>)}
                    </Select>
                    <Button onClick={() => onNavigate('activitati')} variant="secondary" className="w-full lg:w-auto justify-self-end">
                        <CalendarDaysIcon className="w-5 h-5 mr-2" />
                        Generează Antrenamente Recurente
                    </Button>
                </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-slate-700/50 text-sky-300 text-xs uppercase">
                            <tr>
                                <th className="p-4 font-semibold">Ora</th>
                                <th className="p-4 font-semibold">Grupa / Tip</th>
                                <th className="p-4 font-semibold text-center">Prezenți</th>
                                <th className="p-4 font-semibold text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {(filteredAntrenamente || []).map(p => {
                                const now = new Date();
                                let isPast = false;
                                if (p.data && p.ora_start) {
                                    const trainingDateTime = new Date(`${p.data}T${p.ora_start}`);
                                    isPast = trainingDateTime < now;
                                }

                                return (
                                <tr key={p.id} className={`transition-all ${isPast ? 'opacity-60 bg-slate-800/30' : ''} hover:bg-slate-700/50 hover:opacity-100`}>
                                    <td className="p-4 font-medium text-white">{p.ora_start}</td>
                                    <td className="p-4 text-slate-300">{p.grupe?.denumire || 'Antrenament Liber'}</td>
                                    <td className="p-4 text-center">
                                         <span className={`inline-block font-bold text-sm px-3 py-1 rounded-full ${isPast ? 'bg-slate-600 text-slate-300' : 'bg-sky-900/50 text-sky-300'}`}>{p.prezenta.filter(pr => pr.status === 'prezent').length}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <Button onClick={() => setViewingAnunturiFor(p as Antrenament)} variant="secondary" size="sm">
                                                Vezi Anunțuri
                                            </Button>
                                            <Button onClick={() => handleSetSelectedAntrenament(p as Antrenament)} variant={isPast ? "secondary" : "primary"} size="sm">
                                                Gestionează Prezența
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                            })}
                        </tbody>
                    </table>
                    {(filteredAntrenamente || []).length === 0 && <p className="p-4 text-center text-slate-400">Niciun antrenament înregistrat conform filtrelor.</p>}
                </div>
            </Card>
            <AntrenamentForm 
                isOpen={isFormOpen} 
                onClose={() => setIsFormOpen(false)} 
                onSave={handleSaveAntrenament} 
                antrenamentToEdit={antrenamentToEdit}
                grupe={grupe}
            />
            <ConfirmDeleteModal 
                isOpen={!!antrenamentToDelete} 
                onClose={() => setAntrenamentToDelete(null)} 
                onConfirm={() => { if(antrenamentToDelete) confirmDeleteAntrenament(antrenamentToDelete.id) }} 
                tableName="Antrenament" 
                isLoading={isDeleting} 
            />
        </div>
    );
};