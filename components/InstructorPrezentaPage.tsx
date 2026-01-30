import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Antrenament, Sportiv, Grupa, ProgramItem, User } from '../types';
import { useError } from './ErrorProvider';
import { Card, Button, Select } from './ui';
import { ArrowLeftIcon, ArchiveBoxIcon, UserPlusIcon, XIcon } from './icons';

interface TrainingWithGroupAndAthletes extends Omit<Antrenament, 'grupe'> {
    grupe: (Grupa & { sportivi: Sportiv[] }) | null;
}

interface InstructorPrezentaPageProps {
    onBack: () => void;
    onNavigate: (view: any) => void;
    allClubSportivi: Sportiv[];
    currentUser: User;
}

export const InstructorPrezentaPage: React.FC<InstructorPrezentaPageProps> = ({ onBack, onNavigate, allClubSportivi, currentUser }) => {
    const [trainings, setTrainings] = useState<TrainingWithGroupAndAthletes[]>([]);
    const [attendance, setAttendance] = useState<Map<string, Set<string>>>(new Map()); // Map<antrenamentId, Set<sportivId>>
    const [extraAthletes, setExtraAthletes] = useState<Map<string, string[]>>(new Map()); // antrenamentId -> sportivId[]
    const [selectedExternalSportiv, setSelectedExternalSportiv] = useState<Record<string, string>>({}); // antrenamentId -> sportivId
    const [loading, setLoading] = useState(true);
    const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
    const { showError, showSuccess } = useError();
    const todayRo = useMemo(() => new Date().toLocaleDateString('ro-RO', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase()), []);

    useEffect(() => {
        const fetchTodaysTrainings = async () => {
            setLoading(true);
            const todayISO = new Date().toISOString().split('T')[0];

            if (!supabase) return;

            const { data: userProfile, error: profileError } = await supabase.from('sportivi').select('club_id').eq('user_id', currentUser.user_id).single();
            if (profileError || !userProfile?.club_id) {
                showError("Eroare Profil", "Nu s-a putut determina clubul instructorului. Verificați dacă profilul este corect configurat.");
                setLoading(false);
                return;
            }
            const clubId = userProfile.club_id;
            
            const { data: grupeDataRaw, error: grupeError } = await supabase.from('grupe').select('id').eq('club_id', clubId);
            if(grupeError) { showError("Eroare", grupeError); setLoading(false); return; }
            const grupaIds = (grupeDataRaw || []).map(g => g.id);

            if (grupaIds.length === 0) {
                setTrainings([]);
                setLoading(false);
                return;
            }
            
            // SIMPLIFIED: Fetch all trainings with today's date for the instructor's club.
            // This query fetches the training, its group, the athletes in that group, and the attendance for that training.
            const { data: trainingsData, error: trainingsError } = await supabase
                .from('program_antrenamente')
                .select('*, grupe(*, sportivi(*)), prezenta_antrenament(sportiv_id)')
                .eq('data', todayISO)
                .in('grupa_id', grupaIds);

            if (trainingsError) {
                showError("Eroare la încărcarea antrenamentelor", trainingsError);
                setLoading(false);
                return;
            }

            const initialAttendance = new Map<string, Set<string>>();
            const processedTrainings = (trainingsData || []).map((training: any) => {
                // Normalize nested arrays from Supabase which might be objects if only one result is returned.
                if (training.grupe && training.grupe.sportivi) {
                    const sportiviRaw = training.grupe.sportivi;
                    training.grupe.sportivi = sportiviRaw ? (Array.isArray(sportiviRaw) ? sportiviRaw : [sportiviRaw]) : [];
                }
                const prezentaRaw = training.prezenta_antrenament;
                const prezentaIds = prezentaRaw ? (Array.isArray(prezentaRaw) ? prezentaRaw : [prezentaRaw]).map((p: any) => p.sportiv_id) : [];
                
                initialAttendance.set(training.id, new Set(prezentaIds));
                
                return {
                    ...training,
                    sportivi_prezenti_ids: prezentaIds,
                };
            });
            
            setTrainings(processedTrainings.sort((a, b) => a.ora_start.localeCompare(b.ora_start)));
            setAttendance(initialAttendance);
            setLoading(false);
        };

        fetchTodaysTrainings();
    }, [showError, currentUser.user_id]);

    const handleToggle = (antrenamentId: string, sportivId: string) => {
        setAttendance(prev => {
            const next = new Map(prev);
            // FIX: Explicitly cast return of next.get to resolve 'unknown' iterator error in Set spread.
            const currentSet = (next.get(antrenamentId) || new Set<string>()) as Set<string>;
            const newSet = new Set([...currentSet]);
            if (newSet.has(sportivId)) {
                newSet.delete(sportivId);
            } else {
                newSet.add(sportivId);
            }
            next.set(antrenamentId, newSet);
            return next;
        });
    };
    
    const handleAddExternal = (antrenamentId: string) => {
        const sportivId = selectedExternalSportiv[antrenamentId];
        if (!sportivId) return;
        setExtraAthletes(prev => {
            const next = new Map(prev);
            // FIX: Explicitly cast return of next.get to string[] to resolve 'unknown' property includes error.
            const current = (next.get(antrenamentId) || []) as string[];
            if (!current.includes(sportivId)) {
                next.set(antrenamentId, [...current, sportivId]);
            }
            return next;
        });
        setSelectedExternalSportiv(prev => ({ ...prev, [antrenamentId]: '' }));
    };

    const handleRemoveExternal = (antrenamentId: string, sportivId: string) => {
        setExtraAthletes(prev => {
            const next = new Map(prev);
            // FIX: Explicitly cast return of next.get to string[] to resolve 'unknown' property filter error.
            const current = (next.get(antrenamentId) || []) as string[];
            next.set(antrenamentId, current.filter(id => id !== sportivId));
            return next;
        });
    };

    const handleSave = async (antrenament: TrainingWithGroupAndAthletes) => {
        if (!supabase) return;
        setSavingStates(prev => ({ ...prev, [antrenament.id]: true }));
        try {
            let antrenamentId = antrenament.id;
            if (antrenament.is_recurent && antrenament.id.startsWith('recurent-')) {
                const { data, error } = await supabase.from('program_antrenamente').insert({
                    data: antrenament.data, ora_start: antrenament.ora_start, ora_sfarsit: antrenament.ora_sfarsit,
                    grupa_id: antrenament.grupa_id, is_recurent: false,
                }).select('id').single();
                if (error) throw error;
                antrenamentId = data.id;
            }

            const presentSportivIds = Array.from(attendance.get(antrenament.id) || []);
            
            const { error: deleteError } = await supabase.from('prezenta_antrenament').delete().eq('antrenament_id', antrenamentId);
            if (deleteError) throw deleteError;

            if (presentSportivIds.length > 0) {
                 const { error: upsertError } = await supabase.from('prezenta_antrenament').upsert(presentSportivIds.map(sportiv_id => ({ antrenament_id: antrenamentId, sportiv_id })));
                 if (upsertError) throw upsertError;
            }
            showSuccess("Prezență Salvată!", `Prezența pentru grupa ${antrenament.grupe?.denumire} a fost actualizată.`);
        } catch (err: any) {
            showError("Eroare la Salvare", err.message);
        } finally {
             setSavingStates(prev => ({ ...prev, [antrenament.id]: false }));
        }
    };

    if (loading) return <div className="text-center p-8">Se încarcă antrenamentele de astăzi...</div>;

    return (
        <div className="pb-20">
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            <h1 className="text-3xl font-bold text-white mb-2">Prezență Instructor</h1>
            <p className="text-slate-400 mb-6">Antrenamente programate pentru astăzi, <strong>{todayRo}</strong>.</p>
            
            <div className="space-y-6">
                {trainings.length > 0 ? trainings.map(t => {
                    const groupSportivIds = new Set((t.grupe?.sportivi || []).map(sp => sp.id));
                    const athletesToDisplay = [
                        ...(t.grupe?.sportivi || []),
                        ...(extraAthletes.get(t.id) || []).map(id => allClubSportivi.find(s => s.id === id)).filter((s): s is Sportiv => !!s)
                    ].sort((a,b) => a.nume.localeCompare(b.nume));
                    const allDisplayedSportivIds = new Set(athletesToDisplay.map(s => s.id));
                    const availableExternalSportivi = allClubSportivi.filter(s => !allDisplayedSportivIds.has(s.id));

                    return (
                    <Card key={t.id}>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-brand-secondary">{t.grupe?.denumire || 'Antrenament Liber'}</h2>
                                <p className="text-slate-400">Ora: {t.ora_start} - {t.ora_sfarsit}</p>
                            </div>
                            <Button onClick={() => handleSave(t)} isLoading={savingStates[t.id]} variant="success">Salvează Lista</Button>
                        </div>
                        <div className="space-y-2">
                            {athletesToDisplay.map(s => {
                                const isPresent = attendance.get(t.id)?.has(s.id);
                                const isExternal = !groupSportivIds.has(s.id);
                                return (
                                <label key={s.id} htmlFor={`att-${t.id}-${s.id}`} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isPresent ? 'bg-green-900/30 border-green-700/50' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}`}>
                                    <input id={`att-${t.id}-${s.id}`} type="checkbox" className="h-6 w-6 shrink-0 rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary focus:ring-offset-slate-800"
                                        checked={!!isPresent} onChange={() => handleToggle(t.id, s.id)} />
                                    <span className="font-medium text-white flex-grow">{s.nume} {s.prenume}</span>
                                    {isExternal && <span className="text-xs font-bold bg-sky-500/20 text-sky-400 px-2 py-1 rounded">EXTERN</span>}
                                    <span className={`font-bold text-sm px-2 py-1 rounded-md ${isPresent ? 'text-green-300' : 'text-slate-500'}`}>{isPresent ? 'Prezent' : 'Absent'}</span>
                                    {isExternal && <button type="button" onClick={(e) => { e.preventDefault(); handleRemoveExternal(t.id, s.id); }} className="p-1 text-red-400 hover:text-red-200"><XIcon className="w-4 h-4" /></button>}
                                </label>
                            )})}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <h4 className="text-sm font-bold text-slate-300 mb-2">Adaugă sportiv din afara grupei</h4>
                            <div className="flex gap-2">
                                <Select label="" value={selectedExternalSportiv[t.id] || ''} onChange={e => setSelectedExternalSportiv(p => ({ ...p, [t.id]: e.target.value }))} className="flex-grow">
                                    <option value="">Selectează un sportiv...</option>
                                    {availableExternalSportivi.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
                                </Select>
                                <Button onClick={() => handleAddExternal(t.id)} variant="secondary" disabled={!selectedExternalSportiv[t.id]}><UserPlusIcon className="w-5 h-5 mr-2"/> Adaugă</Button>
                            </div>
                        </div>
                    </Card>
                )}) : (
                     <Card className="text-center py-12"><p className="text-slate-400">Niciun antrenament programat pentru astăzi.</p></Card>
                )}
            </div>
            <footer className="fixed bottom-0 left-0 lg:left-64 right-0 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700 p-4 text-center">
                 <Button onClick={() => onNavigate('arhiva-prezente')} variant="secondary"><ArchiveBoxIcon className="w-5 h-5 mr-2" /> 📂 Arhivă Prezențe</Button>
            </footer>
        </div>
    );
};