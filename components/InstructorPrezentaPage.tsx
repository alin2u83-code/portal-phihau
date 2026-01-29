import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
// FIX: Imported the missing ProgramItem type, which is used by the getTodayRo helper function.
import { Antrenament, Sportiv, Grupa, ProgramItem } from '../types';
import { useError } from './ErrorProvider';
import { Card, Button } from './ui';
import { CheckIcon, XIcon, ArrowLeftIcon, ArchiveBoxIcon } from './icons';

interface TrainingWithGroupAndAthletes extends Omit<Antrenament, 'grupe'> {
    grupe: (Grupa & { sportivi: Sportiv[] }) | null;
}

const getTodayRo = (): ProgramItem['ziua'] => {
    const day = new Date().toLocaleDateString('ro-RO', { weekday: 'long' });
    return (day.charAt(0).toUpperCase() + day.slice(1)) as ProgramItem['ziua'];
};

export const InstructorPrezentaPage: React.FC<{ onBack: () => void, onNavigate: (view: any) => void }> = ({ onBack, onNavigate }) => {
    const [trainings, setTrainings] = useState<TrainingWithGroupAndAthletes[]>([]);
    const [attendance, setAttendance] = useState<Map<string, Set<string>>>(new Map()); // Map<antrenamentId, Set<sportivId>>
    const [loading, setLoading] = useState(true);
    const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
    const { showError, showSuccess } = useError();
    const todayRo = useMemo(() => getTodayRo(), []);

    useEffect(() => {
        const fetchTodaysTrainings = async () => {
            setLoading(true);
            const todayISO = new Date().toISOString().split('T')[0];

            // 1. Fetch non-recurring trainings for today
            const { data: singleTrainings, error: singleError } = await supabase
                .from('program_antrenamente')
                .select('*, grupe(*, sportivi(*))')
                .eq('data', todayISO);

            if (singleError) {
                showError("Eroare la încărcarea antrenamentelor", singleError);
                setLoading(false);
                return;
            }

            // 2. Fetch recurring trainings for today's day of the week
            const { data: recurringTrainings, error: recurringError } = await supabase
                .from('grupe')
                .select('*, program_antrenamente!inner(*), sportivi(*)')
                .eq('program_antrenamente.ziua', todayRo);

            if (recurringError) {
                showError("Eroare la încărcarea programului recurent", recurringError);
                setLoading(false);
                return;
            }

            const combined: TrainingWithGroupAndAthletes[] = [...(singleTrainings || []) as TrainingWithGroupAndAthletes[]];
            const initialAttendance = new Map<string, Set<string>>();

            // Process recurring trainings and create virtual Antrenament objects if they don't exist as single instances
            recurringTrainings?.forEach(grupa => {
                grupa.program_antrenamente.forEach((programItem: any) => {
                    const antrenamentId = `recurent-${programItem.id}-${todayISO}`;
                    if (!combined.some(t => t.id === programItem.id && t.data === todayISO)) {
                        combined.push({
                            id: antrenamentId,
                            data: todayISO,
                            ora_start: programItem.ora_start,
                            ora_sfarsit: programItem.ora_sfarsit,
                            grupa_id: grupa.id,
                            grupe: { ...grupa, sportivi: grupa.sportivi || [] },
                            ziua: programItem.ziua,
                            is_recurent: true,
                            sportivi_prezenti_ids: []
                        });
                    }
                });
            });

            // Fetch existing attendance for all relevant trainings
            const trainingIds = combined.map(t => t.id).filter(id => !id.startsWith('recurent-'));
            if (trainingIds.length > 0) {
                 const { data: prezentaData, error: prezentaError } = await supabase
                    .from('prezenta_antrenament')
                    .select('*')
                    .in('antrenament_id', trainingIds);
                if (prezentaData) {
                    prezentaData.forEach(p => {
                        const set = initialAttendance.get(p.antrenament_id) || new Set();
                        set.add(p.sportiv_id);
                        initialAttendance.set(p.antrenament_id, set);
                    });
                }
            }
            
            setTrainings(combined.sort((a, b) => a.ora_start.localeCompare(b.ora_start)));
            setAttendance(initialAttendance);
            setLoading(false);
        };

        fetchTodaysTrainings();
    }, [showError, todayRo]);

    const handleToggle = (antrenamentId: string, sportivId: string) => {
        setAttendance(prev => {
            const next = new Map(prev);
            // FIX: Initialize with an empty array if the key doesn't exist to prevent an error from `new Set(undefined)`.
            const presentSet = new Set(next.get(antrenamentId) || []);
            if (presentSet.has(sportivId)) {
                presentSet.delete(sportivId);
            } else {
                presentSet.add(sportivId);
            }
            next.set(antrenamentId, presentSet);
            return next;
        });
    };

    const handleSave = async (antrenament: TrainingWithGroupAndAthletes) => {
        setSavingStates(prev => ({ ...prev, [antrenament.id]: true }));

        try {
            let antrenamentId = antrenament.id;
            // If it's a recurring template, we must first create a real antrenament instance
            if (antrenament.id.startsWith('recurent-')) {
                const { data, error } = await supabase.from('program_antrenamente').insert({
                    data: antrenament.data,
                    ora_start: antrenament.ora_start,
                    ora_sfarsit: antrenament.ora_sfarsit,
                    grupa_id: antrenament.grupa_id,
                    is_recurent: false,
                }).select('id').single();
                if (error) throw error;
                antrenamentId = data.id;
            }

            const presentSportivIds = Array.from(attendance.get(antrenament.id) || []);
            
            const recordsToUpsert = presentSportivIds.map(sportiv_id => ({
                antrenament_id: antrenamentId,
                sportiv_id,
            }));
            
            // Delete all existing for this training, then insert the new set
            const { error: deleteError } = await supabase.from('prezenta_antrenament').delete().eq('antrenament_id', antrenamentId);
            if (deleteError) throw deleteError;

            if (recordsToUpsert.length > 0) {
                 const { error: upsertError } = await supabase.from('prezenta_antrenament').upsert(recordsToUpsert);
                 if (upsertError) throw upsertError;
            }

            showSuccess("Prezență Salvată!", `Prezența pentru grupa ${antrenament.grupe?.denumire} a fost actualizată.`);
        } catch (err: any) {
            showError("Eroare la Salvare", err.message);
        } finally {
             setSavingStates(prev => ({ ...prev, [antrenament.id]: false }));
        }
    };

    if (loading) {
        return <div className="text-center p-8">Se încarcă antrenamentele de astăzi...</div>;
    }

    return (
        <div className="pb-20">
            <Button onClick={onBack} variant="secondary" className="mb-6">
                <ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu
            </Button>
            <h1 className="text-3xl font-bold text-white mb-2">Prezență Instructor</h1>
            <p className="text-slate-400 mb-6">Antrenamente programate pentru astăzi, <strong>{todayRo}</strong>.</p>
            
            <div className="space-y-6">
                {trainings.length > 0 ? trainings.map(t => (
                    <Card key={t.id}>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-brand-secondary">{t.grupe?.denumire || 'Antrenament Liber'}</h2>
                                <p className="text-slate-400">Ora: {t.ora_start} - {t.ora_sfarsit}</p>
                            </div>
                            <Button onClick={() => handleSave(t)} isLoading={savingStates[t.id]} variant="success">
                                Salvează Lista
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {(t.grupe?.sportivi || []).map(s => {
                                const isPresent = attendance.get(t.id)?.has(s.id);
                                return (
                                <div key={s.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                    <span className="font-medium text-white">{s.nume} {s.prenume}</span>
                                    <Button
                                        onClick={() => handleToggle(t.id, s.id)}
                                        variant={isPresent ? 'success' : 'secondary'}
                                        size="sm"
                                        className="w-28"
                                    >
                                        {isPresent ? <><CheckIcon className="w-4 h-4 mr-2"/> Prezent</> : <><XIcon className="w-4 h-4 mr-2"/> Absent</>}
                                    </Button>
                                </div>
                            )})}
                        </div>
                    </Card>
                )) : (
                     <Card className="text-center py-12">
                        <p className="text-slate-400">Niciun antrenament programat pentru astăzi.</p>
                    </Card>
                )}
            </div>
            <footer className="fixed bottom-0 left-0 lg:left-64 right-0 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700 p-4 text-center">
                 <Button onClick={() => onNavigate('arhiva-prezente')} variant="secondary">
                    <ArchiveBoxIcon className="w-5 h-5 mr-2" /> 📂 Arhivă Prezențe
                </Button>
            </footer>
        </div>
    );
};
