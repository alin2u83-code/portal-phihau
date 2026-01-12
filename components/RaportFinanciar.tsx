

import React, { useMemo } from 'react';
import { Plata, Sportiv, Familie, Tranzactie } from '../types';
import { Card, Input, Select, Button } from './ui';
import { ArrowLeftIcon } from './icons';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface RaportFinanciarProps {
    plati: Plata[];
    sportivi: Sportiv[];
    familii: Familie[];
    tranzactii: Tranzactie[];
    onBack: () => void;
}

const initialFilters = {
    startDate: '',
    endDate: '',
    sportivId: '',
    familieId: '',
    metodaPlata: '',
    tip: '',
};

export const RaportFinanciar: React.FC<RaportFinanciarProps> = ({ plati, sportivi, familii, tranzactii, onBack }) => {
    const [filters, setFilters] = useLocalStorage('phi-hau-raport-financiar-filters', initialFilters);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const filteredTranzactii = useMemo(() => {
        return tranzactii.filter(t => {
            const dataPlatii = new Date(t.data_platii);
            
            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            const endDate = filters.endDate ? new Date(filters.endDate) : null;

            if (startDate && dataPlatii < startDate) return false;
            if (endDate) {
                endDate.setHours(23, 59, 59, 999); // Include toata ziua
                if (dataPlatii > endDate) return false;
            }
            if (filters.sportivId && t.sportiv_id !== filters.sportivId) return false;
            if (filters.familieId && t.familie_id !== filters.familieId) return false;
            if (filters.metodaPlata && t.metoda_plata !== filters.metodaPlata) return false;
            
            // Filter by type requires looking at the original Plata objects
            if (filters.tip) {
                const areTipulCerut = t.plata_ids.some(plataId => {
                    const plataOriginala = plati.find(p => p.id === plataId);
                    return plataOriginala?.tip === filters.tip;
                });
                if (!areTipulCerut) return false;
            }

            return true;
        });
    }, [tranzactii, plati, filters]);

    const totalIncasari = useMemo(() => {
        return filteredTranzactii.reduce((acc, t) => acc + t.suma, 0);
    }, [filteredTranzactii]);
    
    const getSportivName = (id: string | null) => { if(!id) return 'N/A'; const s = sportivi.find(s=>s.id === id); return s ? `${s.nume} ${s.prenume}` : 'N/A'; };
    const getFamilieName = (id: string | null) => { if(!id) return 'N/A'; return familii.find(f => f.id === id)?.nume || 'N/A'; };


    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <h1 className="text-3xl font-bold text-white mb-6">Raport Financiar Încasări</h1>
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 p-4 bg-slate-700/50 rounded-lg">
                    <Input label="Data Start" type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                    <Input label="Data Sfârșit" type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                    <Select label="Sportiv" name="sportivId" value={filters.sportivId} onChange={handleFilterChange} disabled={!!filters.familieId}>
                        <option value="">Toți sportivii</option>
                        {sportivi.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
                    </Select>
                     <Select label="Familie" name="familieId" value={filters.familieId} onChange={handleFilterChange} disabled={!!filters.sportivId}>
                        <option value="">Toate familiile</option>
                        {familii.map(f => <option key={f.id} value={f.id}>{f.nume}</option>)}
                    </Select>
                    <Select label="Metodă Plată" name="metodaPlata" value={filters.metodaPlata} onChange={handleFilterChange}>
                        <option value="">Toate</option>
                        <option value="Cash">Cash</option>
                        <option value="Transfer Bancar">Transfer Bancar</option>
                    </Select>
                    <Select label="Categorie" name="tip" value={filters.tip} onChange={handleFilterChange}>
                        <option value="">Toate</option>
                        <option value="Abonament">Abonament</option><option value="Taxa Examen">Taxa Examen</option><option value="Taxa Stagiu">Taxa Stagiu</option><option value="Taxa Competitie">Taxa Competitie</option><option value="Echipament">Echipament</option>
                    </Select>
                </div>

                <div className="mb-6 p-4 bg-slate-700 rounded-lg flex justify-between items-center">
                    <h3 className="text-xl font-semibold">Total Încasări Filtru Curent:</h3>
                    <p className="text-3xl font-bold text-green-400">{totalIncasari.toFixed(2)} RON</p>
                </div>

                <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-700">
                            <tr>
                                <th className="p-4 font-semibold">Data Plății</th>
                                <th className="p-4 font-semibold">Plătit de</th>
                                <th className="p-4 font-semibold">Descriere Scurtă</th>
                                <th className="p-4 font-semibold">Metodă</th>
                                <th className="p-4 font-semibold text-right">Sumă</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTranzactii.sort((a,b) => new Date(b.data_platii).getTime() - new Date(a.data_platii).getTime()).map(tranzactie => (
                                <tr key={tranzactie.id} className="border-b border-slate-700">
                                    <td className="p-4">{new Date(tranzactie.data_platii).toLocaleDateString('ro-RO')}</td>
                                    <td className="p-4 font-medium">{tranzactie.familie_id ? `Familia ${getFamilieName(tranzactie.familie_id)}` : getSportivName(tranzactie.sportiv_id)}</td>
                                    <td className="p-4">{plati.find(p => p.id === tranzactie.plata_ids[0])?.descriere || 'Încasare multiplă'}</td>
                                    <td className="p-4">{tranzactie.metoda_plata}</td>
                                    <td className="p-4 text-right font-semibold">{tranzactie.suma.toFixed(2)} RON</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredTranzactii.length === 0 && <p className="p-4 text-center text-slate-400">Nicio încasare conform filtrelor.</p>}
                </div>
            </Card>
        </div>
    );
};