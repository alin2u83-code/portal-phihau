/**
 * FamilyPaymentCard.tsx
 * Card consolidat solduri familie:
 *  - Membrii cu indicator restanță
 *  - Sumar financiar total emis / achitat / rest
 *  - Lista plăților restante cu status aging
 */
import React from 'react';
import { Familie, Sportiv, Plata } from '../types';
import { getDisplayStatus, STATUS_DISPLAY_CONFIG } from '../utils/paymentStatus';
import { UsersIcon, CheckCircleIcon, ExclamationTriangleIcon } from './icons';

interface Props {
    familie: Familie;
    sportivi: Sportiv[];   // toți sportiviI din aplicație — filtrul se face intern
    plati: Plata[];        // toate plățile — filtrul se face intern
    onViewSportiv?: (s: Sportiv) => void;
}

const fmt = (n: number) =>
    n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RON';

export const FamilyPaymentCard: React.FC<Props> = ({
    familie, sportivi, plati, onViewSportiv,
}) => {
    const membrii = sportivi.filter(s => s.familie_id === familie.id);
    const memberIds = new Set(membrii.map(s => s.id));

    // Plăți alocate direct familiei SAU oricărui membru
    const familyPlati = plati.filter(p =>
        p.familie_id === familie.id || (p.sportiv_id !== null && memberIds.has(p.sportiv_id))
    );

    if (familyPlati.length === 0) return null;

    const totalDatorat  = familyPlati.reduce((s, p) => s + p.suma, 0);
    const totalAchitat  = familyPlati.filter(p => p.status === 'Achitat').reduce((s, p) => s + p.suma, 0);
    const totalRestant  = familyPlati.filter(p => p.status !== 'Achitat').reduce((s, p) => s + p.suma, 0);
    const restante      = familyPlati.filter(p => p.status !== 'Achitat');
    const nrRestante    = restante.length;
    const isLaZi        = nrRestante === 0;

    return (
        <div className={`bg-slate-900 border rounded-xl overflow-hidden
            ${isLaZi ? 'border-emerald-800/30' : 'border-rose-800/40'}`}>

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/30 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                    <UsersIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-white font-bold text-sm">Familia {familie.nume}</span>
                    <span className="text-xs text-slate-500">
                        · {membrii.length} {membrii.length === 1 ? 'sportiv' : 'sportivi'}
                    </span>
                </div>
                <span className={`flex items-center gap-1 text-xs font-bold ${isLaZi ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isLaZi
                        ? <><CheckCircleIcon className="w-3.5 h-3.5" />La zi</>
                        : <><ExclamationTriangleIcon className="w-3.5 h-3.5" />{nrRestante} restante</>
                    }
                </span>
            </div>

            {/* ── Membrii pill-uri ── */}
            {membrii.length > 0 && (
                <div className="px-4 py-2.5 border-b border-slate-800/40 flex flex-wrap gap-1.5">
                    {membrii.map(s => {
                        const hasRestanta = familyPlati.some(
                            p => p.sportiv_id === s.id && p.status !== 'Achitat'
                        );
                        return (
                            <button
                                key={s.id}
                                onClick={() => onViewSportiv?.(s)}
                                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors
                                    ${hasRestanta
                                        ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                                        : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                                    } ${onViewSportiv ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                                {s.nume} {s.prenume}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Sumar financiar 3 coloane ── */}
            <div className="grid grid-cols-3 divide-x divide-slate-800/50">
                <div className="px-3 py-3 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Total emis</p>
                    <p className="text-sm font-bold text-white">{fmt(totalDatorat)}</p>
                </div>
                <div className="px-3 py-3 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Achitat</p>
                    <p className="text-sm font-bold text-emerald-400">{fmt(totalAchitat)}</p>
                </div>
                <div className="px-3 py-3 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Rest</p>
                    <p className={`text-sm font-bold ${totalRestant > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                        {fmt(totalRestant)}
                    </p>
                </div>
            </div>

            {/* ── Plăți restante (colapsate) ── */}
            {nrRestante > 0 && (
                <div className="border-t border-slate-800/50 max-h-52 overflow-y-auto divide-y divide-slate-800/40">
                    {restante.map(p => {
                        const ds = getDisplayStatus(p);
                        const cfg = STATUS_DISPLAY_CONFIG[ds];
                        return (
                            <div key={p.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm text-white truncate">{p.descriere}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {new Date(p.data.toString().slice(0, 10)).toLocaleDateString('ro-RO')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                                        {cfg.label}
                                    </span>
                                    <span className="text-sm font-bold text-white whitespace-nowrap">
                                        {fmt(p.suma)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
