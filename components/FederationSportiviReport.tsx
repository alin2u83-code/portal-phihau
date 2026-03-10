import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card, Input, Select } from './ui';
import { Download, Filter } from 'lucide-react';
import Papa from 'papaparse';
import { useError } from './ErrorProvider';

export const FederationSportiviReport: React.FC = () => {
    const [sportivi, setSportivi] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ nume_club: '', status: '', gen: '' });
    const { showError } = useError();

    const fetchSportivi = async () => {
        setLoading(true);
        try {
            let query = supabase.from('vedere_federatie_sportivi').select('*');
            if (filters.nume_club) query = query.ilike('nume_club', `%${filters.nume_club}%`);
            if (filters.status) query = query.eq('status', filters.status);
            if (filters.gen) query = query.eq('gen', filters.gen);
            
            const { data, error } = await query;
            if (error) throw error;
            setSportivi(data || []);
        } catch (err: any) {
            showError('Eroare', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const csv = Papa.unparse(sportivi);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sportivi_national.csv';
        a.click();
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Raport Național Sportivi</h1>
            <Card className="p-4 bg-zinc-900 border-zinc-800 flex gap-4 items-end">
                <Input label="Club" value={filters.nume_club} onChange={e => setFilters({...filters, nume_club: e.target.value})} />
                <Select label="Status" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                    <option value="">Toate</option>
                    <option value="Activ">Activ</option>
                    <option value="Inactiv">Inactiv</option>
                </Select>
                <Select label="Gen" value={filters.gen} onChange={e => setFilters({...filters, gen: e.target.value})}>
                    <option value="">Toate</option>
                    <option value="Masculin">Masculin</option>
                    <option value="Feminin">Feminin</option>
                </Select>
                <Button onClick={fetchSportivi}>Filtrează</Button>
                <Button onClick={handleExport} disabled={sportivi.length === 0}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
            </Card>
            <Card className="p-4 bg-zinc-900 border-zinc-800">
                {loading ? <p className="text-white">Se încarcă...</p> : (
                    <table className="w-full text-white">
                        <thead>
                            <tr>
                                <th>Nume</th>
                                <th>Club</th>
                                <th>Status</th>
                                <th>Gen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sportivi.map(s => (
                                <tr key={s.id}>
                                    <td>{s.nume} {s.prenume}</td>
                                    <td>{s.nume_club}</td>
                                    <td>{s.status}</td>
                                    <td>{s.gen}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    );
};
