
import React, { useState, useMemo } from 'react';
import { Prezenta, Sportiv, Grupa } from '../types';
import { Card, Input, Select } from './ui';

interface RaportPrezentaProps {
    prezente: Prezenta[];
    sportivi: Sportiv[];
    grupe: Grupa[];
}

export const RaportPrezenta: React.FC<RaportPrezentaProps> = ({ prezente, sportivi, grupe }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [grupaFilter, setGrupaFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

    const allRecords = useMemo(() => {
        return prezente.flatMap(p => 
            p.sportiviPrezentiIds.map(sportivId => {
                const sportiv = sportivi.find(s => s.id === sportivId);
                const grupa = grupe.find(g => g.id === p.grupaId);
                return {
                    id: `${p.id}-${sportivId}`,
                    data: p.data,
                    ora: p.ora,
                    sportivNume: sportiv ? `${sportiv.nume} ${sportiv.prenume}` : 'N/A',
                    grupaNume: grupa?.denumire || 'N/A',
                    grupaId: p.grupaId,
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

            return nameMatch && grupaMatch && monthMatch && yearMatch;
        });
    }, [allRecords, searchTerm, grupaFilter, monthFilter, yearFilter]);

    const yearOptions = useMemo(() => {
        const years = new Set(allRecords.map(r => new Date(r.data).getFullYear()));
        // FIX: Explicitly cast sort parameters to Number to ensure the arithmetic operation is valid.
        return Array.from(years).sort((a,b) => Number(b) - Number(a));
    }, [allRecords]);

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-6">Raport General Prezențe</h1>
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-slate-700/50 rounded-lg">
                    <Input label="Caută după nume" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Nume sportiv..."/>
                    <Select label="Filtrează după grupă" value={grupaFilter} onChange={e => setGrupaFilter(e.target.value)}>
                        <option value="">Toate grupele</option>
                        {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                    </Select>
                     <Select label="Filtrează după lună" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
                        <option value="">Toate lunile</option>
                        {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('ro-RO', {month: 'long'})}</option>)}
                    </Select>
                     <Select label="Filtrează după an" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                        <option value="">Toți anii</option>
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </Select>
                </div>

                 <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-slate-700">
                            <tr>
                                <th className="p-4 font-semibold">Data</th>
                                <th className="p-4 font-semibold">Ora</th>
                                <th className="p-4 font-semibold">Nume Sportiv</th>
                                <th className="p-4 font-semibold">Grupa Antrenament</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map(rec => (
                                <tr key={rec.id} className="border-b border-slate-700">
                                    <td className="p-4">{new Date(rec.data).toLocaleDateString('ro-RO')}</td>
                                    <td className="p-4">{rec.ora}</td>
                                    <td className="p-4 font-medium">{rec.sportivNume}</td>
                                    <td className="p-4">{rec.grupaNume}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredRecords.length === 0 && <p className="p-4 text-center text-slate-400">Nicio înregistrare găsită conform filtrelor.</p>}
                </div>
            </Card>
        </div>
    );
};