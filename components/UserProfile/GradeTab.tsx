import React from 'react';
import { Card, Button } from '../ui';
import { PlusIcon } from '../icons';
import { SportivProgressChart, ChartDataPoint } from '../SportivProgressChart';
import { ExamHistory } from './ExamHistory';
import { Sportiv, InscriereExamen, SesiuneExamen, Grad } from '../../types';

interface GradeTabProps {
    chartData: ChartDataPoint[];
    primaryColor: string;
    setIsAddGradeModalOpen: (val: boolean) => void;
    gradeHistory: { date: number; rankName: string; source: string }[];
    sportiv: Sportiv;
    participari: InscriereExamen[];
    examene: SesiuneExamen[];
    grade: Grad[];
}

export const GradeTab: React.FC<GradeTabProps> = ({
    chartData,
    primaryColor,
    setIsAddGradeModalOpen,
    gradeHistory,
    sportiv,
    participari,
    examene,
    grade
}) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-lg font-bold text-white mb-4">Evoluție în Timp</h3>
                    <SportivProgressChart data={chartData} themeColor={primaryColor} />
                </Card>

                <ExamHistory 
                    sportiv={sportiv} 
                    participari={participari} 
                    examene={examene} 
                    grade={grade} 
                />
            </div>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">Istoric Examinări & Grade</h3>
                    <Button size="sm" variant="secondary" onClick={() => setIsAddGradeModalOpen(true)}>
                        <PlusIcon className="w-4 h-4 mr-1"/> Adaugă Manual
                    </Button>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-700">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-800 text-slate-400">
                            <tr>
                                <th className="p-3">Data</th>
                                <th className="p-3">Grad</th>
                                <th className="p-3">Sursă</th>
                                <th className="p-3">Observații</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                            {gradeHistory.length > 0 ? gradeHistory.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3 font-medium text-white">{new Date(item.date).toLocaleDateString('ro-RO')}</td>
                                    <td className="p-3"><span className="font-bold text-amber-400">{item.rankName}</span></td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs ${item.source === 'examen' ? 'bg-blue-900/30 text-blue-400' : 'bg-slate-700 text-slate-300'}`}>
                                            {item.source === 'examen' ? 'Examen Oficial' : 'Acordat Manual'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-400 italic">-</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} className="p-4 text-center text-slate-500 italic">Nu există istoric înregistrat.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
