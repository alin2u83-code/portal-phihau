import React, { useMemo } from 'react';
import { Card, Button, Badge } from './ui';
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
            <Card className="md:p-6">
                <h3 className="text-base font-semibold text-[var(--t-text)] mb-4 flex items-center gap-2">
                    <TrophyIcon className="w-5 h-5 text-[var(--t-text-muted)]" /> Activități Viitoare
                </h3>
                <p className="text-sm text-[var(--t-text-muted)] py-4 text-center">Nicio activitate viitoare programată.</p>
            </Card>
        );
    }

    return (
        <Card className="md:p-6">
            <h3 className="text-base font-semibold text-[var(--t-text)] mb-4 flex items-center gap-2">
                <TrophyIcon className="w-5 h-5 text-[var(--t-text-muted)]" /> Activități Viitoare
            </h3>

            <div className="space-y-4">
                {upcomingEvents.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-[var(--t-text-muted)]">Stagii și competiții</p>
                        {upcomingEvents.map(ev => {
                            const isEnrolled = rezultate.some(r => r.eveniment_id === ev.id && r.sportiv_id === sportivId);
                            return (
                                <div key={ev.id} className="flex justify-between items-center gap-3 p-3 rounded-lg border border-[var(--t-border)]">
                                    <div>
                                        <p className="font-semibold text-[var(--t-text)] text-sm">{ev.denumire}</p>
                                        <p className="text-xs text-[var(--t-text-muted)] flex items-center gap-1">
                                            <CalendarDaysIcon className="w-3 h-3" /> {new Date((ev.data || '').toString().slice(0, 10)).toLocaleDateString('ro-RO')}
                                            {ev.tip ? <span>· {ev.tip}</span> : null}
                                        </p>
                                    </div>
                                    {isEnrolled ?
                                        <Badge variant="green">Înscris</Badge> :
                                        <Button size="xs" variant="secondary" onClick={() => handleInscriereEveniment(ev.id)}>Înscrie-te</Button>
                                    }
                                </div>
                            );
                        })}
                    </div>
                )}

                {upcomingExams.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-[var(--t-text-muted)]">Sesiuni examene</p>
                        {upcomingExams.map(ex => {
                            const isEnrolled = inscrieriExamene.some(i => i.sesiune_id === ex.id && i.sportiv_id === sportivId);
                            const locatie = locatii.find(l => l.id === ex.locatie_id);
                            return (
                                <div key={ex.id} className="flex justify-between items-center gap-3 p-3 rounded-lg border border-[var(--t-border)]">
                                    <div>
                                        <p className="font-semibold text-[var(--t-text)] text-sm">Examen {locatie?.nume || ex.localitate || ''}</p>
                                        <p className="text-xs text-[var(--t-text-muted)] flex items-center gap-1">
                                            <CalendarDaysIcon className="w-3 h-3" /> {new Date((ex.data || '').toString().slice(0, 10)).toLocaleDateString('ro-RO')}
                                        </p>
                                    </div>
                                    {isEnrolled ?
                                        <Badge variant="green">Înscris</Badge> :
                                        <span className="text-xs text-[var(--t-text-muted)]">Contactează instructorul</span>
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
