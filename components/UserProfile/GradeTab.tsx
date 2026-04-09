import React from 'react';
import { Card, Button } from '../ui';
import { PlusIcon, EditIcon, TrashIcon } from '../icons';
import { SportivProgressChart, ChartDataPoint } from '../SportivProgressChart';
import { ExamHistory } from './ExamHistory';
import { Sportiv, InscriereExamen, SesiuneExamen, Grad } from '../../types';

interface GradeHistoryItem {
    id: string;
    date: number;
    data_obtinere: string;
    rankName: string;
    grad_id: string;
    source: string;
    observatii: string;
}

interface GradeTabProps {
    chartData: ChartDataPoint[];
    primaryColor: string;
    setIsAddGradeModalOpen: (val: boolean) => void;
    gradeHistory: GradeHistoryItem[];
    sportiv: Sportiv;
    participari: InscriereExamen[];
    examene: SesiuneExamen[];
    grade: Grad[];
    onEditEntry?: (entry: { id: string; grad_id: string; data_obtinere: string; observatii: string }) => void;
    onDeleteEntry?: (id: string) => void;
    onNavigateToExam?: (sesiuneId: string) => void;
}

export const GradeTab: React.FC<GradeTabProps> = ({
    chartData,
    primaryColor,
    setIsAddGradeModalOpen,
    gradeHistory,
    sportiv,
    participari,
    examene,
    grade,
    onEditEntry,
    onDeleteEntry,
    onNavigateToExam
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
                    onNavigateToExam={onNavigateToExam}
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
                                {(onEditEntry || onDeleteEntry) && <th className="p-3 w-24"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                            {gradeHistory.length > 0 ? gradeHistory.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3 font-medium text-white">{new Date(item.data_obtinere + 'T00:00:00').toLocaleDateString('ro-RO')}</td>
                                    <td className="p-3"><span className="font-bold text-amber-400">{item.rankName}</span></td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs ${item.source === 'examen' ? 'bg-blue-900/30 text-blue-400' : 'bg-slate-700 text-slate-300'}`}>
                                            {item.source === 'examen' ? 'Examen Oficial' : 'Acordat Manual'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-400 italic">{item.observatii || '-'}</td>
                                    {(onEditEntry || onDeleteEntry) && (
                                        <td className="p-3">
                                            <div className="flex gap-1 justify-end">
                                                {onEditEntry && (
                                                    <button
                                                        onClick={() => onEditEntry({ id: item.id, grad_id: item.grad_id, data_obtinere: item.data_obtinere, observatii: item.observatii })}
                                                        className="p-1.5 rounded text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                                                        title="Editează"
                                                    >
                                                        <EditIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {onDeleteEntry && (
                                                    <button
                                                        onClick={() => onDeleteEntry(item.id)}
                                                        className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                        title="Șterge"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                <tr><td colSpan={5} className="p-4 text-center text-slate-500 italic">Nu există istoric înregistrat.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
