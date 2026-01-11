import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Prezenta, Sportiv, Grupa, ProgramItem } from '../types';
import { Button, Card, Input, Select, ConfirmationModal } from './ui';
import { PlusIcon, ArrowLeftIcon, TrashIcon, ChevronDownIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

type DayOfWeek = ProgramItem['ziua'];

const getDayNameFromDate = (date: Date): DayOfWeek => {
    const days: DayOfWeek[] = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
    return days[date.getUTCDay()];
};

const AttendanceChecklist: React.FC<{
    antrenament: Prezenta;
    sportiviInGrupa: Sportiv[];
    onSave: (antrenamentId: string, presentIds: Set<string>) => Promise<void>;
}> = ({ antrenament, sportiviInGrupa, onSave }) => {
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set(antrenament.sportivi_prezenti_ids));
    const [loading, setLoading] = useState(false);

    const handleCheckboxChange = (sportivId: string) => {
        setPresentIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sportivId)) newSet.delete(sportivId);
            else newSet.add(sportivId);
            return newSet;
        });
    };

    const handleSaveClick = async () => {
        setLoading(true);
        await onSave(antrenament.id, presentIds);
        setLoading(false);
    };

    return (
        <div className="bg-slate-900/50 p-4 space-y-3">
            <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                {sportiviInGrupa.map(sportiv => (
                    <label key={sportiv.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-700/50 cursor-pointer transition-colors">
                        <input type="checkbox" className="h-5 w-5 rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary" checked={presentIds.has(sportiv.id)} onChange={() => handleCheckboxChange(sportiv.id)} />
                        <span className="font-medium">{sportiv.nume} {sportiv.prenume}</span>
                    </label>
                ))}
                {sportiviInGrupa.length === 0 && <p className="text-slate-400 italic text-center py-4">Nu există sportivi activi în această grupă.</p>}
            </div>
            <div className="flex justify-end pt-3 border-t border-slate-700">
                <Button onClick={handleSaveClick} variant="success" size="sm" disabled={loading}>
                    {loading ? 'Se salvează...' : `Salvează Prezența (${presentIds.size})`}
                </Button>
            </div>
        </div>
    );
};

export const ActivitatiManagement: React.FC<{
    sportivi: Sportiv[];
    grupe: Grupa[];
    onBack: () => void;
}> = ({ sportivi, grupe, onBack }) => {
    const [antrenamente, setAntrenamente] = useState<Prezenta[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedAntrenamentId, setExpandedAntrenamentId] = useState<string | null>(null);
    const [antrenamentToDelete, setAntrenamentToDelete] = useState<Prezenta | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const { showError } = useError();
    const [filters, setFilters] = useState({ data: '', grupa: '' });
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update time every minute
        return () => clearInterval(timer);
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data: antrenamenteData, error: antrenamenteError } = await supabase.from('program_antrenamente').select('*').order('data_antrenament', { ascending: false }).order('ora_inceput', { ascending: true });
        if (antrenamenteError) { showError("Eroare la încărcarea antrenamentelor", antrenamenteError); setLoading(false); return; }

        const { data: prezenteData, error: prezenteError } = await supabase.from('prezenta_antrenament').select('*');
        if (prezenteError) { showError("Eroare la încărcarea prezențelor", prezenteError); setLoading(false); return; }

        const prezenteMap = new Map<string, string[]>();
        prezenteData.forEach(p => {
            if (!prezenteMap.has(p.antrenament_id)) prezenteMap.set(p.antrenament_id, []);
            prezenteMap.get(p.antrenament_id)?.push(p.sportiv_id);
        });

        const combinedData = (antrenamenteData || []).map(a => ({ ...a, sportivi_prezenti_ids: prezenteMap.get(a.id) || [] }));
        setAntrenamente(combinedData as Prezenta[]);
        setLoading(false);
    }, [showError]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDeleteAntrenament = async (scope: 'single' | 'series') => {
        if (!antrenamentToDelete || !supabase) return;
        setDeleteLoading(true);
        let query = supabase.from('program_antrenamente').delete();
        query = scope === 'series' && antrenamentToDelete.recurent_group_id ? query.eq('recurent_group_id', antrenamentToDelete.recurent_group_id) : query.eq('id', antrenamentToDelete.id);
        
        const { error } = await query;
        setDeleteLoading(false);
        if (error) { showError("Eroare la ștergere", error); }
        else { fetchData(); setAntrenamentToDelete(null); }
    };

    const handleSaveAttendance = async (antrenamentId: string, presentIds: Set<string>) => {
        const { error: deleteError } = await supabase.from('prezenta_antrenament').delete().eq('antrenament_id', antrenamentId);
        if (deleteError) { showError("Eroare la actualizarea prezenței (pas 1)", deleteError); return; }
        if (presentIds.size > 0) {
            const toInsert = Array.from(presentIds).map(sportiv_id => ({ antrenament_id: antrenamentId, sportiv_id }));
            const { error: insertError } = await supabase.from('prezenta_antrenament').insert(toInsert);
            if (insertError) { showError("Eroare la salvarea prezenței (pas 2)", insertError); return; }
        }
        await fetchData();
        setExpandedAntrenamentId(null);
    };

    const getStatus = useCallback((antrenament: Prezenta, now: Date): { text: 'Urmează' | 'Live' | 'Finalizat', color: string } => {
        const todayString = now.toISOString().split('T')[0];
        if (antrenament.data_antrenament !== todayString) return { text: 'Finalizat', color: 'text-slate-400' };

        const startDateTime = new Date(`${antrenament.data_antrenament}T${antrenament.ora_inceput}`);
        const endDateTime = new Date(startDateTime.getTime() + 90 * 60000);
        if (now < startDateTime) return { text: 'Urmează', color: 'text-sky-400' };
        if (now >= startDateTime && now <= endDateTime) return { text: 'Live', color: 'text-red-500 animate-pulse' };
        return { text: 'Finalizat', color: 'text-slate-400' };
    }, []);

    const filteredAntrenamente = useMemo(() => {
        const todayString = currentTime.toISOString().split('T')[0];
        return antrenamente.filter(a => {
            const dateMatch = !filters.data || a.data_antrenament === filters.data;
            const groupMatch = !filters.grupa || a.grupa_id === filters.grupa;
            return dateMatch && groupMatch;
        }).map(a => ({...a, isToday: a.data_antrenament === todayString}))
        .sort((a,b) => {
            if (a.isToday && !b.isToday) return -1;
            if (!a.isToday && b.isToday) return 1;
            return 0; // The rest is already sorted by date/time from query
        });
    }, [antrenamente, filters, currentTime]);
    
    const sportiviByGrupa = useMemo(() => {
        const map = new Map<string, Sportiv[]>();
        grupe.forEach(g => {
            map.set(g.id, sportivi.filter(s => s.status === 'Activ' && s.grupa_id === g.id).sort((a, b) => a.nume.localeCompare(b.nume)));
        });
        return map;
    }, [sportivi, grupe]);

    if (loading) return <div className="flex items-center justify-center min-h-screen">Se încarcă...</div>;

    return (
        <div className="w-full max-w-7xl mx-auto">
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            <h1 className="text-3xl font-bold text-white mb-6">Antrenamente & Prezență</h1>
            
            <Card className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <Input label="Filtrează după dată" name="data" type="date" value={filters.data} onChange={e => setFilters(p => ({...p, data: e.target.value}))} />
                    <Select label="Filtrează după grupă" name="grupa" value={filters.grupa} onChange={e => setFilters(p => ({...p, grupa: e.target.value}))}>
                        <option value="">Toate grupele</option>
                        {grupe.map(g => (<option key={g.id} value={g.id}>{g.denumire}</option>))}
                    </Select>
                    <Button onClick={() => setFilters({ data: '', grupa: '' })} variant="secondary">Resetează Filtre</Button>
                </div>
            </Card>

            {/* Mobile View: Cards */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredAntrenamente.map(a => {
                    const grupa = grupe.find(g => g.id === a.grupa_id);
                    const status = getStatus(a, currentTime);
                    const isExpanded = expandedAntrenamentId === a.id;
                    return (
                        <Card key={a.id} className={`p-0 overflow-hidden border-l-4 ${a.isToday ? 'border-brand-secondary' : 'border-slate-700'}`}>
                            <div className="p-4" onClick={() => setExpandedAntrenamentId(isExpanded ? null : a.id)}>
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-bold">{grupa?.denumire}</h3>
                                    <span className={`text-xs font-bold ${status.color}`}>{status.text}</span>
                                </div>
                                <p className="text-sm text-slate-400">{new Date(a.data_antrenament + 'T00:00:00Z').toLocaleDateString('ro-RO', { timeZone: 'UTC' })} • {a.ora_inceput}</p>
                                <p className="text-sm mt-2">Prezenți: <span className="font-bold text-brand-secondary">{a.sportivi_prezenti_ids.length} / {sportiviByGrupa.get(a.grupa_id || '')?.length || 0}</span></p>
                            </div>
                            {isExpanded && <AttendanceChecklist antrenament={a} sportiviInGrupa={sportiviByGrupa.get(a.grupa_id || '') || []} onSave={handleSaveAttendance} />}
                        </Card>
                    )
                })}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-700/50"><tr>
                        {['Data', 'Ora', 'Grupa', 'Prezenți', 'Status', ''].map(h => <th key={h} className="p-4 font-semibold">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredAntrenamente.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">Niciun antrenament conform filtrelor.</td></tr>
                        )}
                        {filteredAntrenamente.map(a => {
                            const grupa = grupe.find(g => g.id === a.grupa_id);
                            const status = getStatus(a, currentTime);
                            const isExpanded = expandedAntrenamentId === a.id;
                            return (
                                <React.Fragment key={a.id}>
                                    <tr className={`hover:bg-slate-800 cursor-pointer ${isExpanded ? 'bg-slate-800' : ''} ${a.isToday ? 'border-l-4 border-brand-secondary' : ''}`} onClick={() => setExpandedAntrenamentId(isExpanded ? null : a.id)}>
                                        <td className="p-4 font-medium">{new Date(a.data_antrenament + 'T00:00:00Z').toLocaleDateString('ro-RO', { timeZone: 'UTC' })} ({a.ziua})</td>
                                        <td className="p-4">{a.ora_inceput}</td>
                                        <td className="p-4">{grupa?.denumire}</td>
                                        <td className="p-4"><span className="font-bold text-brand-secondary">{a.sportivi_prezenti_ids.length}</span> / {sportiviByGrupa.get(a.grupa_id || '')?.length || 0}</td>
                                        <td className={`p-4 font-bold text-sm ${status.color}`}>{status.text}</td>
                                        <td className="p-4 text-right flex justify-end items-center gap-2">
                                            <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); setAntrenamentToDelete(a); }}><TrashIcon /></Button>
                                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-slate-900/50">
                                            <td colSpan={6} className="p-0">
                                                <AttendanceChecklist antrenament={a} sportiviInGrupa={sportiviByGrupa.get(a.grupa_id || '') || []} onSave={handleSaveAttendance} />
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <ConfirmationModal
                isOpen={!!antrenamentToDelete}
                onClose={() => setAntrenamentToDelete(null)}
                title="Confirmare Ștergere Antrenament"
                message={antrenamentToDelete?.is_recurent ? "Acesta este un antrenament recurent. Doriți să ștergeți doar această instanță sau întreaga serie de antrenamente?" : "Sunteți sigur că doriți să ștergeți acest antrenament?"}
                loading={deleteLoading}
                onConfirm={() => {}} // Dummy confirm, logic is handled by custom buttons
            >
                 <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                    <Button variant="secondary" onClick={() => setAntrenamentToDelete(null)} disabled={deleteLoading}>Anulează</Button>
                    <Button variant="danger" onClick={() => handleDeleteAntrenament('single')} disabled={deleteLoading}>
                        {deleteLoading ? 'Se șterge...' : (antrenamentToDelete?.is_recurent ? 'Șterge Doar Acesta' : 'Confirmă Ștergere')}
                    </Button>
                    {antrenamentToDelete?.is_recurent && (
                        <Button variant="danger" onClick={() => handleDeleteAntrenament('series')} disabled={deleteLoading}>
                        {deleteLoading ? 'Se șterge...' : 'Șterge Întreaga Serie'}
                        </Button>
                    )}
                </div>
            </ConfirmationModal>
        </div>
    );
};
