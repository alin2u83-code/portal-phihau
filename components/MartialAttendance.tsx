import React, { useMemo, useEffect } from 'react';
import { User } from '../types';
import { Button } from './ui';
import { ArrowLeftIcon, CalendarDaysIcon } from './icons';
import { useDataProvider } from '../hooks/useDataProvider';
import { TabelPrezentaVedere } from './TabelPrezentaVedere';

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
    onBack: () => void;
}

export const MartialAttendance: React.FC<MartialAttendanceProps> = ({ currentUser, onBack }) => {
    const { istoricPrezenta, fetchIstoricVedere, loadingIstoric } = useDataProvider();

    useEffect(() => {
        if (currentUser?.id) {
            fetchIstoricVedere(currentUser.id);
        }
    }, [currentUser?.id, fetchIstoricVedere]);

    const { attendancePercentage, totalAttended } = useMemo(() => {
        if (!istoricPrezenta) return { attendancePercentage: 0, totalAttended: 0 };

        const attended = istoricPrezenta.filter(r => r.status?.toLowerCase() === 'prezent').length;
        const totalRelevant = istoricPrezenta.length;
        const percentage = totalRelevant > 0 ? Math.round((attended / totalRelevant) * 100) : 0;

        return { attendancePercentage: percentage, totalAttended: attended };
    }, [istoricPrezenta]);
    
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
                        Ai participat la <span className="text-[#4DBCE9] font-bold text-2xl">{totalAttended}</span> antrenamente dintr-un total de <span className="font-bold text-white">{istoricPrezenta?.length || 0}</span> planificate pentru grupa ta.
                    </p>
                    <div className="mt-4 h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-[#4DBCE9] transition-all duration-1000" style={{ width: `${attendancePercentage}%` }}></div>
                    </div>
                    <p className="text-right text-xs text-[#4DBCE9] mt-1 font-bold">{attendancePercentage}% Rată de prezență</p>
                </div>
            </header>

            <div className="space-y-3">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                    <CalendarDaysIcon className="w-5 h-5 text-[#4DBCE9]" />
                    Activitate Recentă
                </h3>
                
                <TabelPrezentaVedere istoricPrezenta={istoricPrezenta} loading={loadingIstoric} />
            </div>
        </div>
    );
};