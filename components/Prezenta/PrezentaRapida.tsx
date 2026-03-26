import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { Card, Button } from '../ui';
import { CheckCircleIcon, CalendarDaysIcon, SparklesIcon, PlusIcon, SearchIcon, XIcon, ChevronDownIcon } from '../icons';
import { useStatusePrezenta } from '../../hooks/useStatusePrezenta';
import { useAttendance } from '../../hooks/useAttendance';
import { useError } from '../ErrorProvider';
import { useData } from '../../contexts/DataContext';

interface AthletePill {
    id: string;
    nume: string;
    prenume: string;
    isPresent: boolean;
    isExtra?: boolean;
    gradNume?: string;
    gradOrdine?: number;
}

interface TrainingSection {
    id: string;
    ora_start: string;
    ora_sfarsit: string;
    grup: string;
    athletes: AthletePill[];
    initialPresent: Set<string>;
    hasSavedData: boolean;
}

type SortBy = 'name' | 'grade';

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

// Modal pentru adăugat sportiv din altă grupă
const AddExternalAthleteModal: React.FC<{
    trainingId: string;
    existingIds: Set<string>;
    onAdd: (athlete: AthletePill) => void;
    onClose: () => void;
}> = ({ trainingId, existingIds, onAdd, onClose }) => {
    const { filteredData, grade } = useData();
    const [search, setSearch] = useState('');

    const candidates = useMemo(() => {
        const q = search.toLowerCase().trim();
        return (filteredData.sportivi || [])
            .filter(s => s.status === 'Activ' && !existingIds.has(s.id))
            .filter(s => !q || `${s.nume} ${s.prenume}`.toLowerCase().includes(q))
            .slice(0, 20);
    }, [filteredData.sportivi, existingIds, search]);

    const gradeById = useMemo(() => Object.fromEntries((grade || []).map(g => [g.id, g])), [grade]);

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h3 className="font-bold text-white text-sm">Adaugă sportiv din altă grupă</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><XIcon className="w-4 h-4" /></button>
                </div>
                <div className="p-4">
                    <div className="relative mb-3">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Caută sportiv..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                        {candidates.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-4 italic">Niciun sportiv găsit.</p>
                        ) : candidates.map(s => {
                            const grad = s.grad_actual_id ? gradeById[s.grad_actual_id] : null;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => {
                                        onAdd({
                                            id: s.id,
                                            nume: s.nume,
                                            prenume: s.prenume,
                                            isPresent: true,
                                            isExtra: true,
                                            gradNume: grad?.nume,
                                            gradOrdine: grad?.ordine,
                                        });
                                        onClose();
                                    }}
                                    className="w-full text-left px-3 py-2.5 rounded-lg bg-slate-800/50 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 text-sm text-slate-200 transition-colors flex items-center justify-between"
                                >
                                    <span className="font-medium">{s.prenume} {s.nume}</span>
                                    {grad && <span className="text-xs text-slate-500 ml-2 shrink-0">{grad.nume}</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PrezentaRapida: React.FC<{ onSelectFull?: (id: string) => void }> = ({ onSelectFull }) => {
    const { prezentId } = useStatusePrezenta();
    const { saveAttendance } = useAttendance();
    const { showError } = useError();
    const { grade } = useData();
    const [sections, setSections] = useState<TrainingSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
    const [addingToTrainingId, setAddingToTrainingId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortBy>('name');

    const gradeById = useMemo(() => Object.fromEntries((grade || []).map(g => [g.id, g])), [grade]);

    const today = new Date().toLocaleDateString('sv-SE');

    const fetchTrainings = useCallback(async () => {
        setLoading(true);
        const [trainingRes, statusRes] = await Promise.all([
            supabase
                .from('program_antrenamente')
                .select('id, ora_start, ora_sfarsit, grupe(denumire, sportivi(id, nume, prenume, status, grad_actual_id)), prezenta:prezenta_antrenament(sportiv_id, status_id)')
                .eq('data', today)
                .order('ora_start'),
            supabase.from('statuse_prezenta').select('id, este_prezent, denumire'),
        ]);
        const { data, error } = trainingRes;
        const statusById: Record<string, { este_prezent: boolean }> = Object.fromEntries(
            (statusRes.data || []).map(s => [s.id, { este_prezent: s.este_prezent }])
        );

        if (error) { showError("Eroare", error.message); setLoading(false); return; }

        const built: TrainingSection[] = (data || []).map(t => {
            const sportivi = ((t.grupe as any)?.sportivi || [])
                .filter((s: any) => s.status === 'Activ')
                .sort((a: any, b: any) => a.nume.localeCompare(b.nume));
            const initialPresent = new Set<string>(
                (t.prezenta || []).filter((p: any) => p.status_id && statusById[p.status_id]?.este_prezent === true).map((p: any) => p.sportiv_id)
            );
            const extraIds = [...initialPresent].filter(id => !sportivi.some((s: any) => s.id === id));
            const extraAthletes: AthletePill[] = extraIds.map(id => ({
                id,
                nume: '...',
                prenume: '(extra)',
                isPresent: true,
                isExtra: true,
            }));

            return {
                id: t.id,
                ora_start: t.ora_start,
                ora_sfarsit: t.ora_sfarsit,
                grup: (t.grupe as any)?.denumire || 'Antrenament',
                athletes: [
                    ...sportivi.map((s: any) => {
                        const grad = s.grad_actual_id ? gradeById[s.grad_actual_id] : null;
                        return {
                            id: s.id,
                            nume: s.nume,
                            prenume: s.prenume,
                            isPresent: initialPresent.has(s.id),
                            gradNume: grad?.nume,
                            gradOrdine: grad?.ordine,
                        };
                    }),
                    ...extraAthletes,
                ],
                initialPresent,
                hasSavedData: (t.prezenta || []).length > 0,
            };
        });

        setSections(built);
        setSavedIds(new Set(built.filter(s => s.hasSavedData).map(s => s.id)));
        setLoading(false);
    }, [today, showError, gradeById]);

    useEffect(() => { fetchTrainings(); }, [fetchTrainings]);

    const toggleAthlete = (trainingId: string, athleteId: string) => {
        setSections(prev => prev.map(s => {
            if (s.id !== trainingId) return s;
            return { ...s, athletes: s.athletes.map(a => a.id === athleteId ? { ...a, isPresent: !a.isPresent } : a) };
        }));
        setSavedIds(prev => { const n = new Set(prev); n.delete(trainingId); return n; });
    };

    const markAll = (trainingId: string, present: boolean) => {
        setSections(prev => prev.map(s => {
            if (s.id !== trainingId) return s;
            return { ...s, athletes: s.athletes.map(a => ({ ...a, isPresent: present })) };
        }));
        setSavedIds(prev => { const n = new Set(prev); n.delete(trainingId); return n; });
    };

    const addExternalAthlete = (trainingId: string, athlete: AthletePill) => {
        setSections(prev => prev.map(s => {
            if (s.id !== trainingId) return s;
            if (s.athletes.some(a => a.id === athlete.id)) return s;
            return { ...s, athletes: [...s.athletes, athlete] };
        }));
        setSavedIds(prev => { const n = new Set(prev); n.delete(trainingId); return n; });
    };

    const handleSave = async (trainingId: string) => {
        if (!prezentId) return;
        const section = sections.find(s => s.id === trainingId);
        if (!section) return;

        setSavingId(trainingId);
        const allSportivIds = section.athletes.map(a => a.id);
        const records = section.athletes
            .filter(a => a.isPresent)
            .map(a => ({ sportiv_id: a.id, status_id: prezentId }));
        const ok = await saveAttendance(trainingId, records, allSportivIds);
        if (ok) setSavedIds(prev => new Set(prev).add(trainingId));
        setSavingId(null);
    };

    const sortAthletes = useCallback((athletes: AthletePill[]) => {
        return [...athletes].sort((a, b) => {
            if (sortBy === 'grade') {
                const oa = a.gradOrdine ?? 9999;
                const ob = b.gradOrdine ?? 9999;
                if (oa !== ob) return oa - ob;
            }
            return `${a.nume} ${a.prenume}`.localeCompare(`${b.nume} ${b.prenume}`);
        });
    }, [sortBy]);

    if (loading) return (
        <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
    );

    if (sections.length === 0) return (
        <Card className="text-center py-16">
            <CalendarDaysIcon className="w-12 h-12 text-slate-700 mx-auto mb-3 opacity-30" />
            <p className="text-slate-400 italic">Niciun antrenament programat pentru astăzi.</p>
        </Card>
    );

    return (
        <div className="space-y-4">
            {/* Controls row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-amber-400 shrink-0" />
                    <p className="text-xs text-slate-400">Apasă pe un sportiv pentru a comuta prezența.</p>
                </div>
                <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-0.5 border border-slate-700/50">
                    <button
                        onClick={() => setSortBy('name')}
                        className={`text-xs px-2.5 py-1 rounded-md transition-colors font-medium ${sortBy === 'name' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Nume
                    </button>
                    <button
                        onClick={() => setSortBy('grade')}
                        className={`text-xs px-2.5 py-1 rounded-md transition-colors font-medium ${sortBy === 'grade' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Grad
                    </button>
                </div>
            </div>

            {sections.map(section => {
                const sortedAthletes = sortAthletes(section.athletes);
                const presentCount = section.athletes.filter(a => a.isPresent).length;
                const isSaved = savedIds.has(section.id);
                const isSaving = savingId === section.id;
                const pct = section.athletes.length > 0 ? Math.round((presentCount / section.athletes.length) * 100) : 0;
                const existingIds = new Set(section.athletes.map(a => a.id));

                return (
                    <Card key={section.id} className={`transition-all duration-300 !p-0 overflow-hidden ${isSaved ? 'ring-1 ring-emerald-500/40' : ''}`}>
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-white">{section.grup}</h3>
                                <p className="text-xs text-slate-500">{section.ora_start} – {section.ora_sfarsit}</p>
                            </div>
                            <div className="text-right">
                                <span className={`text-xl font-black ${presentCount > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>{presentCount}</span>
                                <span className="text-slate-500 text-xs">/{section.athletes.length}</span>
                                {section.athletes.length > 0 && (
                                    <div className="w-16 h-1.5 bg-slate-800 rounded-full mt-1 ml-auto">
                                        <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick mark all */}
                        <div className="flex gap-2 px-4 pb-3">
                            <button
                                onClick={() => markAll(section.id, true)}
                                className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors font-medium"
                            >
                                Toți prezenți
                            </button>
                            <button
                                onClick={() => markAll(section.id, false)}
                                className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors font-medium"
                            >
                                Toți absenți
                            </button>
                            <button
                                onClick={() => setAddingToTrainingId(section.id)}
                                className="ml-auto text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors font-medium flex items-center gap-1"
                            >
                                <PlusIcon className="w-3 h-3" /> Alt sportiv
                            </button>
                        </div>

                        {/* Athlete list — tabular */}
                        {section.athletes.length === 0 ? (
                            <p className="text-sm text-slate-500 italic px-4 pb-4">Niciun sportiv activ în această grupă.</p>
                        ) : (
                            <div className="border-t border-slate-800/60">
                                {/* Column headers */}
                                <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-800/30">
                                    <span className="w-5 shrink-0" />
                                    <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Sportiv</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 w-28 text-right shrink-0">Grad</span>
                                </div>
                                <div className="divide-y divide-slate-800/40">
                                    {sortedAthletes.map(a => (
                                        <button
                                            key={a.id}
                                            onClick={() => toggleAthlete(section.id, a.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors select-none active:scale-[0.99] ${
                                                a.isPresent ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-slate-800/40'
                                            }`}
                                        >
                                            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                                a.isPresent
                                                    ? 'bg-emerald-500 border-emerald-500'
                                                    : 'border-slate-600 bg-transparent'
                                            }`}>
                                                {a.isPresent && <CheckIcon className="w-3 h-3 text-white" />}
                                            </span>
                                            <span className={`flex-1 text-sm font-medium transition-colors ${a.isPresent ? 'text-white' : 'text-slate-400'}`}>
                                                {a.prenume} {a.nume}
                                                {a.isExtra && <span className="ml-1.5 text-[10px] text-slate-500 font-normal">↗ extern</span>}
                                            </span>
                                            <span className="text-xs text-slate-500 w-28 text-right shrink-0 truncate">
                                                {a.gradNume || <span className="text-slate-700">—</span>}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex gap-2 items-center p-4 pt-3 border-t border-slate-800">
                            <Button
                                onClick={() => handleSave(section.id)}
                                isLoading={isSaving}
                                variant={isSaved ? 'secondary' : 'success'}
                                className="flex-1"
                                disabled={isSaving || section.athletes.length === 0}
                            >
                                {isSaved
                                    ? <><CheckCircleIcon className="w-4 h-4 mr-1.5" /> Salvat</>
                                    : 'Salvează Prezența'}
                            </Button>
                            {onSelectFull && (
                                <button
                                    onClick={() => onSelectFull(section.id)}
                                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors shrink-0 px-2"
                                >
                                    Complet →
                                </button>
                            )}
                        </div>
                    </Card>
                );
            })}

            {addingToTrainingId && (
                <AddExternalAthleteModal
                    trainingId={addingToTrainingId}
                    existingIds={new Set(sections.find(s => s.id === addingToTrainingId)?.athletes.map(a => a.id) || [])}
                    onAdd={(athlete) => addExternalAthlete(addingToTrainingId, athlete)}
                    onClose={() => setAddingToTrainingId(null)}
                />
            )}
        </div>
    );
};
