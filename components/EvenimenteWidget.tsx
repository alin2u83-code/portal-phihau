import React, { useMemo } from 'react';
import { Card, Button } from './ui';
import { TrophyIcon, CalendarDaysIcon } from './icons';
import { useData } from '../contexts/DataContext';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface EvenimenteWidgetProps { sportivId: string; clubId: string | null; }

export const EvenimenteWidget: React.FC<EvenimenteWidgetProps> = ({ sportivId, clubId }) => {
    const { filteredData, setRezultate, locatii } = useData();
    const { showSuccess, showError } = useError();
    
    const evenimente = filteredData.evenimente;
    const rezultate = filteredData.rezultate;
    const sesiuniExamene = filteredData.sesiuniExamene;
    const inscrieriExamene = filteredData.inscrieriExamene;

    const today = new Date().toISOString().split('T')[0];

    const upcomingEvents = useMemo(() => {
        return (evenimente || [])
            .filter(ev => ev.data >= today)
            .sort((a, b) => a.data.localeCompare(b.data));
    }, [evenimente, today]);

    const upcomingExams = useMemo(() => {
        return (sesiuniExamene || [])
            .filter(ex => ex.data >= today && ex.status !== 'Finalizat')
            .sort((a, b) => a.data.localeCompare(b.data));
    }, [sesiuniExamene, today]);

    const handleInscriereEveniment = async (evenimentId: string) => {
        try {
            const { data, error } = await supabase
                .from('rezultate')
                .insert({ sportiv_id: sportivId, eveniment_id: evenimentId, rezultat: 'Participare' })
                .select()
                .single();
            
            if (error) throw error;
            if (data) {
                setRezultate(prev => [...prev, data]);
                showSuccess("Succes", "Te-ai înscris la eveniment!");
            }
        } catch (err: any) {
            showError("Eroare la înscriere", err.message);
        }
    };

    if (upcomingEvents.length === 0 && upcomingExams.length === 0) {
        return (
            <Card className="border border-slate-800 bg-slate-900/50 p-4">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <TrophyIcon className="w-5 h-5 text-indigo-400" /> Activități Viitoare
                </h3>
                <p className="text-slate-500 text-sm italic py-4 text-center">Nicio activitate viitoare programată.</p>
            </Card>
        );
    }

    return (
        <Card className="border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrophyIcon className="w-5 h-5 text-indigo-400" /> Activități Viitoare
            </h3>
            
            <div className="space-y-4">
                {upcomingEvents.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Stagii & Competiții</p>
                        {upcomingEvents.map(ev => {
                            const isEnrolled = rezultate.some(r => r.eveniment_id === ev.id && r.sportiv_id === sportivId);
                            return (
                                <div key={ev.id} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/30 hover:border-indigo-500/30 transition-colors">
                                    <div>
                                        <p className="font-medium text-white text-sm">{ev.denumire}</p>
                                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <CalendarDaysIcon className="w-3 h-3" /> {new Date((ev.data || '').toString().slice(0, 10)).toLocaleDateString('ro-RO')}
                                            <span className={`ml-1 px-1.5 py-0.5 rounded-sm ${ev.tip === 'Stagiu' ? 'bg-amber-500/10 text-amber-500' : 'bg-sky-500/10 text-sky-500'}`}>
                                                {ev.tip}
                                            </span>
                                        </p>
                                    </div>
                                    {isEnrolled ? 
                                        <span className="text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Înscris</span> :
                                        <Button size="sm" variant="info" className="h-7 text-[10px] px-3 font-bold uppercase tracking-wider" onClick={() => handleInscriereEveniment(ev.id)}>Înscrie-te</Button>
                                    }
                                </div>
                            );
                        })}
                    </div>
                )}

                {upcomingExams.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Sesiuni Examene</p>
                        {upcomingExams.map(ex => {
                            const isEnrolled = inscrieriExamene.some(i => i.sesiune_id === ex.id && i.sportiv_id === sportivId);
                            const locatie = locatii.find(l => l.id === ex.locatie_id);
                            return (
                                <div key={ex.id} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/30 hover:border-indigo-500/30 transition-colors">
                                    <div>
                                        <p className="font-medium text-white text-sm">Examen {locatie?.nume || ex.localitate || ''}</p>
                                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <CalendarDaysIcon className="w-3 h-3" /> {new Date((ex.data || '').toString().slice(0, 10)).toLocaleDateString('ro-RO')}
                                        </p>
                                    </div>
                                    {isEnrolled ? 
                                        <span className="text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Înscris</span> :
                                        <span className="text-slate-500 text-[10px] italic bg-slate-800 px-2 py-1 rounded border border-slate-700">Contactează instructorul</span>
                                    }
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Card>
    );
};
