
import React, { useState, useMemo } from 'react';
import { Prezenta, Sportiv, Grupa } from '../types';
import { Card, Input, Select, Button } from './ui';
import { ArrowLeftIcon } from './icons';

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

    const yearOptions = useMemo(() => {
        const years = new Set(allRecords.map(r => new Date(r.data).getFullYear()));
        return Array.from(years).sort((a,b) => Number(b) - Number(a));
    }, [allRecords]);

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <h1 className="text-3xl font-bold text-white mb-6">Raport General Prezențe</h1>
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 bg-slate-700/50 rounded-lg">
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
                    <Select label="Tip antrenament" value={tipFilter} onChange={e => setTipFilter(e.target.value)}>
                        <option value="">Toate tipurile</option>
                        <option value="Normal">Normal</option>
                        <option value="Vacanta">Vacanță</option>
                    </Select>
                </div>

                 <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                        <thead className="bg-slate-700">
                            <tr>
                                <th className="p-4 font-semibold">Data</th>
                                <th className="p-4 font-semibold">Ora</th>
                                <th className="p-4 font-semibold">Nume Sportiv</th>
                                <th className="p-4 font-semibold">Grupa Antrenament</th>
                                <th className="p-4 font-semibold">Tip</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map(rec => (
                                <tr key={rec.id} className="border-b border-slate-700">
                                    <td className="p-4">{new Date(rec.data).toLocaleDateString('ro-RO')}</td>
                                    <td className="p-4">{rec.ora}</td>
                                    <td className="p-4 font-medium">{rec.sportivNume}</td>
                                    <td className="p-4">{rec.grupaNume}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${rec.tip === 'Vacanta' ? 'bg-sky-600 text-white' : 'bg-slate-600 text-slate-200'}`}>
                                            {rec.tip}
                                        </span>
                                    </td>
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