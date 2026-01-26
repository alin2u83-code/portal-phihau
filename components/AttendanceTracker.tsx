import React, { useMemo } from 'react';
import { User, Antrenament } from '../types';
import { Card } from './ui';
import { CalendarDaysIcon } from './icons';

// Tip local pentru a reprezenta o înregistrare de prezență procesată
interface AttendanceRecord {
    date: string;
    status: 'Prezent' | 'Absent';
}

interface AttendanceTrackerProps {
    currentUser: User;
    antrenamente: Antrenament[];
}

export const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ currentUser, antrenamente }) => {
    
    // Procesează antrenamentele relevante din ultimele 60 de zile
    const attendanceData = useMemo(() => {
        const today = new Date();
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(today.getDate() - 60);

        const relevantTrainings = antrenamente
            .filter(a => {
                const trainingDate = new Date(a.data);
                return trainingDate >= sixtyDaysAgo && trainingDate <= today &&
                       (a.grupa_id === currentUser.grupa_id || (currentUser.participa_vacanta && a.grupa_id === null));
            });
        
        return relevantTrainings
            .map(training => ({
                date: training.data,
                status: training.sportivi_prezenti_ids.includes(currentUser.id) ? 'Prezent' : 'Absent'
            } as AttendanceRecord))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [currentUser, antrenamente]);

    // Calculează procentajul de prezență pentru luna curentă
    const attendancePercentage = useMemo(() => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const trainingsThisMonth = attendanceData.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
        });

        if (trainingsThisMonth.length === 0) return 100;

        const attendedThisMonth = trainingsThisMonth.filter(r => r.status === 'Prezent').length;
        return Math.round((attendedThisMonth / trainingsThisMonth.length) * 100);
    }, [attendanceData]);

    // Generează starea pentru fiecare din ultimele 30 de zile pentru afișajul vizual
    const last30Days = useMemo(() => {
        const days = [];
        const dataMap = new Map(attendanceData.map(d => [d.date, d.status]));
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            
            let status: 'Prezent' | 'Absent' | 'Viitor' | 'FaraAntrenament' = 'FaraAntrenament';
            if (date > today) {
                status = 'Viitor';
            } else if (dataMap.has(dateString)) {
                status = dataMap.get(dateString)!;
            }

            days.push({ date, status });
        }
        return days.reverse();
    }, [attendanceData]);

    return (
        <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5 text-brand-secondary" />
                Monitor Prezență
            </h3>
            <div className="flex justify-between items-center my-4">
                <span className="text-sm text-slate-400">Rata de prezență (luna curentă):</span>
                <span className="text-2xl font-bold text-green-400">{attendancePercentage}%</span>
            </div>
            
            <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2 text-center">Ultimele 30 de zile</p>
                <div className="grid grid-cols-10 gap-2">
                    {last30Days.map(({ date, status }) => {
                        let colorClass = 'bg-slate-700/50'; // FaraAntrenament
                        if (status === 'Prezent') colorClass = 'bg-green-500';
                        if (status === 'Absent') colorClass = 'bg-red-500';
                        if (status === 'Viitor') colorClass = 'bg-slate-600';

                        return (
                            <div key={date.toISOString()} title={`${date.toLocaleDateString('ro-RO')} - ${status}`}
                                 className={`h-5 w-full rounded-sm ${colorClass}`}>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <div className="max-h-48 overflow-y-auto space-y-2 border-t border-slate-700 pt-4">
                {attendanceData.map(record => (
                    <div key={record.date} className="flex justify-between items-center text-sm">
                        <span className="text-slate-300">
                            {new Date(record.date + 'T00:00:00').toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                        <span className={`font-bold ${record.status === 'Prezent' ? 'text-green-400' : 'text-red-400'}`}>
                            {record.status}
                        </span>
                    </div>
                ))}
                 {attendanceData.length === 0 && (
                    <p className="text-center text-slate-500 italic py-4">Nicio prezență înregistrată în ultimele 60 de zile.</p>
                )}
            </div>
        </Card>
    );
};