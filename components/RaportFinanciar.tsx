

import React, { useMemo, useState } from 'react';
import { IstoricPlataDetaliat, Sportiv, Familie, Plata, Tranzactie } from '../types';
import { Card, Input, Select, Button } from './ui';
import { ArrowLeftIcon, ChartBarIcon, BanknotesIcon, FileTextIcon } from './icons';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface RaportFinanciarProps {
    istoricPlatiDetaliat: IstoricPlataDetaliat[];
    sportivi: Sportiv[];
    familii: Familie[];
    onBack: () => void;
    onViewSportiv?: (sportiv: Sportiv) => void;
}

const initialFilters = {
    startDate: '',
    endDate: '',
    sportivId: '',
    familieId: '',
    metodaPlata: '',
    tip: '',
};

export const RaportFinanciar: React.FC<RaportFinanciarProps> = ({ istoricPlatiDetaliat, sportivi, familii, onBack, onViewSportiv }) => {
    const [filters, setFilters] = useLocalStorage('phi-hau-raport-financiar-filters', initialFilters);
    const [activeTab, setActiveTab] = useState<'incasari' | 'lunar' | 'taxe_anuale'>('incasari');
    const [selectedMonth, setSelectedMonth] = useState<string>('');

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const filteredIstoric = useMemo(() => {
        if (!istoricPlatiDetaliat) return [];
        return istoricPlatiDetaliat.filter(t => {
            const dataPlata = t.data_plata_string ? new Date((t.data_plata_string || '').toString().slice(0, 10)) : null;
            
            const startDate = filters.startDate ? new Date((filters.startDate || '').toString().slice(0, 10)) : null;
            const endDate = filters.endDate ? new Date((filters.endDate || '').toString().slice(0, 10)) : null;

            if (startDate && dataPlata && dataPlata < startDate) return false;
            if (endDate && dataPlata) {
                endDate.setHours(23, 59, 59, 999);
                if (dataPlata > endDate) return false;
            }
            
            // Note: We might need sportiv_id/familie_id in the view to filter by them
            // Assuming they are available in IstoricPlataDetaliat
            if (filters.sportivId && t.sportiv_id !== filters.sportivId) return false;
            if (filters.familieId && t.familie_id !== filters.familieId) return false;
            if (filters.metodaPlata && t.metoda_plata !== filters.metodaPlata) return false;
            
            return true;
        });
    }, [istoricPlatiDetaliat, filters]);

    const totalIncasari = useMemo(() => {
        return (filteredIstoric || []).reduce((acc, t) => acc + (t.suma_incasata || 0), 0);
    }, [filteredIstoric]);
    
    // --- Date pentru Raport Lunar ---
    const luniDisponibile = useMemo(() => {
        if (!istoricPlatiDetaliat) return [];
        const luniSet = new Set<string>();
        istoricPlatiDetaliat.forEach(t => {
            const luna = (t.data_plata_string || '').toString().substring(0, 7);
            if (luna) luniSet.add(luna);
        });
        return Array.from(luniSet).sort().reverse();
    }, [istoricPlatiDetaliat]);

    const raportLunarData = useMemo(() => {
        const luna = selectedMonth || (luniDisponibile.length > 0 ? luniDisponibile[0] : '');
        if (!luna || !istoricPlatiDetaliat) return { incasari: 0, restante: [], luna: luna || '' };

        const incasariLuna = istoricPlatiDetaliat
            .filter(t => (t.data_plata_string || '').toString().startsWith(luna))
            .reduce((sum, t) => sum + (t.suma_incasata || 0), 0);

        const restanteLuna = istoricPlatiDetaliat.filter(p => (p.data_emitere || '').toString().startsWith(luna) && p.status !== 'Achitat');

        return { incasari: incasariLuna, restante: restanteLuna, luna };
    }, [selectedMonth, luniDisponibile, istoricPlatiDetaliat]);

    // --- Date pentru Raport Taxe Anuale ---
    const taxeAnualeData = useMemo(() => {
        if (!istoricPlatiDetaliat) return {};
        const tipuriTaxe = new Set<string>();
        istoricPlatiDetaliat.forEach(p => {
            const tipLower = (p.descriere || '').toString().toLowerCase();
            if (tipLower.includes('fram') || tipLower.includes('frqkd') || tipLower === 'taxa anuala' || tipLower === 'taxa anuală') {
                tipuriTaxe.add(p.descriere);
            }
        });

        const raport: Record<string, { achitat: IstoricPlataDetaliat[], neachitat: IstoricPlataDetaliat[] }> = {};
        Array.from(tipuriTaxe).forEach(tip => {
            raport[tip] = {
                achitat: istoricPlatiDetaliat.filter(p => p.descriere === tip && p.status === 'Achitat'),
                neachitat: istoricPlatiDetaliat.filter(p => p.descriere === tip && p.status !== 'Achitat')
            };
        });

        return raport;
    }, [istoricPlatiDetaliat]);


    const totalRestanteLuna = useMemo(() => {
        let sum = 0;
        for (const p of raportLunarData.restante) {
            sum += p.suma_datorata || 0;
        }
        return sum;
    }, [raportLunarData.restante]);

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <h1 className="text-3xl font-bold text-white mb-6">Raport Financiar Club</h1>

            <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
                <Button variant={activeTab === 'incasari' ? 'primary' : 'secondary'} onClick={() => setActiveTab('incasari')}>
                    <FileTextIcon className="w-5 h-5 mr-2" /> Încasări Detaliate
                </Button>
                <Button variant={activeTab === 'lunar' ? 'primary' : 'secondary'} onClick={() => setActiveTab('lunar')}>
                    <ChartBarIcon className="w-5 h-5 mr-2" /> Situație Lunară
                </Button>
                <Button variant={activeTab === 'taxe_anuale' ? 'primary' : 'secondary'} onClick={() => setActiveTab('taxe_anuale')}>
                    <BanknotesIcon className="w-5 h-5 mr-2" /> Situație Taxe Anuale (FRAM/FRQKD)
                </Button>
            </div>

            {activeTab === 'incasari' && (
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
                            <option value="Abonament">Abonament</option>
                            <option value="Taxa Examen">Taxa Examen</option>
                            <option value="Taxa Stagiu">Taxa Stagiu</option>
                            <option value="Taxa Competitie">Taxa Competitie</option>
                            <option value="Echipament">Echipament</option>
                            <option value="Taxa Anuala">Taxa Anuală</option>
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
                                {filteredIstoric.sort((a,b) => (b.data_plata_string ? new Date((b.data_plata_string || '').toString().slice(0, 10)).getTime() : 0) - (a.data_plata_string ? new Date((a.data_plata_string || '').toString().slice(0, 10)).getTime() : 0)).map(tranzactie => {
                                    const date = tranzactie.data_plata_string ? new Date((tranzactie.data_plata_string || '').toString().slice(0, 10)) : null;
                                    const dateString = date && !isNaN(date.getTime()) ? date.toLocaleDateString('ro-RO') : 'Dată invalidă';
                                    return (
                                        <tr key={tranzactie.tranzactie_id || tranzactie.plata_id} className="border-b border-slate-700">
                                            <td className="p-4">{dateString}</td>
                                            <td className="p-4 font-bold text-white">
                                                {tranzactie.sportiv_id && onViewSportiv ? (
                                                    <button
                                                        type="button"
                                                        className="hover:text-brand-primary hover:underline cursor-pointer text-left"
                                                        onClick={() => { const s = sportivi.find(sp => sp.id === tranzactie.sportiv_id); if (s) onViewSportiv(s); }}
                                                    >
                                                        {tranzactie.nume_complet_sportiv || 'N/A'}
                                                    </button>
                                                ) : (
                                                    tranzactie.nume_complet_sportiv || 'N/A'
                                                )}
                                            </td>
                                            <td className="p-4">{tranzactie.descriere}</td>
                                            <td className="p-4">{tranzactie.metoda_plata}</td>
                                            <td className="p-4 text-right font-bold text-white">{(tranzactie.suma_incasata || 0).toFixed(2)} RON</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredIstoric.length === 0 && <p className="p-4 text-center text-slate-400">Nicio încasare conform filtrelor.</p>}
                    </div>
                </Card>
            )}

            {activeTab === 'lunar' && (
                <Card>
                    <div className="mb-6 flex items-center space-x-4">
                        <Select 
                            label="Selectează Luna" 
                            value={selectedMonth || (luniDisponibile.length > 0 ? luniDisponibile[0] : '')} 
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="max-w-xs"
                        >
                            {luniDisponibile.map(luna => (
                                <option key={luna} value={luna}>{luna}</option>
                            ))}
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="p-6 bg-slate-700/50 rounded-lg border border-slate-600">
                            <h3 className="text-lg font-semibold text-slate-300 mb-2">Total Încasări ({raportLunarData.luna})</h3>
                            <p className="text-4xl font-bold text-green-400">{raportLunarData.incasari.toFixed(2)} RON</p>
                        </div>
                        <div className="p-6 bg-slate-700/50 rounded-lg border border-slate-600">
                            <h3 className="text-lg font-semibold text-slate-300 mb-2">Total Restanțe ({raportLunarData.luna})</h3>
                            <p className="text-4xl font-bold text-red-400">
                                {totalRestanteLuna.toFixed(2)} RON
                            </p>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-4">Cine mai are de achitat în {raportLunarData.luna}</h3>
                    <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-slate-700">
                                <tr>
                                    <th className="p-4 font-semibold">Data Scadenței</th>
                                    <th className="p-4 font-semibold">Sportiv / Familie</th>
                                    <th className="p-4 font-semibold">Descriere</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold text-right">Sumă Restantă</th>
                                </tr>
                            </thead>
                            <tbody>
                                {raportLunarData.restante.sort((a,b) => new Date((a.data_emitere || '').toString().slice(0, 10)).getTime() - new Date((b.data_emitere || '').toString().slice(0, 10)).getTime()).map(plata => (
                                    <tr key={plata.plata_id} className="border-b border-slate-700">
                                        <td className="p-4">{new Date((plata.data_emitere || '').toString().slice(0, 10)).toLocaleDateString('ro-RO')}</td>
                                        <td className="p-4 font-bold text-white">
                                            {plata.sportiv_id && onViewSportiv ? (
                                                <button
                                                    type="button"
                                                    className="hover:text-brand-primary hover:underline cursor-pointer text-left"
                                                    onClick={() => { const s = sportivi.find(sp => sp.id === plata.sportiv_id); if (s) onViewSportiv(s); }}
                                                >
                                                    {plata.nume_complet_sportiv || 'N/A'}
                                                </button>
                                            ) : (
                                                plata.nume_complet_sportiv || 'N/A'
                                            )}
                                        </td>
                                        <td className="p-4">{plata.descriere}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${plata.status === 'Achitat Parțial' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {plata.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-bold text-red-400">{plata.suma_datorata.toFixed(2)} RON</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {raportLunarData.restante.length === 0 && <p className="p-4 text-center text-slate-400">Nu există restanțe pentru această lună.</p>}
                    </div>
                </Card>
            )}

            {activeTab === 'taxe_anuale' && (
                <div className="space-y-6">
                    {Object.entries(taxeAnualeData).length === 0 ? (
                        <Card><p className="text-center text-slate-400">Nu s-au găsit taxe anuale (FRAM/FRQKD) în sistem.</p></Card>
                    ) : (
                        Object.entries(taxeAnualeData).map(([tip, date]) => (
                            <Card key={tip}>
                                <h2 className="text-2xl font-bold text-brand-secondary mb-4">{tip}</h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Achitat */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-lg font-semibold text-green-400">Au Achitat</h3>
                                            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-bold">{date.achitat.length} sportivi</span>
                                        </div>
                                        <div className="bg-slate-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                                            {date.achitat.length === 0 ? <p className="text-slate-500 italic">Niciun sportiv nu a achitat.</p> : (
                                                <ul className="space-y-2">
                                                    {date.achitat.map(p => (
                                                        <li key={p.plata_id} className="flex justify-between items-center border-b border-slate-700 pb-2">
                                                            {p.sportiv_id && onViewSportiv ? (
                                                                <button type="button" className="text-white hover:text-brand-primary hover:underline cursor-pointer text-left" onClick={() => { const s = sportivi.find(sp => sp.id === p.sportiv_id); if (s) onViewSportiv(s); }}>{p.nume_complet_sportiv || 'N/A'}</button>
                                                            ) : (
                                                                <span className="text-white">{p.nume_complet_sportiv || 'N/A'}</span>
                                                            )}
                                                            <span className="text-xs text-slate-400">{p.descriere}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    {/* Neachitat */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-lg font-semibold text-red-400">Restanțieri</h3>
                                            <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs font-bold">{date.neachitat.length} sportivi</span>
                                        </div>
                                        <div className="bg-slate-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                                            {date.neachitat.length === 0 ? <p className="text-slate-500 italic">Nu există restanțieri.</p> : (
                                                <ul className="space-y-2">
                                                    {date.neachitat.map(p => (
                                                        <li key={p.plata_id} className="flex justify-between items-center border-b border-slate-700 pb-2">
                                                            {p.sportiv_id && onViewSportiv ? (
                                                                <button type="button" className="text-white hover:text-brand-primary hover:underline cursor-pointer text-left" onClick={() => { const s = sportivi.find(sp => sp.id === p.sportiv_id); if (s) onViewSportiv(s); }}>{p.nume_complet_sportiv || 'N/A'}</button>
                                                            ) : (
                                                                <span className="text-white">{p.nume_complet_sportiv || 'N/A'}</span>
                                                            )}
                                                            <span className="text-xs text-slate-400">{p.descriere}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};