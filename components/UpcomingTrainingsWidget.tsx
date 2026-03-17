import React, { useState, useEffect } from 'react';
import { Grupa, User } from '../types';
import { Card } from './ui';
import { CalendarDaysIcon, ClockIcon } from './icons';
import { MapPin, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface UpcomingTrainingsWidgetProps {
    currentUser: User;
    grupe: Grupa[];
}

export const UpcomingTrainingsWidget: React.FC<UpcomingTrainingsWidgetProps> = ({ currentUser, grupe }) => {
    const [upcoming, setUpcoming] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrainings = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('vw_antrenamente_viitoare_sportiv')
                .select('*')
                .order('data', { ascending: true })
                .order('ora_start', { ascending: true })
                .limit(5);

            if (data) {
                setUpcoming(data);
            }
            setLoading(false);
        };
        fetchTrainings();
    }, []);

    const formatDate = (dateStr: string) => {
        const date = new Date((dateStr || '').toString().slice(0, 10) + 'T00:00:00');
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

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                </div>
            ) : upcoming.length > 0 ? (
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
                                        {training.nume_locatie && (
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                <MapPin className="w-3 h-3 text-violet-500" />
                                                {training.nume_locatie}
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
                <div className="flex flex-col items-center justify-center py-8 text-slate-500 italic text-sm text-center">
                    <CalendarDaysIcon className="w-10 h-10 mb-2 opacity-20" />
                    <p>Nu sunt antrenamente programate pentru grupa ta în perioada următoare.</p>
                </div>
            )}
        </Card>
    );
};
