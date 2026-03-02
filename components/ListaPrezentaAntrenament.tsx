import React, { useState, useMemo, useEffect } from 'react';
import { Antrenament, Sportiv, Grupa } from '../types';
import { Card, Button } from './ui';
import { ArrowLeftIcon, CheckCircleIcon, CalendarDaysIcon } from './icons';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { useError } from './ErrorProvider';
import { AntrenamentForm } from './AntrenamentForm';
import { supabase } from '../supabaseClient';

interface ListaPrezentaAntrenamentProps {
    grupa: Grupa;
    onBack: () => void;
    onViewSportiv?: (s: Sportiv) => void;
}

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
            setTimeout(() => setSaved(false), 3000);
        }
    };

    return (
        <Card className={`transition-all duration-500 relative ${saved ? 'ring-4 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)] scale-[1.01]' : 'border-slate-800'}`}>
            {saved && (
                <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-sm font-black px-4 py-2 rounded-xl animate-bounce flex items-center gap-2 shadow-xl z-20 border-2 border-white/20">
                    <CheckCircleIcon className="w-5 h-5" /> SALVAT!
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
                        {new Date(antrenament.data).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })} • {antrenament.ora_start}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 p-4 bg-slate-800/20 rounded-2xl border border-slate-700/30">
                <Button size="sm" variant="secondary" onClick={() => setAllAttendance(true)} className="w-full bg-slate-800 hover:bg-slate-700">Toți Prezenți</Button>
                <Button size="sm" variant="secondary" onClick={() => setAllAttendance(false)} className="w-full bg-slate-800 hover:bg-slate-700">Toți Absenți</Button>
                <div className="sm:col-span-2 flex justify-center pt-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Status: <span className="text-indigo-400">{presentIds.size}</span> / {sportiviInGrupa.length} prezenți
                    </span>
                </div>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar mb-6">
                {sportiviInGrupa.map(s => {
                    const isPresent = presentIds.has(s.id);
                    return (
                        <div 
                            key={s.id} 
                            className={`group flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer border ${isPresent ? 'bg-emerald-500/10 border-emerald-500/30 shadow-sm' : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'}`}
                            onClick={() => toggleSportiv(s.id)}
                        >
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isPresent ? 'bg-emerald-500 border-emerald-500 scale-110' : 'border-slate-600 group-hover:border-slate-500'}`}>
                                {isPresent && <CheckCircleIcon className="w-4 h-4 text-white" />}
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
                                        onViewSportiv(s);
                                    }}
                                >
                                    Profil
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="pt-4 border-t border-slate-800">
                <Button variant="success" size="md" onClick={handleSaveAttendance} isLoading={loading} className="w-full py-4 text-lg shadow-lg shadow-emerald-900/20">
                    <CheckCircleIcon className="w-5 h-5 mr-2" /> Salvează Prezența Lot
                </Button>
            </div>
        </Card>
    );
};

export const ListaPrezentaAntrenament: React.FC<ListaPrezentaAntrenamentProps> = ({ grupa, onBack, onViewSportiv }) => {
    const { todaysTrainings, loading, saveAttendance, refetch } = useAttendanceData(grupa.club_id);
    const [selectedTraining, setSelectedTraining] = useState<(Antrenament & { grupe: Grupa & { sportivi: Sportiv[] }}) | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { showError, showSuccess } = useError();

    const filteredTodaysTrainings = useMemo(() => {
        return todaysTrainings.filter(a => a.grupa_id === grupa.id);
    }, [todaysTrainings, grupa.id]);

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
                const { error: genError } = await supabase.rpc('genereaza_antrenamente_din_orar', { 
                    p_zile_in_avans: 30,
                    p_grupa_id: grupa.id
                });
                
                if (genError) {
                    // Fallback
                    const { error: genError2 } = await supabase.rpc('genereaza_antrenamente_din_orar', { p_zile_in_avans: 30 });
                    if (genError2) showError("Eroare generare", genError2.message);
                    else await refetch();
                } else {
                    await refetch();
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
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-4"><ArrowLeftIcon className="mr-2"/> Înapoi la Grupe</Button>
            <Card>
                <div className="flex justify-between items-start mb-1">
                    <h2 className="text-xl font-bold text-white">Antrenamente Azi: {grupa.denumire}</h2>
                    <Button size="sm" variant="info" onClick={() => setIsFormOpen(true)}>+ Adaugă</Button>
                </div>
                <p className="text-sm text-slate-400 mb-6">{new Date().toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                
                {loading ? (
                    <p className="text-center p-8 text-slate-400">Se încarcă antrenamentele...</p>
                ) : filteredTodaysTrainings.length === 0 ? (
                    <div className="text-center p-8 bg-slate-800/30 rounded-lg border border-slate-700/50">
                        <CalendarDaysIcon className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                        <p className="text-slate-400">Nu există antrenamente programate pentru astăzi.</p>
                        <p className="text-xs text-slate-500 mt-1">Verifică orarul sau calendarul pentru alte zile.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTodaysTrainings.map(a => (
                            <div key={a.id} className="p-4 bg-slate-700/50 rounded-lg flex justify-between items-center hover:bg-slate-700 transition-colors border border-slate-600/30">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${a.is_recurent ? 'bg-sky-900/50 text-sky-300' : 'bg-amber-900/50 text-amber-300'}`}>
                                            {a.is_recurent ? 'Recurent' : 'Extra'}
                                        </span>
                                    </div>
                                    <span className="text-lg font-bold text-white">{a.ora_start} - {a.ora_sfarsit}</span>
                                </div>
                                <Button size="sm" onClick={() => setSelectedTraining(a as any)}>
                                    Bifează Prezența &rarr;
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
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
