import React from 'react';
import { Button, Card } from '../ui';
import { CalendarDaysIcon, UsersIcon, CheckCircleIcon } from '../icons';
import { useAttendanceData } from '../../hooks/useAttendanceData';

export const DashboardPrezentaAzi: React.FC<{
    onSelectAntrenament: (id: string) => void;
    onMassGenerator: () => void;
    clubId: string | null;
}> = ({ onSelectAntrenament, onMassGenerator, clubId }) => {
    const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const { todaysTrainings, loading } = useAttendanceData(clubId, false, { date: today });

    const totalAsteptati = todaysTrainings.reduce((acc, a) => acc + (a.sportivi_count || 0), 0);
    const totalPrezenti = todaysTrainings.reduce((acc, a) => acc + (a.prezenta?.filter((p: any) => p.status?.este_prezent === true).length || 0), 0);
    const pctGlobal = totalAsteptati > 0 ? Math.round((totalPrezenti / totalAsteptati) * 100) : 0;

    return (
        <div className="space-y-4 md:space-y-6 animate-fade-in">
            {/* Stats bar */}
            {!loading && todaysTrainings.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    <Card className="p-3 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Antrenamente</p>
                        <p className="text-2xl font-black text-white">{todaysTrainings.length}</p>
                    </Card>
                    <Card className="p-3 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Așteptați</p>
                        <p className="text-2xl font-black text-white">{totalAsteptati}</p>
                    </Card>
                    <Card className="p-3 text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Prezenți</p>
                        <p className="text-2xl font-black text-emerald-400">{totalPrezenti}</p>
                    </Card>
                </div>
            )}

            {/* Global progress */}
            {!loading && todaysTrainings.length > 0 && totalAsteptati > 0 && (
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>Prezență globală astăzi</span>
                        <span className="font-bold text-slate-300">{pctGlobal}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                            style={{ width: `${pctGlobal}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Training list */}
            <Card className="border-none shadow-xl bg-slate-900/40 backdrop-blur-sm overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <CalendarDaysIcon className="w-5 h-5 text-indigo-400" />
                        Programul de azi
                    </h2>
                    <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20">
                        {new Date().toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                </div>
                <div className="p-4">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-500" />
                        </div>
                    ) : todaysTrainings.length === 0 ? (
                        <div className="text-center py-10">
                            <CalendarDaysIcon className="w-10 h-10 text-slate-700 mx-auto mb-3 opacity-20" />
                            <p className="text-slate-500 italic text-sm">Niciun antrenament programat pentru astăzi.</p>
                            <button
                                onClick={onMassGenerator}
                                className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                Generează program →
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {todaysTrainings.map(a => {
                                const prezenti = (a.prezenta?.filter((p: any) => p.status?.este_prezent === true).length) || 0;
                                const total = a.sportivi_count || 0;
                                const pct = total > 0 ? Math.round((prezenti / total) * 100) : 0;
                                const isBifat = prezenti > 0;

                                return (
                                    <div
                                        key={a.id}
                                        className="group flex items-center gap-3 p-3 bg-slate-800/30 hover:bg-slate-800/60 rounded-xl border border-slate-700/50 hover:border-indigo-500/30 transition-all cursor-pointer"
                                        onClick={() => onSelectAntrenament(a.id)}
                                    >
                                        {/* Time badge */}
                                        <div className="w-12 h-12 shrink-0 rounded-xl bg-indigo-500/10 flex flex-col items-center justify-center text-indigo-400 border border-indigo-500/20">
                                            <span className="text-xs font-black leading-none">{a.ora_start?.slice(0, 5)}</span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-white text-sm truncate">{a.nume_grupa || 'Grupă necunoscută'}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {total > 0 && (
                                                    <>
                                                        <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="text-[10px] text-slate-500 shrink-0">{prezenti}/{total}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status */}
                                        {isBifat ? (
                                            <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                                        ) : (
                                            <span className="text-xs text-indigo-400 font-bold shrink-0 group-hover:underline">Bifează →</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};
