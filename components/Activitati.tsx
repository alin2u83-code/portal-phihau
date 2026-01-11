import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Antrenament, Orar, Prezenta, Sportiv, Grupa, Examen, Participare, Grad, PretConfig, Plata, Eveniment, Rezultat, View } from '../types';
import { Button, Card, Input, Select, ConfirmationModal, Modal } from './ui';
import { PlusIcon, ArrowLeftIcon, TrashIcon, UsersIcon, RefreshCwIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ExameneManagement } from './Examene';
import { StagiiCompetitiiManagement } from './StagiiCompetitii';

type Tab = 'antrenamente' | 'examene' | 'evenimente';

interface ActivitatiManagementProps {
    onBack: () => void;
    initialTab?: Tab;
    sportivi: Sportiv[]; setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    examene: Examen[]; setExamene: React.Dispatch<React.SetStateAction<Examen[]>>;
    grade: Grad[]; setGrade: React.Dispatch<React.SetStateAction<Grad[]>>;
    participari: Participare[]; setParticipari: React.Dispatch<React.SetStateAction<Participare[]>>;
    grupe: Grupa[]; setGrupe: React.Dispatch<React.SetStateAction<Grupa[]>>;
    plati: Plata[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    evenimente: Eveniment[]; setEvenimente: React.Dispatch<React.SetStateAction<Eveniment[]>>;
    rezultate: Rezultat[]; setRezultate: React.Dispatch<React.SetStateAction<Rezultat[]>>;
    preturiConfig: PretConfig[]; setPreturiConfig: React.Dispatch<React.SetStateAction<PretConfig[]>>;
    onNavigate?: (view: View, state?: any) => void;
    navigationState?: any;
    antrenamente: Antrenament[]; setAntrenamente: React.Dispatch<React.SetStateAction<Antrenament[]>>;
    prezenta: Prezenta[]; setPrezenta: React.Dispatch<React.SetStateAction<Prezenta[]>>;
    orar: Orar[]; setOrar: React.Dispatch<React.SetStateAction<Orar[]>>;
}

const TabButton: React.FC<{ activeTab: Tab, tabName: Tab, label: string, onClick: (tab: Tab) => void }> = ({ activeTab, tabName, label, onClick }) => (
    <button onClick={() => onClick(tabName)} className={`px-4 py-2 text-sm md:text-base font-bold transition-colors duration-200 border-b-2 ${activeTab === tabName ? 'text-brand-secondary border-brand-secondary' : 'text-slate-400 border-transparent hover:text-white hover:border-slate-500'}`}>
        {label}
    </button>
);

const DeleteAntrenamentModal: React.FC<{ antrenament: Antrenament | null; isOpen: boolean; onClose: () => void; onConfirm: (antrenament: Antrenament, option: 'single' | 'series') => void; loading: boolean; }> = ({ antrenament, isOpen, onClose, onConfirm, loading }) => {
    const [option, setOption] = useState<'single' | 'series'>('single');
    if (!isOpen || !antrenament) return null;
    return (
        <ConfirmationModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={() => onConfirm(antrenament, option)}
            title="Confirmare Ștergere Antrenament"
            message={antrenament.is_recurent ? 'Doriți să ștergeți doar această instanță a antrenamentului sau întreaga serie recurentă?' : 'Sunteți sigur că doriți să ștergeți acest antrenament? Acțiunea este ireversibilă.'}
            loading={loading}
        >
            {antrenament.is_recurent && (
                <div className="my-4 space-y-2">
                    <label className="flex items-center p-3 bg-slate-700 rounded-md cursor-pointer hover:bg-slate-600">
                        <input type="radio" name="delete-option" value="single" checked={option === 'single'} onChange={() => setOption('single')} className="w-4 h-4 text-brand-secondary bg-slate-800 border-slate-600 focus:ring-brand-secondary" />
                        <span className="ml-3 text-sm font-medium text-white">Șterge doar antrenamentul din {new Date(antrenament.data).toLocaleDateString('ro-RO')}</span>
                    </label>
                    <label className="flex items-center p-3 bg-slate-700 rounded-md cursor-pointer hover:bg-slate-600">
                        <input type="radio" name="delete-option" value="series" checked={option === 'series'} onChange={() => setOption('series')} className="w-4 h-4 text-brand-secondary bg-slate-800 border-slate-600 focus:ring-brand-secondary" />
                        <span className="ml-3 text-sm font-medium text-white">Șterge întreaga serie de antrenamente recurente</span>
                    </label>
                </div>
            )}
        </ConfirmationModal>
    );
};

const AntrenamenteView: React.FC<ActivitatiManagementProps> = ({ antrenamente, setAntrenamente, prezenta, setPrezenta, grupe, orar, ...props }) => {
    const [todayFilter, setTodayFilter] = useState<'all' | 'upcoming' | 'live' | 'finished'>('all');
    const [scheduleFilters, setScheduleFilters] = useState({ grupaId: '', month: new Date().toISOString().slice(0, 7) });
    const [antrenamentToDelete, setAntrenamentToDelete] = useState<Antrenament | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [syncLoading, setSyncLoading] = useState(false);
    const { showError } = useError();
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
    
    const antrenamenteCuGrupa = useMemo(() => antrenamente.map(a => ({ ...a, grupa: grupe.find(g => g.id === a.grupa_id) })), [antrenamente, grupe]);

    const handleGenerateAntrenamente = useCallback(async () => {
        if (!supabase || !orar || !grupe) return;
        setSyncLoading(true);
        try {
            const todayDayName = new Date().toLocaleDateString('ro-RO', { weekday: 'long' });
            const todayDayNameCapitalized = todayDayName.charAt(0).toUpperCase() + todayDayName.slice(1);

            const orarPentruAzi = orar.filter(o => o.ziua === todayDayNameCapitalized && o.is_activ);
            const antrenamenteDeCreat: Omit<Antrenament, 'id' | 'sportivi_prezenti_ids'>[] = [];
            
            for (const orarItem of orarPentruAzi) {
                const existaDeja = antrenamente.some(a => a.data === today && a.grupa_id === orarItem.grupa_id && a.ora_start === orarItem.ora_start);
                if (!existaDeja) {
                    antrenamenteDeCreat.push({
                        data: today,
                        grupa_id: orarItem.grupa_id,
                        ora_start: orarItem.ora_start,
                        ora_sfarsit: orarItem.ora_sfarsit,
                        orar_id: orarItem.id,
                        status: 'Programat',
                        is_recurent: orarItem.is_recurent,
                        recurent_group_id: orarItem.recurent_group_id,
                    });
                }
            }
            
            if (antrenamenteDeCreat.length > 0) {
                const { data, error } = await supabase.from('antrenamente').insert(antrenamenteDeCreat).select();
                if (error) throw error;
                if (data) {
                    const newAntrenamente = data.map(a => ({...a, sportivi_prezenti_ids: []}));
                    setAntrenamente(prev => [...prev, ...newAntrenamente]);
                }
            }
        } catch (err) {
            showError("Eroare la generarea automată a antrenamentelor", err);
        } finally {
            setSyncLoading(false);
        }
    }, [orar, grupe, antrenamente, today, showError, setAntrenamente]);

    useEffect(() => {
        handleGenerateAntrenamente();
    }, []); // Run once on mount

    const { antrenamenteAzi, now } = useMemo(() => {
        const n = new Date();
        const antrenamenteAzi = antrenamenteCuGrupa.filter(a => a.data === today).sort((a,b) => a.ora_start.localeCompare(b.ora_start));
        return { antrenamenteAzi, now: n };
    }, [antrenamenteCuGrupa, today]);
    
    const getStatus = useCallback((antrenament: Antrenament, currentTime: Date): 'upcoming' | 'live' | 'finished' => {
        const startTime = new Date(`${antrenament.data}T${antrenament.ora_start}`);
        const endTime = new Date(`${antrenament.data}T${antrenament.ora_sfarsit}`);
        if (currentTime < startTime) return 'upcoming';
        if (currentTime >= startTime && currentTime <= endTime) return 'live';
        return 'finished';
    }, []);
    
    const filteredAntrenamenteAzi = useMemo(() => {
        if (todayFilter === 'all') return antrenamenteAzi;
        return antrenamenteAzi.filter(a => getStatus(a, now) === todayFilter);
    }, [antrenamenteAzi, todayFilter, now, getStatus]);

    const monthOptions = useMemo(() => {
        const options = [];
        const d = new Date();
        for (let i = -3; i <= 3; i++) {
            const month = new Date(d.getFullYear(), d.getMonth() + i, 1);
            options.push({ value: month.toISOString().slice(0, 7), label: month.toLocaleString('ro-RO', { month: 'long', year: 'numeric' }) });
        }
        return options;
    }, []);

    const filteredSchedule = useMemo(() => antrenamenteCuGrupa.filter(a =>
        (!scheduleFilters.grupaId || a.grupa_id === scheduleFilters.grupaId) &&
        a.data.startsWith(scheduleFilters.month)
    ).sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime() || a.ora_start.localeCompare(b.ora_start)), [antrenamenteCuGrupa, scheduleFilters]);

    const handleConfirmDelete = async (antrenament: Antrenament, option: 'single' | 'series') => {
        if (!supabase) return;
        setDeleteLoading(true);
        try {
            if (option === 'series' && antrenament.is_recurent && antrenament.recurent_group_id) {
                const { data: antrenamenteDeSters, error: selectError } = await supabase.from('antrenamente').select('id').eq('recurent_group_id', antrenament.recurent_group_id);
                if (selectError) throw selectError;
                const idsToDelete = antrenamenteDeSters.map(a => a.id);
                const { error: prezentaError } = await supabase.from('prezenta').delete().in('antrenament_id', idsToDelete);
                if (prezentaError) throw prezentaError;
                const { error: antrenamentError } = await supabase.from('antrenamente').delete().in('id', idsToDelete);
                if (antrenamentError) throw antrenamentError;
                setAntrenamente(prev => prev.filter(a => a.recurent_group_id !== antrenament.recurent_group_id));
                setPrezenta(prev => prev.filter(p => !idsToDelete.includes(p.antrenament_id)));
            } else {
                const { error: prezentaError } = await supabase.from('prezenta').delete().eq('antrenament_id', antrenament.id);
                if (prezentaError) throw prezentaError;
                const { error: antrenamentError } = await supabase.from('antrenamente').delete().eq('id', antrenament.id);
                if (antrenamentError) throw antrenamentError;
                setAntrenamente(prev => prev.filter(a => a.id !== antrenament.id));
                setPrezenta(prev => prev.filter(p => p.antrenament_id !== antrenament.id));
            }
        } catch (err) {
            showError("Eroare la ștergere", err);
        } finally {
            setDeleteLoading(false);
            setAntrenamentToDelete(null);
        }
    };
    
    return (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Activitate Astăzi - {new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                        <p className="text-sm text-slate-400">Generează antrenamentele de azi pe baza orarului.</p>
                    </div>
                    <Button onClick={handleGenerateAntrenamente} variant="secondary" size="sm" disabled={syncLoading}>
                        <RefreshCwIcon className={`w-4 h-4 mr-2 ${syncLoading ? 'animate-spin' : ''}`} />
                        {syncLoading ? 'Se sincronizează...' : 'Sincronizează Azi'}
                    </Button>
                </div>
                <div className="flex gap-2 mb-4 border-b border-slate-700 pb-4">
                    {(['all', 'upcoming', 'live', 'finished'] as const).map(f => <Button key={f} size="sm" variant={todayFilter === f ? 'primary' : 'secondary'} onClick={() => setTodayFilter(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</Button>)}
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredAntrenamenteAzi.map(a => {
                        const status = getStatus(a, now);
                        const statusColors = { upcoming: 'border-sky-500', live: 'border-green-500 animate-pulse', finished: 'border-slate-600 opacity-60' };
                        return (
                        <div key={a.id} className={`p-3 bg-slate-800 rounded-lg border-l-4 ${statusColors[status]} flex justify-between items-center`}>
                            <div>
                                <p className="font-bold">{a.grupa?.denumire || 'N/A'}</p>
                                <p className="text-sm text-slate-400">{a.ora_start} - {a.ora_sfarsit}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {a.is_recurent && <RefreshCwIcon className="w-4 h-4 text-slate-500" title="Antrenament Recurent"/>}
                                <Button size="sm" variant="danger" onClick={() => setAntrenamentToDelete(a)}><TrashIcon className="w-4 h-4"/></Button>
                            </div>
                        </div>
                    )})}
                    {filteredAntrenamenteAzi.length === 0 && <p className="text-slate-400 text-center py-4">Nicio activitate conform filtrului.</p>}
                </div>
            </Card>
            <Card>
                <h2 className="text-2xl font-bold text-white mb-4">Program Complet Antrenamente</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-slate-900/50 rounded-lg">
                    <Select label="Filtrează după grupă" value={scheduleFilters.grupaId} onChange={e => setScheduleFilters(p => ({...p, grupaId: e.target.value}))}><option value="">Toate grupele</option>{grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}</Select>
                    <Select label="Filtrează după lună" value={scheduleFilters.month} onChange={e => setScheduleFilters(p => ({...p, month: e.target.value}))}>{monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-700/50"><tr>{['Data', 'Grupa', 'Interval', 'Status', ''].map(h=><th key={h} className="p-3 font-semibold text-sm">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredSchedule.map(a => (
                            <tr key={a.id}>
                                <td className="p-3"><div className="flex items-center gap-2">{new Date(a.data).toLocaleDateString('ro-RO')} {a.is_recurent && <RefreshCwIcon className="w-4 h-4 text-slate-500" title="Recurent"/>}</div></td>
                                <td className="p-3 font-medium">{a.grupa?.denumire}</td>
                                <td className="p-3">{a.ora_start} - {a.ora_sfarsit}</td>
                                <td className="p-3"><span className={`px-2 py-1 text-xs rounded-full ${a.status === 'Anulat' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>{a.status}</span></td>
                                <td className="p-3 text-right"><Button size="sm" variant="danger" onClick={() => setAntrenamentToDelete(a)}><TrashIcon/></Button></td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredSchedule.length === 0 && <p className="text-slate-400 text-center py-8">Niciun antrenament conform filtrelor.</p>}
                </div>
            </Card>
            <DeleteAntrenamentModal isOpen={!!antrenamentToDelete} onClose={() => setAntrenamentToDelete(null)} antrenament={antrenamentToDelete} onConfirm={handleConfirmDelete} loading={deleteLoading} />
        </div>
    );
};

export const ActivitatiManagement: React.FC<ActivitatiManagementProps> = (props) => {
    const { onBack, initialTab = 'antrenamente' } = props;
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
                {activeTab === 'antrenamente' && <AntrenamenteView {...props} />}
                {activeTab === 'examene' && <ExameneManagement {...props} onBack={() => {}} />}
                {activeTab === 'evenimente' && (
                    <div className="space-y-8">
                        <StagiiCompetitiiManagement {...props} type="Stagiu" onBack={()=>{}}/>
                        <StagiiCompetitiiManagement {...props} type="Competitie" onBack={()=>{}}/>
                    </div>
                )}
            </div>
        </div>
    );
};