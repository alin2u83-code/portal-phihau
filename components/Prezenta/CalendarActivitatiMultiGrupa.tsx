import React, { useMemo } from 'react';
import { Grupa, Antrenament } from '../../types';
import { Button, Card } from '../ui';
import { ArrowLeftIcon, CalendarDaysIcon, UsersIcon } from '../icons';
import { useMultiCalendarView } from '../../hooks/useMultiCalendarView';
import { formatTime } from '../../utils/date';

const GROUP_COLORS = ['#4DBCE9', '#3D3D99', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6', '#ec4899', '#64748b'];

const ZILE_SCURTE = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];

function ymd(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildCalendarGrid(year: number, month: number): (string | null)[] {
    const firstDay = new Date(year, month - 1, 1);
    let startPad = firstDay.getDay() - 1;
    if (startPad < 0) startPad = 6;
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(ymd(year, month, d));
    return cells;
}

function monthLabel(year: number, month: number): string {
    return new Date(year, month - 1, 1).toLocaleString('ro-RO', { month: 'long', year: 'numeric' });
}

export const CalendarActivitatiMultiGrupa: React.FC<{
    grupe: Grupa[];
    onSelect: (id: string) => void;
    onSelectMultiple: (ids: string[]) => void;
    onBack: () => void;
}> = ({ grupe, onSelect, onSelectMultiple, onBack }) => {
    // Memoizat — critic: array nou la fiecare render => re-fetch infinit fără memo
    const grupeIds = useMemo(() => grupe.map(g => g.id), [grupe]);

    const { date, setDate, selectedDate, setSelectedDate, todayLocal, antrenamente, loading } =
        useMultiCalendarView(grupeIds);

    // Culoare stabilă per grupaId — Map garantează aceeași culoare indiferent de ordinea render
    const colorByGrupa = useMemo(() => {
        const m = new Map<string, string>();
        grupe.forEach((g, i) => m.set(g.id, GROUP_COLORS[i % GROUP_COLORS.length]));
        return m;
    }, [grupe]);

    const [year, month] = useMemo(() => {
        const parts = date.split('-');
        return [parseInt(parts[0]), parseInt(parts[1])];
    }, [date]);

    const cells = useMemo(() => buildCalendarGrid(year, month), [year, month]);

    const antrenamenteByDate = useMemo(() => {
        const map: Record<string, Antrenament[]> = {};
        for (const a of antrenamente) {
            if (!map[a.data]) map[a.data] = [];
            map[a.data].push(a);
        }
        return map;
    }, [antrenamente]);

    const goToPrevMonth = () => {
        setDate(new Date(year, month - 2, 1).toLocaleDateString('sv-SE'));
        setSelectedDate(null);
    };
    const goToNextMonth = () => {
        setDate(new Date(year, month, 1).toLocaleDateString('sv-SE'));
        setSelectedDate(null);
    };

    const selectedAntrenamente = selectedDate ? (antrenamenteByDate[selectedDate] || []) : [];

    // Grupare grupe simultane: cheia = "ora_start_ora_sfarsit"
    const simultaneByInterval = useMemo(() => {
        const grouped = new Map<string, Antrenament[]>();
        for (const a of selectedAntrenamente) {
            const key = `${a.ora_start}_${a.ora_sfarsit}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(a);
        }
        return grouped;
    }, [selectedAntrenamente]);

    return (
        <div className="space-y-6 animate-fade-in">
            <Button onClick={onBack} variant="secondary" size="sm">
                <ArrowLeftIcon className="w-4 h-4 mr-2" /> Înapoi la Grupe
            </Button>

            <Card className="overflow-hidden border-none shadow-xl bg-slate-900/40 backdrop-blur-sm">
                <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-800/30">
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                        <CalendarDaysIcon className="w-6 h-6 text-indigo-400" />
                        Calendar - Toate Grupele
                    </h2>
                    <p className="text-slate-400 mt-1 text-sm">Toate antrenamentele din {grupe.length} grupe.</p>

                    {/* Legendă grupe */}
                    <div className="flex flex-wrap gap-3 mt-3">
                        {grupe.map(g => (
                            <span key={g.id} className="flex items-center gap-1.5 text-xs text-slate-300">
                                <span
                                    className="inline-block w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: colorByGrupa.get(g.id) }}
                                />
                                {g.denumire}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="p-4 md:p-6 space-y-6">
                    <div className="bg-slate-800/20 rounded-2xl border border-slate-700/30 overflow-hidden">
                        {/* Navigare luni */}
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/40 border-b border-slate-700/30">
                            <button
                                onClick={goToPrevMonth}
                                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors"
                                aria-label="Luna anterioară"
                            >‹</button>
                            <h3 className="text-base font-semibold text-white capitalize">
                                {monthLabel(year, month)}
                            </h3>
                            <button
                                onClick={goToNextMonth}
                                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors"
                                aria-label="Luna următoare"
                            >›</button>
                        </div>

                        {/* Header zile */}
                        <div className="grid grid-cols-7 border-b border-slate-700/30">
                            {ZILE_SCURTE.map(z => (
                                <div key={z} className="text-center py-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                    {z}
                                </div>
                            ))}
                        </div>

                        {/* Grid zile */}
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
                                    const dayAntrenamente = antrenamenteByDate[cellDate] || [];
                                    const dayNum = parseInt(cellDate.split('-')[2]);

                                    // Dots: un dot per grupă distinctă prezentă în ziua asta
                                    const grupeInZi = [...new Set(dayAntrenamente.map(a => a.grupa_id))];

                                    return (
                                        <button
                                            key={cellDate}
                                            onClick={() => setSelectedDate(isSelected ? null : cellDate)}
                                            className={[
                                                'min-h-[64px] p-1.5 border-b border-r border-slate-700/20 flex flex-col items-center gap-1 transition-all',
                                                isSelected ? 'bg-indigo-600/30 border-indigo-500/40' : isToday ? 'bg-indigo-500/10' : 'hover:bg-slate-700/20',
                                                isPast && dayAntrenamente.length === 0 ? 'opacity-40' : '',
                                            ].join(' ')}
                                        >
                                            <span className={[
                                                'text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full',
                                                isToday ? 'bg-indigo-500 text-white' : isPast ? 'text-slate-400' : 'text-slate-200',
                                            ].join(' ')}>
                                                {dayNum}
                                            </span>

                                            {grupeInZi.length > 0 && (
                                                <div className="flex flex-wrap justify-center gap-0.5">
                                                    {grupeInZi.slice(0, 4).map(grupaId => (
                                                        <span
                                                            key={grupaId}
                                                            className="inline-block w-1.5 h-1.5 rounded-full"
                                                            style={{ backgroundColor: colorByGrupa.get(grupaId) || '#64748b' }}
                                                        />
                                                    ))}
                                                    {grupeInZi.length > 4 && (
                                                        <span className="text-[8px] text-slate-400">+{grupeInZi.length - 4}</span>
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Detalii zi selectată */}
                    {selectedDate && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ro-RO', {
                                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                })}
                            </h3>

                            {simultaneByInterval.size === 0 ? (
                                <div className="text-center py-8 bg-slate-800/10 rounded-2xl border border-dashed border-slate-800">
                                    <CalendarDaysIcon className="w-10 h-10 text-slate-700 mx-auto mb-2 opacity-20" />
                                    <p className="text-slate-500 italic text-sm">Nicio activitate programată.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {[...simultaneByInterval.entries()].map(([intervalKey, antrenamenteInterval]) => {
                                        const isSimultan = antrenamenteInterval.length > 1;
                                        const first = antrenamenteInterval[0];

                                        return (
                                            <div
                                                key={intervalKey}
                                                className="p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:border-indigo-500/30 transition-all"
                                            >
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                    <div className="flex items-start gap-4 w-full sm:w-auto">
                                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-400 shrink-0">
                                                            {isSimultan
                                                                ? <UsersIcon className="w-6 h-6" />
                                                                : <CalendarDaysIcon className="w-6 h-6" />}
                                                        </div>
                                                        <div>
                                                            {isSimultan && (
                                                                <span className="inline-block px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-400 mb-1">
                                                                    SIMULTAN
                                                                </span>
                                                            )}
                                                            <p className="text-lg font-bold text-white leading-none">
                                                                {formatTime(first.ora_start)} - {formatTime(first.ora_sfarsit)}
                                                            </p>
                                                            <div className="flex flex-wrap gap-2 mt-1.5">
                                                                {antrenamenteInterval.map(a => (
                                                                    <span key={a.id} className="flex items-center gap-1 text-xs text-slate-300">
                                                                        <span
                                                                            className="inline-block w-2 h-2 rounded-full"
                                                                            style={{ backgroundColor: colorByGrupa.get(a.grupa_id) || '#64748b' }}
                                                                        />
                                                                        {(a as any).grupe?.denumire || a.grupa_id.slice(0, 8)}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="w-full sm:w-auto">
                                                        {isSimultan ? (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => onSelectMultiple(antrenamenteInterval.map(a => a.id))}
                                                                className="w-full shadow-lg shadow-indigo-500/10"
                                                            >
                                                                Bifează Prezența ({antrenamenteInterval.length} grupe) &rarr;
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => onSelect(first.id)}
                                                                className="w-full shadow-lg shadow-indigo-500/10"
                                                            >
                                                                Bifează Prezența &rarr;
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};
