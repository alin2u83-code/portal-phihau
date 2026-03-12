import React, { useMemo } from 'react';
import { Antrenament, Sportiv, Grupa, View } from '../types';
import { Card, Input, Select, Button } from './ui';
import { ArrowLeftIcon, ExclamationTriangleIcon } from './icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useData } from '../contexts/DataContext';
import { ResponsiveTable, Column } from './ResponsiveTable';

interface RaportPrezentaProps {
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

export const RaportPrezenta: React.FC<RaportPrezentaProps> = ({ onBack, onViewSportiv }) => {
    const { filteredData } = useData();
    const antrenamente = filteredData.antrenamente;
    const sportivi = filteredData.sportivi;
    const grupe = filteredData.grupe;

    const [filters, setFilters] = useLocalStorage('phi-hau-raport-prezenta-filters', initialFilters);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({...prev, [e.target.name]: e.target.value}));
    };
    
    const monthNames = useMemo(() => ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"], []);
    const sali = useMemo(() => [...new Set((grupe || []).map(g => g.sala).filter(Boolean))], [grupe]);

    const { filteredPresenceRecords, filteredDetailedLog, athleteSummary } = useMemo(() => {
        const [type, yearStr] = filters.yearFilter.split('_');
        const year = parseInt(yearStr, 10);
        
        let filteredTrainings = (antrenamente || []);
        if (filters.yearFilter) {
            filteredTrainings = filteredTrainings.filter(a => new Date((a.data || '').toString().slice(0, 10)).getFullYear() === year);
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
                    id: `${a.id}-${p.sportiv_id}`, data: (a.data || '').toString().slice(0, 10), ora: a.ora_start, tip: tip,
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
                id: `${a.id}-${sportiv.id}`, data: (a.data || '').toString().slice(0, 10), sportiv: sportiv,
                sportivNume: `${sportiv.nume} ${sportiv.prenume}`,
                grupaNume: a.grupe?.denumire || 'Vacanță',
                status: (a.prezenta || []).some(p => p.sportiv_id === sportiv.id) ? 'Prezent' : 'Absent'
            }));
        });

        const finalFilteredLog = detailedLog.filter(rec =>
            filters.searchTerm === '' || rec.sportivNume.toLowerCase().includes(filters.searchTerm.toLowerCase())
        ).sort((a,b) => new Date((b.data || '').toString().slice(0, 10)).getTime() - new Date((a.data || '').toString().slice(0, 10)).getTime());

        const athleteStats = new Map<string, { total: number, present: number, sportivNume: string, sportiv: Sportiv }>();
        finalFilteredLog.forEach(rec => {
            if (!athleteStats.has(rec.sportiv.id)) {
                athleteStats.set(rec.sportiv.id, { total: 0, present: 0, sportivNume: rec.sportivNume, sportiv: rec.sportiv });
            }
            const stat = athleteStats.get(rec.sportiv.id)!;
            stat.total++;
            if (rec.status === 'Prezent') stat.present++;
        });

        const athleteSummary = Array.from(athleteStats.values()).map(stat => ({
            ...stat,
            id: stat.sportiv.id,
            percentage: stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0
        })).sort((a, b) => a.percentage - b.percentage);

        return { filteredPresenceRecords: presenceRecords, filteredDetailedLog: finalFilteredLog, athleteSummary };
    }, [antrenamente, sportivi, grupe, filters]);


    const { groupChartData, activeGroups } = useMemo(() => {
        const groupNames: string[] = [...new Set<string>(filteredPresenceRecords.map(r => r.grupaNume))].sort();
        const data = monthNames.map(monthName => {
            const monthEntry: { [key: string]: string | number } = { name: monthName };
            groupNames.forEach(gName => { monthEntry[gName] = 0; });
            return monthEntry;
        });

        filteredPresenceRecords.forEach(rec => {
            const monthIndex = new Date((rec.data || '').toString().slice(0, 10)).getMonth();
            if (data[monthIndex] && typeof data[monthIndex][rec.grupaNume] === 'number') {
                data[monthIndex][rec.grupaNume] = (data[monthIndex][rec.grupaNume] as number) + 1;
            }
        });
        
        return { groupChartData: data, activeGroups: groupNames };
    }, [filteredPresenceRecords, monthNames]);
    
    // --- Columns for Summary Table ---
    const columnsSummary: Column<typeof athleteSummary[0]>[] = [
        {
            key: 'sportivNume',
            label: 'Nume Sportiv',
            render: (stat) => (
                <div className="flex items-center gap-2 font-medium text-white hover:text-brand-primary hover:underline cursor-pointer" onClick={() => onViewSportiv(stat.sportiv)}>
                    {stat.percentage < 50 && <span title="Prezență sub 50%"><ExclamationTriangleIcon className="w-4 h-4 text-red-500" /></span>}
                    {stat.sportivNume}
                </div>
            )
        },
        {
            key: 'present',
            label: 'Prezențe',
            headerClassName: 'text-center',
            cellClassName: 'text-center text-slate-300',
            render: (stat) => <span>{stat.present} / {stat.total}</span>
        },
        {
            key: 'percentage',
            label: 'Procentaj',
            headerClassName: 'text-center',
            cellClassName: 'text-center',
            render: (stat) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stat.percentage < 50 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                    {stat.percentage}%
                </span>
            )
        }
    ];

    const renderMobileItemSummary = (stat: typeof athleteSummary[0]) => (
        <Card className={`mb-4 border-l-4 ${stat.percentage < 50 ? 'border-red-500 bg-red-900/10' : 'border-green-500'}`}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    {stat.percentage < 50 && <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />}
                    <p className="font-bold text-white text-lg" onClick={() => onViewSportiv(stat.sportiv)}>{stat.sportivNume}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${stat.percentage < 50 ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
                    {stat.percentage}%
                </span>
            </div>
            <div className="mt-2 text-sm text-slate-400">
                Prezențe: <span className="text-white font-bold">{stat.present} / {stat.total}</span>
            </div>
        </Card>
    );

    // --- Columns for Detailed Log Table ---
    const columnsLog: Column<typeof filteredDetailedLog[0]>[] = [
        {
            key: 'data',
            label: 'Data',
            render: (rec) => <span className="whitespace-nowrap">{new Date((rec.data || '').toString().slice(0, 10) + 'T00:00:00').toLocaleDateString('ro-RO')}</span>
        },
        {
            key: 'sportivNume',
            label: 'Nume Sportiv',
            render: (rec) => (
                <span className="font-medium text-white hover:text-brand-primary hover:underline cursor-pointer" onClick={() => rec.sportiv && onViewSportiv(rec.sportiv)}>
                    {rec.sportivNume}
                </span>
            )
        },
        {
            key: 'grupaNume',
            label: 'Grupa',
            render: (rec) => <span className="text-slate-400">{rec.grupaNume}</span>
        },
        {
            key: 'status',
            label: 'Status',
            headerClassName: 'text-center',
            cellClassName: 'text-center',
            render: (rec) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rec.status === 'Prezent' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {rec.status}
                </span>
            )
        }
    ];

    const renderMobileItemLog = (rec: typeof filteredDetailedLog[0]) => (
        <Card className={`mb-4 border-l-4 ${rec.status === 'Prezent' ? 'border-green-500' : 'border-red-500'}`}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="font-bold text-white text-lg" onClick={() => rec.sportiv && onViewSportiv(rec.sportiv)}>{rec.sportivNume}</p>
                    <p className="text-sm text-slate-400">{new Date((rec.data || '').toString().slice(0, 10) + 'T00:00:00').toLocaleDateString('ro-RO')} - {rec.grupaNume}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${rec.status === 'Prezent' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                    {rec.status}
                </span>
            </div>
        </Card>
    );

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-0 overflow-hidden">
                    <div className="p-4 bg-slate-700/50 font-bold text-white">Sumar pe Sportiv (Atenție &lt; 50%)</div>
                    <div className="overflow-x-auto max-h-[600px]">
                        <ResponsiveTable
                            columns={columnsSummary}
                            data={athleteSummary}
                            renderMobileItem={renderMobileItemSummary}
                            idKey="id"
                        />
                        {athleteSummary.length === 0 && <p className="p-12 text-center text-slate-500 italic">Niciun rezultat conform filtrelor.</p>}
                    </div>
                </Card>

                <Card className="p-0 overflow-hidden">
                    <div className="p-4 bg-slate-700/50 font-bold text-white">Jurnal Detaliat Prezențe</div>
                    <div className="overflow-x-auto max-h-[600px]">
                        <ResponsiveTable
                            columns={columnsLog}
                            data={filteredDetailedLog}
                            renderMobileItem={renderMobileItemLog}
                            idKey="id"
                        />
                         {filteredDetailedLog.length === 0 && <p className="p-12 text-center text-slate-500 italic">Niciun rezultat conform filtrelor.</p>}
                    </div>
                </Card>
            </div>
        </div>
    );
};
