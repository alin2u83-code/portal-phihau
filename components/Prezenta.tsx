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
                <Button size="sm" variant="danger" onClick={() => onRemove(sportiv.id)} className="!p-2 shrink-0" title="Elimină de la antrenament" disabled={isUpdating}>
                    <TrashIcon className="w-4 h-4" />
                </Button>
            )}
        </div>
    );

    const [groupAthletes, setGroupAthletes] = useState<Sportiv[]>([]);
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
    const [initialPresentIds, setInitialPresentIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [extraAthleteIds, setExtraAthleteIds] = useState<Set<string>>(new Set());
    const [selectedExternalId, setSelectedExternalId] = useState('');
    const { showError, showSuccess } = useError();

    const hasValidMedicalCheck = useCallback((sportivId: string, plati: Plata[]): boolean => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const seasonStartYear = currentMonth >= 8 ? currentYear : currentYear - 1;
        const seasonStartDate = new Date(seasonStartYear, 8, 1);
        return (plati || []).some(p => p.sportiv_id === sportivId && p.tip === 'Taxa Anuala' && p.status === 'Achitat' && new Date(p.data) >= seasonStartDate);
    }, []);
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const initialIds = new Set(antrenament.prezenta.map(p => p.sportiv_id));
            setPresentIds(initialIds);
            setInitialPresentIds(initialIds);
            
            if (!antrenament.grupa_id) {
                setGroupAthletes([]);
                setExtraAthleteIds(initialIds);
                setLoading(false);
                return;
            }
            
            const { data: athletesData, error: athletesError } = await supabase.from('sportivi').select('*').eq('grupa_id', antrenament.grupa_id).order('nume', { ascending: true });
            if (athletesError) { showError("Eroare sportivi", athletesError.message); setLoading(false); return; }
            
            const fetchedGroupAthletes = athletesData || [];
            setGroupAthletes(fetchedGroupAthletes);

            const groupAthleteIds = new Set(fetchedGroupAthletes.map(s => s.id));
            const initialExtraIds = new Set<string>();
            initialIds.forEach(id => {
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

    const hasChanges = useMemo(() => {
        if (initialPresentIds.size !== presentIds.size) return true;
        for (const id of initialPresentIds) {
            if (!presentIds.has(id)) return true;
        }
        return false;
    }, [initialPresentIds, presentIds]);

    const handleToggle = (sportivId: string) => {
        setPresentIds(prev => {
            const next = new Set(prev);
            if (next.has(sportivId)) {
                next.delete(sportivId);
            } else {
                next.add(sportivId);
            }
            return next;
        });
    };
    
    const handleAddExternal = () => {
        if (!selectedExternalId) return;
        setExtraAthleteIds(prev => new Set(prev).add(selectedExternalId));
        setPresentIds(prev => new Set(prev).add(selectedExternalId));
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

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const idsToAdd = Array.from(presentIds).filter(id => !initialPresentIds.has(id));
            const idsToRemove = Array.from(initialPresentIds).filter(id => !presentIds.has(id));
    
            const promises = [];
    
            if (idsToAdd.length > 0) {
                const recordsToInsert = idsToAdd.map(sportivId => ({
                    antrenament_id: antrenament.id,
                    sportiv_id: sportivId
                }));
                promises.push(supabase.from('prezenta_antrenament').upsert(recordsToInsert));
            }
    
            if (idsToRemove.length > 0) {
                promises.push(
                    supabase.from('prezenta_antrenament')
                        .delete()
                        .eq('antrenament_id', antrenament.id)
                        .in('sportiv_id', idsToRemove)
                );
            }
            
            const results = await Promise.all(promises);
            const anyError = results.find(res => res.error);
            if (anyError) throw anyError.error;
    
            setAntrenamente(prev => prev.map(a => a.id === antrenament.id ? { ...a, prezenta: Array.from(presentIds).map(id => ({ sportiv_id: id, status: 'prezent' })) } : a));
            setInitialPresentIds(new Set(presentIds));
            showSuccess("Succes", "Prezența a fost salvată.");
    
        } catch (err: unknown) {
            // FIX: Safely handle the unknown error type by checking if it's an instance of Error before passing its message to showError.
            showError("Eroare la salvarea prezenței", err instanceof Error ? err.message : String(err));
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="text-center p-8">Se încarcă lista de sportivi...</div>;

    return (
        <Card className="overflow-visible relative">
            <Button onClick={onBack} variant="secondary" className="mb-4"><ArrowLeftIcon /> Înapoi la Listă</Button>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Înregistrare Prezență</h2>
                    <p className="text-slate-400">Antrenament {antrenament.grupe?.denumire || 'Liber'} - {new Date(antrenament.data + 'T00:00:00').toLocaleDateString('ro-RO')} ora {antrenament.ora_start}</p>
                </div>
            </div>

            <div className="space-y-2">
                {(groupAthletes || []).length > 0 ? (groupAthletes || []).map(sportiv => (
                     <AthleteRow 
                        key={sportiv.id} 
                        sportiv={sportiv} 
                        isPresent={presentIds.has(sportiv.id)} 
                        isUpdating={isSaving}
                        hasViza={hasValidMedicalCheck(sportiv.id, allPlati)} 
                        onToggle={handleToggle}
                    />
                )) : <p className="text-slate-400 italic text-center py-4">Niciun sportiv înscris în această grupă.</p>}
            </div>

             {(extraAthletesToDisplay || []).length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-700">
                    <h3 className="text-lg font-bold text-white mb-2">Participanți Externi</h3>
                    <div className="space-y-2">
                        {(extraAthletesToDisplay || []).map(sportiv => (
                            <AthleteRow
                                key={sportiv.id}
                                sportiv={sportiv}
                                isPresent={presentIds.has(sportiv.id)}
                                isUpdating={isSaving}
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
                        <Select label="Selectează Sportiv" value={selectedExternalId} onChange={e => setSelectedExternalId(e.target.value)} disabled={isSaving}>
                            <option value="">Alege...</option>
                            {(externalAthletesForSelect || []).map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
                        </Select>
                    </div>
                    <Button onClick={handleAddExternal} disabled={!selectedExternalId || isSaving} variant="info">
                        <PlusIcon className="w-5 h-5 mr-2" /> Adaugă
                    </Button>
                </div>
            </div>
            
            {hasChanges && (
                <div className="sticky bottom-0 -mx-4 -mb-4 mt-8 p-3 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700 animate-fade-in-down">
                    <div className="flex justify-end items-center gap-4 max-w-4xl mx-auto px-4">
                        <p className="text-sm text-amber-300 font-semibold">Ai modificări nesalvate.</p>
                        <Button variant="secondary" onClick={() => setPresentIds(initialPresentIds)} disabled={isSaving}>Resetează</Button>
                        <Button variant="success" onClick={handleSave} isLoading={isSaving}>Salvează Prezența</Button>
                    </div>
                </div>
            )}
        </Card>
    );
};