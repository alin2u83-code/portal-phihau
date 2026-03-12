import React from 'react';
import { Button, Card } from '../ui';
import { CalendarDaysIcon, UsersIcon, CheckCircleIcon } from '../icons';
import { useAttendanceData } from '../../hooks/useAttendanceData';

export const DashboardPrezentaAzi: React.FC<{ 
    onSelectAntrenament: (id: string) => void;
    onViewGrupe: () => void;
    onGlobalHistory: () => void;
    onMassGenerator: () => void;
    clubId: string | null;
}> = ({ onSelectAntrenament, onViewGrupe, onGlobalHistory, onMassGenerator, clubId }) => {
    const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const { todaysTrainings, loading } = useAttendanceData(clubId, false, { date: today });

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Prezență Astăzi</h1>
                    <p className="text-slate-400 mt-1">
                        {new Date().toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onViewGrupe}>
                        <UsersIcon className="w-5 h-5 mr-2 text-indigo-400" />
                        Vezi Grupe
                    </Button>
                    <Button variant="secondary" onClick={onGlobalHistory}>
                        <CalendarDaysIcon className="w-5 h-5 mr-2 text-purple-400" />
                        Istoric Global
                    </Button>
                    <Button variant="primary" onClick={onMassGenerator}>
                        <CalendarDaysIcon className="w-5 h-5 mr-2 text-emerald-400" />
                        Generator Masiv
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-xl bg-slate-900/40 backdrop-blur-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <CalendarDaysIcon className="w-6 h-6 text-indigo-400" />
                                Programul Zilei
                            </h2>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20">
                                    {todaysTrainings.length} Azi
                                </span>
                            </div>
                        </div>
                        <div className="p-6">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                </div>
                            ) : todaysTrainings.length === 0 ? (
                                <div className="space-y-6">
                                    <div className="text-center py-12 bg-slate-800/10 rounded-2xl border border-dashed border-slate-800">
                                        <CalendarDaysIcon className="w-12 h-12 text-slate-700 mx-auto mb-3 opacity-20" />
                                        <p className="text-slate-500 italic">Niciun antrenament programat pentru astăzi.</p>
                                        <p className="text-xs text-slate-600 mt-2">Verifică calendarul sau orarul pentru alte zile.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {todaysTrainings.map(a => (
                                        <div key={a.id} className="group p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row justify-between items-center gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-xl bg-indigo-500/10 flex flex-col items-center justify-center text-indigo-400 border border-indigo-500/20">
                                                    <span className="text-xs font-black uppercase leading-none mb-1">Ora</span>
                                                    <span className="text-sm font-bold">{a.ora_start}</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-white leading-tight">{a.nume_grupa || 'Grupă necunoscută'}</h3>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                        <UsersIcon className="w-3 h-3" />
                                                        {a.sala || 'Sală nespecificată'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button size="sm" onClick={() => onSelectAntrenament(a.id)} className="w-full sm:w-auto shadow-lg shadow-indigo-500/10">
                                                Bifează Prezența &rarr;
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-none shadow-xl bg-slate-900/40 backdrop-blur-sm p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                            Statistici Azi
                        </h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Sportivi Așteptați</p>
                                <p className="text-3xl font-black text-white">
                                    {todaysTrainings.reduce((acc, a) => acc + (a.sportivi_count || 0), 0)}
                                </p>
                            </div>
                            <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Prezențe Înregistrate</p>
                                <p className="text-3xl font-black text-emerald-400">
                                    {todaysTrainings.reduce((acc, a) => acc + (a.prezenta?.length || 0), 0)}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
