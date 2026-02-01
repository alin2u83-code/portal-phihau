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
                style={{ filter: 'drop-shadow(0 0 10px rgba(74, 222, 128, 0.4))' }}
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
                    stroke="#4ade80"
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
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-lime-400 flex flex-col items-center justify-center shadow-[0_0_20px_5px_rgba(192,250,50,0.7)]">
                    <span className="text-5xl font-black text-black tracking-tighter">
                        {totalAttended}
                    </span>
                    <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest -mt-1">Prezențe</span>
                </div>
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

        const attended = relevantTrainings.filter(a => a.prezenta.some(p => p.sportiv_id === currentUser.id)).length;
        const percentage = relevantTrainings.length > 0 ? Math.round((attended / relevantTrainings.length) * 100) : 0;

        return { attendancePercentage: percentage, totalAttended: attended };
    }, [antrenamente, currentUser]);


    return (
        <Card className="bg-slate-800/50 backdrop-blur-sm border border-green-400/20 p-6 flex flex-col items-center">
            <h3 className="text-xl font-bold text-white mb-4">Oglinda Perseverenței</h3>
            <ProgressRing percentage={attendancePercentage} totalAttended={totalAttended} />
            <p className="mt-4 text-lg text-center font-bold text-slate-300">
                Frecvență de <span className="text-lime-400">{attendancePercentage}%</span> în ultimele 60 de zile.
            </p>
            <div className="mt-6 pt-4 border-t border-green-400/20 w-full">
                <Button onClick={() => onNavigate('istoric-prezenta')} variant="secondary" className="w-full">
                    Vezi Istoric Detaliat
                </Button>
            </div>
        </Card>
    );
};