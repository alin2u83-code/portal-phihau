import React, { useMemo } from 'react';
import { User, Antrenament, View } from '../types';
import { Card, Button } from './ui';

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


interface AttendanceTrackerProps {
    currentUser: User;
    antrenamente: Antrenament[];
    onNavigate: (view: View) => void;
}

export const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ currentUser, antrenamente, onNavigate }) => {
    
    const { attendancePercentage, totalAttended } = useMemo(() => {
        const now = new Date();
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(now.getDate() - 60);

        const relevantTrainings = antrenamente.filter(a => {
            const trainingDate = new Date(a.data + "T00:00:00");
            return (a.grupa_id === currentUser.grupa_id || (currentUser.participa_vacanta && a.grupa_id === null)) && trainingDate <= now && trainingDate >= sixtyDaysAgo;
        });

        const attended = relevantTrainings.filter(a => a.sportivi_prezenti_ids.includes(currentUser.id)).length;
        const percentage = relevantTrainings.length > 0 ? Math.round((attended / relevantTrainings.length) * 100) : 0;

        return { attendancePercentage: percentage, totalAttended: attended };
    }, [antrenamente, currentUser]);


    return (
        <Card className="bg-slate-800/50 backdrop-blur-sm border border-amber-300/20 p-6 flex flex-col items-center">
            <h3 className="text-xl font-bold text-white mb-4">Oglinda Perseverenței</h3>
            <ProgressRing percentage={attendancePercentage} totalAttended={totalAttended} />
            <p className="mt-4 text-lg text-center font-bold text-slate-300">
                Frecvență de <span className="text-amber-300">{attendancePercentage}%</span> în ultimele 60 de zile.
            </p>
            <div className="mt-6 pt-4 border-t border-amber-300/20 w-full">
                <Button onClick={() => onNavigate('istoric-prezenta')} variant="secondary" className="w-full">
                    Vezi Istoric Detaliat
                </Button>
            </div>
        </Card>
    );
};