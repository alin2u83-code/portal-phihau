import React, { useState, useMemo } from 'react';
import { Prezenta, Sportiv, Grupa } from '../types';
import { Card, Input, Select, Button } from './ui';
import { ArrowLeftIcon } from './icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface RaportPrezentaProps {
    prezente: Prezenta[];
    sportivi: Sportiv[];
    grupe: Grupa[];
    onBack: () => void;
}

export const RaportPrezenta: React.FC<RaportPrezentaProps> = ({ prezente, sportivi, grupe, onBack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [grupaFilter, setGrupaFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
    const [tipFilter, setTipFilter] = useState('');

    const allRecords = useMemo(() => {
        return prezente.flatMap(p => 
            p.sportivi_prezenti_ids.map(sportivId => {
                const sportiv = sportivi.find(s => s.id === sportivId);
                const grupa = grupe.find(g => g.id === p.grupa_id);
                return {
                    id: `${p.id}-${sportivId}`,
                    data: p.data,
                    ora: p.ora,
                    tip: p.tip,
                    sportivNume: sportiv ? `${sportiv.nume} ${sportiv.prenume}` : 'N/A',
                    grupaNume: grupa?.denumire || (p.tip === 'Vacanta' ? 'Vacanță' : 'N/A'),
                    grupaId: p.grupa_id,
                };
            })
        ).sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }, [prezente, sportivi, grupe]);

    const filteredRecords = useMemo(() => {
        return allRecords.filter(rec => {
            const recordDate = new Date(rec.data);
            const month = recordDate.getMonth() + 1;
            const year = recordDate.getFullYear();

            const nameMatch = searchTerm === '' || rec.sportivNume.toLowerCase().includes(searchTerm.toLowerCase());
            const grupaMatch = grupaFilter === '' || rec.grupaId === grupaFilter;
            const monthMatch = monthFilter === '' || month === parseInt(monthFilter);
            const yearMatch = yearFilter === '' || year === parseInt(yearFilter);
            const tipMatch = tipFilter === '' || rec.tip === tipFilter;

            return nameMatch && grupaMatch && monthMatch && yearMatch && tipMatch;
        });
    }, [allRecords, searchTerm, grupaFilter, monthFilter, yearFilter, tipFilter]);

    const chartData = useMemo(() => {
        const counts: { [key: string]: number } = {};
        filteredRecords.forEach(rec => {
            counts[rec.data] = (counts[rec.data] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([date, count]) => ({
                dataLabel: new Date(date).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' }),
                prezente: count,
                fullDate: date
            }))
            .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
            .slice(-12);
    }, [filteredRecords]);

    const attendanceSummary = useMemo(() => {
        const summary: { [sportivNume: string]: { monthly: number[], total: number } } = {};
        filteredRecords.forEach(rec => {
            if (!summary[rec.sportivNume]) {
                summary[rec.sportivNume] = { monthly: Array(12).fill(0), total: 0 };
            }
            const monthIndex = new Date(rec.data).getMonth();
            summary[rec.sportivNume].monthly[monthIndex]++;
            summary[rec.sportivNume].total++;
        });

        return Object.entries(summary)
            .map(([sportivNume, data]) => ({ sportivNume, ...data }))
            .sort((a, b) => a.sportivNume.localeCompare(b.sportivNume));
    }, [filteredRecords]);

    const monthNames = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary" className="mb-2"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            
            <h1 className="text-3xl font-bold text-white">Analiză Prezențe</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <h3 className="text-xl font-bold text-white mb-4">Evoluție Prezențe (Ultima Perioadă)</h3>
                    <div className="h-64 w-full">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="dataLabel" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                        itemStyle={{ color: '#4DBCE9', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="prezente" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill="#4DBCE9" fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500 italic">Nu există date pentru intervalul selectat.</div>
                        )}
                    </div>
                </Card>

                <Card>
                    <h3 className="text-xl font-bold text-white mb-4">Filtre Raport</h3>
                    <div className="space-y-4">
                        <Input label="Caută Sportiv" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Nume..." />
                        <Select label="Grupă" value={grupaFilter} onChange={e => setGrupaFilter(e.target.value)}>
                            <option value="">Toate Grupele</option>
                            {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                        </Select>
                        <div className="grid grid-cols-2 gap-2">
                            <Select label="An" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                                <option value="2024">2024</option>
                                <option value="2025">2025</option>
                            </Select>
                            <Select label="Tip" value={tipFilter} onChange={e => setTipFilter(e.target.value)}>
                                <option value="">Toate</option>
                                <option value="Normal">Normal</option>
                                <option value="Vacanta">Vacanță</option>
                            </Select>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="bg-slate-700/50 p-4 border-b border-slate-600 flex justify-between items-center">
                    <h3 className="font-bold text-white">Centralizator Prezențe Luna/An ({yearFilter})</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-800 text-slate-400">
                            <tr>
                                <th className="p-3 font-semibold sticky left-0 bg-slate-800">Sportiv</th>
                                {monthNames.map(m => <th key={m} className="p-3 font-semibold text-center">{m}</th>)}
                                <th className="p-3 font-semibold text-center bg-slate-700/50">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {attendanceSummary.map(row => (
                                <tr key={row.sportivNume} className="hover:bg-slate-700/30">
                                    <td className="p-3 font-medium text-white sticky left-0 bg-slate-800/90 backdrop-blur-sm border-r border-slate-700">{row.sportivNume}</td>
                                    {row.monthly.map((count, i) => (
                                        <td key={i} className={`p-3 text-center ${count > 0 ? 'text-brand-secondary font-bold' : 'text-slate-600'}`}>
                                            {count || '-'}
                                        </td>
                                    ))}
                                    <td className="p-3 text-center font-bold bg-brand-secondary/10 text-brand-secondary">{row.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};