import React, { useMemo } from 'react';
import { Antrenament, Sportiv, Grupa } from '../types';
import { Card } from './ui';
import { UsersIcon } from './icons';

interface GeneralAttendanceWidgetProps {
    antrenamente: Antrenament[];
    sportivi: Sportiv[];
    grupe: Grupa[];
}

export const GeneralAttendanceWidget: React.FC<GeneralAttendanceWidgetProps> = ({ antrenamente, sportivi, grupe }) => {
    const todayStats = useMemo(() => {
        const todayString = new Date().toISOString().split('T')[0];
        const todaysTrainings = antrenamente.filter(a => a.data === todayString);

        if (todaysTrainings.length === 0) {
            return { present: 0, expected: 0, percentage: 0, trainingsCount: 0 };
        }
        
        const presentIds = new Set<string>();
        todaysTrainings.forEach(t => {
            t.sportivi_prezenti_ids.forEach(id => presentIds.add(id));
        });

        const expectedIds = new Set<string>();
        todaysTrainings.forEach(t => {
            if (t.grupa_id) {
                sportivi.forEach(s => {
                    if (s.grupa_id === t.grupa_id && s.status === 'Activ') {
                        expectedIds.add(s.id);
                    }
                });
            } else { // Vacanta
                sportivi.forEach(s => {
                    if (s.participa_vacanta && s.status === 'Activ') {
                        expectedIds.add(s.id);
                    }
                });
            }
        });
        
        const presentCount = presentIds.size;
        const expectedCount = expectedIds.size;
        const percentage = expectedCount > 0 ? Math.round((presentCount / expectedCount) * 100) : 0;

        return { present: presentCount, expected: expectedCount, percentage, trainingsCount: todaysTrainings.length };
    }, [antrenamente, sportivi, grupe]);

    return (
        <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 flex flex-col justify-center text-center h-full">
            <div className="flex items-center justify-center gap-2">
                 <UsersIcon className="w-6 h-6 text-sky-400" />
                <h3 className="text-lg font-bold text-white">Prezența Generală Azi</h3>
            </div>
            
            {todayStats.trainingsCount === 0 ? (
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-slate-400 italic">Niciun antrenament programat astăzi.</p>
                </div>
            ) : (
                <div className="mt-4">
                    <div className="text-6xl font-black text-white">{todayStats.present} / <span className="text-4xl text-slate-400">{todayStats.expected}</span></div>
                    <p className="text-slate-300">Sportivi Prezenți</p>
                    <div className="w-full bg-slate-700 rounded-full h-2.5 mt-6">
                      <div className="bg-sky-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${todayStats.percentage}%`, boxShadow: '0 0 8px #0ea5e9' }}></div>
                    </div>
                    <p className="text-2xl font-bold text-sky-400 mt-2">{todayStats.percentage}%</p>
                    <p className="text-xs text-slate-500 mt-1">din {todayStats.trainingsCount} antrenament(e) programate</p>
                </div>
            )}
        </Card>
    );
};