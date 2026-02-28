import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Grad, IstoricGrade } from '../types';

interface SportivProgressChartProps {
    istoricGrade: IstoricGrade[];
    grade: Grad[];
    themeColor?: string;
}

export const SportivProgressChart: React.FC<SportivProgressChartProps> = ({ istoricGrade, grade, themeColor = '#3b82f6' }) => {
    const data = React.useMemo(() => {
        if (!istoricGrade || !grade) return [];

        const sortedHistory = [...istoricGrade].sort((a, b) => 
            new Date(a.data_obtinere).getTime() - new Date(b.data_obtinere).getTime()
        );

        return sortedHistory.map(entry => {
            const grad = grade.find(g => g.id === entry.grad_id);
            return {
                date: new Date(entry.data_obtinere).toLocaleDateString('ro-RO'),
                rankOrder: grad?.ordine || 0,
                rankName: grad?.nume || 'Necunoscut',
                timestamp: new Date(entry.data_obtinere).getTime()
            };
        });
    }, [istoricGrade, grade]);

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-slate-400 text-sm italic">Nu există date istorice despre grade.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-80 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Evoluție Grade</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                        dataKey="date" 
                        stroke="#64748b" 
                        fontSize={12}
                        tickMargin={10}
                    />
                    <YAxis 
                        dataKey="rankOrder" 
                        stroke="#64748b" 
                        fontSize={12}
                        domain={['dataMin - 1', 'dataMax + 1']}
                        hide // Hide the Y axis numbers as rank order is internal
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                        formatter={(value: any, name: any, props: any) => [props.payload.rankName, 'Grad']}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="rankOrder" 
                        stroke={themeColor} 
                        strokeWidth={3}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                        animationDuration={1500}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
