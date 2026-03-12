import React, { useState, useMemo } from 'react';
import { User, Antrenament, Grupa, AnuntPrezenta } from '../types';
import { Card, Button } from './ui';
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon } from './icons';

interface AntrenamenteViitoareProps {
    currentUser: User;
    antrenamente: Antrenament[];
    grupe: Grupa[];
    anunturi: AnuntPrezenta[];
}

export const AntrenamenteViitoare: React.FC<AntrenamenteViitoareProps> = ({ currentUser, antrenamente, grupe, anunturi }) => {
    const [displayDate, setDisplayDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const changeMonth = (delta: number) => {
        setDisplayDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1);
            newDate.setMonth(newDate.getMonth() + delta);
            return newDate;
        });
    };
    
    const trainingsByDate = useMemo(() => {
        const events = new Map<string, { time: string; groupName: string; antrenament: Antrenament }[]>();
        if (!antrenamente) return events;
        
        antrenamente.forEach(a => {
            const isInGroup = a.grupa_id === currentUser.grupa_id;
            const isVacationTraining = currentUser.participa_vacanta && a.grupa_id === null;
            if (isInGroup || isVacationTraining) {
                const dateKey = (a.data || '').toString().slice(0, 10);
                const existing = events.get(dateKey) || [];
                const groupName = a.grupa_id ? (grupe.find(g => g.id === a.grupa_id)?.denumire || 'Grupă') : 'Liber (Vacanță)';
                events.set(dateKey, [...existing, { time: `${a.ora_start} - ${a.ora_sfarsit}`, groupName, antrenament: a }]);
            }
        });
        
        events.forEach((eventsOnDay, date) => {
            events.set(date, eventsOnDay.sort((a, b) => a.time.localeCompare(b.time)));
        });
            
        return events;
    }, [antrenamente, currentUser, grupe]);

    const dayStatusMap = useMemo(() => {
        const statusMap = new Map<string, 'prezent' | 'absent' | 'viitor' | 'neanuntat'>();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

        trainingsByDate.forEach((dayTrainings, dateKey) => {
            const date = new Date(dateKey + 'T00:00:00');

            if (dateKey >= todayString) {
                statusMap.set(dateKey, 'viitor');
                return;
            }

            const announcementsForDay = anunturi.filter(anunt => dayTrainings.some(t => t.antrenament.id === anunt.antrenament_id));
            const wasPresent = announcementsForDay.some(a => a.status === 'Confirm' || a.status === 'Intarziat');
            if (wasPresent) {
                statusMap.set(dateKey, 'prezent');
                return;
            }

            const wasAbsentFromAll = dayTrainings.every(t => announcementsForDay.some(a => a.antrenament_id === t.antrenament.id && a.status === 'Absent'));
            if (wasAbsentFromAll && announcementsForDay.length >= dayTrainings.length) {
                statusMap.set(dateKey, 'absent');
                return;
            }
            
            statusMap.set(dateKey, 'neanuntat');
        });

        return statusMap;
    }, [trainingsByDate, anunturi]);


    const { days, monthName, yearName } = useMemo(() => {
        const year = displayDate.getFullYear();
        const month = displayDate.getMonth();
        const monthName = displayDate.toLocaleString('ro-RO', { month: 'long' });
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let startingDayOfWeek = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;

        const daysArray: (Date | null)[] = Array(startingDayOfWeek).fill(null);
        for (let i = 1; i <= daysInMonth; i++) {
            daysArray.push(new Date(year, month, i));
        }
        return { days: daysArray, monthName, yearName: year };
    }, [displayDate]);

    const selectedDayEvents = useMemo(() => {
        const dateKey = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const events = trainingsByDate.get(dateKey) || [];
        const today = new Date(); today.setHours(0,0,0,0);
        const isPast = selectedDate < today;

        return events.map(event => {
            let status: 'Prezent' | 'Absent' | 'Viitor' | 'Neanunțat' = 'Viitor';
            if (isPast) {
                const anunt = anunturi.find(a => a.antrenament_id === event.antrenament.id);
                if (anunt) {
                    if (anunt.status === 'Confirm' || anunt.status === 'Intarziat') status = 'Prezent';
                    else if (anunt.status === 'Absent') status = 'Absent';
                } else {
                    status = 'Neanunțat';
                }
            }
            return { ...event, status };
        });
    }, [selectedDate, trainingsByDate, anunturi]);

    const todayString = useMemo(() => new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0], []);

    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-4">Calendar Activitate</h3>
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-brand-secondary capitalize">{monthName} <span className="text-slate-400">{yearName}</span></h4>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => changeMonth(-1)} className="!p-1.5 h-auto"><ChevronLeftIcon className="w-5 h-5"/></Button>
                    <Button variant="secondary" size="sm" onClick={() => { setDisplayDate(new Date()); setSelectedDate(new Date()); }} className="text-xs px-3">Azi</Button>
                    <Button variant="secondary" size="sm" onClick={() => changeMonth(1)} className="!p-1.5 h-auto"><ChevronRightIcon className="w-5 h-5"/></Button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                    <div key={i} className="py-1">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1 mt-1">
                {days.map((day, index) => {
                    if (!day) return <div key={`pad-${index}`} className="w-full h-10"></div>;
                    
                    const dateString = new Date(day.getTime() - day.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                    const status = dayStatusMap.get(dateString);
                    const isToday = dateString === todayString;
                    const isSelected = dateString === new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                    
                    const statusColorClass = {
                        prezent: 'bg-green-500',
                        absent: 'bg-red-500',
                        viitor: 'bg-sky-400',
                        neanuntat: 'bg-slate-600',
                    }[status || ''];

                    return (
                        <div key={dateString} className="flex items-center justify-center">
                            <button
                                onClick={() => setSelectedDate(day)}
                                className={`w-10 h-10 flex flex-col items-center justify-center rounded-full font-semibold transition-all duration-200 relative
                                    ${isToday ? 'bg-brand-secondary text-black' : 'text-white hover:bg-slate-700'}
                                    ${isSelected ? 'ring-2 ring-brand-secondary ring-offset-2 ring-offset-[var(--bg-card)]' : ''}
                                `}
                            >
                                <span>{day.getDate()}</span>
                                {status && (
                                    <div className={`absolute bottom-1 w-4 h-1.5 rounded-full ${statusColorClass}`} />
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700 animate-fade-in-down">
                <h4 className="font-semibold text-white">
                    Program pentru <span className="text-brand-secondary">{selectedDate.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </h4>
                {selectedDayEvents.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                        {selectedDayEvents.map((event, i) => {
                            const statusInfo = {
                                Prezent: { color: 'bg-green-500', text: 'Prezent' },
                                Absent: { color: 'bg-red-500', text: 'Absent' },
                                Viitor: { color: 'bg-sky-500', text: 'Viitor' },
                                Neanunțat: { color: 'bg-slate-600', text: 'Neanunțat' }
                            }[event.status];

                            return (
                                <li key={i} className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-md border-l-4 border-slate-600">
                                    <ClockIcon className="w-5 h-5 text-slate-400 shrink-0" />
                                    <div className="flex-grow">
                                        <p className="font-mono text-sm font-bold text-slate-200">{event.time}</p>
                                        <p className="text-xs text-slate-400">{event.groupName}</p>
                                    </div>
                                     <div className="flex items-center gap-2 text-xs font-semibold">
                                        <div className={`w-2.5 h-2.5 rounded-full ${statusInfo.color}`} />
                                        <span className="text-slate-300">{statusInfo.text}</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="mt-2 text-sm text-slate-400 italic">Nicio activitate programată.</p>
                )}
            </div>
        </Card>
    );
};
