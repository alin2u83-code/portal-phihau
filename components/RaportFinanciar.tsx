import React, { useMemo, useState } from 'react';
import { IstoricPlataDetaliat, Sportiv, Familie, Plata, Tranzactie } from '../types';
import { Card, Input, Select, Button } from './ui';
import { ChartBarIcon, BanknotesIcon, FileTextIcon, ChevronDownIcon, ExclamationTriangleIcon, CheckCircleIcon, WalletIcon, XIcon, TrendingUpIcon } from './icons';
import { RevenueBarChart } from './RevenueBarChart';
import { PaymentTypePieChart } from './PaymentTypePieChart';
import { AgingReport } from './AgingReport';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { supabase } from '../supabaseClient';
import { useData } from '../contexts/DataContext';
import { useError } from './ErrorProvider';
import { getDisplayStatus, STATUS_DISPLAY_CONFIG } from '../utils/paymentStatus';
import { FacturaChitantaModal } from './FacturaChitantaModal';

interface RaportFinanciarProps {
    istoricPlatiDetaliat: IstoricPlataDetaliat[];
    sportivi: Sportiv[];
    familii: Familie[];
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
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
    istoricPlatiDetaliat, sportivi, familii, plati, setPlati, setTranzactii, onBack, onViewSportiv
}) => {
    const { currentUser } = useData();
    const { showError, showSuccess } = useError();
    const [filters, setFilters] = useLocalStorage('phi-hau-raport-financiar-filters', initialFilters);
    const [activeTab, setActiveTab] = useState<'incasari' | 'lunar' | 'taxe_anuale' | 'abonamente' | 'grafice'>('incasari');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Payment modal state
    const [plataToIncaseze, setPlataToIncaseze] = useState<IstoricPlataDetaliat | null>(null);

    // Factură / Chitanță modal
    const [documentModal, setDocumentModal] = useState<{ plata: IstoricPlataDetaliat; mode: 'factura' | 'chitanta' } | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Transfer Bancar'>('Cash');
    const [isSaving, setIsSaving] = useState(false);

    const openIncasareModal = (p: IstoricPlataDetaliat) => {
        const rest = p.rest_de_plata ?? p.suma_datorata;
        setPaymentAmount(rest.toFixed(2));
        setPaymentMethod('Cash');
        setPlataToIncaseze(p);
    };

    const handleIncaseaza = async () => {
        if (!plataToIncaseze) return;
        const suma = parseFloat(paymentAmount.replace(',', '.'));
        if (isNaN(suma) || suma <= 0) { showError('Sumă invalidă', 'Suma introdusă nu este validă.'); return; }

        setIsSaving(true);
        try {
            const sportiv = sportivi.find(s => s.id === plataToIncaseze.sportiv_id);
            const clubId = sportiv?.club_id || (currentUser as any)?.club_id;
            const p_tranzactie = {
                sportiv_id: plataToIncaseze.sportiv_id,
                familie_id: plataToIncaseze.familie_id,
                suma,
                data_platii: new Date().toISOString().split('T')[0],
                metoda_plata: paymentMethod,
                club_id: clubId,
            };
            const p_plati = [{ plata_id: plataToIncaseze.plata_id, suma_alocata: suma }];

            const { data: txId, error: txError } = await supabase.rpc('proceseaza_incasare_normalizata', { p_tranzactie, p_plati });
            if (txError) throw new Error(txError.message);

            const { data: tx } = await supabase.from('tranzactii').select('*').eq('id', txId).maybeSingle();
            if (tx) setTranzactii(prev => [tx as Tranzactie, ...prev]);

            const { data: updatedPlata } = await supabase.from('plati').select('*').eq('id', plataToIncaseze.plata_id).maybeSingle();
            if (updatedPlata) setPlati(prev => prev.map(p => p.id === updatedPlata.id ? updatedPlata as Plata : p));

            showSuccess('Succes', 'Încasarea a fost înregistrată cu succes!');
            setPlataToIncaseze(null);
        } catch (e: any) {
            showError('Eroare încasare', e.message || 'Eroare la înregistrarea încasării.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const resetFilters = () => setFilters(initialFilters);

    const filteredIstoric = useMemo(() => {
        if (!istoricPlatiDetaliat) return [];
        return istoricPlatiDetaliat
            .filter(t => {
                // Tab "Încasări" arată doar plăți efectuate (cu dată de plată)
                if (!t.data_plata_string) return false;
                const dp = new Date(t.data_plata_string.toString().slice(0, 10));
                if (isNaN(dp.getTime())) return false;
                const s = filters.startDate ? new Date(filters.startDate) : null;
                const e = filters.endDate ? new Date(filters.endDate) : null;
                if (s && dp < s) return false;
                if (e) { const eEnd = new Date(e); eEnd.setHours(23, 59, 59, 999); if (dp > eEnd) return false; }
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

    // ─── KPI cards ───────────────────────────────────────────────────────────
    const kpi = useMemo(() => {
        const lunaAct = new Date().toISOString().slice(0, 7);
        const incasatLuna = (istoricPlatiDetaliat || [])
            .filter(t => t.data_plata_string?.toString().startsWith(lunaAct))
            .reduce((s, t) => s + (t.suma_incasata || 0), 0);

        const emisLuna = (istoricPlatiDetaliat || [])
            .filter(t => t.data_emitere?.toString().startsWith(lunaAct))
            .reduce((s, t) => s + t.suma_datorata, 0);

        const totalRestante = (istoricPlatiDetaliat || [])
            .filter(t => t.status !== 'Achitat')
            .reduce((s, t) => s + (t.rest_de_plata ?? 0), 0);

        const azi = new Date(); azi.setHours(0, 0, 0, 0);
        const nrScadente = (plati || []).filter(p => {
            if (p.status === 'Achitat') return false;
            const d = new Date(p.data.toString().slice(0, 10));
            return !isNaN(d.getTime()) && d < azi;
        }).length;

        const rataColectare = emisLuna > 0 ? Math.round((incasatLuna / emisLuna) * 100) : null;

        return { incasatLuna, totalRestante, nrScadente, rataColectare };
    }, [istoricPlatiDetaliat, plati]);

    // ─── Filter chips ─────────────────────────────────────────────────────────
    const activeFilterChips = useMemo(() => {
        const chips: { key: string; label: string }[] = [];
        if (filters.startDate) chips.push({ key: 'startDate', label: `De la: ${new Date(filters.startDate).toLocaleDateString('ro-RO')}` });
        if (filters.endDate)   chips.push({ key: 'endDate',   label: `Până la: ${new Date(filters.endDate).toLocaleDateString('ro-RO')}` });
        if (filters.metodaPlata) chips.push({ key: 'metodaPlata', label: `Metodă: ${filters.metodaPlata}` });
        if (filters.sportivId) {
            const s = sportivi.find(sp => sp.id === filters.sportivId);
            if (s) chips.push({ key: 'sportivId', label: `Sportiv: ${s.nume} ${s.prenume}` });
        }
        if (filters.familieId) {
            const f = familii.find(fa => fa.id === filters.familieId);
            if (f) chips.push({ key: 'familieId', label: `Familie: ${f.nume}` });
        }
        return chips;
    }, [filters, sportivi, familii]);

    // ─── Tab Abonamente ───────────────────────────────────────────────────────
    const [lunaAbonamente, setLunaAbonamente] = useState('');
    const luniAbonamente = useMemo(() => {
        const s = new Set<string>();
        (plati || []).filter(p => (p.tip || '').toLowerCase().includes('abonament'))
            .forEach(p => { const l = p.data.toString().slice(0, 7); if (l) s.add(l); });
        return Array.from(s).sort().reverse();
    }, [plati]);

    const abonamenteData = useMemo(() => {
        const luna = lunaAbonamente || luniAbonamente[0] || '';
        if (!luna) return { luna, total: 0, achitate: 0, neachitate: 0, listaNeachitate: [] as Plata[], totalSuma: 0, incasatSuma: 0 };
        const lunares = (plati || []).filter(p =>
            (p.tip || '').toLowerCase().includes('abonament') &&
            p.data.toString().startsWith(luna)
        );
        const achitate = lunares.filter(p => p.status === 'Achitat');
        const neachitate = lunares.filter(p => p.status !== 'Achitat');
        const totalSuma = lunares.reduce((s, p) => s + p.suma, 0);
        const incasatSuma = achitate.reduce((s, p) => s + p.suma, 0);
        return { luna, total: lunares.length, achitate: achitate.length, neachitate: neachitate.length, listaNeachitate: neachitate, totalSuma, incasatSuma };
    }, [plati, lunaAbonamente, luniAbonamente]);

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
        { id: 'incasari' as const,    label: 'Încasări',     icon: <FileTextIcon className="w-4 h-4" /> },
        { id: 'abonamente' as const,  label: 'Abonamente',   icon: <WalletIcon className="w-4 h-4" /> },
        { id: 'lunar' as const,       label: 'Lunar',        icon: <ChartBarIcon className="w-4 h-4" /> },
        { id: 'taxe_anuale' as const, label: 'Taxe Anuale',  icon: <BanknotesIcon className="w-4 h-4" /> },
        { id: 'grafice' as const,     label: 'Grafice',      icon: <TrendingUpIcon className="w-4 h-4" /> },
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

            {/* ─── KPI CARDS (mereu vizibile) ─── */}
            {(activeTab === 'incasari' || activeTab === 'abonamente') && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Încasat luna curentă */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />
                            Încasat {new Date().toLocaleString('ro-RO', { month: 'short' })}
                        </p>
                        <p className="text-xl font-black text-emerald-400">{(kpi.incasatLuna).toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON</p>
                    </div>
                    {/* Total restanțe */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-400" />
                            Total Restanțe
                        </p>
                        <p className={`text-xl font-black ${kpi.totalRestante > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                            {(kpi.totalRestante).toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON
                        </p>
                    </div>
                    {/* Plăți scadente */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-400" />
                            Plăți Scadente
                        </p>
                        <p className={`text-xl font-black ${kpi.nrScadente > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                            {kpi.nrScadente} {kpi.nrScadente === 1 ? 'factură' : 'facturi'}
                        </p>
                    </div>
                    {/* Rata colectare */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                            <ChartBarIcon className="w-3.5 h-3.5 text-indigo-400" />
                            Rată Colectare
                        </p>
                        {kpi.rataColectare !== null ? (
                            <div>
                                <p className={`text-xl font-black ${kpi.rataColectare >= 90 ? 'text-emerald-400' : kpi.rataColectare >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                                    {kpi.rataColectare}%
                                </p>
                                <div className="w-full bg-slate-700 rounded-full h-1 mt-1.5">
                                    <div className={`h-1 rounded-full transition-all ${kpi.rataColectare >= 90 ? 'bg-emerald-400' : kpi.rataColectare >= 70 ? 'bg-amber-400' : 'bg-rose-400'}`}
                                        style={{ width: `${Math.min(kpi.rataColectare, 100)}%` }} />
                                </div>
                            </div>
                        ) : (
                            <p className="text-xl font-black text-slate-500">—</p>
                        )}
                    </div>
                </div>
            )}

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

                    {/* Filter chips active */}
                    {activeFilterChips.length > 0 && (
                        <div className="flex flex-wrap gap-2 px-1">
                            {activeFilterChips.map(chip => (
                                <span key={chip.key}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/15
                                               text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-medium">
                                    {chip.label}
                                    <button
                                        onClick={() => setFilters((f: typeof filters) => ({ ...f, [chip.key]: '' }))}
                                        className="ml-0.5 hover:text-white transition-colors"
                                        aria-label={`Șterge filtrul ${chip.label}`}
                                    >
                                        <XIcon className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            {activeFilterChips.length > 1 && (
                                <button onClick={resetFilters}
                                    className="text-xs text-slate-500 hover:text-rose-400 transition-colors px-1">
                                    Șterge toate
                                </button>
                            )}
                        </div>
                    )}

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
                                            <th className="px-4 py-3 w-20"></th>
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
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => setDocumentModal({ plata: t, mode: t.status === 'Achitat' ? 'chitanta' : 'factura' })}
                                                        title={t.status === 'Achitat' ? 'Chitanță' : 'Factură'}
                                                        className="text-slate-500 hover:text-indigo-400 transition-colors p-1 rounded"
                                                    >
                                                        <FileTextIcon className="w-4 h-4" />
                                                    </button>
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
                                            <th className="px-4 py-3"></th>
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
                                                <td className="px-4 py-3 text-right font-bold text-rose-400 whitespace-nowrap">{formatSum(p.rest_de_plata ?? p.suma_datorata)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => openIncasareModal(p)}
                                                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors whitespace-nowrap"
                                                    >
                                                        Încasează
                                                    </button>
                                                </td>
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
                                            <p className="text-rose-400 font-bold text-sm whitespace-nowrap shrink-0">{formatSum(p.rest_de_plata ?? p.suma_datorata)}</p>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-slate-500">{formatDate(p.data_emitere)}</span>
                                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${p.status === 'Achitat Parțial' ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'}`}>{p.status}</span>
                                            </div>
                                            <button
                                                onClick={() => openIncasareModal(p)}
                                                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
                                            >
                                                Încasează
                                            </button>
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
                                                    <div key={p.plata_id} className="flex items-center justify-between px-3 py-2.5 gap-2">
                                                        <span className="text-sm text-white min-w-0 truncate"><SportivLink row={p} /></span>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {label === 'Restanțieri' && (
                                                                <button
                                                                    onClick={() => openIncasareModal(p)}
                                                                    className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
                                                                >
                                                                    Încasează
                                                                </button>
                                                            )}
                                                            <span className="text-xs text-slate-500">{formatSum(p.suma_datorata)}</span>
                                                        </div>
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
            {/* ─── TAB: ABONAMENTE ─── */}
            {activeTab === 'abonamente' && (
                <div className="space-y-4">
                    {/* Selector lună */}
                    <Card>
                        <Select
                            label="Luna"
                            value={lunaAbonamente || luniAbonamente[0] || ''}
                            onChange={e => setLunaAbonamente(e.target.value)}
                            className="max-w-xs"
                        >
                            {luniAbonamente.map(l => <option key={l} value={l}>{l}</option>)}
                        </Select>
                    </Card>

                    {abonamenteData.total === 0 ? (
                        <Card><p className="text-center text-slate-400 py-6 italic">Nu s-au găsit abonamente pentru această lună.</p></Card>
                    ) : (
                        <>
                            {/* Sumar */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 col-span-2 md:col-span-1">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Total sportivi</p>
                                    <p className="text-2xl font-black text-white">{abonamenteData.total}</p>
                                </div>
                                <div className="bg-slate-900 border border-emerald-800/30 rounded-xl px-4 py-3">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Achitat</p>
                                    <p className="text-2xl font-black text-emerald-400">{abonamenteData.achitate}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{abonamenteData.total > 0 ? Math.round((abonamenteData.achitate / abonamenteData.total) * 100) : 0}%</p>
                                </div>
                                <div className="bg-slate-900 border border-rose-800/30 rounded-xl px-4 py-3">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Neachitat</p>
                                    <p className={`text-2xl font-black ${abonamenteData.neachitate > 0 ? 'text-rose-400' : 'text-slate-500'}`}>{abonamenteData.neachitate}</p>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Rest Colectat</p>
                                    <p className={`text-lg font-black ${abonamenteData.incasatSuma < abonamenteData.totalSuma ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {formatSum(abonamenteData.totalSuma - abonamenteData.incasatSuma)}
                                    </p>
                                </div>
                            </div>

                            {/* Bara progres colectare */}
                            {abonamenteData.totalSuma > 0 && (
                                <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                                        <span>Progres colectare</span>
                                        <span className="font-bold text-white">
                                            {formatSum(abonamenteData.incasatSuma)} / {formatSum(abonamenteData.totalSuma)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-2">
                                        <div
                                            className="h-2 rounded-full bg-emerald-400 transition-all"
                                            style={{ width: `${Math.min(Math.round((abonamenteData.incasatSuma / abonamenteData.totalSuma) * 100), 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Lista neachitate */}
                            {abonamenteData.listaNeachitate.length > 0 && (
                                <>
                                    <h3 className="text-sm font-bold text-rose-400 px-1 flex items-center gap-2">
                                        <ExclamationTriangleIcon className="w-4 h-4" />
                                        Abonamente neachitate ({abonamenteData.listaNeachitate.length})
                                    </h3>
                                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                                        <div className="divide-y divide-slate-800/60">
                                            {abonamenteData.listaNeachitate.map(p => {
                                                const ds = getDisplayStatus(p);
                                                const cfg = STATUS_DISPLAY_CONFIG[ds];
                                                const sp = sportivi.find(s => s.id === p.sportiv_id);
                                                const fam = familii.find(f => f.id === p.familie_id);
                                                const numePlatitor = sp ? `${sp.nume} ${sp.prenume}` : fam?.nume ?? '—';
                                                return (
                                                    <div key={p.id} className="flex items-center justify-between px-4 py-3 gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-white font-medium text-sm truncate">{numePlatitor}</p>
                                                            <p className="text-slate-500 text-xs mt-0.5">{p.descriere}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                                                                {cfg.label}
                                                            </span>
                                                            <span className="text-white font-bold text-sm whitespace-nowrap">{formatSum(p.suma)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ─── TAB: GRAFICE ─── */}
            {activeTab === 'grafice' && (
                <div className="space-y-4">
                    {/* Bar chart — încasări 12 luni */}
                    <RevenueBarChart istoricPlatiDetaliat={istoricPlatiDetaliat} />

                    {/* Donut + Aging side by side pe desktop */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PaymentTypePieChart istoricPlatiDetaliat={istoricPlatiDetaliat} />

                        {/* Mini KPI restanțe lângă donut */}
                        <div className="space-y-3">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">
                                    Sumar financiar curent
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-400">Încasat luna curentă</span>
                                        <span className="text-sm font-bold text-emerald-400">
                                            {kpi.incasatLuna.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON
                                        </span>
                                    </div>
                                    <div className="h-px bg-slate-800" />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-400">Total restanțe</span>
                                        <span className={`text-sm font-bold ${kpi.totalRestante > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                            {kpi.totalRestante.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON
                                        </span>
                                    </div>
                                    <div className="h-px bg-slate-800" />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-400">Facturi scadente</span>
                                        <span className={`text-sm font-bold ${kpi.nrScadente > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                            {kpi.nrScadente} {kpi.nrScadente === 1 ? 'factură' : 'facturi'}
                                        </span>
                                    </div>
                                    {kpi.rataColectare !== null && (
                                        <>
                                            <div className="h-px bg-slate-800" />
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-sm text-slate-400">Rată colectare</span>
                                                    <span className={`text-sm font-bold ${kpi.rataColectare >= 90 ? 'text-emerald-400' : kpi.rataColectare >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                        {kpi.rataColectare}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-slate-700 rounded-full h-1.5">
                                                    <div
                                                        className={`h-1.5 rounded-full transition-all ${kpi.rataColectare >= 90 ? 'bg-emerald-400' : kpi.rataColectare >= 70 ? 'bg-amber-400' : 'bg-rose-400'}`}
                                                        style={{ width: `${Math.min(kpi.rataColectare, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Aging report — full width */}
                    <AgingReport plati={plati} sportivi={sportivi} familii={familii} />
                </div>
            )}

            {/* ─── MODAL FACTURĂ / CHITANȚĂ ─── */}
            {documentModal && (
                <FacturaChitantaModal
                    mode={documentModal.mode}
                    plata={documentModal.plata}
                    sportiv={sportivi.find(s => s.id === documentModal.plata.sportiv_id) ?? null}
                    familie={familii.find(f => f.id === documentModal.plata.familie_id) ?? null}
                    onClose={() => setDocumentModal(null)}
                />
            )}

            {/* ─── MODAL ÎNCASARE ─── */}
            {plataToIncaseze && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="px-5 pt-5 pb-4 border-b border-slate-800">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Înregistrare Încasare</p>
                            <p className="text-white font-bold text-base">{plataToIncaseze.nume_complet_sportiv || '—'}</p>
                            <p className="text-slate-400 text-sm mt-0.5">{plataToIncaseze.descriere}</p>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-slate-500">De plată:</span>
                                <span className="text-rose-400 font-bold text-sm">{formatSum(plataToIncaseze.rest_de_plata ?? plataToIncaseze.suma_datorata)}</span>
                            </div>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <Input
                                label="Sumă încasată (RON)"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={paymentAmount}
                                onChange={e => setPaymentAmount(e.target.value)}
                            />
                            <Select
                                label="Metodă plată"
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value as 'Cash' | 'Transfer Bancar')}
                            >
                                <option value="Cash">Cash</option>
                                <option value="Transfer Bancar">Transfer Bancar</option>
                            </Select>
                        </div>
                        <div className="px-5 pb-5 flex gap-2">
                            <button
                                onClick={() => setPlataToIncaseze(null)}
                                className="flex-1 py-2.5 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-xl transition-colors font-medium"
                            >
                                Anulează
                            </button>
                            <button
                                onClick={handleIncaseaza}
                                disabled={isSaving}
                                className="flex-1 py-2.5 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-colors font-bold"
                            >
                                {isSaving ? 'Se salvează...' : 'Confirmă'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
