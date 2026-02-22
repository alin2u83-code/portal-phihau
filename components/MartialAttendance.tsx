import React, { useMemo } from 'react';
import { User, Antrenament, Grupa } from '../types';
import { Button } from './ui';
import { ArrowLeftIcon } from './icons';

interface AttendanceRecord {
    date: Date;
    time: string;
    groupName: string;
    status: 'Prezent' | 'Absent';
}

interface ProgressRingProps {
    percentage: number;
    totalAttended: number;
}

const ProgressRing: React.FC<ProgressRingProps> = ({ percentage, totalAttended }) => {
    const radius = 80;
    const stroke = 12;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-52 h-52">
            <svg
                height={radius * 2}
                width={radius * 2}
                className="transform -rotate-90"
                style={{ filter: 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.4))' }}
            >
                <circle
                    stroke="#374155"
                    fill="transparent"
                    strokeWidth={stroke}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                <circle
                    stroke="#d4af37"
                    fill="transparent"
                    strokeWidth={stroke}
                    strokeDasharray={circumference + ' ' + circumference}
                    style={{ strokeDashoffset }}
                    strokeLinecap="round"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                    className="transition-all duration-1000 ease-in-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                 <span className="text-6xl font-black text-white tracking-tighter" style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
                    {totalAttended}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prezențe</span>
            </div>
        </div>
    );
};


interface MartialAttendanceProps {
    currentUser: User;
    antrenamente: Antrenament[];
    grupe: Grupa[];
    onBack: () => void;
}

export const MartialAttendance: React.FC<MartialAttendanceProps> = ({ currentUser, antrenamente, grupe, onBack }) => {

    const { records, attendancePercentage, totalAttended } = useMemo(() => {
        const now = new Date();
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(now.getDate() - 60);

        const relevantTrainings = antrenamente
            .filter(a => {
                const trainingDate = new Date(a.data + "T00:00:00");
                return (a.grupa_id === currentUser.grupa_id || (currentUser.participa_vacanta && a.grupa_id === null)) && trainingDate <= now && trainingDate >= sixtyDaysAgo;
            });
        
        const processedRecords: AttendanceRecord[] = relevantTrainings
            .map((a): AttendanceRecord => ({
                date: new Date(a.data + "T00:00:00"),
                time: a.ora_start,
                groupName: grupe.find(g => g.id === a.grupa_id)?.denumire || 'Antrenament Liber',
                status: a.prezenta.some(p => p.sportiv_id === currentUser.id) ? 'Prezent' : 'Absent'
            }))
            .sort((a, b) => b.date.getTime() - a.date.getTime());

        const attended = processedRecords.filter(r => r.status === 'Prezent').length;
        const percentage = processedRecords.length > 0 ? Math.round((attended / processedRecords.length) * 100) : 0;

        return { records: processedRecords, attendancePercentage: percentage, totalAttended: attended };
    }, [antrenamente, currentUser, grupe]);

    const StatusIndicator: React.FC<{ status: 'Prezent' | 'Absent' }> = ({ status }) => {
        if (status === 'Prezent') {
            return <div className="w-4 h-4 rounded-full bg-green-400" style={{ boxShadow: '0 0 8px #22c55e' }}></div>;
        }
        return <div className="w-4 h-4 rounded-full bg-red-500 opacity-50"></div>;
    };
    
    return (
        <div className="space-y-8 font-sans tracking-wide">
            <header className="flex flex-col items-center justify-center py-6 animate-fade-in-down">
                <ProgressRing percentage={attendancePercentage} totalAttended={totalAttended} />
                <p className="mt-4 text-xl font-bold text-slate-300">
                    Frecvență de <span className="text-amber-300">{attendancePercentage}%</span> în ultimele 60 de zile.
                </p>
            </header>

            <div className="space-y-3">
                {records.map((item, index) => (
                    <div
                        key={item.date.toISOString() + item.time}
                        className="flex items-center p-3 bg-slate-800/30 backdrop-blur-sm border border-amber-300/20 rounded-lg transition-transform duration-300 hover:scale-[1.02] hover:border-amber-300/50 animate-fade-in-down"
                        style={{ animationDelay: `${150 + index * 50}ms` }}
                    >
                        <div className="flex flex-col items-center justify-center w-16 h-16 rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-300 flex-shrink-0">
                            <span className="text-2xl font-black">{item.date.toLocaleDateString('ro-RO', { day: '2-digit' })}</span>
                            <span className="text-xs font-bold uppercase">{item.date.toLocaleDateString('ro-RO', { month: 'short' })}</span>
                        </div>
                        <div className="flex-grow mx-4">
                            <p className="font-bold text-white text-lg">{item.groupName}</p>
                            <p className="text-sm text-slate-400 font-mono">Ora {item.time}</p>
                        </div>
                        <div className="flex-shrink-0">
                            <StatusIndicator status={item.status} />
                        </div>
                    </div>
                ))}
                {records.length === 0 && (
                    <div className="text-center py-16 animate-fade-in-down">
                        <p className="text-slate-500 italic">Nicio activitate înregistrată în ultimele 60 de zile.</p>
                    </div>
                )}
            </div>
        </div>
    );
};