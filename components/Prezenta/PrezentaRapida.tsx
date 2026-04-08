import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Card, Button } from '../ui';
import { CheckCircleIcon, CalendarDaysIcon, SparklesIcon, PlusIcon, SearchIcon, XIcon, ChevronDownIcon } from '../icons';
import { useStatusePrezenta } from '../../hooks/useStatusePrezenta';
import { useAttendance } from '../../hooks/useAttendance';
import { useError } from '../ErrorProvider';
import { useData } from '../../contexts/DataContext';
import { formatTime } from '../../utils/date';

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

type SortBy = 'nume' | 'prenume' | 'grade';

interface UnsavedWarning {
    sectionId: string;
    sectionName: string;
    onContinue: () => void;
}

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const ChevronUpIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
    </svg>
);

// Dialog avertisment modificari nesalvate
const UnsavedWarningDialog: React.FC<{
    warning: UnsavedWarning;
    onGoToSave: () => void;
    onDismiss: () => void;
}> = ({ warning, onGoToSave, onDismiss }) => (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-5">
                <div className="flex items-start gap-3 mb-4">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm mb-1">Modificari nesalvate</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Ai modificari nesalvate la grupa <span className="text-amber-300 font-semibold">{warning.sectionName}</span>. Salveaza inainte de a continua.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={onGoToSave}
                        className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm rounded-xl transition-colors"
                    >
                        Du-ma la salvare
                    </button>
                    <button
                        onClick={onDismiss}
                        className="w-full py-2 px-4 text-slate-400 hover:text-slate-200 text-sm transition-colors"
                    >
                        Continua fara a salva
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// Modal pentru adaugat sportiv din alta grupa
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
                    <h3 className="font-bold text-white text-sm">Adauga sportiv din alta grupa</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><XIcon className="w-4 h-4" /></button>
                </div>
                <div className="p-4">
                    <div className="relative mb-3">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Cauta sportiv..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                        {candidates.length === 0 ? (
                            <p className="text-slate-500 text-sm text-center py-4 italic">Niciun sportiv gasit.</p>
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
                                    <span className="font-medium">{s.nume} {s.prenume}</span>
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
    const [sortBy, setSortBy] = useState<SortBy>('nume');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    // Stare collapse/expand per sectiune: cheia = id sectiune, valoarea = true (expandat)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    // Sectiunile cu modificari nesalvate (fata de initialPresent)
    const [unsavedSectionIds, setUnsavedSectionIds] = useState<Set<string>>(new Set());
    // Dialog avertisment
    const [warningDialog, setWarningDialog] = useState<UnsavedWarning | null>(null);
    // Ref-uri pentru butoanele de salvare (pentru scroll + highlight)
    const saveButtonRefs = useRef<Record<string, HTMLDivElement | null>>({});
    // Sectiune cu buton highlight activ
    const [highlightedSaveId, setHighlightedSaveId] = useState<string | null>(null);

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

        const seen = new Set<string>();
        const deduped = (data || []).filter(t => {
            const key = `${t.grupe ? (t.grupe as any).denumire : ''}_${t.ora_start}_${t.ora_sfarsit}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        const built: TrainingSection[] = deduped.map(t => {
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
        setUnsavedSectionIds(new Set());

        // Prima sectiune expandata, restul colapsate
        if (built.length > 0) {
            setExpandedIds(new Set([built[0].id]));
        }

        setLoading(false);
    }, [today, showError, gradeById]);

    useEffect(() => { fetchTrainings(); }, [fetchTrainings]);

    // Verifica daca o sectiune are modificari fata de starea initiala
    const hasUnsavedChanges = useCallback((section: TrainingSection): boolean => {
        const currentPresent = new Set(section.athletes.filter(a => a.isPresent).map(a => a.id));
        if (currentPresent.size !== section.initialPresent.size) return true;
        for (const id of currentPresent) {
            if (!section.initialPresent.has(id)) return true;
        }
        return false;
    }, []);

    // Gestioneaza expand/collapse cu verificare modificari nesalvate
    const handleToggleExpand = (targetSectionId: string) => {
        // Daca sectiunea e deja expandata, o colapsam direct (fara avertisment)
        if (expandedIds.has(targetSectionId)) {
            setExpandedIds(prev => {
                const next = new Set(prev);
                next.delete(targetSectionId);
                return next;
            });
            return;
        }

        // Cauta o sectiune expandata cu modificari nesalvate
        const unsavedExpanded = sections.find(s =>
            expandedIds.has(s.id) && unsavedSectionIds.has(s.id)
        );

        if (unsavedExpanded) {
            setWarningDialog({
                sectionId: unsavedExpanded.id,
                sectionName: unsavedExpanded.grup,
                onContinue: () => {
                    setWarningDialog(null);
                    setExpandedIds(prev => {
                        const next = new Set(prev);
                        next.add(targetSectionId);
                        return next;
                    });
                },
            });
            return;
        }

        setExpandedIds(prev => {
            const next = new Set(prev);
            next.add(targetSectionId);
            return next;
        });
    };

    const scrollToSaveButton = (sectionId: string) => {
        setWarningDialog(null);
        const el = saveButtonRefs.current[sectionId];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedSaveId(sectionId);
            setTimeout(() => setHighlightedSaveId(null), 2800);
        }
        // Asigura ca sectiunea e expandata
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.add(sectionId);
            return next;
        });
    };

    const toggleAthlete = (trainingId: string, athleteId: string) => {
        setSections(prev => prev.map(s => {
            if (s.id !== trainingId) return s;
            return { ...s, athletes: s.athletes.map(a => a.id === athleteId ? { ...a, isPresent: !a.isPresent } : a) };
        }));
        setSavedIds(prev => { const n = new Set(prev); n.delete(trainingId); return n; });
        // Marcheaza ca are modificari nesalvate
        setUnsavedSectionIds(prev => new Set(prev).add(trainingId));
    };

    const markAll = (trainingId: string, present: boolean) => {
        setSections(prev => prev.map(s => {
            if (s.id !== trainingId) return s;
            return { ...s, athletes: s.athletes.map(a => ({ ...a, isPresent: present })) };
        }));
        setSavedIds(prev => { const n = new Set(prev); n.delete(trainingId); return n; });
        setUnsavedSectionIds(prev => new Set(prev).add(trainingId));
    };

    const addExternalAthlete = (trainingId: string, athlete: AthletePill) => {
        setSections(prev => prev.map(s => {
            if (s.id !== trainingId) return s;
            if (s.athletes.some(a => a.id === athlete.id)) return s;
            return { ...s, athletes: [...s.athletes, athlete] };
        }));
        setSavedIds(prev => { const n = new Set(prev); n.delete(trainingId); return n; });
        setUnsavedSectionIds(prev => new Set(prev).add(trainingId));
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
        if (ok) {
            setSavedIds(prev => new Set(prev).add(trainingId));
            setUnsavedSectionIds(prev => {
                const next = new Set(prev);
                next.delete(trainingId);
                return next;
            });
            // Actualizeaza initialPresent pentru sectiunea salvata
            setSections(prev => prev.map(s => {
                if (s.id !== trainingId) return s;
                return {
                    ...s,
                    initialPresent: new Set(s.athletes.filter(a => a.isPresent).map(a => a.id)),
                    hasSavedData: true,
                };
            }));
        }
        setSavingId(null);
    };

    const sortAthletes = useCallback((athletes: AthletePill[]) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        return [...athletes].sort((a, b) => {
            let cmp = 0;
            if (sortBy === 'grade') {
                const oa = a.gradOrdine ?? 9999;
                const ob = b.gradOrdine ?? 9999;
                cmp = oa !== ob ? oa - ob : a.nume.localeCompare(b.nume);
            } else if (sortBy === 'prenume') {
                cmp = a.prenume.localeCompare(b.prenume) || a.nume.localeCompare(b.nume);
            } else {
                cmp = a.nume.localeCompare(b.nume) || a.prenume.localeCompare(b.prenume);
            }
            return cmp * dir;
        });
    }, [sortBy, sortDir]);

    if (loading) return (
        <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
    );

    if (sections.length === 0) return (
        <Card className="text-center py-16">
            <CalendarDaysIcon className="w-12 h-12 text-slate-700 mx-auto mb-3 opacity-30" />
            <p className="text-slate-400 italic">Niciun antrenament programat pentru astazi.</p>
        </Card>
    );

    return (
        <div className="space-y-3">
            {/* Style pentru animatia pulse la butonul de salvare */}
            <style>{`
                @keyframes saveHighlight {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
                    25% { box-shadow: 0 0 0 6px rgba(251, 191, 36, 0.35); }
                    50% { box-shadow: 0 0 0 12px rgba(251, 191, 36, 0.15); }
                    75% { box-shadow: 0 0 0 6px rgba(251, 191, 36, 0.25); }
                }
                .save-highlight-pulse {
                    animation: saveHighlight 0.7s ease-in-out 4;
                }
            `}</style>

            {/* Controls row */}
            <div data-tour="prezenta-data" className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-amber-400 shrink-0" />
                    <p className="text-xs text-slate-400">Apasa pe un sportiv pentru a comuta prezenta.</p>
                </div>
                <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-0.5 border border-slate-700/50">
                        {(['nume', 'prenume', 'grade'] as SortBy[]).map(opt => (
                            <button
                                key={opt}
                                onClick={() => setSortBy(opt)}
                                className={`text-xs px-2.5 py-1 rounded-md transition-colors font-medium ${sortBy === opt ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                {opt === 'nume' ? 'Nume' : opt === 'prenume' ? 'Prenume' : 'Grad'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                        className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-amber-300 transition-colors"
                        title={sortDir === 'asc' ? 'A - Z  (apasa pentru Z - A)' : 'Z - A  (apasa pentru A - Z)'}
                    >
                        {sortDir === 'asc'
                            ? <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                            : <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd"/></svg>
                        }
                    </button>
                </div>
            </div>

            {sections.map((section, idx) => {
                const sortedAthletes = sortAthletes(section.athletes);
                const presentCount = section.athletes.filter(a => a.isPresent).length;
                const isSaved = savedIds.has(section.id);
                const isSaving = savingId === section.id;
                const isUnsaved = unsavedSectionIds.has(section.id);
                const pct = section.athletes.length > 0 ? Math.round((presentCount / section.athletes.length) * 100) : 0;
                const existingIds = new Set(section.athletes.map(a => a.id));
                const isExpanded = expandedIds.has(section.id);
                const isHighlighted = highlightedSaveId === section.id;

                return (
                    <Card
                        key={section.id}
                        className={`transition-all duration-300 !p-0 overflow-hidden ${
                            isSaved && !isUnsaved ? 'ring-1 ring-emerald-500/40' : ''
                        } ${isUnsaved ? 'ring-1 ring-amber-500/30' : ''}`}
                    >
                        {/* Header colapsabil */}
                        <button
                            onClick={() => handleToggleExpand(section.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                                isExpanded ? 'bg-slate-800/20' : 'hover:bg-slate-800/30'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-white truncate">{section.grup}</h3>
                                        {isUnsaved && (
                                            <span className="shrink-0 w-2 h-2 rounded-full bg-amber-400" title="Modificari nesalvate" />
                                        )}
                                        {isSaved && !isUnsaved && (
                                            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500">{formatTime(section.ora_start)} – {formatTime(section.ora_sfarsit)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-3">
                                {/* Counter prezenti/total */}
                                <div className="text-right">
                                    <div className="flex items-baseline gap-0.5">
                                        <span className={`text-lg font-black leading-none ${presentCount > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                            {presentCount}
                                        </span>
                                        <span className="text-slate-500 text-xs">/{section.athletes.length}</span>
                                    </div>
                                    {section.athletes.length > 0 && (
                                        <div className="w-12 h-1 bg-slate-800 rounded-full mt-1 ml-auto">
                                            <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
                                        </div>
                                    )}
                                </div>
                                {/* Chevron */}
                                <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                                    <ChevronDownIcon className="w-4 h-4 text-slate-500" />
                                </div>
                            </div>
                        </button>

                        {/* Continut colapsabil */}
                        <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            {/* Quick mark all */}
                            <div className="flex gap-2 px-4 py-2.5 border-t border-slate-800/60">
                                <button
                                    onClick={() => markAll(section.id, true)}
                                    className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors font-medium"
                                >
                                    Toti prezenti
                                </button>
                                <button
                                    onClick={() => markAll(section.id, false)}
                                    className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors font-medium"
                                >
                                    Toti absenti
                                </button>
                                <button
                                    onClick={() => setAddingToTrainingId(section.id)}
                                    className="ml-auto text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors font-medium flex items-center gap-1"
                                >
                                    <PlusIcon className="w-3 h-3" /> Alt sportiv
                                </button>
                            </div>

                            {/* Lista sportivi */}
                            {section.athletes.length === 0 ? (
                                <p className="text-sm text-slate-500 italic px-4 pb-4">Niciun sportiv activ in aceasta grupa.</p>
                            ) : (
                                <div data-tour="prezenta-lista" className="border-t border-slate-800/60">
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
                                                    {a.nume} {a.prenume}
                                                    {a.isExtra && <span className="ml-1.5 text-[10px] text-slate-500 font-normal">extern</span>}
                                                </span>
                                                <span className="text-xs text-slate-500 w-28 text-right shrink-0 truncate">
                                                    {a.gradNume || <span className="text-slate-700">—</span>}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Footer cu buton salvare */}
                            <div
                                ref={el => { saveButtonRefs.current[section.id] = el; }}
                                className={`flex gap-2 items-center p-4 pt-3 border-t border-slate-800 ${isHighlighted ? 'save-highlight-pulse rounded-b-xl' : ''}`}
                            >
                                <Button
                                    onClick={() => handleSave(section.id)}
                                    isLoading={isSaving}
                                    variant={isSaved && !isUnsaved ? 'secondary' : 'success'}
                                    className={`flex-1 transition-all duration-200 ${isUnsaved ? 'ring-2 ring-amber-400/60' : ''}`}
                                    disabled={isSaving || section.athletes.length === 0}
                                    data-tour="prezenta-salveaza"
                                >
                                    {isSaved && !isUnsaved
                                        ? <><CheckCircleIcon className="w-4 h-4 mr-1.5" /> Salvat</>
                                        : 'Salveaza Prezenta'}
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

            {/* Dialog avertisment modificari nesalvate */}
            {warningDialog && (
                <UnsavedWarningDialog
                    warning={warningDialog}
                    onGoToSave={() => scrollToSaveButton(warningDialog.sectionId)}
                    onDismiss={() => {
                        const cb = warningDialog.onContinue;
                        setWarningDialog(null);
                        cb();
                    }}
                />
            )}
        </div>
    );
};
