import React, { useState, useMemo, useEffect } from 'react';
import { Antrenament, Sportiv, Grupa, Plata, TipAbonament } from '../types';
import { Button, Card, Input, Select, Modal } from './ui';
import { PlusIcon, ArrowLeftIcon, TrashIcon, EditIcon, XIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { QuickAddSportivModal } from './QuickAddSportivModal';

// --- Sub-componente ---

const AntrenamentForm: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Antrenament, 'id' | 'sportivi_prezenti_ids'>) => Promise<void>;
    antrenamentToEdit: Antrenament | null;
    grupe: Grupa[];
}> = ({ isOpen, onClose, onSave, antrenamentToEdit, grupe }) => {
    const getInitialState = () => ({
        data: antrenamentToEdit?.data || new Date().toISOString().split('T')[0],
        ora_start: antrenamentToEdit?.ora_start || '18:00',
        ora_sfarsit: antrenamentToEdit?.ora_sfarsit || '19:30',
        grupa_id: antrenamentToEdit?.grupa_id || null,
        // UI-only state to control form logic
        tip: (antrenamentToEdit?.grupa_id ? 'Normal' : 'Vacanta') as 'Normal' | 'Vacanta',
    });
    
    const [formState, setFormState] = useState(getInitialState());
    const [loading, setLoading] = useState(false);
    const { showError } = useError();

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
        if (formState.tip === 'Normal' && !formState.grupa_id) {
            showError("Date incomplete", "Vă rugăm selectați grupa pentru un antrenament normal.");
            return;
        }
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
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Data" type="date" name="data" value={formState.data} onChange={handleChange} required />
                    <Select label="Tip Antrenament" name="tip" value={formState.tip} onChange={handleChange}>
                        <option value="Normal">Normal</option>
                        <option value="Vacanta">Vacanță</option>
                    </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Ora Start" type="time" name="ora_start" value={formState.ora_start} onChange={handleChange} required />
                    <Input label="Ora Sfârșit" type="time" name="ora_sfarsit" value={formState.ora_sfarsit ?? ''} onChange={handleChange} required />
                </div>
                <div className="grid grid-cols-1">
                    {formState.tip === 'Normal' && (
                        <Select label="Grupa" name="grupa_id" value={formState.grupa_id || ''} onChange={handleChange} required={formState.tip === 'Normal'}>
                            <option value="">Selectează grupa...</option>
                            {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                        </Select>
                    )}
                </div>
                <div className="flex justify-end pt-4 space-x-2 border-t border-slate-700 mt-6">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button>
                </div>
            </form>
        </Modal>
    );
};

const AttendanceDetail: React.FC<{
    antrenament: Antrenament;
    onBack: () => void;
    sportivi: Sportiv[];
    grupe: Grupa[];
    setAntrenamente: React.Dispatch<React.SetStateAction<Antrenament[]>>;
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    tipuriAbonament: TipAbonament[];
}> = ({ antrenament, onBack, sportivi, grupe, setAntrenamente, setSportivi, setPlati, tipuriAbonament }) => {
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set(antrenament.sportivi_prezenti_ids));
    const [extraSportivId, setExtraSportivId] = useState('');
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();
    const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
    
    const tip = antrenament.grupa_id ? 'Normal' : 'Vacanta';

    const sportiviInGrupa = useMemo(() => {
        let sportiviAfisati: Sportiv[];
        if (tip === 'Vacanta') {
             sportiviAfisati = sportivi.filter(s => s.status === 'Activ' && s.participa_vacanta);
        } else {
             sportiviAfisati = sportivi.filter(s => s.status === 'Activ' && s.grupa_id === antrenament.grupa_id);
        }
        return sportiviAfisati.sort((a,b) => a.nume.localeCompare(b.nume));
    }, [sportivi, antrenament.grupa_id, tip]);

    const sportiviExtraDisponibili = useMemo(() => {
        const idsInGrupa = new Set(sportiviInGrupa.map(s => s.id));
        return sportivi.filter(s => s.status === 'Activ' && !idsInGrupa.has(s.id) && !presentIds.has(s.id));
    }, [sportivi, sportiviInGrupa, presentIds]);

    const handleCheckboxChange = (sportivId: string, isChecked: boolean) => {
        setPresentIds(prev => { const newSet = new Set(prev); if (isChecked) newSet.add(sportivId); else newSet.delete(sportivId); return newSet; });
    };

    const handleSelectAll = () => setPresentIds(new Set(sportiviInGrupa.map(s => s.id)));
    const handleDeselectAll = () => setPresentIds(new Set());
    
    const handleAddExtra = () => {
        if (extraSportivId && !presentIds.has(extraSportivId)) {
            setPresentIds(prev => new Set(prev).add(extraSportivId));
            setExtraSportivId('');
        }
    };

    const handleSaveAttendance = async () => {
        if (!antrenament || !supabase) return;
        setLoading(true);

        const initialIds = new Set(antrenament.sportivi_prezenti_ids);
        const finalIds = presentIds;

        const idsToAdd = [...finalIds].filter(id => !initialIds.has(id));
        const idsToRemove = [...initialIds].filter(id => !finalIds.has(id));

        const promises = [];

        if (idsToRemove.length > 0) {
            const deletePromise = supabase
                .from('prezenta_antrenament')
                .delete()
                .eq('antrenament_id', antrenament.id)
                .in('sportiv_id', idsToRemove);
            promises.push(deletePromise);
        }

        if (idsToAdd.length > 0) {
            const toInsert = idsToAdd.map(sportiv_id => ({
                antrenament_id: antrenament.id,
                sportiv_id: sportiv_id
            }));
            const insertPromise = supabase.from('prezenta_antrenament').insert(toInsert);
            promises.push(insertPromise);
        }
        
        try {
            if (promises.length > 0) {
                const results = await Promise.all(promises);
                const errors = results.map(r => r.error).filter(Boolean);
                if (errors.length > 0) {
                    throw new Error(errors.map(e => e.message).join('; '));
                }
            }

            setAntrenamente(prev => prev.map(p =>
                p.id === antrenament.id ? { ...p, sportivi_prezenti_ids: Array.from(finalIds) } : p
            ));
            showSuccess("Succes", "Prezența a fost salvată.");
            onBack();
        } catch (err: any) {
            showError("Eroare la actualizarea prezenței", err);
        } finally {
            setLoading(false);
        }
    };
    
    const handleQuickAddSave = (newSportiv: Sportiv, newPlata: Plata | null) => {
        setSportivi(prev => [...prev, newSportiv]);
        if(newPlata) setPlati(prev => [...prev, newPlata]);
        
        setPresentIds(prev => new Set(prev).add(newSportiv.id));
        
        setAntrenamente(prev => prev.map(a => 
            a.id === antrenament.id 
            ? { ...a, sportivi_prezenti_ids: [...a.sportivi_prezenti_ids, newSportiv.id] } 
            : a
        ));
    };

    const grupaAntrenament = grupe.find(g => g.id === antrenament.grupa_id);
    const sportiviPrezentiExtra = sportivi.filter(s => presentIds.has(s.id) && !sportiviInGrupa.some(sg => sg.id === s.id));

    return (
        <>
        <Card>
            <div className="flex justify-between items-center mb-6">
                <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Listă</Button>
                <Button onClick={() => setIsQuickAddModalOpen(true)} variant="info">
                    <PlusIcon className="w-5 h-5 mr-2"/> Sportiv Nou / Vizitator
                </Button>
            </div>

            <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <h2 className="text-xl font-bold text-brand-secondary mb-2">Gestionare Prezență ({presentIds.size} prezenți)</h2>
                 <div className="text-sm text-slate-400 grid grid-cols-2 md:grid-cols-3 gap-2">
                    <span>Data: <strong className="text-white">{new Date(antrenament.data).toLocaleDateString('ro-RO')}</strong></span>
                    <span>Ora: <strong className="text-white">{antrenament.ora_start}</strong></span>
                    <span>Grupa: <strong className="text-white">{grupaAntrenament?.denumire || tip}</strong></span>
                </div>
            </div>
            <div className="space-y-6">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-white">Sportivi din grupă</h3>
                        <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={handleSelectAll}>Selectează Toți</Button>
                            <Button size="sm" variant="secondary" onClick={handleDeselectAll}>Deselectează Toți</Button>
                        </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        {sportiviInGrupa.map(sportiv => (
                            <label key={sportiv.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-700/50 cursor-pointer">
                                <input type="checkbox" className="h-5 w-5 rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary" checked={presentIds.has(sportiv.id)} onChange={(e) => handleCheckboxChange(sportiv.id, e.target.checked)} />
                                <span className="font-medium">{sportiv.nume} {sportiv.prenume}</span>
                            </label>
                        ))}
                        {sportiviInGrupa.length === 0 && <p className="text-slate-400 italic text-center py-4">Nu există sportivi în această grupă/configurație.</p>}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Adaugă sportiv extra (opțional)</h3>
                    <div className="flex items-end gap-2">
                        <div className="flex-grow">
                            <Select label="" value={extraSportivId} onChange={e => setExtraSportivId(e.target.value)}>
                                <option value="">Selectează sportiv...</option>
                                {sportiviExtraDisponibili.map(s => (<option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>))}
                            </Select>
                        </div>
                        <Button onClick={handleAddExtra} disabled={!extraSportivId} variant="info"><PlusIcon /></Button>
                    </div>
                    {sportiviPrezentiExtra.length > 0 && (
                        <div className="mt-2 space-y-1">
                            <h4 className="text-sm text-slate-400">Extra prezenți:</h4>
                            {sportiviPrezentiExtra.map(s => (
                                <div key={s.id} className="text-sm flex justify-between items-center bg-slate-700/50 p-1.5 pl-3 rounded-md">
                                    <span>{s.nume} {s.prenume}</span>
                                    <Button size="sm" variant="danger" onClick={() => handleCheckboxChange(s.id, false)} className="!p-1 h-auto" title="Elimină"><TrashIcon className="w-4 h-4"/></Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-8 flex justify-end">
                 <Button onClick={handleSaveAttendance} variant="success" size="md" className="px-8" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează și Închide'}</Button>
            </div>
        </Card>
        <QuickAddSportivModal
            isOpen={isQuickAddModalOpen}
            onClose={() => setIsQuickAddModalOpen(false)}
            grupaId={antrenament.grupa_id}
            antrenamentId={antrenament.id}
            tipuriAbonament={tipuriAbonament}
            onSaveSuccess={handleQuickAddSave}
        />
        </>
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
    tipuriAbonament: TipAbonament[];
}> = ({ sportivi, setSportivi, antrenamente, setAntrenamente, grupe, onBack, setPlati, tipuriAbonament }) => {
    
    const [selectedAntrenamentId, setSelectedAntrenamentId] = useLocalStorage<string | null>('phi-hau-selected-antrenament-id', null);
    const selectedAntrenament = useMemo(() => antrenamente.find(p => p.id === selectedAntrenamentId) || null, [antrenamente, selectedAntrenamentId]);

    const handleSetSelectedAntrenament = (antrenament: Antrenament | null) => {
        setSelectedAntrenamentId(antrenament ? antrenament.id : null);
    };

    const [antrenamentToEdit, setAntrenamentToEdit] = useState<Antrenament | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [antrenamentToDelete, setAntrenamentToDelete] = useState<Antrenament | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError, showSuccess } = useError();

    const initialFilters = { tip: '', data: '', grupa: '' };
    const [filters, setFilters] = useLocalStorage('phi-hau-prezenta-filters', initialFilters);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({...prev, [e.target.name]: e.target.value}));
    };

    const handleResetFilters = () => {
        setFilters(initialFilters);
    };

    const handleSaveAntrenament = async (antrenamentData: Omit<Antrenament, 'id' | 'sportivi_prezenti_ids'>) => {
        if (!supabase) return;
        if (antrenamentToEdit) {
            const { data, error } = await supabase.from('program_antrenamente').update(antrenamentData).eq('id', antrenamentToEdit.id).select('*, prezenta_antrenament(sportiv_id)').single();
            if (error) { showError("Eroare la actualizare", error); } 
            else if (data) { 
                const formatted: Antrenament = {
                    ...data,
                    sportivi_prezenti_ids: data.prezenta_antrenament ? data.prezenta_antrenament.map((ps: any) => ps.sportiv_id) : []
                };
                setAntrenamente(prev => prev.map(p => p.id === data.id ? formatted : p));
            }
        } else {
            const { data, error } = await supabase.from('program_antrenamente').insert(antrenamentData).select().single();
            if (error) { showError("Eroare la creare", error); } 
            else if (data) { setAntrenamente(prev => [...prev, { ...data, sportivi_prezenti_ids: [] }]); }
        }
    };

    const confirmDeleteAntrenament = async (id: string) => {
        if (!supabase) return;
        setIsDeleting(true);
        try {
            const { error: deleteLinksError } = await supabase.from('prezenta_antrenament').delete().eq('antrenament_id', id);
            if (deleteLinksError) throw deleteLinksError;

            const { error } = await supabase.from('program_antrenamente').delete().eq('id', id);
            if (error) throw error;
            
            setAntrenamente(prev => prev.filter(p => p.id !== id));
            showSuccess("Succes", "Antrenamentul a fost șters.");
        } catch (err: any) {
            showError("Eroare la ștergere", err);
        } finally {
            setIsDeleting(false);
            setAntrenamentToDelete(null);
        }
    };

    const handleOpenAdd = () => { setAntrenamentToEdit(null); setIsFormOpen(true); };
    const handleOpenEdit = (antrenament: Antrenament) => { setAntrenamentToEdit(antrenament); setIsFormOpen(true); };

    const filteredAntrenamente = useMemo(() => {
        let sorted = [...antrenamente].sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime() || (b.ora_start || '').localeCompare(a.ora_start || ''));
        
        if (filters.tip) {
            if (filters.tip === 'Vacanta') {
                sorted = sorted.filter(p => !p.grupa_id);
            } else if (filters.tip === 'Normal') {
                sorted = sorted.filter(p => !!p.grupa_id);
            }
        }
        if (filters.data) {
            sorted = sorted.filter(p => p.data === filters.data);
        }
        if (filters.grupa) {
            sorted = sorted.filter(p => p.grupa_id === filters.grupa);
        }
        return sorted;
    }, [antrenamente, filters]);

    if (selectedAntrenament) {
        return <AttendanceDetail 
            antrenament={selectedAntrenament} 
            onBack={() => handleSetSelectedAntrenament(null)} 
            sportivi={sportivi} 
            grupe={grupe} 
            setAntrenamente={setAntrenamente} 
            setSportivi={setSportivi}
            setPlati={setPlati}
            tipuriAbonament={tipuriAbonament}
        />;
    }

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Istoric Antrenamente</h1>
                <Button onClick={handleOpenAdd} variant="info"><PlusIcon className="w-5 h-5 mr-2" /> Antrenament Nou</Button>
            </div>

            <Card className="mb-6">
                <div className="flex flex-col lg:flex-row items-end gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow w-full">
                        <Input label="Filtrează după dată" name="data" type="date" value={filters.data} onChange={handleFilterChange} />
                        <Select label="Filtrează după grupă" name="grupa" value={filters.grupa} onChange={handleFilterChange}>
                            <option value="">Toate Grupele</option>
                            {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                        </Select>
                        <Select label="Tip Antrenament" name="tip" value={filters.tip} onChange={handleFilterChange}>
                            <option value="">Toate Tipurile</option>
                            <option value="Normal">Normal</option>
                            <option value="Vacanta">Vacanță</option>
                        </Select>
                    </div>
                    <Button 
                        onClick={handleResetFilters} 
                        variant="secondary" 
                        size="md" 
                        title="Resetează toate filtrele"
                        className="w-full lg:w-auto"
                        disabled={JSON.stringify(filters) === JSON.stringify(initialFilters)}
                    >
                        <XIcon className="w-5 h-5 mr-2" /> Resetare
                    </Button>
                </div>
            </Card>

            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="p-4 font-semibold">Data & Ora</th>
                                <th className="p-4 font-semibold">Grupa / Tip</th>
                                <th className="p-4 font-semibold text-center">Prezenți</th>
                                <th className="p-4 font-semibold text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredAntrenamente.map(p => {
                                const grupa = grupe.find(g => g.id === p.grupa_id);
                                const tip = p.grupa_id ? 'Normal' : 'Vacanta';
                                return (
                                    <tr key={p.id} className="hover:bg-slate-700/50">
                                        <td className="p-4 font-medium">
                                            {new Date(p.data).toLocaleDateString('ro-RO')} - <span className="text-slate-400">{p.ora_start}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span>{grupa?.denumire || (tip === 'Vacanta' ? 'Antrenament Vacanță' : tip)}</span>
                                                {tip === 'Vacanta' ? (
                                                    <span className="px-2 py-0.5 text-[10px] bg-sky-600/30 text-sky-400 border border-sky-600/50 rounded-full font-bold uppercase tracking-wider">Vacanță</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 text-[10px] bg-slate-600/30 text-slate-400 border border-slate-600/50 rounded-full font-bold uppercase tracking-wider">Normal</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center font-bold text-brand-secondary">{p.sportivi_prezenti_ids.length}</td>
                                        <td className="p-4 text-right w-64">
                                            <div className="flex items-center justify-end space-x-2">
                                                <Button onClick={() => handleSetSelectedAntrenament(p)} variant="primary" size="sm">Gestionează Prezența</Button>
                                                <Button onClick={() => handleOpenEdit(p)} variant="secondary" size="sm" title="Editează detaliile antrenamentului"><EditIcon /></Button>
                                                <Button onClick={() => setAntrenamentToDelete(p)} variant="danger" size="sm" title="Șterge antrenamentul"><TrashIcon /></Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
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