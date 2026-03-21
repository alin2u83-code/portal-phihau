import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Antrenament, Sportiv, Grupa } from '../types';
import { useError } from './ErrorProvider';
import { Card, Button } from './ui';
import { ArrowLeftIcon, CalendarDaysIcon, SparklesIcon } from './icons';
import { useAttendance } from '../hooks/useAttendance';
import { FormularPrezenta } from './ListaPrezentaAntrenament';
import { PrezentaRapida } from './Prezenta/PrezentaRapida';
import { useStatusePrezenta } from '../hooks/useStatusePrezenta';

interface TrainingWithGroupAndAthletes extends Omit<Antrenament, 'grupe' | 'prezenta'> {
    grupe: (Grupa & { sportivi: Sportiv[] }) | null;
    prezenta: { sportiv_id: string, status_id: string | null, status: { este_prezent: boolean, denumire: string } | null }[];
}

interface InstructorPrezentaPageProps {
    onBack: () => void;
    onNavigate: (view: any) => void;
    onViewSportiv?: (s: Sportiv) => void;
}

type Mode = 'lista' | 'rapid';

export const InstructorPrezentaPage: React.FC<InstructorPrezentaPageProps> = ({ onBack, onViewSportiv }) => {
    const { saveAttendance } = useAttendance();
    const { byId: statusById } = useStatusePrezenta();
    const [mode, setMode] = useState<Mode>('rapid');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [trainings, setTrainings] = useState<TrainingWithGroupAndAthletes[]>([]);
    const [selectedTraining, setSelectedTraining] = useState<TrainingWithGroupAndAthletes | null>(null);
    const [loading, setLoading] = useState(true);
    const { showError } = useError();
    const today = useMemo(() => new Date(), []);
    const yesterday = useMemo(() => new Date(Date.now() - 86400000), []);

    const selectedDateString = useMemo(() => selectedDate.toLocaleDateString('sv-SE'), [selectedDate]);
    const todayString = useMemo(() => today.toLocaleDateString('sv-SE'), [today]);
    const yesterdayString = useMemo(() => yesterday.toLocaleDateString('sv-SE'), [yesterday]);
    const isToday = selectedDateString === todayString;

    useEffect(() => {
        setSelectedTraining(null);
        if (!isToday || mode === 'lista') {
            // For lista mode or non-today dates, fetch full training data
            const fetchTrainings = async () => {
                if (!supabase) { showError("Eroare Configurare", "Clientul Supabase nu a fost găsit."); setLoading(false); return; }
                setLoading(true);
                const { data, error } = await supabase
                    .from('program_antrenamente')
                    .select('*, grupe(*, sportivi(id, nume, prenume, status, grad_actual_id)), prezenta:prezenta_antrenament(sportiv_id, status_id)')
                    .eq('data', selectedDateString);
                if (error) { showError("Eroare la încărcarea antrenamentelor", error.message); setLoading(false); return; }
                const processed = (data || []).map(t => ({
                    ...t,
                    grupe: t.grupe ? {
                        ...t.grupe,
                        sportivi: (t.grupe.sportivi || []).filter((s: Sportiv) => s.status === 'Activ').sort((a: Sportiv, b: Sportiv) => a.nume.localeCompare(b.nume))
                    } : null
                }));
                setTrainings(processed.sort((a, b) => a.ora_start.localeCompare(b.ora_start)) as TrainingWithGroupAndAthletes[]);
                setLoading(false);
            };
            fetchTrainings();
        } else {
            setLoading(false);
        }
    }, [selectedDateString, showError, mode, isToday]);

    const handleSelectFull = async (id: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('program_antrenamente')
            .select('*, grupe(*, sportivi(id, nume, prenume, status, grad_actual_id)), prezenta:prezenta_antrenament(sportiv_id, status_id)')
            .eq('id', id).single();
        if (error) { showError("Eroare", error.message); setLoading(false); return; }
        if (data) {
            const processed = {
                ...data,
                grupe: data.grupe ? { ...data.grupe, sportivi: (data.grupe.sportivi || []).filter((s: any) => s.status === 'Activ').sort((a: any, b: any) => a.nume.localeCompare(b.nume)) } : null,
                prezenta: (data.prezenta || []).map((p: any) => ({ ...p, status: p.status_id ? (statusById[p.status_id] ?? null) : null })),
            };
            setSelectedTraining(processed as any);
        }
        setLoading(false);
    };

    if (selectedTraining) {
        return (
            <FormularPrezenta
                antrenament={selectedTraining as any}
                onBack={() => setSelectedTraining(null)}
                onViewSportiv={onViewSportiv}
                saveAttendance={saveAttendance}
            />
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button onClick={onBack} variant="secondary" size="sm">
                    <ArrowLeftIcon className="w-4 h-4 mr-1" /> Meniu
                </Button>
                <h1 className="text-xl font-bold text-white flex-1">Prezență Zilnică</h1>
            </div>

            {/* Date selector */}
            <div className="flex items-center gap-2">
                <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
                    <button
                        onClick={() => setSelectedDate(yesterday)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${selectedDateString === yesterdayString ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        Ieri
                    </button>
                    <button
                        onClick={() => setSelectedDate(today)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${selectedDateString === todayString ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        Azi
                    </button>
                </div>

                {/* Mode toggle — only for today */}
                {isToday && (
                    <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1 ml-auto">
                        <button
                            onClick={() => setMode('rapid')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${mode === 'rapid' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <SparklesIcon className="w-3.5 h-3.5" /> Rapid
                        </button>
                        <button
                            onClick={() => setMode('lista')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${mode === 'lista' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <CalendarDaysIcon className="w-3.5 h-3.5" /> Listă
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            {isToday && mode === 'rapid' ? (
                <PrezentaRapida onSelectFull={handleSelectFull} />
            ) : loading ? (
                <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-500" />
                </div>
            ) : trainings.length === 0 ? (
                <Card className="text-center py-12">
                    <p className="text-slate-400 italic">Niciun antrenament programat pentru data selectată.</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {trainings.map(t => (
                        <div key={t.id} className="group p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex flex-col items-center justify-center text-indigo-400 border border-indigo-500/20">
                                    <span className="text-xs font-black">{t.ora_start?.slice(0, 5)}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{t.grupe?.denumire || 'Antrenament Liber'}</h3>
                                    <p className="text-sm text-slate-400">{t.ora_start} - {t.ora_sfarsit} • {t.grupe?.sportivi.length || 0} sportivi</p>
                                </div>
                            </div>
                            <Button size="sm" onClick={() => setSelectedTraining(t)} className="w-full sm:w-auto">
                                Bifează Prezența →
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
