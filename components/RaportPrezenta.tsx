import React, { useMemo } from 'react';
import { Antrenament, Sportiv, Grupa } from '../types';
import { Card, Input, Select, Button } from './ui';
import { ArrowLeftIcon } from './icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface RaportPrezentaProps {
    antrenamente: Antrenament[];
    sportivi: Sportiv[];
    grupe: Grupa[];
    onBack: () => void;
}

interface RaportFilters {
    searchTerm: string;
    grupaFilter: string;
    salaFilter: string;
    yearFilter: string;
    tipFilter: string;
}

const initialFilters: RaportFilters = {
    searchTerm: '',
    grupaFilter: '',
    salaFilter: '',
    yearFilter: new Date().getFullYear().toString(),
    tipFilter: '',
};

// Define colors for the chart
const GROUP_COLORS = ['#4DBCE9', '#3D3D99', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6', '#ec4899'];

export const RaportPrezenta: React.FC<RaportPrezentaProps> = ({ antrenamente, sportivi, grupe, onBack }) => {
    const [filters, setFilters] = useLocalStorage('phi-hau-raport-prezenta-filters', initialFilters);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({...prev, [e.target.name]: e.target.value}));
    };
    
    const monthNames = useMemo(() => ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"], []);
    
    const sali = useMemo(() => [...new Set(grupe.map(g => g.sala).filter(Boolean))], [grupe]);

    const allRecords = useMemo(() => {
        return antrenamente.flatMap(a => 
            a.sportivi_prezenti_ids.map(sportivId => {
                const sportiv = sportivi.find(s => s.id === sportivId);
                const grupa = grupe.find(g => g.id === a.grupa_id);
                const tip = a.grupa_id ? 'Normal' : 'Vacanta';
                return {
                    id: `${a.id}-${sportivId}`,
                    data: a.data,
                    ora: a.ora_start,
                    tip: tip,
                    sportivNume: sportiv ? `${sportiv.nume} ${sportiv.prenume}` : 'N/A',
                    grupaNume: grupa?.denumire || (tip === 'Vacanta' ? 'Vacanță' : 'N/A'),
                    grupaId: a.grupa_id,
                };
            })
        ).sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }, [antrenamente, sportivi, grupe]);

    const filteredRecords = useMemo(() => {
        return allRecords.filter(rec => {
            const recordDate = new Date(rec.data);
            const year = recordDate.getFullYear();

            const nameMatch = filters.searchTerm === '' || rec.sportivNume.toLowerCase().includes(filters.searchTerm.toLowerCase());
            const grupaMatch = filters.grupaFilter === '' || rec.grupaId === filters.grupaFilter;
            const grupaPentruRecord = rec.grupaId ? grupe.find(g => g.id === rec.grupaId) : null;
            const salaMatch = filters.salaFilter === '' || (grupaPentruRecord && grupaPentruRecord.sala === filters.salaFilter);
            const yearMatch = filters.yearFilter === '' || year === parseInt(filters.yearFilter);
            const tipMatch = filters.tipFilter === '' || rec.tip === filters.tipFilter;

            return nameMatch && grupaMatch && yearMatch && tipMatch && salaMatch;
        });
    }, [allRecords, filters, grupe]);

    const { groupChartData, activeGroups } = useMemo(() => {
        // FIX: Explicitly set the generic type for `new Set` to `<string>` to resolve a type inference issue where the resulting array was being inferred as `unknown[]` instead of `string[]`.
        const groupNames: string[] = [...new Set<string>(filteredRecords.map(r => r.grupaNume))].sort();
        
        const data = monthNames.map(monthName => {
            const monthEntry: { [key: string]: string | number } = { name: monthName };
            groupNames.forEach(gName => {
                monthEntry[gName] = 0;
            });
            return monthEntry;
        });

        filteredRecords.forEach(rec => {
            const monthIndex = new Date(rec.data).getMonth();
            if (data[monthIndex] && typeof data[monthIndex][rec.grupaNume] === 'number') {
                (data[monthIndex][rec.grupaNume] as number)++;
            }
        });
        
        return { groupChartData: data, activeGroups: groupNames };
    }, [filteredRecords, monthNames]);

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

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary" className="mb-2"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            
            <h1 className="text-3xl font-bold text-white">Analiză Prezențe</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <h3 className="text-xl font-bold text-white mb-4">Prezențe Lunare pe Grupe ({filters.yearFilter})</h3>
                    <div className="h-64 w-full">
                        {groupChartData.length > 0 && activeGroups.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={groupChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                        itemStyle={{ fontWeight: 'bold' }}
                                        cursor={{ fill: 'rgba(77, 188, 233, 0.1)' }}
                                    />
                                    <Legend wrapperStyle={{fontSize: "12px"}}/>
                                    {activeGroups.map((groupName, index) => (
                                        <Bar 
                                            key={groupName} 
                                            dataKey={groupName} 
                                            stackId="a" 
                                            fill={GROUP_COLORS[index % GROUP_COLORS.length]} 
                                            radius={[4, 4, 0, 0]} 
                                        />
                                    ))}
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
                        <Input label="Caută Sportiv" name="searchTerm" value={filters.searchTerm} onChange={handleFilterChange} placeholder="Nume..." />
                        <Select label="Grupă" name="grupaFilter" value={filters.grupaFilter} onChange={handleFilterChange}>
                            <option value="">Toate Grupele</option>
                            {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                        </Select>
                        <Select label="Sală" name="salaFilter" value={filters.salaFilter} onChange={handleFilterChange}>
                            <option value="">Toate sălile</option>
                            {sali.map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                        <div className="grid grid-cols-2 gap-2">
                            <Select label="An" name="yearFilter" value={filters.yearFilter} onChange={handleFilterChange}>
                                <option value="2024">2024</option>
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                            </Select>
                            <Select label="Tip" name="tipFilter" value={filters.tipFilter} onChange={handleFilterChange}>
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
                    <h3 className="font-bold text-white">Centralizator Prezențe Luna/An ({filters.yearFilter})</h3>
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