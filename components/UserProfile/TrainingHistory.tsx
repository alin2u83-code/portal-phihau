import React, { useMemo } from 'react';
import { Antrenament, Grupa } from '../../types';
import { Card, Skeleton } from '../ui';

export interface TrainingHistoryProps {
    sportivId: string;
    antrenamente: Antrenament[];
    grupe: Grupa[];
}

export const TrainingHistory: React.FC<TrainingHistoryProps> = ({ sportivId, antrenamente, grupe }) => {
    const trainingRecords = useMemo(() => {
        const records: { date: string; groupName: string; status: 'Prezent' | 'Absent' | 'N/A' }[] = [];
        
        if (!antrenamente || !grupe) return [];

        antrenamente.forEach(antr => {
            const isPresent = (antr.prezenta || []).some(p => p.sportiv_id === sportivId);
            const group = (grupe || []).find(g => g.id === antr.grupa_id);
            
            records.push({
                date: antr.data,
                groupName: group?.denumire || 'Grupă necunoscută',
                status: isPresent ? 'Prezent' : 'Absent',
            });
        });

        return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sportivId, antrenamente, grupe]);

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
                                    <td className={`py-2 text-right font-bold ${record.status === 'Prezent' ? 'text-green-500' : 'text-red-500'}`}>{record.status}</td>
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
