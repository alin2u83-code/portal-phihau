/**
 * AgingReport.tsx
 * Raport AR Aging: distribuție restanțe pe intervale de zile.
 * Heat map: verde (curent) → galben → portocaliu → roșu (critic >90 zile).
 */
import React, { useMemo } from 'react';
import { Plata, Sportiv, Familie } from '../types';

interface Props {
    plati: Plata[];
    sportivi: Sportiv[];
    familii: Familie[];
}

interface AgingBucket {
    label: string;
    min: number;
    max: number;
    colorCls: string;
    bgCls: string;
    dotCls: string;
    borderCls: string;
}

const BUCKETS: AgingBucket[] = [
    {
        label: 'Curent',
        min: -Infinity, max: 0,
        colorCls: 'text-emerald-400',
        bgCls: 'bg-emerald-500/10',
        borderCls: 'border-emerald-700/30',
        dotCls: 'bg-emerald-400',
    },
    {
        label: '1–30 zile',
        min: 1, max: 30,
        colorCls: 'text-amber-400',
        bgCls: 'bg-amber-500/10',
        borderCls: 'border-amber-700/30',
        dotCls: 'bg-amber-400',
    },
    {
        label: '31–60 zile',
        min: 31, max: 60,
        colorCls: 'text-orange-400',
        bgCls: 'bg-orange-500/10',
        borderCls: 'border-orange-700/30',
        dotCls: 'bg-orange-400',
    },
    {
        label: '61–90 zile',
        min: 61, max: 90,
        colorCls: 'text-red-400',
        bgCls: 'bg-red-500/10',
        borderCls: 'border-red-700/30',
        dotCls: 'bg-red-400',
    },
    {
        label: '90+ zile',
        min: 91, max: Infinity,
        colorCls: 'text-red-300',
        bgCls: 'bg-red-950/60',
        borderCls: 'border-red-700/50',
        dotCls: 'bg-red-300 animate-pulse',
    },
];

function getDaysOverdue(plata: Plata): number {
    const d = new Date(plata.data.toString().slice(0, 10));
    if (isNaN(d.getTime())) return 0;
    d.setHours(0, 0, 0, 0);
    const azi = new Date(); azi.setHours(0, 0, 0, 0);
    return Math.floor((azi.getTime() - d.getTime()) / 86_400_000);
}

function bucketFor(days: number): AgingBucket {
    return BUCKETS.find(b => days >= b.min && days <= b.max) ?? BUCKETS[BUCKETS.length - 1];
}

const fmt = (n: number) =>
    n.toLocaleString('ro-RO', { minimumFractionDigits: 0 }) + ' RON';

export const AgingReport: React.FC<Props> = ({ plati, sportivi, familii }) => {
    const { buckets, detailRows, grandTotal, grandCount } = useMemo(() => {
        const neachitate = (plati || []).filter(p => p.status !== 'Achitat');

        const buckets = BUCKETS.map(b => {
            const items = neachitate.filter(p => {
                const days = getDaysOverdue(p);
                return days >= b.min && days <= b.max;
            });
            return {
                ...b,
                count: items.length,
                total: items.reduce((s, p) => s + p.suma, 0),
            };
        });

        const detailRows = neachitate
            .map(p => {
                const daysOverdue = getDaysOverdue(p);
                const sp = sportivi.find(s => s.id === p.sportiv_id);
                const fam = familii.find(f => f.id === p.familie_id);
                return {
                    ...p,
                    daysOverdue,
                    numePlatitor: sp ? `${sp.nume} ${sp.prenume}` : fam?.nume ?? '—',
                    bucket: bucketFor(daysOverdue),
                };
            })
            .sort((a, b) => b.daysOverdue - a.daysOverdue)
            .slice(0, 25);

        const grandTotal = neachitate.reduce((s, p) => s + p.suma, 0);
        const grandCount = neachitate.length;

        return { buckets, detailRows, grandTotal, grandCount };
    }, [plati, sportivi, familii]);

    const criticalBucket = buckets[4]; // 90+ zile
    const criticalPct = grandTotal > 0 ? Math.round((criticalBucket.total / grandTotal) * 100) : 0;

    return (
        <div className="space-y-4">
            {/* ── Heat map ── */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between mb-4 gap-3">
                    <div>
                        <p className="text-sm font-bold text-white">Raport Aging Restanțe</p>
                        <p className="text-xs text-slate-500">Distribuție creanțe neîncasate pe intervale</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xs text-slate-500">Total restant</p>
                        <p className={`text-lg font-black ${grandTotal > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                            {fmt(grandTotal)}
                        </p>
                    </div>
                </div>

                {grandCount === 0 ? (
                    <p className="text-center text-emerald-400 font-semibold py-6 text-sm">
                        Nu există restanțe. Excelent!
                    </p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {buckets.map(b => (
                            <div
                                key={b.label}
                                className={`rounded-xl border px-3 py-3 ${b.bgCls} ${b.borderCls}`}
                            >
                                <div className="flex items-center gap-1.5 mb-2">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${b.dotCls}`} />
                                    <span className={`text-xs font-bold ${b.colorCls}`}>{b.label}</span>
                                </div>
                                <p className={`text-2xl font-black ${b.colorCls}`}>{b.count}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {b.count === 1 ? 'factură' : 'facturi'}
                                </p>
                                {b.total > 0 && (
                                    <p className={`text-xs font-semibold mt-1.5 ${b.colorCls}`}>
                                        {fmt(b.total)}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Risk concentration bar ── */}
            {grandTotal > 0 && criticalBucket.total > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                        <span>
                            Concentrare risc:&nbsp;
                            <span className="text-red-400 font-semibold">
                                {criticalPct}% restant critic (&gt;90 zile)
                            </span>
                        </span>
                        <span className="font-bold text-white">
                            {fmt(criticalBucket.total)} / {fmt(grandTotal)}
                        </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-2 rounded-full bg-red-400 transition-all duration-500"
                            style={{ width: `${criticalPct}%` }}
                        />
                    </div>
                </div>
            )}

            {/* ── Detail table ── */}
            {detailRows.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                        <p className="text-sm font-bold text-white">Top restanțe (cele mai vechi)</p>
                        <span className="text-xs text-slate-500">{grandCount} total · afișate {detailRows.length}</span>
                    </div>

                    {/* Desktop */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-800/40">
                                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">Plătitor</th>
                                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">Descriere</th>
                                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">Scadență</th>
                                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">Vechime</th>
                                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Sumă</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {detailRows.map(row => (
                                    <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-2.5 text-white font-medium">{row.numePlatitor}</td>
                                        <td className="px-4 py-2.5 text-slate-300 max-w-[200px] truncate">{row.descriere}</td>
                                        <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                                            {new Date(row.data.toString().slice(0, 10)).toLocaleDateString('ro-RO')}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border
                                                ${row.bucket.bgCls} ${row.bucket.borderCls} ${row.bucket.colorCls}`}>
                                                {row.daysOverdue > 0
                                                    ? `+${row.daysOverdue}z`
                                                    : row.daysOverdue === 0
                                                    ? 'Azi'
                                                    : `${Math.abs(row.daysOverdue)}z`}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-bold text-white whitespace-nowrap">
                                            {row.suma.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile */}
                    <div className="md:hidden divide-y divide-slate-800/50">
                        {detailRows.map(row => (
                            <div key={row.id} className="px-4 py-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-white font-medium text-sm truncate">{row.numePlatitor}</p>
                                    <p className="text-slate-500 text-xs mt-0.5 truncate">{row.descriere}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-xs text-slate-600">
                                            {new Date(row.data.toString().slice(0, 10)).toLocaleDateString('ro-RO')}
                                        </span>
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border
                                            ${row.bucket.bgCls} ${row.bucket.borderCls} ${row.bucket.colorCls}`}>
                                            {row.daysOverdue > 0 ? `+${row.daysOverdue}z` : 'Azi'}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-white font-bold text-sm whitespace-nowrap shrink-0">
                                    {row.suma.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
