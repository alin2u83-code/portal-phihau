import React, { useMemo, useState } from 'react';
import { User, Antrenament, Grupa } from '../types';
import { Button, Card } from './ui';
import { ArrowLeftIcon, CalendarDaysIcon, CheckCircleIcon, XCircleIcon } from './icons';

interface AttendanceRecord {
    id: string;
    date: Date;
    time: string;
    groupName: string;
    status: 'Prezent' | 'Absent';
    type: string;
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
                style={{ filter: 'drop-shadow(0 0 10px rgba(77, 188, 233, 0.4))' }}
            >
                <circle
                    stroke="#1e293b"
                    fill="transparent"
                    strokeWidth={stroke}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                <circle
                    stroke="#4DBCE9"
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
                 <span className="text-6xl font-black text-white tracking-tighter" style={{ textShadow: '0 0 10px rgba(77, 188, 233, 0.3)' }}>
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
    const [limit, setLimit] = useState(20);

    const { records, attendancePercentage, totalAttended } = useMemo(() => {
        const now = new Date();
        
        // Filter logic:
        // 1. All trainings where user is PRESENT
        // 2. All trainings of user's GROUP (past only) where user is ABSENT
        
        const allRecords: AttendanceRecord[] = [];
        
        (antrenamente || []).forEach(a => {
            const trainingDate = new Date(a.data + "T00:00:00");
            if (trainingDate > now) return; // Skip future trainings

            const isPresent = a.prezenta.some(p => p.sportiv_id === currentUser.id);
            const isMyGroup = a.grupa_id === currentUser.grupa_id;
            
            if (isPresent || isMyGroup) {
                const groupName = grupe.find(g => g.id === a.grupa_id)?.denumire || 'Antrenament';
                allRecords.push({
                    id: a.id,
                    date: trainingDate,
                    time: a.ora_start,
                    groupName: groupName,
                    status: isPresent ? 'Prezent' : 'Absent',
                    type: a.grupa_id ? 'Antrenament Grup' : 'Antrenament Individual'
                });
            }
        });

        const sortedRecords = allRecords.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        // Calculate stats based on ALL history (not just displayed)
        const attended = sortedRecords.filter(r => r.status === 'Prezent').length;
        const totalRelevant = sortedRecords.length;
        const percentage = totalRelevant > 0 ? Math.round((attended / totalRelevant) * 100) : 0;

        return { records: sortedRecords, attendancePercentage: percentage, totalAttended: attended };
    }, [antrenamente, currentUser, grupe]);

    const displayedRecords = records.slice(0, limit);

    const StatusIndicator: React.FC<{ status: 'Prezent' | 'Absent' }> = ({ status }) => {
        if (status === 'Prezent') {
            return (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/50 text-green-400 text-xs font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                    <CheckCircleIcon className="w-4 h-4" />
                    Prezent
                </div>
            );
        }
        return (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-bold uppercase tracking-wider">
                <XCircleIcon className="w-4 h-4" />
                Absent
            </div>
        );
    };
    
    return (
        <div className="space-y-8 font-sans tracking-wide">
            <div className="flex items-center gap-4">
                <Button variant="secondary" onClick={onBack}>
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />
                    Înapoi la Dashboard
                </Button>
                <h1 className="text-2xl font-bold text-white uppercase">Istoric Prezență</h1>
            </div>

            <header className="flex flex-col md:flex-row items-center justify-center gap-8 py-6 animate-fade-in-down bg-slate-800/30 rounded-2xl border border-slate-700/50 p-8">
                <ProgressRing percentage={attendancePercentage} totalAttended={totalAttended} />
                <div className="text-center md:text-left max-w-md">
                    <h2 className="text-3xl font-bold text-white mb-2">Statistici Generale</h2>
                    <p className="text-lg text-slate-300">
                        Ai participat la <span className="text-[#4DBCE9] font-bold text-2xl">{totalAttended}</span> antrenamente dintr-un total de <span className="font-bold text-white">{records.length}</span> planificate pentru grupa ta.
                    </p>
                    <div className="mt-4 h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-[#4DBCE9] transition-all duration-1000" style={{ width: `${attendancePercentage}%` }}></div>
                    </div>
                    <p className="text-right text-xs text-[#4DBCE9] mt-1 font-bold">{attendancePercentage}% Rată de prezență</p>
                </div>
            </header>

            <div className="space-y-3">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <CalendarDaysIcon className="w-5 h-5 text-[#4DBCE9]" />
                    Activitate Recentă
                </h3>
                
                {displayedRecords.map((item, index) => (
                    <div
                        key={item.id}
                        className={`flex flex-col md:flex-row md:items-center p-4 rounded-xl border transition-all duration-300 hover:scale-[1.01] animate-fade-in-down ${
                            item.status === 'Prezent' 
                                ? 'bg-slate-800/40 border-slate-700 hover:border-[#4DBCE9]/50' 
                                : 'bg-red-900/10 border-red-900/30 hover:border-red-500/30'
                        }`}
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <div className="flex items-center gap-4 mb-3 md:mb-0 md:w-1/4">
                            <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg border flex-shrink-0 ${
                                item.status === 'Prezent' ? 'bg-[#4DBCE9]/10 border-[#4DBCE9]/30 text-[#4DBCE9]' : 'bg-slate-700/50 border-slate-600 text-slate-400'
                            }`}>
                                <span className="text-xl font-black">{item.date.toLocaleDateString('ro-RO', { day: '2-digit' })}</span>
                                <span className="text-[10px] font-bold uppercase">{item.date.toLocaleDateString('ro-RO', { month: 'short' })}</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400 font-mono">{item.date.toLocaleDateString('ro-RO', { weekday: 'long' })}</p>
                                <p className="text-xs text-slate-500">{item.time}</p>
                            </div>
                        </div>
                        
                        <div className="flex-grow md:px-4 mb-3 md:mb-0">
                            <p className="font-bold text-white text-lg">{item.groupName}</p>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">{item.type}</p>
                        </div>
                        
                        <div className="flex-shrink-0 flex justify-end">
                            <StatusIndicator status={item.status} />
                        </div>
                    </div>
                ))}

                {records.length === 0 && (
                    <div className="text-center py-16 bg-slate-800/20 rounded-xl border border-dashed border-slate-700">
                        <p className="text-slate-500 italic">Nu există date de prezență înregistrate.</p>
                    </div>
                )}
                
                {records.length > limit && (
                    <div className="flex justify-center pt-4">
                        <Button variant="secondary" onClick={() => setLimit(prev => prev + 20)}>
                            Încarcă mai multe
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};