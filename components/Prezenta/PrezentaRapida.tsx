import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { Sportiv } from '../../types';
import { Card, Button } from '../ui';
import { CheckCircleIcon, CalendarDaysIcon, SparklesIcon } from '../icons';
import { useStatusePrezenta } from '../../hooks/useStatusePrezenta';
import { useAttendance } from '../../hooks/useAttendance';
import { useError } from '../ErrorProvider';

interface AthletePill {
    id: string;
    nume: string;
    prenume: string;
    isPresent: boolean;
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

export const PrezentaRapida: React.FC<{ onSelectFull?: (id: string) => void }> = ({ onSelectFull }) => {
    const { prezentId } = useStatusePrezenta();
    const { saveAttendance } = useAttendance();
    const { showError } = useError();
    const [sections, setSections] = useState<TrainingSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

    const today = new Date().toLocaleDateString('sv-SE');

    const fetchTrainings = useCallback(async () => {
        setLoading(true);
        const [trainingRes, statusRes] = await Promise.all([
            supabase
                .from('program_antrenamente')
                .select('id, ora_start, ora_sfarsit, grupe(denumire, sportivi(id, nume, prenume, status)), prezenta:prezenta_antrenament(sportiv_id, status_id)')
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
            return {
                id: t.id,
                ora_start: t.ora_start,
                ora_sfarsit: t.ora_sfarsit,
                grup: (t.grupe as any)?.denumire || 'Antrenament',
                athletes: sportivi.map((s: any) => ({ id: s.id, nume: s.nume, prenume: s.prenume, isPresent: initialPresent.has(s.id) })),
                initialPresent,
                hasSavedData: (t.prezenta || []).length > 0,
            };
        });

        setSections(built);
        // Mark already-saved trainings
        setSavedIds(new Set(built.filter(s => s.hasSavedData).map(s => s.id)));
        setLoading(false);
    }, [today, showError]);

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
            <div className="flex items-center gap-2 mb-2">
                <SparklesIcon className="w-4 h-4 text-amber-400" />
                <p className="text-xs text-slate-400">Apasă pe un sportiv pentru a comuta prezența, apoi salvează.</p>
            </div>

            {sections.map(section => {
                const presentCount = section.athletes.filter(a => a.isPresent).length;
                const isSaved = savedIds.has(section.id);
                const isSaving = savingId === section.id;
                const pct = section.athletes.length > 0 ? Math.round((presentCount / section.athletes.length) * 100) : 0;

                return (
                    <Card key={section.id} className={`transition-all duration-300 ${isSaved ? 'ring-1 ring-emerald-500/40' : ''}`}>
                        {/* Header */}
                        <div className="flex justify-between items-center mb-3">
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
                        {section.athletes.length > 0 && (
                            <div className="flex gap-2 mb-3">
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
                            </div>
                        )}

                        {/* Athlete pills */}
                        {section.athletes.length === 0 ? (
                            <p className="text-sm text-slate-500 italic py-2">Niciun sportiv activ în această grupă.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {section.athletes.map(a => (
                                    <button
                                        key={a.id}
                                        onClick={() => toggleAthlete(section.id, a.id)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all select-none active:scale-95 ${
                                            a.isPresent
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500'
                                        }`}
                                    >
                                        <span className="mr-1 text-xs">{a.isPresent ? '✓' : '–'}</span>
                                        {a.nume} {a.prenume}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Footer actions */}
                        <div className="flex gap-2 items-center pt-3 border-t border-slate-800">
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
        </div>
    );
};
