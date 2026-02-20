import React, { useMemo } from 'react';
import { Antrenament, Sportiv, Grupa, View } from '../types';
import { Card, Input, Select, Button } from './ui';
import { ArrowLeftIcon } from './icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useIsMobile } from '../hooks/useIsMobile';

interface RaportPrezentaProps {
    antrenamente: Antrenament[];
    sportivi: Sportiv[];
    grupe: Grupa[];
    onBack: () => void;
    onViewSportiv: (sportiv: Sportiv) => void;
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

const GROUP_COLORS = ['#4DBCE9', '#3D3D99', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6', '#ec4899', '#64748b'];

export const RaportPrezenta: React.FC<RaportPrezentaProps> = ({ antrenamente, sportivi, grupe, onBack, onViewSportiv }) => {
    const [filters, setFilters] = useLocalStorage('phi-hau-raport-prezenta-filters', initialFilters);
    const isMobile = useIsMobile();

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({...prev, [e.target.name]: e.target.value}));
    };
    
    const monthNames = useMemo(() => ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"], []);
    const sali = useMemo(() => [...new Set((grupe || []).map(g => g.sala).filter(Boolean))], [grupe]);

    const { filteredPresenceRecords, filteredDetailedLog } = useMemo(() => {
        const [type, yearStr] = filters.yearFilter.split('_');
        const year = parseInt(yearStr, 10);
        
        let filteredTrainings = (antrenamente || []);
        if (filters.yearFilter) {
            filteredTrainings = filteredTrainings.filter(a => new Date(a.data).getFullYear() === year);
        }
        if (filters.tipFilter) {
            filteredTrainings = filteredTrainings.filter(a => (a.grupa_id ? 'Normal' : 'Vacanta') === filters.tipFilter);
        }
        if (filters.grupaFilter) {
            filteredTrainings = filteredTrainings.filter(a => a.grupa_id === filters.grupaFilter);
        }
        if (filters.salaFilter) {
            const groupIdsInSala = new Set((grupe || []).filter(g => g.sala === filters.salaFilter).map(g => g.id));
            filteredTrainings = filteredTrainings.filter(a => a.grupa_id && groupIdsInSala.has(a.grupa_id));
        }
        
        // Data for charts (only presences)
        const presenceRecords = filteredTrainings.flatMap(a => 
            (a.prezenta || []).map(p => {
                const sportiv = sportivi.find(s => s.id === p.sportiv_id);
                const tip = a.grupa_id ? 'Normal' : 'Vacanta';
                return {
                    id: `${a.id}-${p.sportiv_id}`, data: a.data, ora: a.ora_start, tip: tip,
                    sportiv: sportiv, sportivNume: sportiv ? `${sportiv.nume} ${sportiv.prenume}` : 'N/A',
                    grupaNume: a.grupe?.denumire || (tip === 'Vacanta' ? 'Vacanță' : 'N/A'), grupaId: a.grupa_id,
                };
            })
        );
        
        // Data for detailed log (present and absent)
        const detailedLog = filteredTrainings.flatMap(a => {
            const sportiviAsteptati = (a.grupa_id)
                ? (sportivi || []).filter(s => s.grupa_id === a.grupa_id && s.status === 'Activ')
                : (sportivi || []).filter(s => s.participa_vacanta && s.status === 'Activ');

            return sportiviAsteptati.map(sportiv => ({
                id: `${a.id}-${sportiv.id}`, data: a.data, sportiv: sportiv,
                sportivNume: `${sportiv.nume} ${sportiv.prenume}`,
                grupaNume: a.grupe?.denumire || 'Vacanță',
                status: (a.prezenta || []).some(p => p.sportiv_id === sportiv.id) ? 'Prezent' : 'Absent'
            }));
        });

        const finalFilteredLog = detailedLog.filter(rec =>
            filters.searchTerm === '' || rec.sportivNume.toLowerCase().includes(filters.searchTerm.toLowerCase())
        ).sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());

        return { filteredPresenceRecords: presenceRecords, filteredDetailedLog: finalFilteredLog };
    }, [antrenamente, sportivi, grupe, filters]);


    type MonthlyGroupPresence = {
        name: string;
    } & Record<string, number>;

    const { groupChartData, activeGroups } = useMemo(() => {
        const groupNames: string[] = [...new Set(filteredPresenceRecords.map(r => r.grupaNume).filter(Boolean) as string[])].sort();
        
        const data: MonthlyGroupPresence[] = monthNames.map(monthName => {
            const monthEntry: MonthlyGroupPresence = { name: monthName };
            groupNames.forEach(gName => {
                monthEntry[gName] = 0;
            });
            return monthEntry;
        });

        filteredPresenceRecords.forEach(rec => {
            const monthIndex = new Date(rec.data).getMonth();
            const groupName = rec.grupaNume;

            if (data[monthIndex] && groupName && typeof data[monthIndex][groupName] !== 'undefined') {
                data[monthIndex][groupName] = (data[monthIndex][groupName] || 0) + 1;
            }
        });
        
        return { groupChartData: data, activeGroups: groupNames };
    }, [filteredPresenceRecords, monthNames]);
    

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
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} itemStyle={{ fontWeight: 'bold' }} cursor={{ fill: 'rgba(77, 188, 233, 0.1)' }}/>
                                    <Legend wrapperStyle={{fontSize: "12px"}}/>
                                    {activeGroups.map((groupName, index) => (
                                        <Bar key={groupName} dataKey={groupName} stackId="a" fill={GROUP_COLORS[index % GROUP_COLORS.length]} radius={[4, 4, 0, 0]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="flex items-center justify-center h-full text-slate-500 italic">Nu există date pentru intervalul selectat.</div> }
                    </div>
                </Card>
                <Card><h3 className="text-xl font-bold text-white mb-4">Filtre Raport</h3>
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
                                <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
                            </Select>
                            <Select label="Tip" name="tipFilter" value={filters.tipFilter} onChange={handleFilterChange}>
                                <option value="">Toate</option><option value="Normal">Normal</option><option value="Vacanta">Vacanță</option>
                            </Select>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="p-4 bg-slate-700/50 font-bold text-white">Jurnal Detaliat Prezențe</div>
                {isMobile ? (
                    <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
                        {filteredDetailedLog.map(rec => (
                            <div key={rec.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center cursor-pointer" onClick={() => rec.sportiv && onViewSportiv(rec.sportiv)}>
                                <div>
                                    <p className="font-bold text-white">{rec.sportivNume}</p>
                                    <p className="text-sm text-slate-400">{rec.grupaNume}</p>
                                    <p className="text-xs text-slate-500">{new Date(rec.data + 'T00:00:00').toLocaleDateString('ro-RO')}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rec.status === 'Prezent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {rec.status}
                                </span>
                            </div>
                        ))}
                        {filteredDetailedLog.length === 0 && <p className="p-12 text-center text-slate-500 italic">Niciun rezultat conform filtrelor.</p>}
                    </div>
                ) : (
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-left text-sm min-w-[600px]">
                            <thead className="bg-slate-800 text-slate-400 sticky top-0">
                                <tr>
                                    <th className="p-3 font-semibold">Data</th>
                                    <th className="p-3 font-semibold">Nume Sportiv</th>
                                    <th className="p-3 font-semibold">Grupa</th>
                                    <th className="p-3 font-semibold text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {filteredDetailedLog.map(rec => (
                                    <tr key={rec.id} className="hover:bg-slate-700/30">
                                        <td className="p-3 whitespace-nowrap">{new Date(rec.data + 'T00:00:00').toLocaleDateString('ro-RO')}</td>
                                        <td className="p-3 font-medium text-white hover:text-brand-primary hover:underline cursor-pointer" onClick={() => rec.sportiv && onViewSportiv(rec.sportiv)}>
                                            {rec.sportivNume}
                                        </td>
                                        <td className="p-3 text-slate-400">{rec.grupaNume}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rec.status === 'Prezent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {rec.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                         {filteredDetailedLog.length === 0 && <p className="p-12 text-center text-slate-500 italic">Niciun rezultat conform filtrelor.</p>}
                    </div>
                )}
            </Card>
        </div>
    );
};