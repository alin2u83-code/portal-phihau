import React, { useMemo } from 'react';
import { Antrenament, Grupa, User } from '../types';
import { Card } from './ui';
import { CalendarDaysIcon, ClockIcon, MapPinIcon } from './icons';

interface UpcomingTrainingsWidgetProps {
    currentUser: User;
    antrenamente: Antrenament[];
    grupe: Grupa[];
}

export const UpcomingTrainingsWidget: React.FC<UpcomingTrainingsWidgetProps> = ({ currentUser, antrenamente, grupe }) => {
    const upcoming = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return (antrenamente || [])
            .filter(a => {
                const trainingDate = new Date(a.data + 'T00:00:00');
                const isInGroup = a.grupa_id === currentUser.grupa_id;
                const isVacationTraining = currentUser.participa_vacanta && a.grupa_id === null;
                return trainingDate >= today && (isInGroup || isVacationTraining);
            })
            .sort((a, b) => {
                if (a.data !== b.data) return a.data.localeCompare(b.data);
                return a.ora_start.localeCompare(b.ora_start);
            })
            .slice(0, 5); // Show next 5
    }, [antrenamente, currentUser]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'short' });
    };

    return (
        <Card className="h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <CalendarDaysIcon className="w-5 h-5 text-violet-400" />
                    Antrenamente Viitoare
                </h3>
            </div>

            {upcoming.length > 0 ? (
                <div className="space-y-3">
                    {upcoming.map((training) => {
                        const grupa = grupe.find(g => g.id === training.grupa_id);
                        return (
                            <div key={training.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-violet-500/30 transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-bold text-violet-400 capitalize">
                                        {formatDate(training.data)}
                                    </span>
                                    <div className="flex items-center gap-1 text-xs font-mono text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded">
                                        <ClockIcon className="w-3 h-3" />
                                        {training.ora_start} - {training.ora_sfarsit}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-slate-200">
                                            {grupa?.denumire || 'Antrenament Individual'}
                                        </span>
                                        {grupa?.sala && (
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                <MapPinIcon className="w-3 h-3" />
                                                {grupa.sala}
                                            </span>
                                        )}
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500 italic text-sm">
                    <CalendarDaysIcon className="w-10 h-10 mb-2 opacity-20" />
                    <p>Nu sunt antrenamente programate.</p>
                </div>
            )}
        </Card>
    );
};
