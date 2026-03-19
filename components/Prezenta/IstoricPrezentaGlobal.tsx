import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Sportiv } from '../../types';
import { Button, Card, Input } from '../ui';
import { ArrowLeftIcon, CalendarDaysIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { ResponsiveTable, Column } from '../ResponsiveTable';

export const IstoricPrezentaGlobal: React.FC<{ onBack: () => void, onViewSportiv?: (s: Sportiv) => void }> = ({ onBack, onViewSportiv }) => {
    const [istoric, setIstoric] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { showError } = useError();
    const [sportivi, setSportivi] = useState<Record<string, Sportiv>>({});

    // Filters & Sorting
    const [filterNume, setFilterNume] = useState('');
    const [filterGrupa, setFilterGrupa] = useState('');
    const [filterDataStart, setFilterDataStart] = useState('');
    const [filterDataEnd, setFilterDataEnd] = useState('');
    const [sortField, setSortField] = useState<'data' | 'nume_sportiv' | 'nume_grupa'>('data');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const fetchFilteredData = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('vedere_prezenta_sportiv').select('*');

        if (filterDataStart) query = query.gte('data', filterDataStart);
        if (filterDataEnd) query = query.lte('data', filterDataEnd);
        if (filterGrupa) query = query.ilike('nume_grupa', `%${filterGrupa}%`);
        
        query = query.order('data', { ascending: false });
        query = query.limit(500);

        const { data, error } = await query;
        
        if (error) {
            showError("Eroare la încărcarea istoricului", error.message);
        } else {
            setIstoric(data || []);
        }
        setLoading(false);
    }, [filterDataStart, filterDataEnd, filterGrupa, showError]);

    useEffect(() => {
        const loadInitial = async () => {
            setLoading(true);
            const { data } = await supabase.from('sportivi').select('*');
            if (data) {
                const spMap: Record<string, Sportiv> = {};
                data.forEach(s => spMap[s.id] = s);
                setSportivi(spMap);
            }
            fetchFilteredData();
        };
        loadInitial();
    }, []);

    useEffect(() => {
        fetchFilteredData();
    }, [fetchFilteredData]);

    const filteredAndSortedIstoric = useMemo(() => {
        let result = [...istoric];

        if (filterNume) {
            const lowerFilter = filterNume.toLowerCase();
            result = result.filter(row => {
                const sp = sportivi[row.sportiv_id];
                const numeComplet = sp ? `${sp.nume} ${sp.prenume}` : '';
                return numeComplet.toLowerCase().includes(lowerFilter);
            });
        }

        result.sort((a, b) => {
            let valA: any = '';
            let valB: any = '';

            if (sortField === 'data') {
                valA = new Date((a.data || '').toString().slice(0, 10)).getTime();
                valB = new Date((b.data || '').toString().slice(0, 10)).getTime();
            } else if (sortField === 'nume_sportiv') {
                const spA = sportivi[a.sportiv_id];
                const spB = sportivi[b.sportiv_id];
                valA = spA ? `${spA.nume} ${spA.prenume}` : '';
                valB = spB ? `${spB.nume} ${spB.prenume}` : '';
            } else if (sortField === 'nume_grupa') {
                valA = a.nume_grupa || '';
                valB = b.nume_grupa || '';
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [istoric, filterNume, sportivi, sortField, sortDirection]);

    const handleSort = (field: 'data' | 'nume_sportiv' | 'nume_grupa') => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const columns: Column<any>[] = [
        {
            key: 'data',
            label: 'Data',
            render: (row) => <span className="text-slate-300">{new Date((row.data || '').toString().slice(0, 10)).toLocaleDateString('ro-RO')}</span>
        },
        {
            key: 'ora_start',
            label: 'Ora',
            render: (row) => <span className="text-slate-500 font-mono">{row.ora_start}</span>
        },
        {
            key: 'nume_sportiv',
            label: 'Sportiv',
            render: (row) => {
                const sp = sportivi[row.sportiv_id];
                return (
                    <span 
                        className="font-bold text-white cursor-pointer hover:text-indigo-400 hover:underline transition-colors"
                        onClick={() => sp && onViewSportiv && onViewSportiv(sp)}
                    >
                        {sp ? `${sp.nume} ${sp.prenume}` : 'Necunoscut'}
                    </span>
                );
            }
        },
        {
            key: 'nume_grupa',
            label: 'Grupa',
            render: (row) => <span className="text-slate-400">{row.nume_grupa}</span>
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${row.status?.toLowerCase() === 'prezent' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {row.status}
                </span>
            )
        }
    ];

    const renderMobileItem = (row: any) => {
        const sp = sportivi[row.sportiv_id];
        return (
            <Card className={`mb-4 border-l-4 ${row.status?.toLowerCase() === 'prezent' ? 'border-emerald-500' : 'border-rose-500'}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-white text-lg mb-1" onClick={() => sp && onViewSportiv && onViewSportiv(sp)}>
                            {sp ? `${sp.nume} ${sp.prenume}` : 'Necunoscut'}
                        </p>
                        <p className="text-sm text-slate-400 mb-2">{row.nume_grupa}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <CalendarDaysIcon className="w-3 h-3" />
                            <span>{new Date((row.data || '').toString().slice(0, 10)).toLocaleDateString('ro-RO')}</span>
                            <span className="font-mono ml-2">{row.ora_start}</span>
                        </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${row.status?.toLowerCase() === 'prezent' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {row.status}
                    </span>
                </div>
            </Card>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <Button onClick={onBack} variant="secondary" size="sm">
                <ArrowLeftIcon className="w-4 h-4 mr-2"/> Înapoi la Grupe
            </Button>

            <Card className="overflow-hidden border-none shadow-xl bg-slate-900/40 backdrop-blur-sm">
                <div className="p-6 border-b border-slate-800 bg-slate-800/30">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <CalendarDaysIcon className="w-6 h-6 text-indigo-400" />
                                Istoric Global Prezențe
                            </h2>
                            <p className="text-slate-400 mt-1">Vizualizează și filtrează prezențele tuturor sportivilor.</p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 p-4 bg-slate-800/20 rounded-2xl border border-slate-700/30">
                        <Input label="Caută Sportiv" placeholder="Nume..." value={filterNume} onChange={e => setFilterNume(e.target.value)} />
                        <Input label="Caută Grupă" placeholder="Grupă..." value={filterGrupa} onChange={e => setFilterGrupa(e.target.value)} />
                        <Input label="De la" type="date" value={filterDataStart} onChange={e => setFilterDataStart(e.target.value)} />
                        <Input label="Până la" type="date" value={filterDataEnd} onChange={e => setFilterDataEnd(e.target.value)} />
                    </div>

                    <ResponsiveTable
                        columns={columns}
                        data={filteredAndSortedIstoric}
                        onSort={handleSort}
                        sortConfig={{ key: sortField, direction: sortDirection }}
                        renderMobileItem={renderMobileItem}
                    />
                </div>
            </Card>
        </div>
    );
};
