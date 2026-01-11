import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Orar, Prezenta, Sportiv, Grupa, Examen, Participare, Grad, PretConfig, Plata, Eveniment, Rezultat, View } from '../types';
import { Button, Card, Select, ConfirmationModal, Modal, Input } from './ui';
import { ArrowLeftIcon, TrashIcon, UsersIcon, ClipboardCheckIcon, PlusIcon, RefreshCwIcon } from './icons';
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
    prezenta: Prezenta[]; setPrezenta: React.Dispatch<React.SetStateAction<Prezenta[]>>;
    orar: Orar[]; setOrar: React.Dispatch<React.SetStateAction<Orar[]>>;
}

const TabButton: React.FC<{ activeTab: Tab, tabName: Tab, label: string, onClick: (tab: Tab) => void }> = ({ activeTab, tabName, label, onClick }) => (
    <button onClick={() => onClick(tabName)} className={`px-4 py-2 text-sm md:text-base font-bold transition-colors duration-200 border-b-2 ${activeTab === tabName ? 'text-brand-secondary border-brand-secondary' : 'text-slate-400 border-transparent hover:text-white hover:border-slate-500'}`}>
        {label}
    </button>
);

const PrezentaModal: React.FC<{ isOpen: boolean; onClose: () => void; orarItem: (Orar & { grupa?: Grupa }) | null; sportivi: Sportiv[]; prezenta: Prezenta[]; setPrezenta: React.Dispatch<React.SetStateAction<Prezenta[]>> }> = ({ isOpen, onClose, orarItem, sportivi, prezenta, setPrezenta }) => {
    const { showError } = useError();
    if (!isOpen || !orarItem) return null;

    const sportiviDinGrupa = sportivi.filter(s => s.grupa_id === orarItem.grupa_id && s.status === 'Activ');
    const todayStr = new Date().toDateString();
    const prezentaAzi = prezenta.filter(p => p.antrenament_id === orarItem.id && new Date(p.created_at).toDateString() === todayStr);

    const handleTogglePrezenta = async (sportivId: string) => {
        if (!supabase) return;
        const prezentaRecord = prezentaAzi.find(p => p.sportiv_id === sportivId);

        if (prezentaRecord) { // Sterge prezenta
            setPrezenta(prev => prev.filter(p => p.id !== prezentaRecord.id));
            const { error } = await supabase.from('prezenta_antrenament').delete().eq('id', prezentaRecord.id);
            if (error) { showError("Eroare la ștergerea prezenței", error); setPrezenta(prezenta); }
        } else { // Adauga prezenta
            const newPrezenta: Omit<Prezenta, 'id' | 'created_at'> = { antrenament_id: orarItem.id, sportiv_id: sportivId, status: 'prezent' };
            const { data, error } = await supabase.from('prezenta_antrenament').insert(newPrezenta).select().single();
            if (error) { showError("Eroare la salvarea prezenței", error); }
            else if(data) { setPrezenta(prev => [...prev, data as Prezenta]); }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Prezență ${orarItem.grupa?.denumire} - ${orarItem.ora_start}`}>
            <div className="max-h-[60vh] overflow-y-auto space-y-2">
                {sportiviDinGrupa.map(sportiv => {
                    const estePrezent = prezentaAzi.some(p => p.sportiv_id === sportiv.id);
                    return (
                        <div key={sportiv.id} className="flex items-center justify-between p-2 bg-slate-700 rounded-md">
                            <span className="font-medium">{sportiv.nume} {sportiv.prenume}</span>
                            <Button size="sm" variant={estePrezent ? 'success' : 'secondary'} onClick={() => handleTogglePrezenta(sportiv.id)}>
                                {estePrezent ? 'Prezent' : 'Absent'}
                            </Button>
                        </div>
                    );
                })}
                 {sportiviDinGrupa.length === 0 && <p className="text-slate-400 text-center py-4">Niciun sportiv activ în această grupă.</p>}
            </div>
        </Modal>
    );
};

const RecurentaFormModal: React.FC<{ isOpen: boolean, onClose: () => void, onSave: (data: any) => Promise<void>, grupe: Grupa[] }> = ({ isOpen, onClose, onSave, grupe }) => {
    const [loading, setLoading] = useState(false);
    const initialZile = { Luni: false, Marți: false, Miercuri: false, Joi: false, Vineri: false, Sâmbătă: false, Duminică: false };
    const [formState, setFormState] = useState({
        grupa_id: '',
        ora_start: '18:00',
        ora_sfarsit: '19:30',
        data_sfarsit_recurenta: '',
        zile: initialZile
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormState(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormState(p => ({...p, zile: {...p.zile, [name]: checked }}));
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onSave(formState);
        setLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Adaugă Program Recurent">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select label="Grupă" name="grupa_id" value={formState.grupa_id} onChange={handleChange} required>
                    <option value="">Alege o grupă...</option>
                    {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                </Select>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Ora Start" type="time" name="ora_start" value={formState.ora_start} onChange={handleChange} required />
                    <Input label="Ora Sfârșit" type="time" name="ora_sfarsit" value={formState.ora_sfarsit} onChange={handleChange} required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Zilele Săptămânii</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-slate-700/50 rounded-md">
                        {Object.keys(initialZile).map(zi => (
                             <label key={zi} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-slate-600">
                                <input type="checkbox" name={zi} checked={formState.zile[zi as keyof typeof initialZile]} onChange={handleCheckboxChange} className="w-4 h-4 text-brand-secondary bg-slate-800 border-slate-600 focus:ring-brand-secondary" />
                                <span className="text-sm">{zi}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <Input label="Data Sfârșit Recurență" type="date" name="data_sfarsit_recurenta" value={formState.data_sfarsit_recurenta} onChange={handleChange} />
                <div className="flex justify-end pt-4 space-x-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează Program'}</Button>
                </div>
            </form>
        </Modal>
    );
};

const DeleteOrarModal: React.FC<{ orarItem: Orar | null; isOpen: boolean; onClose: () => void; onConfirm: (orarItem: Orar, option: 'single' | 'series') => void; loading: boolean; }> = ({ orarItem, isOpen, onClose, onConfirm, loading }) => {
    const [option, setOption] = useState<'single' | 'series'>('single');
    if (!isOpen || !orarItem) return null;
    return (
        <ConfirmationModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={() => onConfirm(orarItem, option)}
            title="Confirmare Ștergere Program"
            message={orarItem.is_recurent ? `Acest interval face parte dintr-o serie recurentă. Doriți să ștergeți doar intrarea pentru ziua de ${orarItem.ziua} sau întreaga serie?` : 'Sunteți sigur că doriți să ștergeți acest interval din program? Acțiunea este ireversibilă.'}
            loading={loading}
        >
            {orarItem.is_recurent && (
                <div className="my-4 space-y-2">
                    <label className="flex items-center p-3 bg-slate-700 rounded-md cursor-pointer hover:bg-slate-600">
                        <input type="radio" name="delete-option" value="single" checked={option === 'single'} onChange={() => setOption('single')} className="w-4 h-4 text-brand-secondary bg-slate-800 border-slate-600 focus:ring-brand-secondary" />
                        <span className="ml-3 text-sm font-medium text-white">Șterge doar intrarea de {orarItem.ziua}</span>
                    </label>
                    <label className="flex items-center p-3 bg-slate-700 rounded-md cursor-pointer hover:bg-slate-600">
                        <input type="radio" name="delete-option" value="series" checked={option === 'series'} onChange={() => setOption('series')} className="w-4 h-4 text-brand-secondary bg-slate-800 border-slate-600 focus:ring-brand-secondary" />
                        <span className="ml-3 text-sm font-medium text-white">Șterge întreaga serie recurentă</span>
                    </label>
                </div>
            )}
        </ConfirmationModal>
    );
};


const AntrenamenteView: React.FC<Omit<ActivitatiManagementProps, 'antrenamente'>> = ({ prezenta, setPrezenta, grupe, orar, setOrar, sportivi, ...props }) => {
    const [todayFilter, setTodayFilter] = useState<'all' | 'upcoming' | 'live' | 'finished'>('all');
    const [scheduleFilters, setScheduleFilters] = useState({ grupaId: '' });
    const [orarToDelete, setOrarToDelete] = useState<Orar | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [orarForPrezenta, setOrarForPrezenta] = useState<(Orar & { grupa?: Grupa }) | null>(null);
    const [isRecurentaModalOpen, setIsRecurentaModalOpen] = useState(false);
    const { showError } = useError();
    
    const orarCuGrupa = useMemo(() => orar.map(o => ({ ...o, grupa: grupe.find(g => g.id === o.grupa_id) })), [orar, grupe]);
    
    const { orarAzi, now } = useMemo(() => {
        const n = new Date();
        const todayDayName = new Date().toLocaleDateString('ro-RO', { weekday: 'long' });
        const todayDayNameCapitalized = todayDayName.charAt(0).toUpperCase() + todayDayName.slice(1);
        return {
            orarAzi: orarCuGrupa.filter(o => o.ziua === todayDayNameCapitalized && o.is_activ).sort((a, b) => a.ora_start.localeCompare(b.ora_start)),
            now: n
        };
    }, [orarCuGrupa]);
    
    const getStatus = useCallback((orarItem: Orar, currentTime: Date): 'upcoming' | 'live' | 'finished' => {
        const [startH, startM] = orarItem.ora_start.split(':').map(Number);
        const [endH, endM] = orarItem.ora_sfarsit.split(':').map(Number);
        const nowH = currentTime.getHours();
        const nowM = currentTime.getMinutes();
        const nowTotalMinutes = nowH * 60 + nowM;
        const startTotalMinutes = startH * 60 + startM;
        const endTotalMinutes = endH * 60 + endM;

        if (nowTotalMinutes < startTotalMinutes) return 'upcoming';
        if (nowTotalMinutes >= startTotalMinutes && nowTotalMinutes <= endTotalMinutes) return 'live';
        return 'finished';
    }, []);
    
    const filteredOrarAzi = useMemo(() => {
        if (todayFilter === 'all') return orarAzi;
        return orarAzi.filter(o => getStatus(o, now) === todayFilter);
    }, [orarAzi, todayFilter, now, getStatus]);

    const filteredSchedule = useMemo(() => {
        const zileSaptamanaOrdonate: Record<Orar['ziua'], number> = { 'Luni': 1, 'Marți': 2, 'Miercuri': 3, 'Joi': 4, 'Vineri': 5, 'Sâmbătă': 6, 'Duminică': 7 };
        return orarCuGrupa
            .filter(o => !scheduleFilters.grupaId || o.grupa_id === scheduleFilters.grupaId)
            .sort((a,b) => zileSaptamanaOrdonate[a.ziua] - zileSaptamanaOrdonate[b.ziua] || a.ora_start.localeCompare(b.ora_start));
    }, [orarCuGrupa, scheduleFilters]);
    
    const handleSaveRecurenta = async (formData: any) => {
        if (!supabase) return;
        const { grupa_id, ora_start, ora_sfarsit, data_sfarsit_recurenta, zile } = formData;
        const recurent_group_id = crypto.randomUUID();
        const zileSelectate = Object.keys(zile).filter(zi => zile[zi]);
        
        const itemsToInsert: Omit<Orar, 'id'>[] = zileSelectate.map(ziua => ({
            grupa_id, ora_start, ora_sfarsit, ziua: ziua as Orar['ziua'],
            is_recurent: true, recurent_group_id,
            data_sfarsit_recurenta: data_sfarsit_recurenta || null,
            is_activ: true
        }));

        if (itemsToInsert.length > 0) {
            const { data, error } = await supabase.from('program_antrenamente').insert(itemsToInsert).select();
            if (error) { showError("Eroare la salvarea programului", error); }
            else if (data) { setOrar(prev => [...prev, ...data as Orar[]]); }
        }
    };

    const handleConfirmDelete = async (orarItem: Orar, option: 'single' | 'series') => {
        if (!supabase) return;
        setDeleteLoading(true);
        try {
            if (option === 'series' && orarItem.is_recurent && orarItem.recurent_group_id) {
                const { data: orarDeSters, error: selectError } = await supabase.from('program_antrenamente').select('id').eq('recurent_group_id', orarItem.recurent_group_id);
                if (selectError) throw selectError;
                const idsToDelete = orarDeSters.map(o => o.id);
                
                const { error: prezentaError } = await supabase.from('prezenta_antrenament').delete().in('antrenament_id', idsToDelete);
                if (prezentaError) throw prezentaError;

                const { error: orarError } = await supabase.from('program_antrenamente').delete().in('id', idsToDelete);
                if (orarError) throw orarError;

                setOrar(prev => prev.filter(o => o.recurent_group_id !== orarItem.recurent_group_id));
                setPrezenta(prev => prev.filter(p => !idsToDelete.includes(p.antrenament_id)));
            } else {
                const { error: prezentaError } = await supabase.from('prezenta_antrenament').delete().eq('antrenament_id', orarItem.id);
                if (prezentaError) throw prezentaError;
                const { error: orarError } = await supabase.from('program_antrenamente').delete().eq('id', orarItem.id);
                if (orarError) throw orarError;
                setOrar(prev => prev.filter(o => o.id !== orarItem.id));
                setPrezenta(prev => prev.filter(p => p.antrenament_id !== orarItem.id));
            }
        } catch (err) {
            showError("Eroare la ștergerea programului", err);
        } finally {
            setDeleteLoading(false);
            setOrarToDelete(null);
        }
    };
    
    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-2xl font-bold text-white mb-4">Activitate Astăzi - {new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                <div className="flex gap-2 mb-4 border-b border-slate-700 pb-4">
                    {(['all', 'upcoming', 'live', 'finished'] as const).map(f => <Button key={f} size="sm" variant={todayFilter === f ? 'primary' : 'secondary'} onClick={() => setTodayFilter(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</Button>)}
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredOrarAzi.map(o => {
                        const status = getStatus(o, now);
                        const statusColors = { upcoming: 'border-sky-500', live: 'border-green-500 animate-pulse', finished: 'border-slate-600 opacity-60' };
                        return (
                        <div key={o.id} className={`p-3 bg-slate-800 rounded-lg border-l-4 ${statusColors[status]} flex justify-between items-center`}>
                            <div>
                                <p className="font-bold">{o.grupa?.denumire || 'N/A'}</p>
                                <p className="text-sm text-slate-400">{o.ora_start} - {o.ora_sfarsit}</p>
                            </div>
                            <Button size="sm" onClick={() => setOrarForPrezenta(o)}>
                                <ClipboardCheckIcon className="w-4 h-4 mr-2"/> Prezență
                            </Button>
                        </div>
                    )})}
                    {filteredOrarAzi.length === 0 && <p className="text-slate-400 text-center py-4">Niciun antrenament programat pentru astăzi.</p>}
                </div>
            </Card>
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">Program Săptămânal Complet</h2>
                    <Button onClick={() => setIsRecurentaModalOpen(true)}><PlusIcon className="w-4 h-4 mr-2"/>Adaugă Program Recurent</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-slate-900/50 rounded-lg">
                    <Select label="Filtrează după grupă" value={scheduleFilters.grupaId} onChange={e => setScheduleFilters(p => ({...p, grupaId: e.target.value}))}><option value="">Toate grupele</option>{grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}</Select>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-700/50"><tr>{['Ziua', 'Grupa', 'Interval', 'Status', ''].map(h=><th key={h} className="p-3 font-semibold text-sm">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredSchedule.map(o => (
                            <tr key={o.id}>
                                <td className="p-3 font-bold">{o.ziua}</td>
                                <td className="p-3 font-medium flex items-center gap-2">{o.grupa?.denumire} {o.is_recurent && <RefreshCwIcon className="w-4 h-4 text-sky-400" title="Program Recurent"/>}</td>
                                <td className="p-3">{o.ora_start} - {o.ora_sfarsit}</td>
                                <td className="p-3"><span className={`px-2 py-1 text-xs rounded-full ${o.is_activ ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>{o.is_activ ? 'Activ' : 'Inactiv'}</span></td>
                                <td className="p-3 text-right"><Button size="sm" variant="danger" onClick={() => setOrarToDelete(o)}><TrashIcon/></Button></td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredSchedule.length === 0 && <p className="text-slate-400 text-center py-8">Niciun program conform filtrelor.</p>}
                </div>
            </Card>
            <DeleteOrarModal isOpen={!!orarToDelete} onClose={() => setOrarToDelete(null)} orarItem={orarToDelete} onConfirm={handleConfirmDelete} loading={deleteLoading} />
            <PrezentaModal isOpen={!!orarForPrezenta} onClose={() => setOrarForPrezenta(null)} orarItem={orarForPrezenta} sportivi={sportivi} prezenta={prezenta} setPrezenta={setPrezenta} />
            <RecurentaFormModal isOpen={isRecurentaModalOpen} onClose={() => setIsRecurentaModalOpen(false)} onSave={handleSaveRecurenta} grupe={grupe} />
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