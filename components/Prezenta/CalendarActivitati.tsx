import React, { useState, useEffect, useMemo } from 'react';
import { Grupa, Eveniment } from '../../types';
import { Button, Card } from '../ui';
import { ArrowLeftIcon, CalendarDaysIcon } from '../icons';
import { useCalendarView } from '../../hooks/useCalendarView';
import { AntrenamentForm } from '../AntrenamentForm';
import { supabase } from '../../supabaseClient';
import { Input } from '../ui';

// ─── helpers ─────────────────────────────────────────────────────────────────

const ZILE_SCURTE = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];

/** Returns YYYY-MM-DD for the given year/month/day (1-based). */
function ymd(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Build an array of calendar cells (null = empty padding, string = YYYY-MM-DD). */
function buildCalendarGrid(year: number, month: number): (string | null)[] {
    const firstDay = new Date(year, month - 1, 1);
    // getDay() → 0=Sun … 6=Sat; we want Mon=0 … Sun=6
    let startPad = firstDay.getDay() - 1;
    if (startPad < 0) startPad = 6; // Sunday → last column

    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (string | null)[] = [];

    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(ymd(year, month, d));

    return cells;
}

function monthLabel(year: number, month: number): string {
    return new Date(year, month - 1, 1).toLocaleString('ro-RO', { month: 'long', year: 'numeric' });
}

// ─── sub-components ──────────────────────────────────────────────────────────

interface DotProps { color: string }
const Dot: React.FC<DotProps> = ({ color }) => (
    <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />
);

// ─── main component ───────────────────────────────────────────────────────────

export const CalendarActivitati: React.FC<{
    grupa: Grupa; onSelect: (id: string) => void; onBack: () => void; grupe: Grupa[]
}> = ({ grupa, onSelect, onBack, grupe }) => {
    const {
        date, setDate,
        selectedDate, setSelectedDate,
        todayLocal,
        daysToGenerate, setDaysToGenerate,
        antrenamente,
        loading,
        isFormOpen, setIsFormOpen,
        handleGenerate,
        handleSaveCustom
    } = useCalendarView(grupa.id);

    // ── parse current month from `date` ───────────────────────────────────────
    const [year, month] = useMemo(() => {
        const parts = date.split('-');
        return [parseInt(parts[0]), parseInt(parts[1])];
    }, [date]);

    const startOfMonth = useMemo(() => ymd(year, month, 1), [year, month]);
    const endOfMonth = useMemo(
        () => new Date(year, month, 0).toLocaleDateString('sv-SE'),
        [year, month]
    );

    // ── eventi fetch ──────────────────────────────────────────────────────────
    const [evenimente, setEvenimente] = useState<Eveniment[]>([]);
    useEffect(() => {
        supabase
            .from('evenimente')
            .select('*')
            .gte('data', startOfMonth)
            .lte('data', endOfMonth)
            .then(({ data }) => setEvenimente((data as Eveniment[]) || []));
    }, [startOfMonth, endOfMonth]);

    // ── calendar grid ─────────────────────────────────────────────────────────
    const cells = useMemo(() => buildCalendarGrid(year, month), [year, month]);

    // map date → list of trainings / events for quick lookup
    const antrenamenteByDate = useMemo(() => {
        const map: Record<string, typeof antrenamente> = {};
        for (const a of antrenamente) {
            if (!map[a.data]) map[a.data] = [];
            map[a.data].push(a);
        }
        return map;
    }, [antrenamente]);

    const evenimenteByDate = useMemo(() => {
        const map: Record<string, Eveniment[]> = {};
        for (const ev of evenimente) {
            if (!map[ev.data]) map[ev.data] = [];
            map[ev.data].push(ev);
        }
        return map;
    }, [evenimente]);

    // ── month navigation ──────────────────────────────────────────────────────
    const goToPrevMonth = () => {
        const d = new Date(year, month - 2, 1); // month-2 because JS months are 0-indexed
        setDate(d.toLocaleDateString('sv-SE'));
        setSelectedDate(null);
    };
    const goToNextMonth = () => {
        const d = new Date(year, month, 1);
        setDate(d.toLocaleDateString('sv-SE'));
        setSelectedDate(null);
    };

    // ── selected day data ─────────────────────────────────────────────────────
    const selectedAntrenamente = selectedDate ? (antrenamenteByDate[selectedDate] || []) : [];
    const selectedEvenimente = selectedDate ? (evenimenteByDate[selectedDate] || []) : [];

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-fade-in">
            <Button onClick={onBack} variant="secondary" size="sm">
                <ArrowLeftIcon className="w-4 h-4 mr-2" /> Înapoi la Orar
            </Button>

            <Card className="overflow-hidden border-none shadow-xl bg-slate-900/40 backdrop-blur-sm">
                {/* header */}
                <div className="p-6 border-b border-slate-800 bg-slate-800/30">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <CalendarDaysIcon className="w-6 h-6 text-indigo-400" />
                        Calendar Activități: <span className="text-indigo-300">{grupa.denumire}</span>
                    </h2>
                    <p className="text-slate-400 mt-1">Gestionează instanțele reale de antrenament și prezența.</p>
                </div>

                <div className="p-6 space-y-6">
                    {/* controls row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 bg-slate-800/20 rounded-2xl border border-slate-700/30">
                        <Input
                            label="Zile în avans"
                            type="number"
                            value={daysToGenerate}
                            onChange={e => setDaysToGenerate(parseInt(e.target.value) || 0)}
                        />
                        <Button onClick={handleGenerate} isLoading={loading} className="w-full">
                            Generează Calendar
                        </Button>
                        <Button variant="info" onClick={() => setIsFormOpen(true)} className="w-full">
                            + Adaugă Antrenament
                        </Button>
                    </div>

                    {/* ── monthly calendar grid ─────────────────────────────── */}
                    <div className="bg-slate-800/20 rounded-2xl border border-slate-700/30 overflow-hidden">
                        {/* month navigation */}
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/40 border-b border-slate-700/30">
                            <button
                                onClick={goToPrevMonth}
                                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors"
                                aria-label="Luna anterioară"
                            >
                                ‹
                            </button>
                            <h3 className="text-base font-semibold text-white capitalize">
                                {monthLabel(year, month)}
                            </h3>
                            <button
                                onClick={goToNextMonth}
                                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors"
                                aria-label="Luna următoare"
                            >
                                ›
                            </button>
                        </div>

                        {/* weekday headers */}
                        <div className="grid grid-cols-7 border-b border-slate-700/30">
                            {ZILE_SCURTE.map(z => (
                                <div key={z} className="text-center py-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                    {z}
                                </div>
                            ))}
                        </div>

                        {/* day cells */}
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-7">
                                {cells.map((cellDate, idx) => {
                                    if (!cellDate) {
                                        return <div key={`pad-${idx}`} className="min-h-[64px] border-b border-r border-slate-700/20" />;
                                    }

                                    const isToday = cellDate === todayLocal;
                                    const isSelected = cellDate === selectedDate;
                                    const isPast = cellDate < todayLocal;
                                    const hasTrainings = Boolean(antrenamenteByDate[cellDate]?.length);
                                    const hasEvenimente = Boolean(evenimenteByDate[cellDate]?.length);
                                    const dayNum = parseInt(cellDate.split('-')[2]);

                                    return (
                                        <button
                                            key={cellDate}
                                            onClick={() => setSelectedDate(isSelected ? null : cellDate)}
                                            className={[
                                                'min-h-[64px] p-1.5 border-b border-r border-slate-700/20 flex flex-col items-center gap-1 transition-all',
                                                isSelected
                                                    ? 'bg-indigo-600/30 border-indigo-500/40'
                                                    : isToday
                                                    ? 'bg-indigo-500/10'
                                                    : 'hover:bg-slate-700/20',
                                                isPast && !hasTrainings && !hasEvenimente
                                                    ? 'opacity-40'
                                                    : '',
                                            ].join(' ')}
                                        >
                                            {/* day number */}
                                            <span
                                                className={[
                                                    'text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full',
                                                    isToday
                                                        ? 'bg-indigo-500 text-white'
                                                        : isPast
                                                        ? 'text-slate-400'
                                                        : 'text-slate-200',
                                                ].join(' ')}
                                            >
                                                {dayNum}
                                            </span>

                                            {/* dots */}
                                            {(hasTrainings || hasEvenimente) && (
                                                <div className="flex flex-wrap justify-center gap-0.5">
                                                    {hasTrainings && <Dot color="bg-indigo-400" />}
                                                    {evenimenteByDate[cellDate]?.map(ev => (
                                                        <Dot
                                                            key={ev.id}
                                                            color={ev.tip === 'Competitie' ? 'bg-rose-400' : 'bg-emerald-400'}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── legend ───────────────────────────────────────────── */}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5"><Dot color="bg-indigo-400" /> Antrenament</span>
                        <span className="flex items-center gap-1.5"><Dot color="bg-emerald-400" /> Stagiu</span>
                        <span className="flex items-center gap-1.5"><Dot color="bg-rose-400" /> Competiție</span>
                    </div>

                    {/* ── selected day details ──────────────────────────────── */}
                    {selectedDate && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ro-RO', {
                                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                })}
                            </h3>

                            {/* trainings */}
                            {selectedAntrenamente.length === 0 && selectedEvenimente.length === 0 ? (
                                <div className="text-center py-8 bg-slate-800/10 rounded-2xl border border-dashed border-slate-800">
                                    <CalendarDaysIcon className="w-10 h-10 text-slate-700 mx-auto mb-2 opacity-20" />
                                    <p className="text-slate-500 italic text-sm">Nicio activitate programată în această zi.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedAntrenamente.map(a => (
                                        <div
                                            key={a.id}
                                            className="group p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row justify-between items-center gap-4"
                                        >
                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${a.is_recurent ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                    <CalendarDaysIcon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${a.is_recurent ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                            {a.is_recurent ? 'Recurent' : 'Personalizat'}
                                                        </span>
                                                        <span className="text-xs text-slate-500 font-mono">#{a.id.slice(0, 8)}</span>
                                                    </div>
                                                    <p className="text-lg font-bold text-white leading-none">{a.ora_start} - {a.ora_sfarsit}</p>
                                                </div>
                                            </div>
                                            <Button size="sm" onClick={() => onSelect(a.id)} className="w-full sm:w-auto shadow-lg shadow-indigo-500/10">
                                                Bifează Prezența &rarr;
                                            </Button>
                                        </div>
                                    ))}

                                    {selectedEvenimente.map(ev => (
                                        <div
                                            key={ev.id}
                                            className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                                                ev.tip === 'Competitie'
                                                    ? 'bg-rose-500/10 border-rose-500/30'
                                                    : 'bg-emerald-500/10 border-emerald-500/30'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ev.tip === 'Competitie' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                    <CalendarDaysIcon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${ev.tip === 'Competitie' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                        {ev.tip === 'Competitie' ? 'Competiție' : 'Stagiu'}
                                                    </span>
                                                    <p className="text-base font-bold text-white mt-1 leading-snug">{ev.denumire}</p>
                                                    {ev.locatie && (
                                                        <p className="text-xs text-slate-400 mt-0.5">{ev.locatie}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {ev.data_sfarsit && ev.data_sfarsit !== ev.data && (
                                                <span className="text-xs text-slate-400 whitespace-nowrap">
                                                    până la {new Date(ev.data_sfarsit + 'T00:00:00').toLocaleDateString('ro-RO')}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            <AntrenamentForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSave={handleSaveCustom}
                grupaId={grupa.id}
                grupe={grupe}
            />
        </div>
    );
};
