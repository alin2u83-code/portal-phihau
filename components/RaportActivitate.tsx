import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { User, RaportActivitateRecord } from '../types';
import { useError } from './ErrorProvider';
import { Card, Button, Switch } from './ui';
import { DocumentArrowDownIcon } from './icons';
import { exportToCsv } from '../utils/csv';
import { useData } from '../contexts/DataContext';
import { ResponsiveTable, Column } from './ResponsiveTable';

type SortKey = keyof RaportActivitateRecord;

export const RaportActivitate: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { currentUser, grade, sportivi: sportiviCache, activeRoleContext } = useData();
    type RawData = { antrenamente: {id: string; data: string}[]; prezente: {sportiv_id: string; antrenament_id: string}[]; activeClubId: string };
    const [rawData, setRawData] = useState<RawData | null>(null);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'nume_complet', direction: 'asc' });
    const [showAtRiskOnly, setShowAtRiskOnly] = useState(false);
    const { showError } = useError();

    useEffect(() => {
        const fetchData = async () => {
            if (!supabase) {
                showError("Eroare", "Client Supabase neconfigurat.");
                setLoading(false);
                return;
            }
            setLoading(true);

            const today = new Date().toISOString().split('T')[0];
            const activeClubId = activeRoleContext?.club_id;

            if (!activeClubId) {
                showError("Eroare", "Niciun club activ selectat.");
                setLoading(false);
                return;
            }

            const [antrenamenteRes, prezenteRes] = await Promise.all([
                supabase
                    .from('program_antrenamente')
                    .select('id, data')
                    .lte('data', today)
                    .eq('club_id', activeClubId),
                supabase
                    .from('prezenta_antrenament')
                    .select('sportiv_id, antrenament_id')
                    .eq('club_id', activeClubId)
                    .eq('status_id', 'bbb719f2-808d-451b-9ab2-977272104074')
                    .limit(10000),
            ]);

            if (antrenamenteRes.error || prezenteRes.error) {
                const err = antrenamenteRes.error || prezenteRes.error;
                showError("Eroare la încărcare raport", err?.message || 'Eroare necunoscută');
                setLoading(false);
                return;
            }

            setRawData({ antrenamente: antrenamenteRes.data || [], prezente: prezenteRes.data || [], activeClubId });
            setLoading(false);
        };
        fetchData();
    }, [currentUser.id, showError]);

    const data = useMemo<RaportActivitateRecord[]>(() => {
        if (!rawData || sportiviCache.length === 0) return [];
        const { antrenamente, prezente, activeClubId } = rawData;
        const antrenamenteDateMap: Record<string, string> = {};
        for (const a of antrenamente) antrenamenteDateMap[a.id] = a.data;

        const prezenteMap: Record<string, { set: Set<string>; lastDate: string }> = {};
        for (const p of prezente) {
            if (!prezenteMap[p.sportiv_id]) prezenteMap[p.sportiv_id] = { set: new Set(), lastDate: '' };
            prezenteMap[p.sportiv_id].set.add(p.antrenament_id);
            const d = antrenamenteDateMap[p.antrenament_id] || '';
            if (d > prezenteMap[p.sportiv_id].lastDate) prezenteMap[p.sportiv_id].lastDate = d;
        }

        const totalAntrenamente = antrenamente.length;
        const sportiviActivi = sportiviCache.filter(s =>
            s.club_id === activeClubId && s.status === 'Activ'
        );

        return sportiviActivi.map(s => {
            const pInfo = prezenteMap[s.id];
            const prezente_efective = pInfo?.set.size || 0;
            return {
                sportiv_id: s.id,
                nume_complet: `${s.nume} ${s.prenume}`.trim(),
                grad_actual_id: s.grad_actual_id,
                antrenamente_tinute: totalAntrenamente,
                prezente_efective,
                procentaj_prezenta: totalAntrenamente > 0 ? Math.round(prezente_efective / totalAntrenamente * 1000) / 10 : 0,
                ultima_prezenta: pInfo?.lastDate || null,
            };
        }).sort((a, b) => a.nume_complet.localeCompare(b.nume_complet, 'ro'));
    }, [rawData, sportiviCache]);

    const getGradName = (gradId: string | null) => {
        if (!gradId) return 'Începător';
        return grade.find(g => g.id === gradId)?.nume || 'Începător';
    };

    const sortedAndFilteredData = useMemo(() => {
        let sortableData = [...data];
        if (showAtRiskOnly) {
            sortableData = sortableData.filter(item => item.procentaj_prezenta < 50);
        }
        
        sortableData.sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            if (aVal < bVal) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aVal > bVal) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        return sortableData;
    }, [data, sortConfig, showAtRiskOnly]);

    const requestSort = (key: string) => {
        const sortKey = key as SortKey;
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === sortKey && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key: sortKey, direction });
    };
    
    const handleExport = () => {
        const dataToExport = sortedAndFilteredData.map(d => ({
            "Nume Complet": d.nume_complet,
            "Grad Actual": getGradName(d.grad_actual_id),
            "Antrenamente Club": d.antrenamente_tinute,
            "Prezente Efective": d.prezente_efective,
            "Procentaj Prezenta (%)": d.procentaj_prezenta,
            "Data Ultimei Prezente": d.ultima_prezenta ? new Date(d.ultima_prezenta).toLocaleDateString('ro-RO') : 'N/A'
        }));
        exportToCsv(`raport_activitate_${new Date().toISOString().split('T')[0]}.csv`, dataToExport);
    };

    const formatRoDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString + 'T00:00:00').toLocaleDateString('ro-RO', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    const columns: Column<RaportActivitateRecord>[] = [
        {
            key: 'nume_complet',
            label: 'Nume Sportiv',
            render: (row) => <span className="font-medium text-white">{row.nume_complet}</span>
        },
        {
            key: 'grad_actual_id',
            label: 'Grad Actual',
            render: (row) => <span>{getGradName(row.grad_actual_id)}</span>
        },
        {
            key: 'prezente_efective',
            label: 'Prezențe',
            render: (row) => <span className="font-bold">{row.prezente_efective} / {row.antrenamente_tinute}</span>
        },
        {
            key: 'procentaj_prezenta',
            label: 'Procentaj',
            render: (row) => (
                <span className={`font-bold ${row.procentaj_prezenta < 50 ? 'text-red-400' : 'text-green-400'}`}>
                    {row.procentaj_prezenta}%
                </span>
            )
        },
        {
            key: 'ultima_prezenta',
            label: 'Ultima Prezență',
            render: (row) => <span>{formatRoDate(row.ultima_prezenta)}</span>
        }
    ];

    const renderMobileItem = (row: RaportActivitateRecord) => (
        <Card className={`mb-4 border-l-4 ${row.procentaj_prezenta < 50 ? 'border-red-500 bg-red-900/10' : 'border-green-500'}`}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="font-bold text-white text-lg">{row.nume_complet}</p>
                    <p className="text-sm text-slate-400">{getGradName(row.grad_actual_id)}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.procentaj_prezenta < 50 ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
                    {row.procentaj_prezenta}%
                </span>
            </div>
            <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-500">Prezențe:</span>
                    <span className="text-white font-bold">{row.prezente_efective} / {row.antrenamente_tinute}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">Ultima Prezență:</span>
                    <span className="text-white">{formatRoDate(row.ultima_prezenta)}</span>
                </div>
            </div>
        </Card>
    );

    if (loading) {
        return <div className="text-center p-8">Se încarcă raportul de activitate...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Raport de Activitate</h1>
            </div>
            
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <Switch 
                        label="Afișează doar sportivii la risc (prezență < 50%)"
                        name="atRisk"
                        checked={showAtRiskOnly}
                        onChange={(e) => setShowAtRiskOnly(e.target.checked)}
                    />
                    <Button onClick={handleExport} variant="primary" className="w-full sm:w-auto">
                        <DocumentArrowDownIcon className="w-5 h-5 mr-2" /> Export CSV
                    </Button>
                </div>
            </Card>

            <Card className="p-0 overflow-hidden bg-transparent border-none shadow-none">
                <div className="overflow-x-auto">
                    <ResponsiveTable
                        columns={columns}
                        data={sortedAndFilteredData}
                        renderMobileItem={renderMobileItem}
                        onSort={requestSort}
                    />
                     {sortedAndFilteredData.length === 0 && <p className="p-12 text-center text-slate-500 italic">Niciun sportiv de afișat conform filtrelor.</p>}
                </div>
            </Card>
        </div>
    );
};