import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Antrenament, Sportiv, Grupa, ProgramItem, User } from '../types';
import { useError } from './ErrorProvider';
import { Card, Button, Select } from './ui';
import { ArrowLeftIcon, ArchiveBoxIcon, UserPlusIcon, XIcon } from './icons';

interface TrainingWithGroupAndAthletes extends Omit<Antrenament, 'grupe'> {
    grupe: (Grupa & { sportivi: Sportiv[] }) | null;
}

const getTodayRo = (): ProgramItem['ziua'] => {
    const day = new Date().toLocaleDateString('ro-RO', { weekday: 'long' });
    return (day.charAt(0).toUpperCase() + day.slice(1)) as ProgramItem['ziua'];
};

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
    const todayRo = useMemo(() => getTodayRo(), []);

    useEffect(() => {
        const fetchTodaysTrainings = async () => {
            setLoading(true);
            const todayISO = new Date().toISOString().split('T')[0];

            const { data: userProfile, error: profileError } = await supabase.from('sportivi').select('club_id').eq('user_id', currentUser.user_id).single();
            if (profileError || !userProfile?.club_id) {
                showError("Eroare Profil", "Nu s-a putut determina clubul instructorului. Verificați dacă profilul este corect configurat.");
                setLoading(false);
                return;
            }
            const clubId = userProfile.club_id;
            
            const { data: grupeInClub, error: grupeError } = await supabase.from('grupe').select('id').eq('club_id', clubId);
            if(grupeError) { showError("Eroare", grupeError); setLoading(false); return; }
            const grupaIds = (grupeInClub || []).map(g => g.id);

            const { data: singleTrainings, error: singleError } = await supabase
                .from('program_antrenamente')
                .select('*, grupe(*, sportivi(*))')
                .eq('data', todayISO)
                .in('grupa_id', grupaIds);
            
            if (singleError) { showError("Eroare la încărcarea antrenamentelor", singleError); setLoading(false); return; }

            const { data: recurringTrainingsRaw, error: recurringError } = await supabase
                .from('grupe')
                .select('*, program_antrenamente!inner(*), sportivi(*)')
                .eq('program_antrenamente.ziua', todayRo)
                .in('id', grupaIds);
            
            if (recurringError) { showError("Eroare la încărcarea programului recurent", recurringError); setLoading(false); return; }

            const combined: TrainingWithGroupAndAthletes[] = [...(singleTrainings || []) as TrainingWithGroupAndAthletes[]];
            const initialAttendance = new Map<string, Set<string>>();

// FIX: Normalize recurringTrainingsRaw to an array to prevent iteration errors when Supabase returns a single object.
const recurringTrainings = recurringTrainingsRaw ? (Array.isArray(recurringTrainingsRaw) ? recurringTrainingsRaw : [recurringTrainingsRaw]) : [];

            recurringTrainings.forEach(grupa => {
// FIX: When using `!inner(*)` or `(*)`, Supabase may return a single object instead of an array. This normalizes it to always be an array to prevent iteration errors.
const programItemsRaw: any = grupa.program_antrenamente;
const programItems = programItemsRaw ? (Array.isArray(programItemsRaw) ? programItemsRaw : [programItemsRaw]) : [];
                
// FIX: `sportivi(*)` can also return a single object. This normalizes it to an array.
const sportiviRaw: any = grupa.sportivi;
const sportiviList = sportiviRaw ? (Array.isArray(sportiviRaw) ? sportiviRaw : [sportiviRaw]) : [];

                programItems.forEach((programItem: any) => {
                    const antrenamentId = `recurent-${programItem.id}-${todayISO}`;
                    if (!combined.some(t => t.id === programItem.id && t.data === todayISO)) {
                        combined.push({
                            id: antrenamentId, data: todayISO, ora_start: programItem.ora_start, ora_sfarsit: programItem.ora_sfarsit,
                            grupa_id: grupa.id, grupe: { ...grupa, sportivi: sportiviList }, ziua: programItem.ziua,
                            is_recurent: true, sportivi_prezenti_ids: []
                        });
                    }
                });
            });

            const trainingIds = combined.map(t => t.id).filter(id => !id.startsWith('recurent-'));
            if (trainingIds.length > 0) {
                 const { data: prezentaDataRaw } = await supabase.from('prezenta_antrenament').select('*').in('antrenament_id', trainingIds);
// FIX: Ensure `prezentaData` is an array before iterating to prevent runtime errors when Supabase returns a single object.
                if (prezentaDataRaw) {
                    const prezentaData = Array.isArray(prezentaDataRaw) ? prezentaDataRaw : [prezentaDataRaw];
                    prezentaData.forEach((p: any) => {
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
    }, [showError, todayRo, currentUser.user_id]);

    const handleToggle = (antrenamentId: string, sportivId: string) => {
        setAttendance(prev => {
            const next = new Map(prev);
            const currentSet = next.get(antrenamentId) || new Set<string>();
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
            const current = next.get(antrenamentId) || [];
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
            const current = next.get(antrenamentId) || [];
            next.set(antrenamentId, current.filter(id => id !== sportivId));
            return next;
        });
    };

    const handleSave = async (antrenament: TrainingWithGroupAndAthletes) => {
        setSavingStates(prev => ({ ...prev, [antrenament.id]: true }));
        try {
            let antrenamentId = antrenament.id;
            if (antrenament.id.startsWith('recurent-')) {
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