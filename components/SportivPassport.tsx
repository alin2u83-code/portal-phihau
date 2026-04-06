import React, { useMemo } from 'react';
import { User, Grad, InscriereExamen, SesiuneExamen, IstoricGrade, Plata } from '../types';
import { Card } from './ui';
import { parseDurationToMonths } from '../utils/eligibility';
import { TrophyIcon, ShieldCheckIcon, CalendarDaysIcon, ExclamationTriangleIcon, CheckCircleIcon } from './icons';

interface SportivPassportProps {
    viewedUser: User;
    grade: Grad[];
    participari: InscriereExamen[];
    examene: SesiuneExamen[];
    istoricGrade: IstoricGrade[];
    plati: Plata[];
}

type TimelineEventType = 'inscriere' | 'grad_obtinut' | 'viza_medicala' | 'viza_expirata';

interface TimelineEvent {
    id: string;
    type: TimelineEventType;
    date: number; // timestamp ms
    dateLabel: string;
    title: string;
    subtitle?: string;
}

function buildTimeline(
    viewedUser: User,
    grade: Grad[],
    participari: InscriereExamen[],
    examene: SesiuneExamen[],
    istoricGrade: IstoricGrade[],
    plati: Plata[],
): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    // 1. Înregistrare
    if (viewedUser.data_inscrierii) {
        const d = new Date(viewedUser.data_inscrierii);
        if (!isNaN(d.getTime())) {
            events.push({
                id: 'inscriere',
                type: 'inscriere',
                date: d.getTime(),
                dateLabel: d.toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' }),
                title: 'Înregistrare club',
                subtitle: viewedUser.cluburi?.nume,
            });
        }
    }

    // 2. Grade din examene (participari admise)
    const admise = (participari || []).filter(
        p => p.sportiv_id === viewedUser.id && p.rezultat === 'Admis'
    );
    for (const p of admise) {
        const examen = (examene || []).find(e => e.id === p.sesiune_id);
        const grad = (grade || []).find(g => g.id === p.grad_sustinut_id);
        if (!examen || !grad) continue;
        const rawDate = (examen.data || '').toString().slice(0, 10);
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) continue;
        events.push({
            id: `examen-${p.id}`,
            type: 'grad_obtinut',
            date: d.getTime(),
            dateLabel: d.toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' }),
            title: grad.nume,
            subtitle: 'Grad obținut la examen',
        });
    }

    // 3. Grade manuale (fără sesiune_examen_id)
    for (const hg of (istoricGrade || []).filter(g => g.sportiv_id === viewedUser.id && !g.sesiune_examen_id)) {
        const grad = (grade || []).find(g => g.id === hg.grad_id);
        if (!grad) continue;
        const rawDate = (hg.data_obtinere || '').slice(0, 10);
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) continue;
        events.push({
            id: `manual-${hg.id}`,
            type: 'grad_obtinut',
            date: d.getTime(),
            dateLabel: d.toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' }),
            title: grad.nume,
            subtitle: 'Grad înregistrat manual',
        });
    }

    // 4. Vize medicale din plăți
    const vizePlati = (plati || []).filter(
        p => p.sportiv_id === viewedUser.id && p.tip.toLowerCase().includes('viza')
    );
    for (const vp of vizePlati) {
        const rawDate = (vp.data || '').slice(0, 10);
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) continue;
        const isAchitat = vp.status === 'Achitat';
        events.push({
            id: `viza-${vp.id}`,
            type: isAchitat ? 'viza_medicala' : 'viza_expirata',
            date: d.getTime(),
            dateLabel: d.toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' }),
            title: isAchitat ? 'Viză medicală obținută' : 'Viză medicală neachitată',
            subtitle: vp.descriere || undefined,
        });
    }

    // Sortare ascendentă (cel mai vechi primul)
    return events.sort((a, b) => a.date - b.date);
}

const EVENT_STYLES: Record<TimelineEventType, { dot: string; icon: React.ReactNode; label: string }> = {
    inscriere: {
        dot: 'bg-sky-500 ring-sky-500/30',
        icon: <CalendarDaysIcon className="w-3.5 h-3.5 text-sky-400" />,
        label: '📅',
    },
    grad_obtinut: {
        dot: 'bg-amber-500 ring-amber-500/30',
        icon: <TrophyIcon className="w-3.5 h-3.5 text-amber-400" />,
        label: '🥋',
    },
    viza_medicala: {
        dot: 'bg-emerald-500 ring-emerald-500/30',
        icon: <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400" />,
        label: '🏥',
    },
    viza_expirata: {
        dot: 'bg-rose-500 ring-rose-500/30',
        icon: <ExclamationTriangleIcon className="w-3.5 h-3.5 text-rose-400" />,
        label: '⚠️',
    },
};

export const SportivPassport: React.FC<SportivPassportProps> = ({
    viewedUser, grade, participari, examene, istoricGrade, plati,
}) => {
    // ── PROGRES SPRE GRAD URMĂTOR ─────────────────────────────────
    const progress = useMemo(() => {
        const sortedGrades = [...(grade || [])].sort((a, b) => a.ordine - b.ordine);
        const currentGrad = viewedUser.grad_actual_id
            ? grade.find(g => g.id === viewedUser.grad_actual_id) ?? null
            : null;

        const nextGrad = currentGrad
            ? sortedGrades.find(g => g.ordine === currentGrad.ordine + 1) ?? null
            : sortedGrades[0] ?? null;

        if (!nextGrad) return null;

        // Data de referință = ultimul examen admis sau data înscrierii
        const lastAdmitted = (participari || [])
            .filter(p => p.sportiv_id === viewedUser.id && p.rezultat === 'Admis')
            .map(p => {
                const ex = (examene || []).find(e => e.id === p.sesiune_id);
                return ex ? new Date((ex.data || '').toString().slice(0, 10)).getTime() : 0;
            })
            .filter(t => t > 0)
            .sort((a, b) => b - a)[0] ?? null;

        const refDate = lastAdmitted
            ? new Date(lastAdmitted)
            : viewedUser.data_inscrierii
                ? new Date(viewedUser.data_inscrierii)
                : new Date();

        const monthsRequired = parseDurationToMonths(nextGrad.timp_asteptare);
        const now = new Date();
        const monthsElapsed = Math.max(
            0,
            (now.getFullYear() - refDate.getFullYear()) * 12 + (now.getMonth() - refDate.getMonth())
        );
        const percentage = monthsRequired > 0
            ? Math.min(100, Math.round((monthsElapsed / monthsRequired) * 100))
            : 100;

        const isDan = nextGrad.nume.toLowerCase().includes('dan');
        const monthsLeft = Math.max(0, monthsRequired - monthsElapsed);

        return { nextGrad, currentGrad, percentage, monthsElapsed, monthsRequired, monthsLeft, isDan };
    }, [viewedUser, grade, participari, examene]);

    // ── TIMELINE ─────────────────────────────────────────────────
    const events = useMemo(
        () => buildTimeline(viewedUser, grade, participari, examene, istoricGrade, plati),
        [viewedUser, grade, participari, examene, istoricGrade, plati]
    );

    if (!progress && events.length === 0) return null;

    const barColor = progress?.isDan ? 'bg-amber-500' : 'bg-sky-500';

    return (
        <Card className="border border-slate-800 bg-slate-900/50">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <TrophyIcon className="w-4 h-4 text-amber-400" />
                Pașaport Sportiv
            </h3>

            {/* ── PROGRES ────────────────────────────────────────── */}
            {progress && (
                <div className="mb-5 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-slate-400 shrink-0">Grad curent:</span>
                            <span className="text-xs font-semibold text-white truncate">
                                {progress.currentGrad?.nume ?? 'Începător'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-slate-400 shrink-0">Următor:</span>
                            <span className={`text-xs font-bold truncate ${progress.isDan ? 'text-amber-400' : 'text-sky-400'}`}>
                                {progress.nextGrad.nume}
                            </span>
                        </div>
                    </div>

                    {/* Bara progres */}
                    <div className="relative h-2.5 rounded-full bg-slate-700 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                            style={{ width: `${progress.percentage}%` }}
                        />
                    </div>

                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-500">
                            {progress.monthsElapsed} / {progress.monthsRequired} luni stagiu
                        </span>
                        <span className={`text-xs font-bold ${progress.percentage >= 100 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {progress.percentage >= 100
                                ? (
                                    <span className="flex items-center gap-1">
                                        <CheckCircleIcon className="w-3.5 h-3.5" />
                                        Eligibil examen
                                    </span>
                                )
                                : `${progress.percentage}% — mai ai ${progress.monthsLeft} luni`
                            }
                        </span>
                    </div>
                </div>
            )}

            {/* ── TIMELINE ───────────────────────────────────────── */}
            {events.length > 0 && (
                <div className="relative">
                    {/* Linie verticală */}
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-700/60" />

                    <ol className="space-y-0">
                        {events.map((ev, idx) => {
                            const style = EVENT_STYLES[ev.type];
                            const isLast = idx === events.length - 1;
                            return (
                                <li key={ev.id} className="relative flex gap-3 group">
                                    {/* Dot */}
                                    <div className={`relative z-10 mt-1 w-[22px] h-[22px] shrink-0 rounded-full ring-4 ring-slate-900 flex items-center justify-center ${style.dot}`}>
                                        {style.icon}
                                    </div>

                                    {/* Conținut */}
                                    <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <span className={`text-sm font-semibold leading-tight ${
                                                ev.type === 'viza_expirata' ? 'text-rose-400' :
                                                ev.type === 'grad_obtinut' ? 'text-white' :
                                                ev.type === 'viza_medicala' ? 'text-emerald-300' :
                                                'text-sky-300'
                                            }`}>
                                                {ev.title}
                                            </span>
                                            <span className="text-[11px] text-slate-500 shrink-0 mt-0.5">
                                                {ev.dateLabel}
                                            </span>
                                        </div>
                                        {ev.subtitle && (
                                            <p className="text-xs text-slate-500 mt-0.5">{ev.subtitle}</p>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            )}

            {events.length === 0 && !progress && (
                <p className="text-xs text-slate-500 text-center py-4">
                    Nu există evenimente înregistrate încă.
                </p>
            )}
        </Card>
    );
};
