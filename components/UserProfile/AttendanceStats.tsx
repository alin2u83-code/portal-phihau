import React, { useMemo } from 'react';
import { Antrenament, Sportiv } from '../../types';
import { Card } from '../ui';
import { ChartBarIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '../icons';

interface AttendanceStatsProps {
    sportiv: Sportiv;
    antrenamente: Antrenament[];
}

export const AttendanceStats: React.FC<AttendanceStatsProps> = ({ sportiv, antrenamente }) => {
    const stats = useMemo(() => {
        if (!antrenamente || !sportiv) return null;

        const now = new Date();
        const relevantTrainings = antrenamente.filter(a => {
            const trainingDate = new Date(`${(a.data || '').toString().slice(0, 10)}T${a.ora_start || '00:00'}`);
            if (trainingDate > now) return false;
            
            const isInGroup = a.grupa_id === sportiv.grupa_id;
            const isVacationTraining = sportiv.participa_vacanta && a.grupa_id === null;
            
            return isInGroup || isVacationTraining;
        });

        const totalSessions = relevantTrainings.length;
        const presences = relevantTrainings.filter(a =>
            (a.prezenta || []).some(p => p.sportiv_id === sportiv.id && p.status?.este_prezent === true)
        ).length;

        const absences = relevantTrainings.filter(a =>
            (a.prezenta || []).some(p => p.sportiv_id === sportiv.id && p.status?.este_prezent === false)
        ).length;

        // Attendance by month for the last 6 months
        const monthlyData: Record<string, { total: number; present: number }> = {};
        const monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'];
        
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            monthlyData[key] = { total: 0, present: 0 };
        }

        relevantTrainings.forEach(a => {
            const d = new Date(a.data);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            if (monthlyData[key]) {
                monthlyData[key].total++;
                if ((a.prezenta || []).some(p => p.sportiv_id === sportiv.id && p.status?.este_prezent === true)) {
                    monthlyData[key].present++;
                }
            }
        });

        const chartData = Object.entries(monthlyData).map(([key, data]) => {
            const [year, month] = key.split('-');
            return {
                label: `${monthNames[parseInt(month) - 1]}`,
                percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
                total: data.total,
                present: data.present
            };
        });

        return {
            totalSessions,
            presences,
            absences,
            percentage: totalSessions > 0 ? Math.round((presences / totalSessions) * 100) : 0,
            chartData
        };
    }, [sportiv, antrenamente]);

    if (!stats) return null;

    return (
        <Card className="overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-indigo-400" />
                    Statistici Prezență
                </h3>
            </div>

            <div className="flex flex-col items-center mb-8">
                <div className="relative w-32 h-32">
                    {/* Circular Progress */}
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="64"
                            cy="64"
                            r="58"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-slate-800"
                        />
                        <circle
                            cx="64"
                            cy="64"
                            r="58"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={364.4}
                            strokeDashoffset={364.4 - (364.4 * stats.percentage) / 100}
                            strokeLinecap="round"
                            className="text-indigo-500 transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-white">{stats.percentage}%</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Prezență</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 text-center">
                    <div className="flex justify-center mb-1">
                        <ClockIcon className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total</p>
                    <p className="text-lg font-bold text-white">{stats.totalSessions}</p>
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center">
                    <div className="flex justify-center mb-1">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-[10px] text-emerald-500 uppercase font-bold tracking-wider">Prezent</p>
                    <p className="text-lg font-bold text-emerald-400">{stats.presences}</p>
                </div>
                <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 text-center">
                    <div className="flex justify-center mb-1">
                        <XCircleIcon className="w-4 h-4 text-rose-400" />
                    </div>
                    <p className="text-[10px] text-rose-500 uppercase font-bold tracking-wider">Absent</p>
                    <p className="text-lg font-bold text-rose-400">{stats.absences}</p>
                </div>
            </div>

            <div className="space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Evoluție lunară (%)</p>
                <div className="flex items-end justify-between h-32 gap-2 px-2">
                    {stats.chartData.map((data, idx) => (
                        <div key={idx} className="flex-grow flex flex-col items-center gap-2 group relative">
                            <div className="w-full bg-slate-800 rounded-t-md overflow-hidden flex flex-col justify-end h-24">
                                <div 
                                    className="bg-indigo-500/60 group-hover:bg-indigo-400 transition-all duration-500 rounded-t-sm"
                                    style={{ height: `${data.percentage}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{data.label}</span>
                            
                            {/* Tooltip */}
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 border border-slate-700 shadow-xl">
                                {data.present}/{data.total} prezențe ({data.percentage}%)
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};
