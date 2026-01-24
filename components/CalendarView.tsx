import React, { useState, useMemo } from 'react';
import { Antrenament, SesiuneExamen, Grupa, Locatie, Eveniment, View, User } from '../types';
import { Button } from './ui';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from './icons';
import { usePermissions } from '../hooks/usePermissions';

interface CalendarEvent {
  id: string;
  title: string;
  scope: 'club' | 'federatie';
  time: string;
}

interface CalendarViewProps {
    antrenamente: Antrenament[];
    sesiuniExamene: SesiuneExamen[];
    evenimente: Eveniment[];
    grupe: Grupa[];
    locatii: Locatie[];
    onBack: () => void;
    onNavigate: (view: View) => void;
    currentUser: User;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ antrenamente, sesiuniExamene, evenimente, grupe, locatii, onBack, onNavigate, currentUser }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const permissions = usePermissions(currentUser);

    const changeMonth = (delta: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1);
            newDate.setMonth(newDate.getMonth() + delta);
            return newDate;
        });
    };

    const eventsByDate = useMemo(() => {
        const eventMap = new Map<string, CalendarEvent[]>();

        // Club Events: Antrenamente
        antrenamente.forEach(a => {
            const grupa = grupe.find(g => g.id === a.grupa_id);
            const event: CalendarEvent = { id: a.id, title: grupa?.denumire || 'Antrenament', scope: 'club', time: a.ora_start };
            const dateKey = a.data;
            const existing = eventMap.get(dateKey) || [];
            eventMap.set(dateKey, [...existing, event]);
        });
        
        // Club Events: Examene
        sesiuniExamene.forEach(e => {
            const locatie = locatii.find(l => l.id === e.locatie_id);
            const event: CalendarEvent = { id: e.id, title: `Examen ${locatie?.nume || ''}`, scope: 'club', time: '09:00' };
            const dateKey = e.data;
            const existing = eventMap.get(dateKey) || [];
            eventMap.set(dateKey, [...existing, event]);
        });

        // Federation or Club Events: Stagii/Competitii
        evenimente.forEach(e => {
            const event: CalendarEvent = {
                id: e.id,
                title: e.denumire,
                scope: e.club_id ? 'club' : 'federatie',
                time: '' 
            };
            const dateKey = e.data;
            const existing = eventMap.get(dateKey) || [];
            eventMap.set(dateKey, [...existing, event]);
        });

        eventMap.forEach((events, date) => {
            eventMap.set(date, events.sort((a, b) => a.time.localeCompare(b.time)));
        });

        return eventMap;
    }, [antrenamente, sesiuniExamene, evenimente, grupe, locatii]);

    const { days, monthName } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthName = currentDate.toLocaleString('ro-RO', { month: 'long', year: 'numeric' });
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let startingDayOfWeek = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
        
        const daysArray: (Date | null)[] = Array(startingDayOfWeek).fill(null);
        for (let i = 1; i <= daysInMonth; i++) {
            daysArray.push(new Date(year, month, i));
        }
        return { days: daysArray, monthName };
    }, [currentDate]);

    const agendaDays = useMemo(() => {
        return days.filter((d): d is Date => d !== null).map(day => {
            const dateString = day.toISOString().split('T')[0];
            return { day, events: eventsByDate.get(dateString) || [] };
        }).filter(d => d.events.length > 0);
    }, [days, eventsByDate]);

    const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
    const weekdays = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
    const eventStyles = {
        club: 'bg-slate-100 text-slate-900 border-l-4 border-slate-400',
        federatie: 'bg-slate-900 text-white border-l-4 border-blue-400'
    };

    return (
        <div className="space-y-6 text-slate-900 dark:text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <Button onClick={onBack} variant="secondary" className="dark:bg-slate-700 dark:hover:bg-slate-600"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
                {permissions.hasAdminAccess && (
                    <Button onClick={() => onNavigate('stagii')} variant="primary" className="dark:bg-brand-primary dark:hover:bg-blue-800">
                        <PlusIcon className="w-5 h-5 mr-2" /> Adaugă Eveniment
                    </Button>
                )}
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold capitalize text-slate-800 dark:text-white">{monthName}</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => changeMonth(-1)} className="!p-1.5 h-auto dark:bg-slate-700 dark:hover:bg-slate-600"><ChevronLeftIcon className="w-5 h-5"/></Button>
                        <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs px-3 dark:bg-slate-700 dark:hover:bg-slate-600">Azi</Button>
                        <Button variant="secondary" size="sm" onClick={() => changeMonth(1)} className="!p-1.5 h-auto dark:bg-slate-700 dark:hover:bg-slate-600"><ChevronRightIcon className="w-5 h-5"/></Button>
                    </div>
                </div>

                {/* Desktop: Grid View */}
                <div className="hidden md:block">
                    <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
                        {weekdays.map(day => (
                            <div key={day} className="py-2 text-center text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 min-h-[60vh]">
                        {days.map((day, index) => {
                            if (!day) return <div key={`pad-${index}`} className="border-r border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/20"></div>;
                            const dateString = day.toISOString().split('T')[0];
                            const dayEvents = eventsByDate.get(dateString) || [];
                            const isCurrentDay = day.getTime() === today.getTime();
                            return (
                                <div key={dateString} className="border-r border-b border-slate-200 dark:border-slate-700 p-2 flex flex-col relative min-h-[120px]">
                                    <span className={`font-bold text-sm ${isCurrentDay ? 'bg-brand-primary text-white rounded-full h-6 w-6 flex items-center justify-center' : 'text-slate-600 dark:text-slate-300'}`}>{day.getDate()}</span>
                                    <div className="mt-2 space-y-1 overflow-y-auto">
                                        {dayEvents.map(event => (
                                            <div key={event.id} title={event.title} className={`p-1 rounded-md text-[10px] font-bold truncate border ${eventStyles[event.scope]}`}>
                                                {event.time && <span className="font-mono mr-1">{event.time}</span>}
                                                {event.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Mobile: Agenda View */}
                <div className="md:hidden">
                    {agendaDays.length > 0 ? (
                        agendaDays.map(({ day, events }) => (
                            <div key={day.toISOString()} className="p-4 border-b border-slate-200 dark:border-slate-700">
                                <h3 className="font-bold text-brand-primary dark:text-brand-secondary">{day.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric' })}</h3>
                                <div className="mt-2 space-y-2">
                                    {events.map(event => (
                                        <div key={event.id} className={`p-2 rounded-md ${eventStyles[event.scope]}`}>
                                            <p className="font-bold">{event.title}</p>
                                            {event.time && <p className="text-xs font-mono">{event.time}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="p-8 text-center text-slate-500 italic">Niciun eveniment programat în această lună.</p>
                    )}
                </div>
            </div>
        </div>
    );
};