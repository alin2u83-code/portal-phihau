import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { User, RaportActivitateRecord } from '../types';
import { useError } from './ErrorProvider';
import { Card, Button, Input, Switch } from './ui';
import { ArrowLeftIcon, DocumentArrowDownIcon } from './icons';
import { exportToCsv } from '../utils/csv';

type SortKey = keyof RaportActivitateRecord;

export const RaportActivitate: React.FC<{ onBack: () => void, currentUser: User }> = ({ onBack, currentUser }) => {
    const [data, setData] = useState<RaportActivitateRecord[]>([]);
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
            const { data: rpcData, error } = await supabase.rpc('get_raport_prezenta_detaliat');
            
            if (error) {
                showError("Eroare la încărcare raport", `Asigurați-vă că funcția RPC 'get_raport_prezenta_detaliat' există în baza de date și nu necesită parametri. Detalii: ${error.message}`);
            } else {
                setData(rpcData as RaportActivitateRecord[]);
            }
            setLoading(false);
        };
        fetchData();
    }, [currentUser.id, showError]);

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

    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    
    const handleExport = () => {
        const dataToExport = sortedAndFilteredData.map(d => ({
            "Nume Complet": d.nume_complet,
            "Grad Actual": d.grad_actual,
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

    if (loading) {
        return <div className="text-center p-8">Se încarcă raportul de activitate...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
                <h1 className="text-3xl font-bold text-white">Raport de Activitate</h1>
            </div>
            
            <Card>
                <div className="flex justify-between items-center">
                    <Switch 
                        label="Afișează doar sportivii la risc (prezență < 50%)"
                        name="atRisk"
                        checked={showAtRiskOnly}
                        onChange={(e) => setShowAtRiskOnly(e.target.checked)}
                    />
                    <Button onClick={handleExport} variant="primary">
                        <DocumentArrowDownIcon className="w-5 h-5 mr-2" /> Export CSV
                    </Button>
                </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[800px]">
                        <thead className="bg-slate-700/50 text-sky-300 text-xs uppercase">
                            <tr>
                                {Object.entries({
                                    nume_complet: 'Nume Sportiv',
                                    grad_actual: 'Grad Actual',
                                    prezente_efective: 'Prezențe',
                                    procentaj_prezenta: 'Procentaj',
                                    ultima_prezenta: 'Ultima Prezență'
                                }).map(([key, label]) => (
                                    <th key={key} className="p-3 font-semibold cursor-pointer" onClick={() => requestSort(key as SortKey)}>
                                        {label} {sortConfig.key === key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {sortedAndFilteredData.map(item => (
                                <tr key={item.sportiv_id} className={`hover:bg-slate-700/50 ${item.procentaj_prezenta < 50 ? 'bg-red-900/20' : ''}`}>
                                    <td className="p-3 font-medium text-white">{item.nume_complet}</td>
                                    <td className="p-3">{item.grad_actual || 'Începător'}</td>
                                    <td className="p-3 font-bold">{item.prezente_efective} / {item.antrenamente_tinute}</td>
                                    <td className={`p-3 font-bold ${item.procentaj_prezenta < 50 ? 'text-red-400' : 'text-green-400'}`}>{item.procentaj_prezenta}%</td>
                                    <td className="p-3">{formatRoDate(item.ultima_prezenta)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {sortedAndFilteredData.length === 0 && <p className="p-12 text-center text-slate-500 italic">Niciun sportiv de afișat conform filtrelor.</p>}
                </div>
            </Card>
        </div>
    );
};