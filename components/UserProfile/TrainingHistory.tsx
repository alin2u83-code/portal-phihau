import React, { useMemo } from 'react';
import { Antrenament, Grupa, Sportiv } from '../../types';
import { Card, Skeleton } from '../ui';

export interface TrainingHistoryProps {
    sportiv: Sportiv;
    antrenamente: Antrenament[];
    grupe: Grupa[];
}

export const TrainingHistory: React.FC<TrainingHistoryProps> = ({ sportiv, antrenamente, grupe }) => {
    const trainingRecords = useMemo(() => {
        const records: { date: string; groupName: string; status: 'Prezent' | 'Absent' | 'N/A' }[] = [];
        
        if (!antrenamente || !grupe || !sportiv) return [];

        const now = new Date();

        antrenamente.forEach(antr => {
            const trainingDate = new Date(`${(antr.data || '').toString().slice(0, 10)}T${antr.ora_start || '00:00'}`);
            if (trainingDate > now) return; // Don't show future trainings

            const isPresent = (antr.prezenta || []).some(p => p.sportiv_id === sportiv.id && p.status?.este_prezent === true);
            const isMarkedAbsent = (antr.prezenta || []).some(p => p.sportiv_id === sportiv.id && p.status?.este_prezent === false);
            const isInGroup = antr.grupa_id === sportiv.grupa_id;
            const isVacationTraining = sportiv.participa_vacanta && antr.grupa_id === null;
            
            // Only show trainings where the athlete is present, OR they are expected to be there, OR explicitly marked absent
            if (isPresent || isMarkedAbsent || isInGroup || isVacationTraining) {
                const group = (grupe || []).find(g => g.id === antr.grupa_id);
                
                let status: 'Prezent' | 'Absent' | 'N/A' = 'N/A';
                if (isPresent) status = 'Prezent';
                else if (isMarkedAbsent) status = 'Absent';
                else if ((antr.prezenta || []).length > 0) status = 'Absent';
                
                records.push({
                    date: antr.data,
                    groupName: group?.denumire || (antr.grupa_id === null ? 'Antrenament Vacanță' : 'Grupă necunoscută'),
                    status: status,
                });
            }
        });

        return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sportiv, antrenamente, grupe]);

    if (!antrenamente || !grupe) return <Card><Skeleton className="h-40 w-full" /></Card>;

    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-3">Istoric Antrenamente</h3>
            {trainingRecords.length > 0 ? (
                <div className="max-h-60 overflow-y-auto pr-2">
                    <table className="w-full text-left text-sm">
                        <thead className="text-slate-400 text-xs uppercase sticky top-0 bg-[var(--bg-card)]">
                            <tr>
                                <th className="py-2">Data</th>
                                <th className="py-2">Grupă</th>
                                <th className="py-2 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {trainingRecords.map((record, index) => (
                                <tr key={index}>
                                    <td className="py-2 font-semibold text-white">{new Date(record.date).toLocaleDateString('ro-RO')}</td>
                                    <td className="py-2 text-slate-300">{record.groupName}</td>
                                    <td className={`py-2 text-right font-bold ${
                                        record.status === 'Prezent' ? 'text-green-500' : 
                                        record.status === 'Absent' ? 'text-red-500' : 
                                        'text-slate-500'
                                    }`}>{record.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-sm text-slate-500 italic text-center py-4">Nu există înregistrări de antrenament pentru acest sportiv.</p>
            )}
        </Card>
    );
};
