import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, AnuntPrezenta, Sportiv, Antrenament } from '../types';
import { Card, Button } from './ui';
import { ChatBubbleLeftEllipsisIcon, ExclamationTriangleIcon } from './icons';

interface Alert extends AnuntPrezenta {
    sportiv_nume: string;
    sportiv_prenume: string;
    antrenament_ora: string;
}

interface AttendanceAlertsProps {
    currentUser: User;
    sportivi: Sportiv[];
    antrenamente: Antrenament[];
}

export const AttendanceAlerts: React.FC<AttendanceAlertsProps> = ({ currentUser, sportivi, antrenamente }) => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!currentUser.club_id || !supabase) return;

        const fetchInitialAlerts = async () => {
            setIsLoading(true);
            const todayString = new Date().toISOString().split('T')[0];

            const { data: clubTrainings, error: trainingsError } = await supabase
                .from('program_antrenamente')
                .select('id')
                .eq('data', todayString)
                .in('grupa_id', (await supabase.from('grupe').select('id').eq('club_id', currentUser.club_id)).data?.map(g => g.id) || []);

            if (trainingsError || !clubTrainings) {
                setIsLoading(false);
                return;
            }

            const trainingIds = clubTrainings.map(t => t.id);

            const { data: anunturiData, error: anunturiError } = await supabase
                .from('anunturi_prezenta')
                .select('*, sportivi(nume, prenume)')
                .in('antrenament_id', trainingIds);

            if (!anunturiError && anunturiData) {
                const formattedAlerts = anunturiData.map((a: any) => ({
                    ...a,
                    sportiv_nume: a.sportivi.nume,
                    sportiv_prenume: a.sportivi.prenume,
                    antrenament_ora: antrenamente.find(tr => tr.id === a.antrenament_id)?.ora_start || ''
                }));
                setAlerts(formattedAlerts);
            }
            setIsLoading(false);
        };

        fetchInitialAlerts();

        const channel = supabase.channel('attendance-alerts')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'anunturi_prezenta' },
                async (payload) => {
                    const newAnunt = payload.new as AnuntPrezenta;
                    const training = antrenamente.find(t => t.id === newAnunt.antrenament_id);
                    const sportiv = sportivi.find(s => s.id === newAnunt.sportiv_id);
                    const trainingDate = training ? new Date(training.data).toISOString().split('T')[0] : '';
                    const today = new Date().toISOString().split('T')[0];
                    
                    if (training && sportiv && trainingDate === today) {
                        setAlerts(prev => [{
                            ...newAnunt,
                            sportiv_nume: sportiv.nume,
                            sportiv_prenume: sportiv.prenume,
                            antrenament_ora: training.ora_start
                        }, ...prev]);
                    }
                }
            ).subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [currentUser.club_id, sportivi, antrenamente]);

    const handleMarkAsRead = (id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    };

    const sortedAlerts = alerts.sort((a,b) => (a.antrenament_ora || '').localeCompare(b.antrenament_ora || ''));

    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-4">Alerte Prezență Azi</h3>
            {isLoading ? (
                <p className="text-sm text-slate-400 italic">Se încarcă...</p>
            ) : sortedAlerts.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {sortedAlerts.map(alert => {
                        const isAbsent = alert.status === 'Absent';
                        return (
                            <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${isAbsent ? 'bg-red-900/40 border-red-500' : 'bg-amber-900/40 border-amber-500'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className={`font-bold ${isAbsent ? 'text-red-300' : 'text-amber-300'}`}>
                                            <span className="font-mono text-xs mr-2">[{alert.antrenament_ora}]</span>
                                            {alert.sportiv_nume} {alert.sportiv_prenume}
                                        </p>
                                        <p className="text-sm text-slate-300">
                                            {isAbsent ? 'a anunțat că este absent.' : `a anunțat că întârzie. (${alert.detalii || 'Timp nespecificat'})`}
                                        </p>
                                    </div>
                                    <Button size="sm" variant="secondary" onClick={() => handleMarkAsRead(alert.id!)} className="!py-1 !px-2">Văzut</Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-sm text-slate-400 italic text-center py-4">Nicio alertă de prezență pentru astăzi.</p>
            )}
        </Card>
    );
};
