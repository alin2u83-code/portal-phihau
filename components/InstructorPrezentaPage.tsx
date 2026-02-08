import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Antrenament, Sportiv, Grupa, User, View, Grad, SportivProgramPersonalizat } from '../types';
import { useError } from './ErrorProvider';
import { Card, Button, Select } from './ui';
import { ArrowLeftIcon, UserPlusIcon, XIcon } from './icons';
import { GradBadge, getGradBorderColor } from '../utils/grades';

interface TrainingWithGroupAndAthletes extends Omit<Antrenament, 'grupe' | 'prezenta'> {
    grupe: (Grupa & { sportivi: Sportiv[] }) | null;
    prezenta: { sportiv_id: string, status: string | null }[];
}

interface AthleteRowProps {
    sportiv: Sportiv;
    isPresent: boolean;
    onToggle: (sportivId: string) => void;
    isExtra: boolean;
    onRemove?: (sportivId: string) => void;
    grade: Grad | null | undefined;
}

const AthleteRow: React.FC<AthleteRowProps> = ({ sportiv, isPresent, onToggle, isExtra, onRemove, grade }) => {
    const borderColor = getGradBorderColor(grade?.nume || '');

    return (
        <tr className={`transition-all duration-200 ${isPresent ? 'bg-green-900/30' : 'bg-red-900/20'}`}>
            <td className={`pl-2 py-2 border-l-4 ${borderColor}`}>
                <input
                    id={`att-${sportiv.id}`}
                    type="checkbox"
                    className="h-5 w-5 shrink-0 rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary focus:ring-offset-slate-800"
                    checked={isPresent}
                    onChange={() => onToggle(sportiv.id)}
                />
            </td>
            <td className="py-2">
                <label htmlFor={`att-${sportiv.id}`} className="font-medium cursor-pointer">{sportiv.nume} {sportiv.prenume}</label>
            </td>
            <td className="py-2 text-right">
                <GradBadge grad={grade} className="text-[10px] !font-bold" />
            </td>
            <td className="pr-2 py-2 w-10">
                {isExtra && onRemove && (
                    <Button size="sm" variant="danger" onClick={() => onRemove && onRemove(sportiv.id)} className="!p-1.5 h-auto">
                        <XIcon className="w-4 h-4" />
                    </Button>
                )}
            </td>
        </tr>
    );
};

interface TrainingCardProps {
    training: TrainingWithGroupAndAthletes;
    allClubSportivi: Sportiv[];
    onSave: (trainingId: string, presentIds: Set<string>) => Promise<void>;
    grade: Grad[];
}

const TrainingCard: React.FC<TrainingCardProps> = ({ training, allClubSportivi, onSave, grade }) => {
    const [initialPresentIds, setInitialPresentIds] = useState(new Set<string>());
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
    const [extraAthleteIds, setExtraAthleteIds] = useState<Set<string>>(new Set());
    
    useEffect(() => {
        const initialIds = new Set(training.prezenta.filter(p => p.status === 'prezent').map(p => p.sportiv_id));
        setInitialPresentIds(initialIds);
        setPresentIds(initialIds);

        const groupIds = new Set(training.grupe?.sportivi.map(s => s.id) || []);
        const extras = new Set(Array.from(initialIds).filter(id => !groupIds.has(id)));
        setExtraAthleteIds(extras);
    }, [training]);

    const [selectedExternalId, setSelectedExternalId] = useState('');
    const [saving, setSaving] = useState(false);

    const groupAthletes = useMemo(() => training.grupe?.sportivi || [], [training.grupe]);
    const extraAthletes = useMemo(() => allClubSportivi.filter(s => extraAthleteIds.has(s.id)), [allClubSportivi, extraAthleteIds]);

    const availableExternalSportivi = useMemo(() => {
        const currentIds = new Set([...groupAthletes.map(s => s.id), ...extraAthleteIds]);
        return allClubSportivi.filter(s => s.status === 'Activ' && !currentIds.has(s.id));
    }, [allClubSportivi, groupAthletes, extraAthleteIds]);

    const hasChanges = useMemo(() => {
        if (initialPresentIds.size !== presentIds.size) return true;
        for (const id of initialPresentIds) {
            if (!presentIds.has(id)) return true;
        }
        for (const id of presentIds) {
            if (!initialPresentIds.has(id)) return true;
        }
        return false;
    }, [initialPresentIds, presentIds]);

    const handleToggle = (sportivId: string) => {
        setPresentIds(prev => {
            const next = new Set(prev);
            if (next.has(sportivId)) next.delete(sportivId);
            else next.add(sportivId);
            return next;
        });
    };

    const handleAddExtra = () => {
        if (!selectedExternalId) return;
        setExtraAthleteIds(prev => new Set(prev).add(selectedExternalId));
        setPresentIds(prev => new Set(prev).add(selectedExternalId)); // Mark as present by default
        setSelectedExternalId('');
    };

    const handleRemoveExtra = (sportivId: string) => {
        setExtraAthleteIds(prev => { const next = new Set(prev); next.delete(sportivId); return next; });
        setPresentIds(prev => { const next = new Set(prev); next.delete(sportivId); return next; });
    };

    const handleSaveClick = async () => {
        setSaving(true);
        await onSave(training.id, presentIds);
        setSaving(false);
    };

    return (
        <Card className="flex flex-col">
            <h3 className="text-xl font-bold text-white">{training.grupe?.denumire || 'Antrenament Liber'}</h3>
            <p className="text-sm text-slate-400 mb-4">{training.ora_start} - {training.ora_sfarsit}</p>
            
            <div className="flex-grow max-h-96 overflow-y-auto pr-2">
                <table className="w-full text-sm border-separate border-spacing-y-1">
                    <tbody>
                        {groupAthletes.map(s => <AthleteRow key={s.id} sportiv={s} isPresent={presentIds.has(s.id)} onToggle={handleToggle} isExtra={false} grade={grade.find(g => g.id === s.grad_actual_id)} />)}
                        {extraAthletes.length > 0 && (
                            <>
                                <tr><td colSpan={4} className="pt-2 mt-2 border-t border-slate-700"><h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Participanți Externi</h4></td></tr>
                                {extraAthletes.map(s => <AthleteRow key={s.id} sportiv={s} isPresent={presentIds.has(s.id)} onToggle={handleToggle} isExtra={true} onRemove={handleRemoveExtra} grade={grade.find(g => g.id === s.grad_actual_id)} />)}
                            </>
                        )}
                    </tbody>
                </table>
                 {groupAthletes.length === 0 && extraAthletes.length === 0 && (
                    <p className="text-slate-400 italic text-center py-4">Niciun sportiv de afișat.</p>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                <div className="flex items-end gap-2">
                    <Select label="Adaugă sportiv din altă grupă" value={selectedExternalId} onChange={e => setSelectedExternalId(e.target.value)} className="flex-grow">
                        <option value="">Alege...</option>
                        {availableExternalSportivi.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
                    </Select>
                    <Button onClick={handleAddExtra} disabled={!selectedExternalId} variant="secondary" className="h-[34px]"><UserPlusIcon className="w-4 h-4"/></Button>
                </div>
                {hasChanges && (
                    <Button onClick={handleSaveClick} isLoading={saving} className="w-full" variant="success">Salvează Prezența</Button>
                )}
            </div>
        </Card>
    );
};

interface InstructorPrezentaPageProps {
    onBack: () => void;
    onNavigate: (view: any) => void;
    allClubSportivi: Sportiv[];
    currentUser: User;
    grade: Grad[];
}

export const InstructorPrezentaPage: React.FC<InstructorPrezentaPageProps> = ({ onBack, onNavigate, allClubSportivi, currentUser, grade }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [trainings, setTrainings] = useState<TrainingWithGroupAndAthletes[]>([]);
    const [loading, setLoading] = useState(true);
    const { showError, showSuccess } = useError();
    const today = useMemo(() => new Date(), []);
    const yesterday = useMemo(() => new Date(Date.now() - 86400000), []);

    const selectedDateString = useMemo(() => selectedDate.toISOString().split('T')[0], [selectedDate]);

    useEffect(() => {
        const fetchTodaysTrainings = async () => {
            if (!supabase) {
                showError("Eroare Configurare", "Clientul Supabase nu a fost găsit.");
                setLoading(false);
                return;
            }
            setLoading(true);
            const { data, error } = await supabase
                .from('program_antrenamente')
                .select('*, grupe(*, sportivi(id, nume, prenume, status, grad_actual_id)), prezenta:prezenta_antrenament(sportiv_id, status)')
                .eq('data', selectedDateString);

            if (error) {
                showError("Eroare la încărcarea antrenamentelor", error.message);
                setLoading(false);
                return;
            }

            const processedTrainings = (data || []).map(t => ({
                ...t,
                prezenta: t.prezenta as { sportiv_id: string, status: string | null }[],
                grupe: t.grupe ? {
                    ...t.grupe,
                    sportivi: (t.grupe.sportivi || []).filter((s: Sportiv) => s.status === 'Activ').sort((a: Sportiv, b: Sportiv) => a.nume.localeCompare(b.nume))
                } : null
            }));
            setTrainings(processedTrainings.sort((a, b) => a.ora_start.localeCompare(b.ora_start)) as TrainingWithGroupAndAthletes[]);
            setLoading(false);
        };
        fetchTodaysTrainings();
    }, [selectedDateString, showError]);
    
    const handleSave = async (antrenamentId: string, uiPresentIds: Set<string>) => {
        if (!supabase) return;
        
        try {
            const training = trainings.find(t => t.id === antrenamentId);
            if (!training) throw new Error("Antrenament negăsit.");

            const { data: dbPresence, error: fetchError } = await supabase.from('prezenta_antrenament').select('sportiv_id, status').eq('antrenament_id', antrenamentId);
            if (fetchError) throw fetchError;
            
            const allInvolvedIds = new Set([
                ...(training.grupe?.sportivi.map(s => s.id) || []),
                ...dbPresence.map(p => p.sportiv_id)
            ]);
            
            const recordsToUpsert = Array.from(allInvolvedIds).map(sportivId => ({
                antrenament_id: antrenamentId,
                sportiv_id: sportivId,
                status: uiPresentIds.has(sportivId) ? 'prezent' : 'absent'
            }));

            if (recordsToUpsert.length > 0) {
                const { error } = await supabase.from('prezenta_antrenament').upsert(recordsToUpsert, { onConflict: 'antrenament_id, sportiv_id' });
                if (error) throw error;
            }
            
            setTrainings(prev => prev.map(t => t.id === antrenamentId ? { 
                ...t, 
                prezenta: recordsToUpsert.map(({ sportiv_id, status }) => ({ sportiv_id, status }))
            } : t));
            showSuccess("Succes", "Prezența a fost salvată!");

        } catch (err: unknown) {
            // FIX: In `handleSave`, cast the `unknown` error type to `Error` and access its `message` property before passing it to `showError` to fix the TypeScript error.
            showError("Eroare la salvarea prezenței", err instanceof Error ? err.message : String(err));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
                <h1 className="text-3xl font-bold text-white">Prezență Zilnică</h1>
            </div>
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="font-bold text-white text-lg">Afișare prezență pentru:</p>
                    <div className="flex gap-2">
                        <Button variant={selectedDateString === yesterday.toISOString().split('T')[0] ? 'primary' : 'secondary'} onClick={() => setSelectedDate(yesterday)}>Ieri</Button>
                        <Button variant={selectedDateString === today.toISOString().split('T')[0] ? 'primary' : 'secondary'} onClick={() => setSelectedDate(today)}>Azi</Button>
                    </div>
                </div>
            </Card>

            {loading ? (
                <div className="text-center p-8">Se încarcă antrenamentele...</div>
            ) : trainings.length === 0 ? (
                <Card className="text-center p-8">
                    <p className="text-slate-400 italic">Niciun antrenament programat pentru data selectată.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trainings.map(t => (
                        <TrainingCard
                            key={t.id}
                            training={t}
                            allClubSportivi={allClubSportivi}
                            onSave={handleSave}
                            grade={grade}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};