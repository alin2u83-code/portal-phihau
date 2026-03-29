import React, { useMemo } from 'react';
import { InscriereExamen, SesiuneExamen, Grad, Sportiv } from '../../types';
import { Button, Card } from '../ui';
import { TrophyIcon, CheckCircleIcon, XCircleIcon, ClockIcon, ChevronRightIcon } from '../icons';

interface ExamHistoryProps {
    sportiv: Sportiv;
    participari: InscriereExamen[];
    examene: SesiuneExamen[];
    grade: Grad[];
    onNavigateToExam?: (sesiuneId: string) => void;
}

export const ExamHistory: React.FC<ExamHistoryProps> = ({ sportiv, participari, examene, grade, onNavigateToExam }) => {
    const history = useMemo(() => {
        if (!participari || !examene || !grade || !sportiv) return [];

        return (participari || [])
            .filter(p => p.sportiv_id === sportiv.id)
            .map(p => {
                const examen = (examene || []).find(e => e.id === p.sesiune_id);
                const grad = (grade || []).find(g => g.id === p.grad_sustinut_id);
                return {
                    ...p,
                    examen,
                    grad,
                    date: examen ? new Date((examen.data || '').toString().slice(0, 10)) : null
                };
            })
            .sort((a, b) => {
                if (!a.date || !b.date) return 0;
                return b.date.getTime() - a.date.getTime();
            });
    }, [sportiv, participari, examene, grade]);

    const summary = useMemo(() => {
        const total = history.length;
        const admitted = history.filter(h => h.rezultat === 'Admis').length;
        const pending = history.filter(h => !h.rezultat).length;
        return { total, admitted, pending };
    }, [history]);

    if (history.length === 0) {
        return (
            <Card>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <TrophyIcon className="w-5 h-5 text-amber-400" />
                    Istoric Examene
                </h3>
                <p className="text-sm text-slate-500 italic text-center py-8">Nu există participări la examene înregistrate.</p>
            </Card>
        );
    }

    return (
        <Card>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrophyIcon className="w-5 h-5 text-amber-400" />
                    Istoric Examene
                </h3>
                <div className="flex gap-3">
                    <div className="text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Total</p>
                        <p className="text-sm font-bold text-white">{summary.total}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-emerald-500 uppercase font-bold">Admis</p>
                        <p className="text-sm font-bold text-emerald-400">{summary.admitted}</p>
                    </div>
                    {summary.pending > 0 && (
                        <div className="text-center">
                            <p className="text-[10px] text-amber-500 uppercase font-bold">În curs</p>
                            <p className="text-sm font-bold text-amber-400">{summary.pending}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                {history.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                            item.rezultat === 'Admis' ? 'bg-emerald-500/20 text-emerald-400' : 
                            item.rezultat === 'Respins' ? 'bg-rose-500/20 text-rose-400' : 
                            'bg-slate-700/50 text-slate-400'
                        }`}>
                            {item.rezultat === 'Admis' ? <CheckCircleIcon className="w-6 h-6" /> : 
                             item.rezultat === 'Respins' ? <XCircleIcon className="w-6 h-6" /> : 
                             <ClockIcon className="w-6 h-6" />}
                        </div>
                        
                        <div className="flex-grow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-white">{item.grad?.nume || 'Grad necunoscut'}</h4>
                                    <p className="text-xs text-slate-400">{item.examen?.locatie_nume || item.examen?.localitate || 'Locație nespecificată'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-white">{item.date ? item.date.toLocaleDateString('ro-RO') : 'Dată necunoscută'}</p>
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                        item.rezultat === 'Admis' ? 'bg-emerald-500/20 text-emerald-400' : 
                                        item.rezultat === 'Respins' ? 'bg-rose-500/20 text-rose-400' : 
                                        'bg-slate-700 text-slate-400'
                                    }`}>
                                        {item.rezultat || 'În așteptare'}
                                    </span>
                                </div>
                            </div>
                            
                            {(item.nota_tehnica || item.nota_forta || item.nota_viteza || item.nota_atitudine) && (
                                <div className="mt-3 flex flex-wrap gap-3">
                                    {item.nota_tehnica && <div className="text-[10px] text-slate-400"><span className="font-bold text-slate-300">Tehnică:</span> {item.nota_tehnica}</div>}
                                    {item.nota_forta && <div className="text-[10px] text-slate-400"><span className="font-bold text-slate-300">Forță:</span> {item.nota_forta}</div>}
                                    {item.nota_viteza && <div className="text-[10px] text-slate-400"><span className="font-bold text-slate-300">Viteză:</span> {item.nota_viteza}</div>}
                                    {item.nota_atitudine && <div className="text-[10px] text-slate-400"><span className="font-bold text-slate-300">Atitudine:</span> {item.nota_atitudine}</div>}
                                </div>
                            )}
                            
                            {item.observatii && (
                                <p className="mt-2 text-xs text-slate-500 italic">"{item.observatii}"</p>
                            )}

                            {onNavigateToExam && item.sesiune_id && (
                                <div className="mt-3 pt-3 border-t border-slate-700/50">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => onNavigateToExam(item.sesiune_id!)}
                                        className="text-xs"
                                    >
                                        Deschide Examenul <ChevronRightIcon className="w-3 h-3 ml-1" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};
