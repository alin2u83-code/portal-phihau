import React, { useMemo, useState } from 'react';
import { IstoricPlataDetaliat, Sportiv, Familie } from '../types';
import { Card, Input, Select, Button } from './ui';
import { ChartBarIcon, BanknotesIcon, FileTextIcon, ChevronDownIcon } from './icons';
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

const formatDate = (val?: string | null) => {
    if (!val) return '—';
    const d = new Date(val.toString().slice(0, 10));
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ro-RO');
};

const formatSum = (n?: number | null) =>
    (n ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RON';

export const RaportFinanciar: React.FC<RaportFinanciarProps> = ({
    istoricPlatiDetaliat, sportivi, familii, onBack, onViewSportiv
}) => {
    const [filters, setFilters] = useLocalStorage('phi-hau-raport-financiar-filters', initialFilters);
    const [activeTab, setActiveTab] = useState<'incasari' | 'lunar' | 'taxe_anuale'>('incasari');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const resetFilters = () => setFilters(initialFilters);

    const filteredIstoric = useMemo(() => {
        if (!istoricPlatiDetaliat) return [];
        return istoricPlatiDetaliat
            .filter(t => {
                const dp = t.data_plata_string ? new Date(t.data_plata_string.toString().slice(0, 10)) : null;
                const s = filters.startDate ? new Date(filters.startDate) : null;
                const e = filters.endDate ? new Date(filters.endDate) : null;
                if (s && dp && dp < s) return false;
                if (e && dp) { e.setHours(23, 59, 59, 999); if (dp > e) return false; }
                if (filters.sportivId && t.sportiv_id !== filters.sportivId) return false;
                if (filters.familieId && t.familie_id !== filters.familieId) return false;
                if (filters.metodaPlata && t.metoda_plata !== filters.metodaPlata) return false;
                return true;
            })
            .sort((a, b) => {
                const ta = a.data_plata_string ? new Date(a.data_plata_string.toString().slice(0, 10)).getTime() : 0;
                const tb = b.data_plata_string ? new Date(b.data_plata_string.toString().slice(0, 10)).getTime() : 0;
                return tb - ta;
            });
    }, [istoricPlatiDetaliat, filters]);

    const totalIncasari = useMemo(() =>
        filteredIstoric.reduce((s, t) => s + (t.suma_incasata || 0), 0),
        [filteredIstoric]
    );

    const luniDisponibile = useMemo(() => {
        const s = new Set<string>();
        (istoricPlatiDetaliat || []).forEach(t => {
            const l = (t.data_plata_string || '').toString().slice(0, 7);
            if (l) s.add(l);
        });
        return Array.from(s).sort().reverse();
    }, [istoricPlatiDetaliat]);

    const raportLunarData = useMemo(() => {
        const luna = selectedMonth || luniDisponibile[0] || '';
        if (!luna) return { incasari: 0, restante: [], luna: '' };
        const incasari = (istoricPlatiDetaliat || [])
            .filter(t => t.data_plata_string?.toString().startsWith(luna))
            .reduce((s, t) => s + (t.suma_incasata || 0), 0);
        const restante = (istoricPlatiDetaliat || []).filter(p =>
            p.data_emitere?.toString().startsWith(luna) && p.status !== 'Achitat'
        );
        return { incasari, restante, luna };
    }, [selectedMonth, luniDisponibile, istoricPlatiDetaliat]);

    const totalRestante = useMemo(() =>
        raportLunarData.restante.reduce((s, p) => s + (p.suma_datorata || 0), 0),
        [raportLunarData.restante]
    );

    const taxeAnualeData = useMemo(() => {
        const tipuri = new Set<string>();
        (istoricPlatiDetaliat || []).forEach(p => {
            const tl = (p.descriere || '').toLowerCase();
            if (tl.includes('fram') || tl.includes('frqkd') || tl === 'taxa anuala' || tl === 'taxa anuală') tipuri.add(p.descriere);
        });
        const raport: Record<string, { achitat: IstoricPlataDetaliat[], neachitat: IstoricPlataDetaliat[] }> = {};
        tipuri.forEach(tip => {
            raport[tip] = {
                achitat: (istoricPlatiDetaliat || []).filter(p => p.descriere === tip && p.status === 'Achitat'),
                neachitat: (istoricPlatiDetaliat || []).filter(p => p.descriere === tip && p.status !== 'Achitat'),
            };
        });
        return raport;
    }, [istoricPlatiDetaliat]);

    const activeFiltersCount = Object.values(filters).filter(Boolean).length;

    const SportivLink: React.FC<{ row: IstoricPlataDetaliat }> = ({ row }) => {
        const name = row.nume_complet_sportiv || '—';
        if (!row.sportiv_id || !onViewSportiv) return <span>{name}</span>;
        return (
            <button
                type="button"
                className="text-left hover:text-amber-300 transition-colors font-medium"
                onClick={() => { const s = sportivi.find(sp => sp.id === row.sportiv_id); if (s) onViewSportiv(s); }}
            >
                {name}
            </button>
        );
    };

    const tabs = [
        { id: 'incasari' as const, label: 'Încasări', icon: <FileTextIcon className="w-4 h-4" /> },
        { id: 'lunar' as const, label: 'Lunar', icon: <ChartBarIcon className="w-4 h-4" /> },
        { id: 'taxe_anuale' as const, label: 'Taxe Anuale', icon: <BanknotesIcon className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-4">
            {/* Tab bar */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1 w-fit">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                            activeTab === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        {t.icon}
                        <span className="hidden sm:inline">{t.label}</span>
                    </button>
                ))}
            </div>

            {/* ─── TAB: ÎNCASĂRI ─── */}
            {activeTab === 'incasari' && (
                <div className="space-y-4">
                    {/* Filtre colapsabile */}
                    <Card className="!p-0 overflow-hidden">
                        <button
                            onClick={() => setFiltersOpen(o => !o)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/40 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white">Filtre</span>
                                {activeFiltersCount > 0 && (
                                    <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-bold">{activeFiltersCount}</span>
                                )}
                            </div>
                            <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {filtersOpen && (
                            <div className="px-4 pb-4 border-t border-slate-800/60">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-3">
                                    <Input label="De la" type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                                    <Input label="Până la" type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                                    <Select label="Sportiv" name="sportivId" value={filters.sportivId} onChange={handleFilterChange} disabled={!!filters.familieId}>
                                        <option value="">Toți</option>
                                        {sportivi.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
                                    </Select>
                                    <Select label="Familie" name="familieId" value={filters.familieId} onChange={handleFilterChange} disabled={!!filters.sportivId}>
                                        <option value="">Toate</option>
                                        {familii.map(f => <option key={f.id} value={f.id}>{f.nume}</option>)}
                                    </Select>
                                    <Select label="Metodă" name="metodaPlata" value={filters.metodaPlata} onChange={handleFilterChange}>
                                        <option value="">Toate</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Transfer Bancar">Transfer Bancar</option>
                                    </Select>
                                    <div className="flex items-end">
                                        <button onClick={resetFilters} className="w-full py-2 text-xs text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/50 rounded-lg transition-colors font-medium">
                                            Resetează
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Total card */}
                    <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700/50 rounded-xl px-5 py-4">
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Încasări</p>
                            <p className="text-xs text-slate-500">{filteredIstoric.length} înregistrări</p>
                        </div>
                        <p className={`text-2xl md:text-3xl font-black ${totalIncasari > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {formatSum(totalIncasari)}
                        </p>
                    </div>

                    {/* Tabel desktop / Carduri mobil */}
                    {filteredIstoric.length === 0 ? (
                        <Card><p className="text-center text-slate-400 py-8 italic">Nicio încasare conform filtrelor.</p></Card>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-800 bg-slate-800/50">
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Data</th>
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Plătit de</th>
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Descriere</th>
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Metodă</th>
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Sumă</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {filteredIstoric.map(t => (
                                            <tr key={t.tranzactie_id || t.plata_id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{formatDate(t.data_plata_string)}</td>
                                                <td className="px-4 py-3 text-white"><SportivLink row={t} /></td>
                                                <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{t.descriere || '—'}</td>
                                                <td className="px-4 py-3">
                                                    {t.metoda_plata ? (
                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.metoda_plata === 'Cash' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-sky-500/15 text-sky-400'}`}>
                                                            {t.metoda_plata}
                                                        </span>
                                                    ) : <span className="text-slate-600">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-white whitespace-nowrap">
                                                    {formatSum(t.suma_incasata)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile cards */}
                            <div className="md:hidden space-y-2">
                                {filteredIstoric.map(t => (
                                    <div key={t.tranzactie_id || t.plata_id} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-white font-semibold text-sm truncate"><SportivLink row={t} /></p>
                                                <p className="text-slate-400 text-xs mt-0.5 truncate">{t.descriere || '—'}</p>
                                            </div>
                                            <p className="text-white font-bold text-sm whitespace-nowrap shrink-0">{formatSum(t.suma_incasata)}</p>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-xs text-slate-500">{formatDate(t.data_plata_string)}</span>
                                            {t.metoda_plata && (
                                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${t.metoda_plata === 'Cash' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-sky-500/15 text-sky-400'}`}>
                                                    {t.metoda_plata}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ─── TAB: LUNAR ─── */}
            {activeTab === 'lunar' && (
                <div className="space-y-4">
                    <Card>
                        <Select
                            label="Luna"
                            value={selectedMonth || luniDisponibile[0] || ''}
                            onChange={e => setSelectedMonth(e.target.value)}
                            className="max-w-xs"
                        >
                            {luniDisponibile.map(l => <option key={l} value={l}>{l}</option>)}
                        </Select>
                    </Card>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-4">
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Încasări</p>
                            <p className="text-xl md:text-2xl font-black text-emerald-400">{formatSum(raportLunarData.incasari)}</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-4">
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Restanțe</p>
                            <p className="text-xl md:text-2xl font-black text-rose-400">{formatSum(totalRestante)}</p>
                        </div>
                    </div>

                    {raportLunarData.restante.length > 0 && (
                        <>
                            <h3 className="font-bold text-white text-sm px-1">De achitat în {raportLunarData.luna}</h3>
                            {/* Desktop */}
                            <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="border-b border-slate-800 bg-slate-800/50">
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Scadență</th>
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Sportiv</th>
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Descriere</th>
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Restant</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {[...raportLunarData.restante].sort((a, b) =>
                                            new Date(a.data_emitere?.toString().slice(0, 10) || '').getTime() -
                                            new Date(b.data_emitere?.toString().slice(0, 10) || '').getTime()
                                        ).map(p => (
                                            <tr key={p.plata_id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{formatDate(p.data_emitere)}</td>
                                                <td className="px-4 py-3 text-white"><SportivLink row={p} /></td>
                                                <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{p.descriere || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.status === 'Achitat Parțial' ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'}`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-rose-400 whitespace-nowrap">{formatSum(p.suma_datorata)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile */}
                            <div className="md:hidden space-y-2">
                                {raportLunarData.restante.map(p => (
                                    <div key={p.plata_id} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-white font-semibold text-sm truncate"><SportivLink row={p} /></p>
                                                <p className="text-slate-400 text-xs mt-0.5 truncate">{p.descriere || '—'}</p>
                                            </div>
                                            <p className="text-rose-400 font-bold text-sm whitespace-nowrap shrink-0">{formatSum(p.suma_datorata)}</p>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-xs text-slate-500">{formatDate(p.data_emitere)}</span>
                                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${p.status === 'Achitat Parțial' ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'}`}>{p.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    {raportLunarData.restante.length === 0 && (
                        <Card><p className="text-center text-slate-400 py-6 italic">Nu există restanțe pentru această lună.</p></Card>
                    )}
                </div>
            )}

            {/* ─── TAB: TAXE ANUALE ─── */}
            {activeTab === 'taxe_anuale' && (
                <div className="space-y-4">
                    {Object.entries(taxeAnualeData).length === 0 ? (
                        <Card><p className="text-center text-slate-400 py-8 italic">Nu s-au găsit taxe anuale (FRAM/FRQKD) în sistem.</p></Card>
                    ) : Object.entries(taxeAnualeData).map(([tip, date]) => (
                        <Card key={tip}>
                            <h2 className="text-lg font-bold text-amber-300 mb-4">{tip}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { list: date.achitat, label: 'Au achitat', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10' },
                                    { list: date.neachitat, label: 'Restanțieri', colorClass: 'text-rose-400', bgClass: 'bg-rose-500/10' },
                                ].map(({ list, label, colorClass, bgClass }) => (
                                    <div key={label}>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className={`text-sm font-bold ${colorClass}`}>{label}</h3>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bgClass} ${colorClass}`}>{list.length}</span>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-xl overflow-hidden divide-y divide-slate-700/40 max-h-80 overflow-y-auto">
                                            {list.length === 0
                                                ? <p className="text-slate-500 italic text-sm p-4">Nicio înregistrare.</p>
                                                : list.map(p => (
                                                    <div key={p.plata_id} className="flex items-center justify-between px-3 py-2.5">
                                                        <span className="text-sm text-white"><SportivLink row={p} /></span>
                                                        <span className="text-xs text-slate-500 ml-2 shrink-0">{p.descriere}</span>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
