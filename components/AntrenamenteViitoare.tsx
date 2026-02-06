import React, { useState, useMemo } from 'react';
import { User, Antrenament, Grupa } from '../types';
import { Card, Button } from './ui';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface AntrenamenteViitoareProps {
    currentUser: User;
    antrenamente: Antrenament[];
    grupe: Grupa[];
}

export const AntrenamenteViitoare: React.FC<AntrenamenteViitoareProps> = ({ currentUser, antrenamente, grupe }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const changeMonth = (delta: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1); // Evită problemele legate de numărul diferit de zile al lunilor
            newDate.setMonth(newDate.getMonth() + delta);
            return newDate;
        });
    };

    const upcomingTrainingsByDate = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const events = new Map<string, { time: string; groupName: string }[]>();
        
        antrenamente
            .filter(a => {
                const trainingDate = new Date(a.data);
                if (trainingDate < today) return false;
                
                const isInGroup = a.grupa_id === currentUser.grupa_id;
                const isVacationTraining = currentUser.participa_vacanta && a.grupa_id === null;
                
                return isInGroup || isVacationTraining;
            })
            .forEach(a => {
                const dateKey = a.data;
                const existing = events.get(dateKey) || [];
                const groupName = a.grupa_id ? (grupe.find(g => g.id === a.grupa_id)?.denumire || 'Grupă') : 'Liber';
                events.set(dateKey, [...existing, { time: `${a.ora_start} - ${a.ora_sfarsit}`, groupName }]);
            });
            
        return events;
    }, [antrenamente, currentUser, grupe]);

    const { days, monthName, yearName } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthName = currentDate.toLocaleString('ro-RO', { month: 'long' });
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let startingDayOfWeek = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1; // Luni=0..Duminică=6

        const daysArray: (Date | null)[] = Array(startingDayOfWeek).fill(null);
        for (let i = 1; i <= daysInMonth; i++) {
            daysArray.push(new Date(year, month, i));
        }
        return { days: daysArray, monthName, yearName: year };
    }, [currentDate]);

    const todayString = new Date().toISOString().split('T')[0];

    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-4">Calendar Antrenamente</h3>
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-brand-secondary capitalize">{monthName} <span className="text-slate-400">{yearName}</span></h4>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => changeMonth(-1)} className="!p-1.5 h-auto"><ChevronLeftIcon className="w-5 h-5"/></Button>
                    <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs px-3">Azi</Button>
                    <Button variant="secondary" size="sm" onClick={() => changeMonth(1)} className="!p-1.5 h-auto"><ChevronRightIcon className="w-5 h-5"/></Button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(day => (
                    <div key={day} className="py-1">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1 mt-1">
                {days.map((day, index) => {
                    if (!day) return <div key={`pad-${index}`} className="w-full h-10"></div>;
                    
                    const dateString = day.toISOString().split('T')[0];
                    const trainingsOnDay = upcomingTrainingsByDate.get(dateString);
                    const isToday = dateString === todayString;
                    const hasTrainings = !!trainingsOnDay;

                    return (
                        <div key={dateString} className="relative group flex items-center justify-center">
                            <div className={`w-10 h-10 flex items-center justify-center rounded-full font-semibold transition-colors 
                                ${isToday ? 'bg-brand-secondary text-black ring-2 ring-white/50' : 
                                hasTrainings ? 'bg-sky-900/50 text-sky-300' : 'text-white'}`}>
                                {day.getDate()}
                            </div>
                            {hasTrainings && !isToday && (
                                <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full bg-brand-secondary`} style={{ boxShadow: `0 0 5px var(--brand-secondary)` }}></div>
                            )}
                            {trainingsOnDay && (
                                <div className="absolute bottom-full mb-2 w-max max-w-xs p-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-slate-700">
                                    {trainingsOnDay.map((t, i) => (
                                        <div key={i}>{t.groupName}: {t.time}</div>
                                    ))}
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900"></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};
