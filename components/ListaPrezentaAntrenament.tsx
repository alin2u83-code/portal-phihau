import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Antrenament, Sportiv, Grupa } from '../types';
import { Card, Button, Modal, Input, Select } from './ui';
import { ArrowLeftIcon, CheckCircleIcon, CalendarDaysIcon, UsersIcon, SearchIcon, PlusIcon } from './icons';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { useAttendance } from '../hooks/useAttendance';
import { useError } from './ErrorProvider';
import { AntrenamentForm } from './AntrenamentForm';
import { supabase } from '../supabaseClient';
import { generateTrainingsFromSchedule } from '../utils/trainingGenerator';

import { useData } from '../contexts/DataContext';

interface ListaPrezentaAntrenamentProps {
    grupa: Grupa;
    onBack: () => void;
    onViewSportiv?: (s: Sportiv) => void;
}

// Component: Sportiv Info Modal
const SportivInfoModal: React.FC<{
    sportiv: Sportiv | null;
    isOpen: boolean;
    onClose: () => void;
}> = ({ sportiv, isOpen, onClose }) => {
    const { grade } = useData();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && sportiv) {
            const fetchHistory = async () => {
                setLoading(true);
                const { data } = await supabase
                    .from('vedere_prezenta_sportiv')
                    .select('*')
                    .eq('sportiv_id', sportiv.id)
                    .order('data', { ascending: false })
                    .limit(10);
                setHistory(data || []);
                setLoading(false);
            };
            fetchHistory();
        }
    }, [isOpen, sportiv]);

    if (!sportiv) return null;

    const gradName = sportiv.grad_actual_id ? grade.find(g => g.id === sportiv.grad_actual_id)?.nume : 'Fără grad';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Profil Sportiv: ${sportiv.nume} ${sportiv.prenume}`}>
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Grad Actual</p>
                        <p className="text-lg font-bold text-white">{gradName || 'Fără grad'}</p>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                        <p className={`text-lg font-bold ${sportiv.status === 'Activ' ? 'text-emerald-400' : 'text-rose-400'}`}>{sportiv.status}</p>
                    </div>
                </div>

                <div>
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <CalendarDaysIcon className="w-4 h-4" />
                        Ultimul Istoric Prezență
                    </h4>
                    {loading ? (
                        <div className="flex justify-center py-4">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : history.length === 0 ? (
                        <p className="text-slate-500 italic text-sm text-center py-4">Nicio prezență înregistrată recent.</p>
                    ) : (
                        <div className="space-y-2">
                            {history.map((h, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                                    <div>
                                        <p className="text-sm font-bold text-white">{new Date((h.data || '').toString().slice(0, 10)).toLocaleDateString('ro-RO')}</p>
                                        <p className="text-[10px] text-slate-500">{h.nume_grupa}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${h.status === 'prezent' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                        {h.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Închide</Button>
                </div>
            </div>
        </Modal>
    );
};

// Component: Attendance Marking Form
export const FormularPrezenta: React.FC<{
    antrenament: Antrenament & { grupe: Grupa & { sportivi: Sportiv[] }};
    onBack: () => void;
    onViewSportiv?: (s: Sportiv) => void;
    saveAttendance: (id: string, records: { sportiv_id: string; status: 'prezent' | 'absent' }[]) => Promise<boolean>;
}> = ({ antrenament, onBack, onViewSportiv, saveAttendance }) => {
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [selectedSportiv, setSelectedSportiv] = useState<Sportiv | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 1. Initial Data Population
    useEffect(() => {
        const populateInitialData = () => {
            const initialPresent = new Set(
                (antrenament.prezenta || [])
                    .filter(p => p.status === 'prezent')
                    .map(p => p.sportiv_id)
            );
            setPresentIds(initialPresent);
        };
        populateInitialData();
    }, [antrenament]);

    const sportiviInGrupa = useMemo(() => {
        return (antrenament.grupe?.sportivi || [])
            .filter(s => s.status === 'Activ')
            .sort((a, b) => a.nume.localeCompare(b.nume));
    }, [antrenament.grupe]);

    // 2. Checkbox State Management
    const toggleSportiv = (sportivId: string) => {
        setPresentIds(prev => {
            const next = new Set(prev);
            if (next.has(sportivId)) next.delete(sportivId);
            else next.add(sportivId);
            return next;
        });
    };

    const setAllAttendance = (isPresent: boolean) => {
        if (isPresent) {
            setPresentIds(new Set(sportiviInGrupa.map(s => s.id)));
        } else {
            setPresentIds(new Set());
        }
    };

    // Filter Logic
    const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent'>('all');

    const filteredSportivi = useMemo(() => {
        if (filterStatus === 'all') return sportiviInGrupa;
        return sportiviInGrupa.filter(s => {
            const isPresent = presentIds.has(s.id);
            return filterStatus === 'present' ? isPresent : !isPresent;
        });
    }, [sportiviInGrupa, presentIds, filterStatus]);

    // 3. Save Logic
    const handleSaveAttendance = async () => {
        setLoading(true);
        setSaved(false);
        
        const records = sportiviInGrupa.map(s => ({
            sportiv_id: s.id,
            status: presentIds.has(s.id) ? 'prezent' as const : 'absent' as const,
        }));

        const success = await saveAttendance(antrenament.id, records);
        
        setLoading(false);
        if (success) {
            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                onBack();
            }, 1500);
        }
    };

    return (
        <Card className={`transition-all duration-500 relative ${saved ? 'ring-4 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)] scale-[1.01]' : 'border-slate-800'}`}>
            {saved && (
                <div className="absolute top-0 left-0 right-0 -mt-12 flex justify-center z-50 pointer-events-none">
                     <div className="bg-emerald-500 text-white text-lg font-black px-6 py-3 rounded-2xl animate-bounce flex items-center gap-3 shadow-2xl border-4 border-slate-900">
                        <CheckCircleIcon className="w-6 h-6" /> 
                        <span>PREZENȚĂ SALVATĂ CU SUCCES!</span>
                    </div>
                </div>
            )}
            
            <div className="flex justify-between items-center mb-6">
                <Button onClick={onBack} variant="secondary" size="sm">
                    <ArrowLeftIcon className="w-4 h-4 mr-2"/> Înapoi
                </Button>
                <div className="text-right">
                    <h2 className="text-2xl font-black text-white tracking-tight">{antrenament.grupe?.denumire}</h2>
                    <p className="text-sm font-medium text-slate-400 flex items-center justify-end gap-2">
                        <CalendarDaysIcon className="w-4 h-4" />
                        {new Date((antrenament.data || '').toString().slice(0, 10)).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })} • {antrenament.ora_start}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 p-4 bg-slate-800/20 rounded-2xl border border-slate-700/30">
                <Button size="sm" variant="secondary" onClick={() => setAllAttendance(true)} className="w-full bg-slate-800 hover:bg-slate-700">Toți Prezenți</Button>
                <Button size="sm" variant="secondary" onClick={() => setAllAttendance(false)} className="w-full bg-slate-800 hover:bg-slate-700">Toți Absenți</Button>
                <div className="sm:col-span-2 flex flex-col items-center pt-2 gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Status: <span className="text-indigo-400">{presentIds.size}</span> / {sportiviInGrupa.length} prezenți
                    </span>
                    
                    {/* Filter Controls */}
                    <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700/50">
                        <button 
                            onClick={() => setFilterStatus('all')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterStatus === 'all' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                        >
                            Toți
                        </button>
                        <button 
                            onClick={() => setFilterStatus('present')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterStatus === 'present' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-emerald-400'}`}
                        >
                            Prezenți
                        </button>
                        <button 
                            onClick={() => setFilterStatus('absent')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterStatus === 'absent' ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'text-slate-400 hover:text-rose-400'}`}
                        >
                            Absenți
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar mb-6">
                {filteredSportivi.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 italic">
                        Nu există sportivi pentru filtrul selectat.
                    </div>
                ) : (
                    filteredSportivi.map(s => {
                        const isPresent = presentIds.has(s.id);
                        return (
                            <div 
                                key={s.id} 
                                className={`group flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer border ${isPresent ? 'bg-emerald-500/10 border-emerald-500/30 shadow-sm' : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'}`}
                                onClick={() => toggleSportiv(s.id)}
                            >
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isPresent ? 'bg-emerald-500 border-emerald-500 scale-110' : 'border-slate-600 group-hover:border-slate-500'}`}>
                                    <motion.div
                                        initial={false}
                                        animate={{ scale: isPresent ? 1 : 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    >
                                        <CheckCircleIcon className="w-4 h-4 text-white" />
                                    </motion.div>
                                </div>
                                <span 
                                    className={`font-bold flex-grow select-none transition-colors ${isPresent ? 'text-emerald-400' : 'text-slate-300'}`}
                                >
                                    {s.nume} {s.prenume}
                                </span>
                                {onViewSportiv && (
                                    <Button 
                                        size="sm" 
                                        variant="secondary" 
                                        className="opacity-0 group-hover:opacity-100 h-8 px-2 text-[10px]"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedSportiv(s);
                                            setIsModalOpen(true);
                                            if (onViewSportiv) onViewSportiv(s);
                                        }}
                                    >
                                        Profil
                                    </Button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <SportivInfoModal 
                sportiv={selectedSportiv} 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
            />

            <div className="pt-4 border-t border-slate-800">
                <Button variant="success" size="md" onClick={handleSaveAttendance} isLoading={loading} className="w-full py-4 text-lg shadow-lg shadow-emerald-900/20">
                    <CheckCircleIcon className="w-5 h-5 mr-2" /> Salvează Prezența Lot
                </Button>
            </div>
        </Card>
    );
};

export const ListaPrezentaAntrenament: React.FC<ListaPrezentaAntrenamentProps> = ({ grupa, onBack, onViewSportiv }) => {
    const { allTrainings, loading, refetch } = useAttendanceData(grupa.club_id);
    const { saveAttendance, loading: attendanceLoading } = useAttendance();
    const [selectedTraining, setSelectedTraining] = useState<(Antrenament & { grupe: Grupa & { sportivi: Sportiv[] }}) | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { showError, showSuccess } = useError();

    // Filters and Sorting
    const [filterSportivId, setFilterSportivId] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [perioada, setPerioada] = useState<'azi' | 'saptamana' | 'luna' | 'toate'>('azi');

    const filteredTrainings = useMemo(() => {
        let result = allTrainings.filter(a => a.grupa_id === grupa.id);

        const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        if (perioada === 'azi') {
            result = result.filter(a => (a.data || '').toString().slice(0, 10) === today);
        } else if (perioada === 'saptamana') {
            result = result.filter(a => new Date((a.data || '').toString().slice(0, 10)) >= oneWeekAgo);
        } else if (perioada === 'luna') {
            result = result.filter(a => new Date((a.data || '').toString().slice(0, 10)) >= oneMonthAgo);
        }

        if (filterSportivId) {
            // Filter trainings where this sportiv was marked present or absent
            result = result.filter(a => {
                return (a.prezenta || []).some(p => p.sportiv_id === filterSportivId);
            });
        }

        return result.sort((a, b) => {
            const dateA = new Date((a.data || '').toString().slice(0, 10) + 'T' + a.ora_start).getTime();
            const dateB = new Date((b.data || '').toString().slice(0, 10) + 'T' + b.ora_start).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
    }, [allTrainings, grupa.id, perioada, sortOrder, filterSportivId]);

    const sportiviInGrupa = useMemo(() => {
        // We need to get sportivi for this group to populate the filter
        // useAttendanceData doesn't directly give us sportivi list, 
        // but we can get it from the first training or fetch separately.
        // Let's assume we can get it from the first training that has grupe.sportivi
        const firstWithSportivi = allTrainings.find(a => a.grupa_id === grupa.id && (a as any).grupe?.sportivi);
        return (firstWithSportivi as any)?.grupe?.sportivi || [];
    }, [allTrainings, grupa.id]);

    const handleSaveNewTraining = async (data: any) => {
        if (data.is_recurent) {
            const { error } = await supabase.from('orar_saptamanal').insert({
                ziua: data.ziua,
                ora_start: data.ora_start,
                ora_sfarsit: data.ora_sfarsit,
                grupa_id: data.grupa_id,
                club_id: grupa.club_id,
                is_activ: true
            });
            if (error) showError("Eroare la salvare orar", error.message);
            else {
                showSuccess("Succes", "Antrenamentul recurent a fost adăugat în orar.");
                // Trigger generation
                try {
                    await generateTrainingsFromSchedule(30, grupa.id);
                    await refetch();
                } catch (genError: any) {
                    // Fallback
                    try {
                        await generateTrainingsFromSchedule(30);
                        await refetch();
                    } catch (genError2: any) {
                        showError("Eroare generare", genError2.message);
                    }
                }
            }
        } else {
            const { error } = await supabase.from('program_antrenamente').insert(data);
            if (error) showError("Eroare", error.message);
            else {
                showSuccess("Succes", "Antrenamentul personalizat a fost adăugat.");
                await refetch();
            }
        }
    };

    if (selectedTraining) {
        return (
            <FormularPrezenta 
                antrenament={selectedTraining} 
                onBack={() => setSelectedTraining(null)} 
                onViewSportiv={onViewSportiv}
                saveAttendance={saveAttendance}
            />
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <Button onClick={onBack} variant="secondary" className="mb-4">
                <ArrowLeftIcon className="w-4 h-4 mr-2"/> Înapoi la Grupe
            </Button>
            
            <Card className="border-none shadow-xl bg-slate-900/40 backdrop-blur-sm">
                <div className="p-6 border-b border-slate-800 bg-slate-800/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Antrenamente: {grupa.denumire}</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {perioada === 'azi' ? 'Programul de astăzi' : `Istoric antrenamente (${perioada})`}
                        </p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button size="sm" variant="info" onClick={() => setIsFormOpen(true)} className="flex-grow md:flex-grow-0">
                            <PlusIcon className="w-4 h-4 mr-2" /> Adaugă
                        </Button>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 p-4 bg-slate-800/20 rounded-2xl border border-slate-700/30">
                        <Select 
                            label="Perioada" 
                            value={perioada} 
                            onChange={e => setPerioada(e.target.value as any)}
                        >
                            <option value="azi">Astăzi</option>
                            <option value="saptamana">Ultima Săptămână</option>
                            <option value="luna">Ultima Lună</option>
                            <option value="toate">Toate</option>
                        </Select>
                        
                        <Select 
                            label="Sortare" 
                            value={sortOrder} 
                            onChange={e => setSortOrder(e.target.value as any)}
                        >
                            <option value="desc">Cele mai recente</option>
                            <option value="asc">Cele mai vechi</option>
                        </Select>

                        <Select 
                            label="Filtru Sportiv (Vizualizare)" 
                            value={filterSportivId} 
                            onChange={e => setFilterSportivId(e.target.value)}
                        >
                            <option value="">Toți Sportivii</option>
                            {sportiviInGrupa.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>
                            ))}
                        </Select>
                    </div>
                
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : filteredTrainings.length === 0 ? (
                        <div className="text-center py-12 bg-slate-800/10 rounded-2xl border border-dashed border-slate-800">
                            <CalendarDaysIcon className="w-12 h-12 text-slate-700 mx-auto mb-3 opacity-20" />
                            <p className="text-slate-500 italic">Nu există antrenamente programate pentru această selecție.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredTrainings.map(a => {
                                const isToday = (a.data || '').toString().slice(0, 10) === new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
                                const sportivPresence = filterSportivId ? a.prezenta?.find(p => p.sportiv_id === filterSportivId) : null;

                                return (
                                    <div key={a.id} className={`group p-4 rounded-2xl border transition-all flex flex-col sm:flex-row justify-between items-center gap-4 ${isToday ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'}`}>
                                        <div className="flex items-center gap-4 w-full sm:w-auto">
                                            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border ${isToday ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                                <span className="text-[10px] font-black uppercase leading-none mb-1">{new Date((a.data || '').toString().slice(0, 10)).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</span>
                                                <span className="text-xs font-bold">{a.ora_start}</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${a.is_recurent ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                        {a.is_recurent ? 'Recurent' : 'Extra'}
                                                    </span>
                                                    {isToday && <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-400">Azi</span>}
                                                    {sportivPresence && (
                                                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${sportivPresence.status === 'prezent' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                            {sportivPresence.status === 'prezent' ? 'Prezent' : 'Absent'}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-lg font-bold text-white leading-none">{a.ora_start} - {a.ora_sfarsit}</p>
                                            </div>
                                        </div>
                                        <Button size="sm" onClick={() => setSelectedTraining(a as any)} className={`w-full sm:w-auto shadow-lg ${isToday ? 'shadow-indigo-500/20' : 'shadow-slate-900/20'}`}>
                                            {isToday ? 'Bifează Prezența' : 'Vezi Prezența'} &rarr;
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Card>
            <AntrenamentForm 
                isOpen={isFormOpen} 
                onClose={() => setIsFormOpen(false)} 
                onSave={handleSaveNewTraining} 
                grupaId={grupa.id} 
                grupe={[grupa]} 
            />
        </div>
    );
};
