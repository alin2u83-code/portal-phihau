import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useData } from '../contexts/DataContext';
import { Card } from './ui';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const HartaExamene: React.FC = () => {
    const { filteredData } = useData();
    const sesiuni = filteredData.sesiuniExamene || [];
    const inscrieri = filteredData.inscrieriExamene || [];

    const sessionData = useMemo(() => {
        return sesiuni.map(s => {
            const sessionInscrieri = inscrieri.filter(i => i.sesiune_id === s.id);
            return {
                data: new Date(s.data).toLocaleDateString('ro-RO'),
                participanti: sessionInscrieri.length,
                status: s.status
            };
        });
    }, [sesiuni, inscrieri]);

    const statusData = useMemo(() => {
        const statusCounts = sesiuni.reduce((acc, s) => {
            acc[s.status || 'Programat'] = (acc[s.status || 'Programat'] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    }, [sesiuni]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Harta Informațiilor din Examene</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-4">
                    <h3 className="text-lg font-bold text-white mb-4">Participanți per Sesiune</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sessionData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="data" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="participanti" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-4">
                    <h3 className="text-lg font-bold text-white mb-4">Distribuție Status Sesiuni</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
};
