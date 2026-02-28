import React, { useMemo } from 'react';
import { User, Antrenament, View } from '../types';
import { Card, Button } from './ui';

interface AttendanceTrackerProps {
    currentUser: User;
    antrenamente: Antrenament[];
    onNavigate: (view: View) => void;
}

export const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ currentUser, antrenamente, onNavigate }) => {
    
    const totalAttended = useMemo(() => {
        return (antrenamente || []).filter(a => a.prezenta.some(p => p.sportiv_id === currentUser.id)).length;
    }, [antrenamente, currentUser.id]);

    const examThreshold = 40;
    const isEligible = totalAttended >= examThreshold;
    const progressPercentage = Math.min(100, (totalAttended / examThreshold) * 100);

    return (
        <Card className="p-6 flex flex-col items-center text-center">
            <h3 className="text-xl font-bold text-white mb-2">Progres Examen</h3>
            
            <p className="font-black text-8xl" style={{ color: '#4DBCE9', textShadow: '0 0 10px rgba(77, 188, 233, 0.5)' }}>
                {totalAttended}
            </p>
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400 -mt-2">Prezențe Totale</p>
            
            <div className="w-full mt-6">
                <div className="h-3 w-full bg-gray-700 rounded-full">
                    <div 
                        className={`h-3 rounded-full transition-all duration-500 ${isEligible ? 'bg-yellow-500' : 'bg-[#4DBCE9]'}`}
                        style={{ width: `${progressPercentage}%`, boxShadow: `0 0 8px ${isEligible ? '#f59e0b' : '#4DBCE9'}` }}
                    ></div>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500 mt-1">
                    <span>0</span>
                    <span>{examThreshold}</span>
                </div>
            </div>

            {isEligible && (
                <div className="mt-4 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg animate-fade-in-down">
                    <p className="font-bold text-yellow-400 text-center text-lg">ELIGIBIL PENTRU EXAMEN!</p>
                </div>
            )}
            
            <div className="mt-6 pt-4 border-t border-slate-700 w-full">
                <Button onClick={() => onNavigate('istoric-prezenta')} variant="secondary" className="w-full">
                    Vezi Istoric Detaliat
                </Button>
            </div>
        </Card>
    );
};