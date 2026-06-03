import React from 'react';
import { SportivCard } from './types';
import { formatNume } from '../../../utils/formatareSportiv';

export const SportivInfoCard: React.FC<{
    sportiv: SportivCard;
    esteSelectat: boolean;
    eticheta: 'PRIMAR' | 'SECUNDAR';
    gradeMap: Record<string, string>;
    onClick: () => void;
    disabled?: boolean;
}> = ({ sportiv, esteSelectat, eticheta, gradeMap, onClick, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={esteSelectat}
        className={`
            w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
            ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
            ${esteSelectat
                ? 'border-emerald-500/70 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                : 'border-slate-600/60 bg-slate-800/50 hover:border-slate-500'
            }
        `}
    >
        <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-bold text-white leading-tight">
                    {formatNume(sportiv)}
                </p>
                {sportiv.data_nasterii ? (
                    <p className="text-xs text-slate-400 mt-0.5">
                        Nascut: {sportiv.data_nasterii}
                    </p>
                ) : (
                    <p className="text-xs text-slate-500 italic mt-0.5">fara data nastere</p>
                )}
            </div>
            <span className={`
                shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg border leading-none
                ${esteSelectat
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50'
                    : 'bg-slate-700/60 text-slate-400 border-slate-600/50'
                }
            `}>
                {eticheta}
            </span>
        </div>

        <div className="space-y-1">
            {sportiv.email && (
                <p className="text-xs text-slate-400 truncate">{sportiv.email}</p>
            )}
            {sportiv.cnp && (
                <p className="text-xs text-slate-500">CNP: {sportiv.cnp}</p>
            )}
            {sportiv.grad_actual_id && (
                <p className="text-xs text-sky-400 font-medium">
                    Grad: {gradeMap[sportiv.grad_actual_id] || '—'}
                </p>
            )}
            <div className="flex items-center justify-between mt-1.5">
                <p className="text-[10px] text-slate-600">
                    Inscris: {sportiv.data_inscrierii}
                </p>
                <div className="flex items-center gap-1.5">
                    {sportiv.user_id && (
                        <span className="text-[10px] text-emerald-400 font-medium">cont activ</span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium
                        ${sportiv.status === 'Activ'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700 text-slate-500'
                        }
                    `}>
                        {sportiv.status}
                    </span>
                </div>
            </div>
        </div>
    </button>
);
