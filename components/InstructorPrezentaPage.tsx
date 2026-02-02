import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Antrenament, Sportiv, Grupa, User, View, Grad } from '../types';
import { useError } from './ErrorProvider';
import { Card, Button, Select } from './ui';
import { ArrowLeftIcon, UserPlusIcon, XIcon } from './icons';
import { GradBadge, getGradBorderColor } from '../utils/grades';

interface TrainingWithGroupAndAthletes extends Omit<Antrenament, 'grupe' | 'prezenta'> {
    grupe: (Grupa & { sportivi: Sportiv[] }) | null;
    prezenta: { sportiv_id: string }[];
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
        <div className={`flex items-center gap-3 p-2 rounded-md transition-all duration-200 border-l-4 ${borderColor} ${isPresent ? 'bg-green-900/40' : 'bg-slate-800/50 opacity-80 hover:opacity-100'}`}>
            <input
                id={`att-${sportiv.id}`}
                type="checkbox"
                className="h-5 w-5 shrink-0 rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary focus:ring-offset-slate-800"
                checked={isPresent}
                onChange={() => onToggle(sportiv.id)}
            />
            <label htmlFor={`att-${sportiv.id}`} className="flex-grow font-medium cursor-pointer">{sportiv.nume} {sportiv.prenume}</label>
            <GradBadge grad={grade} className="text-[10px] !font-bold" />
            {isExtra && onRemove && (
                <Button size="sm" variant="danger" onClick={() => onRemove(sportiv.id)} className="!p-1.5 h-auto">
                    <XIcon className="w-4 h-4" />
                </Button>
            )}
        </div>
    );
};


interface TrainingCardProps {
    training: TrainingWithGroupAndAthletes;
    allClubSportivi: Sportiv[];
    initialPresentIds: Set<string>;
    onSave: (trainingId: string, presentIds: Set<string>, extraIds: Set<string>) => Promise<void>;
    grade: Grad[];
}

const TrainingCard: React.FC<TrainingCardProps> = ({ training, allClubSportivi, initialPresentIds, onSave, grade }) => {
    const [presentIds, setPresentIds] = useState<Set<string>>(initialPresentIds);
    const [extraAthleteIds, setExtraAthleteIds] = useState<Set<string>>(() => {
        const groupIds = new Set(training.grupe?.sportivi.map(s => s.id) || []);
        return new Set(Array.from(initialPresentIds).filter(id => !groupIds.has(id)));
    });
    const [selectedExternalId, setSelectedExternalId] = useState('');
    const [saving, setSaving] = useState(false);

    const groupAthletes = useMemo(() => training.grupe?.sportivi || [], [training.grupe]);
    const extraAthletes = useMemo(() => allClubSportivi.filter(s => extraAthleteIds.has(s.id)), [allClubSportivi, extraAthleteIds]);

    const availableExternalSportivi = useMemo(() => {
        const currentIds = new Set([...groupAthletes.map(s => s.id), ...extraAthleteIds]);
        return allClubSportivi.filter(s => s.status === 'Activ' && !currentIds.has(s.id));
    }, [allClubSportivi, groupAthletes, extraAthleteIds]);

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
        await onSave(training.id, presentIds, extraAthleteIds);
        setSaving(false);
    };

    return (
        <Card className="flex flex-col">
            <h3 className="text-xl font-bold text-white">{training.grupe?.denumire || 'Antrenament Liber'}</h3>
            <p className="text-sm text-slate-400 mb-4">{training.ora_start} - {training.ora_sfarsit}</p>
            
            <div className="space-y-2 flex-grow max-h-96 overflow-y-auto pr-2">
                {groupAthletes.map(s => <AthleteRow key={s.id} sportiv={s} isPresent={presentIds.has(s.id)} onToggle={handleToggle} isExtra={false} grade={grade.find(g => g.id === s.grad_actual_id)} />)}
                {extraAthletes.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-slate-700">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Participanți Externi</h4>
                        {extraAthletes.map(s => <AthleteRow key={s.id} sportiv={s} isPresent={presentIds.has(s.id)} onToggle={handleToggle} isExtra={true} onRemove={handleRemoveExtra} grade={grade.find(g => g.id === s.grad_actual_id)} />)}
                    </div>
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
                <Button onClick={handleSaveClick} isLoading={saving} className="w-full" variant="success">Salvează Prezența</Button>
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
                .select('*, grupe(*, sportivi(id, nume, prenume, status, grad_actual_id)), prezenta:prezenta_antrenament(sportiv_id)')
                .eq('data', selectedDateString);

            if (error) {
                showError("Eroare la încărcarea antrenamentelor", error);
                setLoading(false);
                return;
            }

            const processedTrainings = (data || []).map(t => {
                const { prezenta, ...rest } = t;
                return {
                    ...rest,
                    prezenta: prezenta as { sportiv_id: string }[],
                    grupe: t.grupe ? {
                        ...t.grupe,
                        sportivi: (t.grupe.sportivi || []).filter((s: Sportiv) => s.status === 'Activ')
                    } : null
                };
            });
            setTrainings(processedTrainings.sort((a,b) => a.ora_start.localeCompare(b.ora_start)) as TrainingWithGroupAndAthletes[]);
            setLoading(false);
        };
        fetchTodaysTrainings();
    }, [selectedDateString, showError]);
    
    const handleSave = async (antrenamentId: string, uiPresentIds: Set<string>, uiExtraIds: Set<string>) => {
        if (!supabase) return;
        
        try {
            const training = trainings.find(t => t.id === antrenamentId);
            if (!training) throw new Error("Antrenament negăsit.");

            const { data: dbPresence, error: fetchError } = await supabase.from('prezenta_antrenament').select('sportiv_id').eq('antrenament_id', antrenamentId);
            if (fetchError) throw fetchError;
            
            const dbPresentIds = new Set(dbPresence.map(p => p.sportiv_id));
            
            const toInsert = [...uiPresentIds].filter(id => !dbPresentIds.has(id));
            const toDelete = [...dbPresentIds].filter(id => !uiPresentIds.has(id));

            if (toDelete.length > 0) {
                const { error } = await supabase.from('prezenta_antrenament').delete().eq('antrenament_id', antrenamentId).in('sportiv_id', toDelete);
                if (error) throw error;
            }
            if (toInsert.length > 0) {
                const { error } = await supabase.from('prezenta_antrenament').insert(toInsert.map(sportiv_id => ({ antrenament_id: antrenamentId, sportiv_id })));
                if (error) throw error;
            }
            
            // Update local state for immediate feedback
            setTrainings(prev => prev.map(t => t.id === antrenamentId ? { ...t, prezenta: Array.from(uiPresentIds).map(sportiv_id => ({ sportiv_id }))} : t));
            showSuccess("Succes", "Prezența a fost salvată!");

        } catch (err: unknown) {
            // In `handleSave`, cast the `unknown` error type to `Error` and access its `message` property before passing it to `showError` to fix the TypeScript error.
            showError("Eroare la salvarea prezenței", (err as Error)?.message || String(err));
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
                            initialPresentIds={new Set(t.prezenta.map(p => p.sportiv_id))}
                            onSave={handleSave}
                            grade={grade}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};