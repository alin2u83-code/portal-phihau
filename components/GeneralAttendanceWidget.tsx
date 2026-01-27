import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Card } from './ui';
import { UsersIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

const LoadingSpinner: React.FC = () => (
    <div className="flex-grow flex flex-col items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-sm text-slate-400 mt-2">Se încarcă sumarul...</p>
    </div>
);


interface GeneralAttendanceWidgetProps {
    currentUser: User;
}

export const GeneralAttendanceWidget: React.FC<GeneralAttendanceWidgetProps> = ({ currentUser }) => {
    const [stats, setStats] = useState({ present: 0, expected: 0, percentage: 0, trainingsCount: 0 });
    const [loading, setLoading] = useState(true);
    const [permissionError, setPermissionError] = useState(false);
    const { showError } = useError();

    useEffect(() => {
        if (!currentUser?.club_id || !supabase) {
            setLoading(false);
            return;
        }

        const fetchTodayStats = async () => {
            setLoading(true);
            setPermissionError(false);

            try {
                const todayString = new Date().toISOString().split('T')[0];
                
                // Fetch groups for the club
                const { data: grupeData, error: grupeError } = await supabase
                    .from('grupe')
                    .select('id')
                    .eq('club_id', currentUser.club_id);
                if (grupeError) throw grupeError;
                const grupaIds = grupeData.map(g => g.id);
                if (grupaIds.length === 0) {
                    setStats({ present: 0, expected: 0, percentage: 0, trainingsCount: 0 });
                    setLoading(false);
                    return;
                }

                // Fetch trainings for the specific club on the current day
                const { data: antrenamenteData, error: antrenamenteError } = await supabase
                    .from('program_antrenamente')
                    .select('id, grupa_id, sportivi_prezenti_ids:prezenta_antrenament(sportiv_id)')
                    .eq('data', todayString)
                    .in('grupa_id', grupaIds);
                
                if (antrenamenteError) throw antrenamenteError;

                const antrenamente = (antrenamenteData || []).map(a => ({...a, sportivi_prezenti_ids: a.sportivi_prezenti_ids.map((p: any) => p.sportiv_id)}));

                if (antrenamente.length === 0) {
                    setStats({ present: 0, expected: 0, percentage: 0, trainingsCount: 0 });
                    setLoading(false);
                    return;
                }
                
                const { data: sportivi, error: sportiviError } = await supabase.from('sportivi').select('id, grupa_id, status').eq('club_id', currentUser.club_id);
                if (sportiviError) throw sportiviError;

                const presentIds = new Set<string>();
                antrenamente.forEach(t => t.sportivi_prezenti_ids.forEach(id => presentIds.add(id)));

                const expectedIds = new Set<string>();
                antrenamente.forEach(t => {
                    sportivi.forEach(s => {
                        if (s.grupa_id === t.grupa_id && s.status === 'Activ') {
                            expectedIds.add(s.id);
                        }
                    });
                });
                
                const presentCount = presentIds.size;
                const expectedCount = expectedIds.size;
                const percentage = expectedCount > 0 ? Math.round((presentCount / expectedCount) * 100) : 0;
                
                setStats({ present: presentCount, expected: expectedCount, percentage, trainingsCount: antrenamente.length });

            } catch (error: any) {
                if (error.code === '42501' || error.message.includes('permission denied')) {
                    console.warn('Permission denied for GeneralAttendanceWidget data. Hiding widget.');
                    setPermissionError(true);
                } else {
                    showError('Eroare widget prezență', error.message);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchTodayStats();

        const channel = supabase.channel('general-attendance-widget-channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'prezenta_antrenament' },
                () => {
                    fetchTodayStats();
                }
            )
            .subscribe();
        
        return () => {
            supabase.removeChannel(channel).catch(console.error);
        };
    }, [currentUser, showError]);
    
    if (permissionError) {
        return null;
    }

    return (
        <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 flex flex-col justify-center text-center h-full">
            <div className="flex items-center justify-center gap-2">
                 <UsersIcon className="w-6 h-6 text-sky-400" />
                <h3 className="text-xl font-bold text-white">Prezența Generală Azi</h3>
            </div>
            
            {loading ? <LoadingSpinner/> : stats.trainingsCount === 0 ? (
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-slate-400 italic">Niciun antrenament programat astăzi.</p>
                </div>
            ) : (
                <div className="mt-4">
                    <div className="text-6xl font-black text-white">{stats.present} / <span className="text-4xl text-slate-400">{stats.expected}</span></div>
                    <p className="text-slate-300 text-base">Sportivi Prezenți</p>
                    <div className="w-full bg-slate-700 rounded-full h-2.5 mt-6">
                      <div className="bg-sky-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${stats.percentage}%`, boxShadow: '0 0 8px #0ea5e9' }}></div>
                    </div>
                    <p className="text-2xl font-bold text-sky-400 mt-2">{stats.percentage}%</p>
                    <p className="text-sm text-slate-500 mt-1">din {stats.trainingsCount} antrenament(e) programate</p>
                </div>
            )}
        </Card>
    );
};
