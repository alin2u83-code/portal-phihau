import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Prezenta, Sportiv, Grupa, ProgramItem, Examen, Participare, Grad, PretConfig, Plata, Eveniment, Rezultat } from '../types';
import { Button, Card, Input, Select, ConfirmationModal } from './ui';
import { PlusIcon, ArrowLeftIcon, TrashIcon, ChevronDownIcon, EditIcon, UsersIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { GradeManagement } from './Grade';
import { ExameneManagement } from './Examene';
import { StagiiCompetitiiManagement } from './StagiiCompetitii';

type Tab = 'antrenamente' | 'examene' | 'evenimente';

const TabButton: React.FC<{ activeTab: Tab, tabName: Tab, label: string, onClick: (tab: Tab) => void }> = ({ activeTab, tabName, label, onClick }) => (
    <button
        onClick={() => onClick(tabName)}
        className={`px-4 py-2 text-sm md:text-base font-bold transition-colors duration-200 border-b-2 ${
            activeTab === tabName
                ? 'text-brand-secondary border-brand-secondary'
                : 'text-slate-400 border-transparent hover:text-white hover:border-slate-500'
        }`}
    >
        {label}
    </button>
);

// FIX: Add missing AttendanceChecklist component.
interface AttendanceChecklistProps {
    antrenament: Prezenta;
    sportiviInGrupa: Sportiv[];
    onSave: (antrenamentId: string, presentIds: Set<string>) => Promise<void>;
}

const AttendanceChecklist: React.FC<AttendanceChecklistProps> = ({ antrenament, sportiviInGrupa, onSave }) => {
    const [presentIds, setPresentIds] = useState<Set<string>>(() => new Set(antrenament.sportivi_prezenti_ids));
    const [loading, setLoading] = useState(false);

    const handleToggle = (sportivId: string) => {
        setPresentIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sportivId)) {
                newSet.delete(sportivId);
            } else {
                newSet.add(sportivId);
            }
            return newSet;
        });
    };

    const handleSaveClick = async () => {
        setLoading(true);
        await onSave(antrenament.id, presentIds);
        setLoading(false);
    };

    return (
        <div className="p-4 bg-slate-900/50">
            <h4 className="font-bold text-white mb-3">Înregistrează Prezența</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-2">
                {sportiviInGrupa.map(sportiv => (
                    <label key={sportiv.id} className="flex items-center space-x-2 text-sm p-2 bg-slate-800 rounded-md cursor-pointer hover:bg-slate-700 transition-colors">
                        <input
                            type="checkbox"
                            checked={presentIds.has(sportiv.id)}
                            onChange={() => handleToggle(sportiv.id)}
                            className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary"
                        />
                        <span>{sportiv.nume} {sportiv.prenume}</span>
                    </label>
                ))}
            </div>
             {sportiviInGrupa.length === 0 && <p className="text-slate-400 text-sm italic">Niciun sportiv eligibil în această grupă pentru acest antrenament.</p>}
            <div className="mt-4 flex justify-end">
                <Button onClick={handleSaveClick} variant="success" size="sm" disabled={loading}>
                    {loading ? 'Se salvează...' : 'Salvează Prezența'}
                </Button>
            </div>
        </div>
    );
};

const AntrenamenteTab: React.FC<{
    sportivi: Sportiv[];
    grupe: Grupa[];
}> = ({ sportivi, grupe }) => {
    const [antrenamente, setAntrenamente] = useState<Prezenta[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedAntrenamentId, setExpandedAntrenamentId] = useState<string | null>(null);
    const [antrenamentToDelete, setAntrenamentToDelete] = useState<Prezenta | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const { showError } = useError();
    const [filters, setFilters] = useState({ data: '', grupa: '', tip: 'toate' });
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
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

    const handleDeleteAntrenament = async () => {
        if (!antrenamentToDelete || !supabase) return;
        setDeleteLoading(true);
        const { error } = await supabase.from('program_antrenamente').delete().eq('id', antrenamentToDelete.id);
        setDeleteLoading(false);
        if (error) { showError("Eroare la ștergere", error); } else { fetchData(); setAntrenamentToDelete(null); }
    };

    const handleSaveAttendance = async (antrenamentId: string, presentIds: Set<string>) => {
        const { error: deleteError } = await supabase.from('prezenta_antrenament').delete().eq('antrenament_id', antrenamentId);
        if (deleteError) { showError("Eroare la actualizarea prezenței", deleteError); return; }
        if (presentIds.size > 0) {
            const toInsert = Array.from(presentIds).map(sportiv_id => ({ antrenament_id: antrenamentId, sportiv_id }));
            const { error: insertError } = await supabase.from('prezenta_antrenament').insert(toInsert);
            if (insertError) { showError("Eroare la salvarea prezenței", insertError); return; }
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

    // FIX: Define isVacationMonth in the component scope so it can be accessed in the render function.
    const isVacationMonth = useCallback((dateStr: string) => {
        const month = new Date(dateStr).getUTCMonth(); // 6=July, 7=August
        return month === 6 || month === 7;
    }, []);

    const filteredAntrenamente = useMemo(() => {
        const todayString = currentTime.toISOString().split('T')[0];
        return antrenamente.filter(a => {
            const dateMatch = !filters.data || a.data_antrenament === filters.data;
            const groupMatch = !filters.grupa || a.grupa_id === filters.grupa;
            const tipMatch = filters.tip === 'toate' || (filters.tip === 'vacanta' && isVacationMonth(a.data_antrenament)) || (filters.tip === 'normal' && !isVacationMonth(a.data_antrenament));
            return dateMatch && groupMatch && tipMatch;
        }).map(a => ({ ...a, isToday: a.data_antrenament === todayString }))
        .sort((a,b) => (a.isToday === b.isToday) ? 0 : a.isToday ? -1 : 1);
    }, [antrenamente, filters, currentTime, isVacationMonth]);
    
    const sportiviByGrupa = useMemo(() => {
        const map = new Map<string, Sportiv[]>();
        grupe.forEach(g => {
            map.set(g.id, sportivi.filter(s => s.status === 'Activ' && s.grupa_id === g.id).sort((a, b) => a.nume.localeCompare(b.nume)));
        });
        return map;
    }, [sportivi, grupe]);

    if (loading) return <div className="text-center p-8">Se încarcă antrenamentele...</div>;

    return (
        <div>
            <Card className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <Input label="Filtrează după dată" name="data" type="date" value={filters.data} onChange={e => setFilters(p => ({...p, data: e.target.value}))} />
                    <Select label="Filtrează după grupă" name="grupa" value={filters.grupa} onChange={e => setFilters(p => ({...p, grupa: e.target.value}))}>
                        <option value="">Toate grupele</option>
                        {grupe.map(g => (<option key={g.id} value={g.id}>{g.denumire}</option>))}
                    </Select>
                     <Select label="Tip Antrenament" name="tip" value={filters.tip} onChange={e => setFilters(p => ({...p, tip: e.target.value}))}>
                        <option value="toate">Toate</option>
                        <option value="normal">Normal</option>
                        <option value="vacanta">Vacanță (Iul-Aug)</option>
                    </Select>
                    <Button onClick={() => setFilters({ data: '', grupa: '', tip: 'toate' })} variant="secondary">Resetează Filtre</Button>
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredAntrenamente.map(a => {
                    const grupa = grupe.find(g => g.id === a.grupa_id);
                    const status = getStatus(a, currentTime);
                    const isExpanded = expandedAntrenamentId === a.id;
                    const sportiviInGrupa = sportiviByGrupa.get(a.grupa_id || '') || [];
                    const filteredSportivi = isVacationMonth(a.data_antrenament) ? sportiviInGrupa.filter(s => s.participa_vacanta) : sportiviInGrupa;

                    return (
                        <Card key={a.id} className={`p-0 overflow-hidden border-l-4 ${a.isToday ? 'border-brand-secondary' : 'border-slate-700'}`}>
                            <div className="p-4" onClick={() => setExpandedAntrenamentId(isExpanded ? null : a.id)}>
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-bold">{grupa?.denumire}</h3>
                                    <span className={`text-xs font-bold ${status.color}`}>{status.text}</span>
                                </div>
                                <p className="text-sm text-slate-400">{new Date(a.data_antrenament + 'T00:00:00Z').toLocaleDateString('ro-RO', { timeZone: 'UTC' })} • {a.ora_inceput}</p>
                                <p className="text-sm mt-2">Prezenți: <span className="font-bold text-brand-secondary">{a.sportivi_prezenti_ids.length} / {filteredSportivi.length}</span></p>
                            </div>
                            {isExpanded && <AttendanceChecklist antrenament={a} sportiviInGrupa={filteredSportivi} onSave={handleSaveAttendance} />}
                        </Card>
                    );
                })}
            </div>

            <div className="hidden md:block bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-700/50"><tr>{['Data', 'Ora', 'Grupa', 'Prezenți', 'Status', ''].map(h => <th key={h} className="p-4 font-semibold">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredAntrenamente.length === 0 && (<tr><td colSpan={6} className="p-8 text-center text-slate-400">Niciun antrenament.</td></tr>)}
                        {filteredAntrenamente.map(a => {
                            const grupa = grupe.find(g => g.id === a.grupa_id);
                            const status = getStatus(a, currentTime);
                            const isExpanded = expandedAntrenamentId === a.id;
                            const sportiviInGrupa = sportiviByGrupa.get(a.grupa_id || '') || [];
                            const filteredSportivi = isVacationMonth(a.data_antrenament) ? sportiviInGrupa.filter(s => s.participa_vacanta) : sportiviInGrupa;
                            return (
                                <React.Fragment key={a.id}>
                                    <tr className={`hover:bg-slate-800 cursor-pointer ${isExpanded ? 'bg-slate-800' : ''} ${a.isToday ? 'border-l-4 border-brand-secondary' : ''}`} onClick={() => setExpandedAntrenamentId(isExpanded ? null : a.id)}>
                                        <td className="p-4 font-medium">{new Date(a.data_antrenament + 'T00:00:00Z').toLocaleDateString('ro-RO', { timeZone: 'UTC' })} ({a.ziua})</td>
                                        <td className="p-4">{a.ora_inceput}</td>
                                        <td className="p-4">{grupa?.denumire}</td>
                                        <td className="p-4"><span className="font-bold text-brand-secondary">{a.sportivi_prezenti_ids.length}</span> / {filteredSportivi.length}</td>
                                        <td className={`p-4 font-bold text-sm ${status.color}`}>{status.text}</td>
                                        <td className="p-4 text-right flex justify-end items-center gap-2">
                                            <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); setAntrenamentToDelete(a); }}><TrashIcon /></Button>
                                            <ChevronDownIcon className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-slate-900/50"><td colSpan={6} className="p-0"><AttendanceChecklist antrenament={a} sportiviInGrupa={filteredSportivi} onSave={handleSaveAttendance} /></td></tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <ConfirmationModal isOpen={!!antrenamentToDelete} onClose={() => setAntrenamentToDelete(null)} title="Confirmare Ștergere Antrenament" message="Sunteți sigur că doriți să ștergeți acest antrenament?" loading={deleteLoading} onConfirm={handleDeleteAntrenament} />
        </div>
    );
};

export const ActivitatiManagement = (props: any) => {
    const { onBack, initialTab = 'antrenamente', initialSubTab } = props;
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            <h1 className="text-3xl font-bold text-white mb-6">Activități & Evaluări</h1>
            
            <div className="border-b border-slate-700 mb-6">
                <TabButton activeTab={activeTab} tabName="antrenamente" label="Antrenamente & Prezență" onClick={setActiveTab} />
                <TabButton activeTab={activeTab} tabName="examene" label="Examene & Grade" onClick={setActiveTab} />
                <TabButton activeTab={activeTab} tabName="evenimente" label="Stagii & Competiții" onClick={setActiveTab} />
            </div>

            <div>
                {activeTab === 'antrenamente' && <AntrenamenteTab sportivi={props.sportivi} grupe={props.grupe} />}
                {activeTab === 'examene' && <ExameneManagement {...props} onBack={() => {}} />}
                {activeTab === 'evenimente' && (
                    <>
                        <StagiiCompetitiiManagement {...props} type="Stagiu" onBack={()=>{}}/>
                        <div className="my-8 border-t border-slate-700"></div>
                        <StagiiCompetitiiManagement {...props} type="Competitie" onBack={()=>{}}/>
                    </>
                )}
            </div>
        </div>
    );
};