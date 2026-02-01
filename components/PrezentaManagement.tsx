import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Antrenament, Sportiv, Grupa, Plata, TipAbonament, AnuntPrezenta, ProgramItem } from '../types';
import { Button, Card, Input, Select, Modal } from './ui';
import { PlusIcon, ArrowLeftIcon, TrashIcon, EditIcon, XIcon, CheckIcon, ExclamationTriangleIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

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
                    {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                </Select>
                <div className="flex justify-end pt-4 space-x-2 border-t border-slate-700 mt-6">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button>
                </div>
            </form>
        </Modal>
    );
};

interface AttendanceDetailProps {
    antrenament: Antrenament;
    onBack: () => void;
    setAntrenamente: React.Dispatch<React.SetStateAction<Antrenament[]>>;
    allSportivi: Sportiv[];
    allPlati: Plata[];
}

const AttendanceDetail: React.FC<AttendanceDetailProps> = ({ antrenament, onBack, setAntrenamente, allSportivi, allPlati }) => {
    // FIX: Moved AthleteRow inside AttendanceDetail to ensure it is always in scope.
    const AthleteRow: React.FC<{
        sportiv: Sportiv;
        isPresent: boolean;
        isUpdating: boolean;
        hasViza: boolean;
        onToggle: (id: string) => void;
        onRemove?: (id: string) => void;
    }> = ({ sportiv, isPresent, isUpdating, hasViza, onToggle, onRemove }) => (
        <div className="flex items-center gap-2">
            <label htmlFor={`att-${sportiv.id}`} className={`flex-grow flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isPresent ? 'bg-green-900/30 border-green-700/50 opacity-100' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 opacity-60 hover:opacity-100'}`}>
                <input 
                    id={`att-${sportiv.id}`} 
                    type="checkbox" 
                    className="h-6 w-6 shrink-0 rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary focus:ring-offset-slate-800 disabled:opacity-50" 
                    checked={isPresent} 
                    onChange={() => onToggle(sportiv.id)} 
                    disabled={isUpdating}
                />
                <span className={`font-medium flex-grow flex items-center gap-2 ${hasViza ? 'text-white' : 'text-red-400'}`}>
                    {!hasViza && <ExclamationTriangleIcon className="w-4 h-4" title="Viză medicală expirată!" />}
                    {sportiv.nume} {sportiv.prenume}
                </span>
                <span className={`font-bold text-sm px-2 py-1 rounded-md ${isPresent ? 'text-green-300' : 'text-slate-500'}`}>{isPresent ? 'Prezent' : 'Absent'}</span>
            </label>
            {onRemove && (
                <Button size="sm" variant="danger" onClick={() => onRemove(sportiv.id)} className="!p-2 shrink-0" title="Elimină de la antrenament">
                    <TrashIcon className="w-4 h-4" />
                </Button>
            )}
        </div>
    );

    const [groupAthletes, setGroupAthletes] = useState<Sportiv[]>([]);
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
    const [extraAthleteIds, setExtraAthleteIds] = useState<Set<string>>(new Set());
    const [selectedExternalId, setSelectedExternalId] = useState('');
    const { showError } = useError();

    const hasValidMedicalCheck = useCallback((sportivId: string, plati: Plata[]): boolean => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const seasonStartYear = currentMonth >= 8 ? currentYear : currentYear - 1;
        const seasonStartDate = new Date(seasonStartYear, 8, 1);
        return plati.some(p => p.sportiv_id === sportivId && p.tip === 'Taxa Anuala' && p.status === 'Achitat' && new Date(p.data) >= seasonStartDate);
    }, []);
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const initialPresentIds = new Set(antrenament.prezenta.map(p => p.sportiv_id));
            setPresentIds(initialPresentIds);
            
            if (!antrenament.grupa_id) {
                setGroupAthletes([]);
                setExtraAthleteIds(initialPresentIds); // All present are external if no group
                setLoading(false);
                return;
            }
            
            const { data: athletesData, error: athletesError } = await supabase.from('sportivi').select('*').eq('grupa_id', antrenament.grupa_id).order('nume', { ascending: true });
            if (athletesError) { showError("Eroare sportivi", athletesError); setLoading(false); return; }
            
            const fetchedGroupAthletes = athletesData || [];
            setGroupAthletes(fetchedGroupAthletes);

            const groupAthleteIds = new Set(fetchedGroupAthletes.map(s => s.id));
            const initialExtraIds = new Set<string>();
            initialPresentIds.forEach(id => {
                if (!groupAthleteIds.has(id)) { initialExtraIds.add(id); }
            });
            setExtraAthleteIds(initialExtraIds);

            setLoading(false);
        };
        fetchData();
    }, [antrenament, showError]);

    const externalAthletesForSelect = useMemo(() => {
        const groupAthleteIds = new Set(groupAthletes.map(s => s.id));
        return (allSportivi || []).filter(s => s.status === 'Activ' && !groupAthleteIds.has(s.id));
    }, [allSportivi, groupAthletes]);
    
    const extraAthletesToDisplay = useMemo(() => {
        return Array.from(extraAthleteIds)
            .map(id => (allSportivi || []).find(s => s.id === id))
            .filter((s): s is Sportiv => s !== undefined);
    }, [allSportivi, extraAthleteIds]);

    const handleToggle = async (sportivId: string) => {
        setUpdatingIds(prev => new Set(prev).add(sportivId));
        const isCurrentlyPresent = presentIds.has(sportivId);
        const newPresentIds = new Set(presentIds);
        if (isCurrentlyPresent) newPresentIds.delete(sportivId); else newPresentIds.add(sportivId);
        setPresentIds(newPresentIds);

        try {
            if (!isCurrentlyPresent) {
                const { error } = await supabase.from('prezenta_antrenament').upsert({ antrenament_id: antrenament.id, sportiv_id: sportivId }, { onConflict: 'antrenament_id, sportiv_id' });
                if (error) throw error;
            } else {
                const { error } = await supabase.from('prezenta_antrenament').delete().match({ antrenament_id: antrenament.id, sportiv_id: sportivId });
                if (error) throw error;
            }
            setAntrenamente(prev => prev.map(a => a.id === antrenament.id ? { ...a, prezenta: Array.from(newPresentIds).map(id => ({ sportiv_id: id, status: 'prezent' })) } : a));
        } catch (err: unknown) {
            // FIX: Pass the raw error object to showError for proper handling.
            showError("Eroare la actualizare", err);
            setPresentIds(presentIds); // Revert UI
        } finally {
            setUpdatingIds(prev => { const next = new Set(prev); next.delete(sportivId); return next; });
        }
    };
    
    const handleAddExternal = () => {
        if (!selectedExternalId || presentIds.has(selectedExternalId)) return;
        setExtraAthleteIds(prev => new Set(prev).add(selectedExternalId));
        if (!presentIds.has(selectedExternalId)) {
            handleToggle(selectedExternalId); 
        }
        setSelectedExternalId('');
    };

    const handleRemoveExternal = (sportivIdToRemove: string) => {
        setExtraAthleteIds(prev => {
            const next = new Set(prev);
            next.delete(sportivIdToRemove);
            return next;
        });
        if (presentIds.has(sportivIdToRemove)) {
            handleToggle(sportivIdToRemove);
        }
    };

    if (loading) return <div className="text-center p-8">Se încarcă lista de sportivi...</div>;

    return (
        <Card>
            <Button onClick={onBack} variant="secondary" className="mb-4"><ArrowLeftIcon /> Înapoi la Listă</Button>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Înregistrare Prezență</h2>
                    <p className="text-slate-400">Antrenament {antrenament.grupe?.denumire || 'Liber'} - {new Date(antrenament.data + 'T00:00:00').toLocaleDateString('ro-RO')} ora {antrenament.ora_start}</p>
                </div>
            </div>

            <div className="space-y-2">
                {groupAthletes.length > 0 ? groupAthletes.map(sportiv => (
                     <AthleteRow 
                        key={sportiv.id} 
                        sportiv={sportiv} 
                        isPresent={presentIds.has(sportiv.id)} 
                        isUpdating={updatingIds.has(sportiv.id)} 
                        hasViza={hasValidMedicalCheck(sportiv.id, allPlati)} 
                        onToggle={handleToggle}
                    />
                )) : <p className="text-slate-400 italic text-center py-4">Niciun sportiv înscris în această grupă.</p>}
            </div>

             {extraAthletesToDisplay.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-700">
                    <h3 className="text-lg font-bold text-white mb-2">Participanți Externi</h3>
                    <div className="space-y-2">
                        {extraAthletesToDisplay.map(sportiv => (
                            <AthleteRow
                                key={sportiv.id}
                                sportiv={sportiv}
                                isPresent={presentIds.has(sportiv.id)}
                                isUpdating={updatingIds.has(sportiv.id)}
                                hasViza={hasValidMedicalCheck(sportiv.id, allPlati)}
                                onToggle={handleToggle}
                                onRemove={handleRemoveExternal}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-700">
                <h3 className="text-lg font-bold text-white mb-2">Adaugă Sportiv din Afara Grupei</h3>
                <div className="flex items-end gap-2">
                    <div className="flex-grow">
                        <Select label="Selectează Sportiv" value={selectedExternalId} onChange={e => setSelectedExternalId(e.target.value)}>
                            <option value="">Alege...</option>
                            {externalAthletesForSelect.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
                        </Select>
                    </div>
                    <Button onClick={handleAddExternal} disabled={!selectedExternalId} variant="info">
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
    onBack: () => void;
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    plati: Plata[];
    tipuriAbonament: TipAbonament[];
    anunturi: AnuntPrezenta[];
    onViewSportiv: (sportiv: Sportiv) => void;
}> = ({ sportivi, setSportivi, antrenamente, setAntrenamente, grupe, onBack, plati, setPlati, tipuriAbonament, anunturi, onViewSportiv }) => {
    
    const [selectedAntrenamentId, setSelectedAntrenamentId] = useLocalStorage<string | null>('phi-hau-selected-antrenament-id', null);
    const selectedAntrenament = useMemo(() => (antrenamente || []).find(p => p.id === selectedAntrenamentId) || null, [antrenamente, selectedAntrenamentId]);

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
            if (error) { showError("Eroare la actualizare", error); } 
            else if (data) { 
                const prezentaRaw = (data as any).prezenta;
                const prezentaArray = prezentaRaw ? (Array.isArray(prezentaRaw) ? prezentaRaw : [prezentaRaw]) : [];
                const formatted: Antrenament = { ...data, prezenta: prezentaArray };
                setAntrenamente(prev => prev.map(p => p.id === data.id ? formatted : p));
            }
        } else {
            const { data, error } = await supabase.from('program_antrenamente').insert(antrenamentData).select('*, grupe(*)').single();
            if (error) { showError("Eroare la creare", error); } 
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
            showError("Eroare la ștergere", (err as Error)?.message || String(err));
        } finally {
            setIsDeleting(false);
            setAntrenamentToDelete(null);
        }
    };

    const handleOpenAdd = () => { setAntrenamentToEdit(null); setIsFormOpen(true); };
    
    const filteredAntrenamente = useMemo(() => {
        return (antrenamente || [])
            .filter(a =>
                (!filters.data || a.data === filters.data) &&
                (!filters.grupa || a.grupa_id === filters.grupa)
            )
            .sort((a, b) => (a.ora_start || '').localeCompare(b.ora_start || ''));
    }, [antrenamente, filters]);

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

            <Card className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Filtrează după Dată" name="data" type="date" value={filters.data} onChange={handleFilterChange} />
                <Select label="Filtrează după Grupă" name="grupa" value={filters.grupa} onChange={handleFilterChange}>
                    <option value="">Toate Grupele</option>
                    {(grupe || []).map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                </Select>
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
                            {filteredAntrenamente.map(p => (
                                <tr key={p.id} className="hover:bg-slate-700/50">
                                    <td className="p-4 font-medium text-white">{p.ora_start}</td>
                                    <td className="p-4 text-slate-300">{p.grupe?.denumire || 'Antrenament Liber'}</td>
                                    <td className="p-4 text-center font-bold text-brand-secondary">{p.prezenta.length}</td>
                                    <td className="p-4 text-right">
                                        <Button onClick={() => handleSetSelectedAntrenament(p as Antrenament)} variant="primary" size="sm">
                                            Gestionează Prezența
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredAntrenamente.length === 0 && <p className="p-4 text-center text-slate-400">Niciun antrenament înregistrat conform filtrelor.</p>}
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