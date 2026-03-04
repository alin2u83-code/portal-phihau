import React from 'react';
import { Skeleton } from '../ui';

export const AttendanceIndicator: React.FC<{ attendances: {date: string; present: boolean}[] }> = ({ attendances }) => {
    if (!attendances) return (
        <div>
            <h3 className="text-lg font-bold text-white mb-3">Prezență Recente</h3>
            <div className="flex gap-2">
                <Skeleton className="w-8 h-12" />
                <Skeleton className="w-8 h-12" />
                <Skeleton className="w-8 h-12" />
            </div>
        </div>
    );

    const indicators = [...(attendances || [])].reverse(); // Afișează cel mai vechi primul

    // Umple array-ul pentru a afișa întotdeauna 3 indicatori
    const displayItems = Array.from({ length: 3 }, (_, i) => {
        if (i < indicators.length) {
            return { ...indicators[i], isPlaceholder: false };
        }
        return { date: 'N/A', present: false, isPlaceholder: true };
    });

    return (
        <div>
            <h3 className="text-lg font-bold text-white mb-3">Prezență Recente</h3>
            <div className="flex justify-center md:justify-start gap-2">
                {displayItems.map((att, index) => (
                    <div 
                        key={index} 
                        title={att.isPlaceholder ? 'Antrenament neînregistrat' : `${new Date(att.date + 'T00:00:00').toLocaleDateString('ro-RO')}: ${att.present ? 'Prezent' : 'Absent'}`}
                        className={`w-8 h-12 rounded-md transition-all duration-300 ${att.isPlaceholder ? 'bg-slate-700' : att.present ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                    </div>
                ))}
            </div>
        </div>
    );
};
