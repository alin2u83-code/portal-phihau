import React from 'react';
import { Sportiv, Familie, TipAbonament, Grad, Grupa } from '../../types';
import { Card, Button } from '../ui';
import { UsersIcon, ChevronRightIcon, CheckCircleIcon } from '../icons';
import { GradBadge } from '../../utils/grades';

interface FamilieTabProps {
    sportiv: Sportiv;
    sportivi: Sportiv[];
    familii: Familie[];
    grade: Grad[];
    grupe: Grupa[];
    tipuriAbonament: TipAbonament[];
    onViewSportiv: (s: Sportiv) => void;
}

export const FamilieTab: React.FC<FamilieTabProps> = ({
    sportiv, sportivi, familii, grade, grupe, tipuriAbonament, onViewSportiv
}) => {
    if (!sportiv.familie_id) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <UsersIcon className="w-12 h-12 text-slate-700 mb-3" />
                <p className="text-slate-400 font-medium">Sportivul nu face parte dintr-o familie</p>
                <p className="text-slate-600 text-sm mt-1">Adaugă-l la o familie din secțiunea Familii.</p>
            </div>
        );
    }

    const familie = familii.find(f => f.id === sportiv.familie_id);
    const membri = sportivi.filter(s => s.familie_id === sportiv.familie_id);
    const planFamilie = tipuriAbonament.find(t => t.id === familie?.tip_abonament_id);

    return (
        <div className="space-y-5">
            {/* Header familie */}
            <Card className="border border-slate-700/50 bg-slate-800/40">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <UsersIcon className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Familie</p>
                            <p className="text-lg font-bold text-white">{familie?.nume ?? '—'}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {planFamilie ? (
                            <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-violet-500/20 text-violet-300">
                                <CheckCircleIcon className="w-3.5 h-3.5" />
                                {planFamilie.denumire}
                            </span>
                        ) : (
                            <span className="text-xs px-3 py-1 rounded-full bg-slate-700/60 text-slate-400">
                                Fără plan familie
                            </span>
                        )}
                        <p className="text-xs text-slate-500">{membri.length} membri</p>
                    </div>
                </div>
            </Card>

            {/* Lista membri */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {membri.map(member => {
                    const isCurrent = member.id === sportiv.id;
                    const isRep = familie?.reprezentant_id === member.id;
                    const gradMember = grade.find(g => g.id === member.grad_actual_id) ?? null;
                    const grupaMember = grupe.find(g => g.id === member.grupa_id);

                    return (
                        <div
                            key={member.id}
                            className={`relative flex flex-col gap-3 p-4 rounded-xl border transition-all ${
                                isCurrent
                                    ? 'border-sky-500/40 bg-sky-500/5'
                                    : 'border-slate-700/40 bg-slate-800/30 hover:border-slate-500/60 hover:bg-slate-800/60'
                            }`}
                        >
                            {/* Badge curent */}
                            {isCurrent && (
                                <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400">
                                    Profil curent
                                </span>
                            )}
                            {isRep && !isCurrent && (
                                <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                                    Reprezentant
                                </span>
                            )}

                            {/* Avatar + Nume */}
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-full bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-sm font-bold text-slate-300 ring-2 ring-slate-600/40">
                                    {member.foto_url ? (
                                        <img src={member.foto_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                        `${member.nume?.[0] ?? ''}${member.prenume?.[0] ?? ''}`
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 pr-16">
                                    <p className="font-semibold text-white truncate">{member.nume} {member.prenume}</p>
                                    <p className="text-xs text-slate-500 truncate">{grupaMember?.denumire ?? 'Fără grupă'}</p>
                                </div>
                            </div>

                            {/* Grad + Status */}
                            <div className="flex items-center justify-between gap-2">
                                {gradMember ? (
                                    <GradBadge grad={gradMember} gradName={gradMember.nume} />
                                ) : (
                                    <span className="text-xs text-slate-600 italic">Fără grad</span>
                                )}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    member.status === 'Activ'
                                        ? 'bg-emerald-500/15 text-emerald-400'
                                        : 'bg-slate-700/50 text-slate-500'
                                }`}>
                                    {member.status ?? 'Activ'}
                                </span>
                            </div>

                            {/* Buton navigare */}
                            {!isCurrent && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="w-full mt-1 text-slate-200 hover:text-white border-slate-600/50 hover:border-slate-400/60"
                                    onClick={() => onViewSportiv(member)}
                                >
                                    Deschide Profil
                                    <ChevronRightIcon className="w-3.5 h-3.5 ml-1.5" />
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
