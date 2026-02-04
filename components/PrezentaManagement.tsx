import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Antrenament, Sportiv, Grupa, Plata, TipAbonament, AnuntPrezenta, ProgramItem, View, Grad } from '../types';
import { Button, Card, Input, Select, Modal } from './ui';
import { PlusIcon, ArrowLeftIcon, TrashIcon, EditIcon, CheckIcon, ExclamationTriangleIcon, CalendarDaysIcon, CogIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ListaPrezentaAntrenament } from './ListaPrezentaAntrenament';
// FIX: Import the AntrenamentForm component to resolve the "Cannot find name" error.
import { AntrenamentForm } from './Prezenta';

type ViewMode = 'calendar' | 'orar';

// --- Sub-component: Orar Fix Editor ---
const OrarFixEditor: React.FC<{
    grupe: (Grupa & { program: ProgramItem[] })[];
    onSave: (grupaId: string, program: ProgramItem[]) => Promise<void>;
}> = ({ grupe, onSave }) => {
    const [editingGrupa, setEditingGrupa] = useState<Grupa & { program: ProgramItem[] } | null>(null);
    const [program, setProgram] = useState<ProgramItem[]>([]);
    const [loading, setLoading] = useState(false);
    
    const zileSaptamana: ProgramItem['ziua'][] = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
    
    const handleEditClick = (grupa: Grupa & { program: ProgramItem[] }) => {
        setEditingGrupa(grupa);
        setProgram(grupa.program || []);
    };
    
    const handleSaveClick = async () => {
        if (!editingGrupa) return;
        setLoading(true);
        await onSave(editingGrupa.id, program);
        setLoading(false);
        setEditingGrupa(null);
    };

    const handleAddItem = () => setProgram(p => [...p, { id: `new-${Date.now()}`, ziua: 'Luni', ora_start: '18:00', ora_sfarsit: '19:30', is_activ: true }]);
    const handleRemoveItem = (id: string) => setProgram(p => p.filter(item => item.id !== id));
    const handleItemChange = (id: string, field: keyof ProgramItem, value: any) => {
        setProgram(p => p.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    return (
        <div className="space-y-4">
            {grupe.map(grupa => (
                <Card key={grupa.id}>
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white">{grupa.denumire}</h3>
                        <Button variant="secondary" size="sm" onClick={() => handleEditClick(grupa)}><CogIcon className="w-4 h-4 mr-2"/> Editează Orar</Button>
                    </div>
                </Card>
            ))}
            <Modal isOpen={!!editingGrupa} onClose={() => setEditingGrupa(null)} title={`Editează Orar Fix: ${editingGrupa?.denumire}`}>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {program.map(item => (
                        <div key={item.id} className="grid grid-cols-4 gap-2 items-center bg-slate-800/50 p-2 rounded-lg">
                            <Select label="" name="ziua" value={item.ziua} onChange={e => handleItemChange(item.id, 'ziua', e.target.value)}>
                                {zileSaptamana.map(zi => <option key={zi} value={zi}>{zi}</option>)}
                            </Select>
                            <Input label="" type="time" name="ora_start" value={item.ora_start} onChange={e => handleItemChange(item.id, 'ora_start', e.target.value)} />
                            <Input label="" type="time" name="ora_sfarsit" value={item.ora_sfarsit} onChange={e => handleItemChange(item.id, 'ora_sfarsit', e.target.value)} />
                            <Button variant="danger" size="sm" onClick={() => handleRemoveItem(item.id)} className="ml-auto"><TrashIcon className="w-4 h-4"/></Button>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between">
                    <Button variant="info" onClick={handleAddItem}><PlusIcon className="w-4 h-4 mr-2"/> Adaugă Interval</Button>
                    <Button variant="success" onClick={handleSaveClick} isLoading={loading}>Salvează Orarul</Button>
                </div>
            </Modal>
        </div>
    );
};

// --- Sub-component: Antrenament Card with Attendance ---
const AntrenamentCard: React.FC<{
    antrenament: Antrenament;
    allSportivi: Sportiv[];
    onSave: (antrenamentId: string, updates: { sportiv_id: string, status: 'prezent' | 'absent' }[]) => Promise<void>;
}> = ({ antrenament, allSportivi, onSave }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setPresentIds(new Set(antrenament.prezenta.filter(p => p.status === 'prezent').map(p => p.sportiv_id)));
    }, [antrenament.prezenta]);
    
    const sportiviInGrupa = useMemo(() => {
        return allSportivi.filter(s => s.status === 'Activ' && s.grupa_id === antrenament.grupa_id);
    }, [allSportivi, antrenament.grupa_id]);

    const handleToggle = (sportivId: string) => {
        setPresentIds(prev => {
            const next = new Set(prev);
            if (next.has(sportivId)) next.delete(sportivId); else next.add(sportivId);
            return next;
        });
    };

    const handleSaveClick = async () => {
        setIsSaving(true);
        const updates = sportiviInGrupa.map(s => ({
            sportiv_id: s.id,
            status: presentIds.has(s.id) ? 'prezent' as const : 'absent' as const,
        }));
        await onSave(antrenament.id, updates);
        setIsSaving(false);
        setIsExpanded(false);
    };

    return (
        <Card>
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div>
                    <h3 className="text-lg font-bold text-white">{antrenament.grupe?.denumire || 'Antrenament Liber'}</h3>
                    <p className="text-sm text-slate-400">{antrenament.ora_start} - {antrenament.ora_sfarsit}</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${antrenament.is_recurent ? 'bg-sky-900/50 text-sky-300' : 'bg-amber-900/50 text-amber-300'}`}>
                        {antrenament.is_recurent ? 'Recurent' : 'Personalizat'}
                    </span>
                    <span className="font-bold text-xl">{presentIds.size} / {sportiviInGrupa.length}</span>
                </div>
            </div>
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setPresentIds(new Set(sportiviInGrupa.map(s => s.id)))}>Toți Prezenți</Button>
                        <Button size="sm" variant="secondary" onClick={() => setPresentIds(new Set())}>Toți Absenți</Button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                        {sportiviInGrupa.map(s => (
                            <label key={s.id} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-md cursor-pointer">
                                <input type="checkbox" checked={presentIds.has(s.id)} onChange={() => handleToggle(s.id)} className="h-5 w-5 rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary"/>
                                <span className="font-medium">{s.nume} {s.prenume}</span>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end">
                        <Button variant="success" onClick={handleSaveClick} isLoading={isSaving}>Salvează Lista</Button>
                    </div>
                </div>
            )}
        </Card>
    );
};


// --- Componenta Principală ---
export const PrezentaManagement: React.FC<{
    sportivi: Sportiv[];
    antrenamente: Antrenament[];
    setAntrenamente: React.Dispatch<React.SetStateAction<Antrenament[]>>;
    grupe: Grupa[];
    setGrupe: React.Dispatch<React.SetStateAction<Grupa[]>>;
    onBack: () => void;
}> = ({ sportivi, antrenamente, setAntrenamente, grupe, setGrupe, onBack }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('calendar');
    const [filters, setFilters] = useState({ data: new Date().toISOString().split('T')[0] });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [loadingRpc, setLoadingRpc] = useState(false);
    const { showError, showSuccess } = useError();

    const fetchAntrenamente = useCallback(async () => {
        const { data, error } = await supabase.from('program_antrenamente').select('*, grupe(*), prezenta:prezenta_antrenament(sportiv_id, status)');
        if (error) showError("Eroare la reîncărcare", error.message);
        else setAntrenamente((data as any[]).map(a => ({...a, prezenta: a.prezenta || []})));
    }, [showError, setAntrenamente]);

    const grupeWithOrar = useMemo(() => {
        return grupe.map(g => ({ ...g, program: g.program || [] }));
    }, [grupe]);

    const handleSaveOrar = async (grupaId: string, program: ProgramItem[]) => {
        await supabase.from('orar_saptamanal').delete().eq('grupa_id', grupaId);
        const toInsert = program.map(({ id, ...rest }) => ({ ...rest, grupa_id: grupaId, club_id: grupe.find(g=>g.id===grupaId)?.club_id }));
        if (toInsert.length > 0) {
            const { error } = await supabase.from('orar_saptamanal').insert(toInsert);
            if (error) { showError("Eroare la salvare orar", error.message); return; }
        }
        const { data: updatedOrar } = await supabase.from('orar_saptamanal').select('*').eq('grupa_id', grupaId);
        setGrupe(prev => prev.map(g => g.id === grupaId ? { ...g, program: updatedOrar || [] } : g));
        showSuccess("Succes", "Orarul fix a fost actualizat.");
    };

    const handleGenerate = async () => {
        setLoadingRpc(true);
        const { error } = await supabase.rpc('genereaza_antrenamente_din_orar', { p_zile_in_avans: 30 });
        if (error) showError("Eroare RPC", error.message);
        else {
            showSuccess("Succes", "Calendarul a fost populat. Se reîncarcă datele...");
            await fetchAntrenamente();
        }
        setLoadingRpc(false);
    };

    const handleSaveCustom = async (data: Omit<Antrenament, 'id' | 'prezenta'>) => {
        const { data: newData, error } = await supabase.from('program_antrenamente').insert(data).select('*, grupe(*), prezenta:prezenta_antrenament(sportiv_id, status)').single();
        if (error) { showError("Eroare la adăugare", error.message); }
        else if (newData) { setAntrenamente(prev => [...prev, { ...newData, prezenta: newData.prezenta || [] } as Antrenament]); showSuccess("Succes", "Antrenamentul a fost adăugat."); }
    };
    
    const handleSaveAttendance = async (antrenamentId: string, updates: { sportiv_id: string, status: 'prezent' | 'absent' }[]) => {
        const recordsToUpsert = updates.map(u => ({ antrenament_id: antrenamentId, ...u }));
        const { error } = await supabase.from('prezenta_antrenament').upsert(recordsToUpsert, { onConflict: 'antrenament_id, sportiv_id' });
        if(error) { showError("Eroare la salvare prezență", error.message); }
        else {
            const { data } = await supabase.from('prezenta_antrenament').select('*').eq('antrenament_id', antrenamentId);
            setAntrenamente(prev => prev.map(a => a.id === antrenamentId ? {...a, prezenta: data || []} : a));
            showSuccess("Succes", "Prezența a fost salvată.");
        }
    };
    
    const antrenamenteFiltrate = useMemo(() => {
        return antrenamente.filter(a => a.data === filters.data).sort((a, b) => a.ora_start.localeCompare(b.ora_start));
    }, [antrenamente, filters.data]);

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            <h1 className="text-3xl font-bold text-white">Management Prezență & Orar</h1>

            <Card>
                <div className="flex border-b border-slate-700 mb-4">
                    <button onClick={() => setViewMode('calendar')} className={`py-2 px-4 font-semibold ${viewMode === 'calendar' ? 'border-b-2 border-brand-secondary text-white' : 'text-slate-400'}`}>Calendar Activități</button>
                    <button onClick={() => setViewMode('orar')} className={`py-2 px-4 font-semibold ${viewMode === 'orar' ? 'border-b-2 border-brand-secondary text-white' : 'text-slate-400'}`}>Orar Fix Săptămânal</button>
                </div>

                {viewMode === 'calendar' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <Input label="Afișează data" type="date" value={filters.data} onChange={e => setFilters({ data: e.target.value })} />
                            <Button onClick={handleGenerate} isLoading={loadingRpc}>Generează Program pe 30 Zile</Button>
                            <Button variant="info" onClick={() => setIsFormOpen(true)}>Antrenament Extraordinar</Button>
                        </div>
                        <div className="space-y-4">
                            {antrenamenteFiltrate.length > 0 
                                ? antrenamenteFiltrate.map(a => <AntrenamentCard key={a.id} antrenament={a} allSportivi={sportivi} onSave={handleSaveAttendance} />)
                                : <p className="text-center text-slate-400 italic pt-8">Niciun antrenament programat pentru data selectată.</p>
                            }
                        </div>
                    </div>
                )}
                
                {viewMode === 'orar' && (
                    <OrarFixEditor grupe={grupeWithOrar} onSave={handleSaveOrar} />
                )}
            </Card>

            <AntrenamentForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveCustom} antrenamentToEdit={null} grupe={grupe} />
        </div>
    );
};