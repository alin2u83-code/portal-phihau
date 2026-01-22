import React, { useState, useMemo } from 'react';
import { Antrenament, SesiuneExamen, Grupa, Locatie } from '../types';
import { Button, Card } from './ui';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'antrenament' | 'examen';
  time: string;
}

interface CalendarViewProps {
    antrenamente: Antrenament[];
    sesiuniExamene: SesiuneExamen[];
    grupe: Grupa[];
    locatii: Locatie[];
    onBack: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ antrenamente, sesiuniExamene, grupe, locatii, onBack }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const changeMonth = (delta: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + delta);
            return newDate;
        });
    };

    const eventsByDate = useMemo(() => {
        const eventMap = new Map<string, CalendarEvent[]>();

        antrenamente.forEach(a => {
            const grupa = grupe.find(g => g.id === a.grupa_id);
            const event: CalendarEvent = {
                id: a.id,
                title: grupa?.denumire || 'Antrenament Vacanță',
                type: 'antrenament',
                time: a.ora_start
            };
            const dateKey = a.data; // YYYY-MM-DD
            const existing = eventMap.get(dateKey) || [];
            eventMap.set(dateKey, [...existing, event]);
        });
        
        sesiuniExamene.forEach(e => {
            const locatie = locatii.find(l => l.id === e.locatie_id);
            const event: CalendarEvent = {
                id: e.id,
                title: `Examen - ${locatie?.nume || 'Locație necunoscută'}`,
                type: 'examen',
                time: ''
            };
            const dateKey = e.data;
            const existing = eventMap.get(dateKey) || [];
            eventMap.set(dateKey, [...existing, event]);
        });

        // Sort events within each day by time
        eventMap.forEach((events, date) => {
            eventMap.set(date, events.sort((a, b) => a.time.localeCompare(b.time)));
        });

        return eventMap;
    }, [antrenamente, sesiuniExamene, grupe, locatii]);

    const { days, monthName, year } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthName = currentDate.toLocaleString('ro-RO', { month: 'long', year: 'numeric' });
        
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let startingDayOfWeek = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon...
        if (startingDayOfWeek === 0) startingDayOfWeek = 7; // Adjust Sunday to be 7
        startingDayOfWeek -= 1; // Now Mon=0, Sun=6
        
        const daysArray = [];
        for (let i = 0; i < startingDayOfWeek; i++) {
            daysArray.push(null); // Padding for days before the 1st
        }
        for (let i = 1; i <= daysInMonth; i++) {
            daysArray.push(new Date(year, month, i));
        }
        
        return { days: daysArray, monthName, year };
    }, [currentDate]);
    
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const weekdays = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

    const eventColors = {
        antrenament: 'bg-brand-secondary/20 text-sky-300 border-brand-secondary/50',
        examen: 'bg-status-warning/20 text-amber-300 border-status-warning/50'
    };

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary">Înapoi la Meniu</Button>
            <Card className="p-0 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white capitalize">{monthName}</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => changeMonth(-1)} className="!p-1.5 h-auto">
                            <ChevronLeftIcon className="w-5 h-5"/>
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs px-3">
                            Azi
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => changeMonth(1)} className="!p-1.5 h-auto">
                            <ChevronRightIcon className="w-5 h-5"/>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-7">
                    {weekdays.map(day => (
                        <div key={day} className="py-2 text-center text-xs font-bold uppercase text-slate-400 border-b border-r border-slate-700">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 min-h-[60vh]">
                    {days.map((day, index) => {
                        if (!day) {
                            return <div key={`pad-${index}`} className="border-r border-b border-slate-700 bg-slate-800/20"></div>;
                        }
                        const dateString = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                        const dayEvents = eventsByDate.get(dateString) || [];
                        const isToday = dateString === todayString;

                        return (
                            <div key={dateString} className="border-r border-b border-slate-700 p-2 flex flex-col relative min-h-[120px]">
                                <span className={`font-bold ${isToday ? 'bg-brand-secondary text-white rounded-full h-6 w-6 flex items-center justify-center' : 'text-slate-300'}`}>
                                    {day.getDate()}
                                </span>
                                <div className="mt-2 space-y-1 overflow-y-auto">
                                    {dayEvents.map(event => (
                                        <div key={event.id} title={`${event.time} ${event.title}`} className={`p-1 rounded-md text-[10px] font-semibold truncate border ${eventColors[event.type]}`}>
                                            {event.time && <span className="font-mono mr-1">{event.time}</span>}
                                            {event.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
};
