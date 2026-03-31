import React, { useState } from 'react';
import { Sportiv, TipAbonament, Familie, VizualizarePlata, Plata, Tranzactie } from '../../types';
import { Card, Button, Skeleton, Modal } from '../ui';
import { UsersIcon, ExclamationTriangleIcon, CalendarDaysIcon, EditIcon, TrashIcon, BanknotesIcon, CheckCircleIcon, WalletIcon } from '../icons';

interface Incasare {
    data_plata: string;
    suma_incasata: number;
    tranzactie_id: string | null;
}

interface FacturaEntry {
    detalii: VizualizarePlata;
    incasari: Incasare[];
    totalIncasat: number;
}

interface FinanciarTabProps {
    totalRestante: number;
    tipuriAbonament: TipAbonament[];
    sportiv: Sportiv;
    sportivi: Sportiv[];
    familii: Familie[];
    vizualizarePlati: VizualizarePlata[];
    possibleViewError: boolean;
    istoricFacturi: FacturaEntry[];
    setPlataToEdit: (plata: Plata | null) => void;
    plati: Plata[];
    setPlataToDelete: (plata: Plata | null) => void;
    tranzactii: Tranzactie[];
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const cfg =
        status === 'Achitat' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
        status === 'Achitat Parțial' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
        'bg-red-500/15 text-red-400 border-red-500/30';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg}`}>
            {status}
        </span>
    );
};

const ProgressBar: React.FC<{ procent: number; status: string }> = ({ procent, status }) => {
    const color =
        status === 'Achitat' ? 'bg-emerald-500' :
        status === 'Achitat Parțial' ? 'bg-amber-500' :
        'bg-red-500/40';
    return (
        <div className="w-full h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full transition-all ${color}`}
                style={{ width: `${Math.min(100, procent)}%` }}
            />
        </div>
    );
};

export const FinanciarTab: React.FC<FinanciarTabProps> = ({
    totalRestante, tipuriAbonament, sportiv, sportivi, familii,
    vizualizarePlati, possibleViewError, istoricFacturi,
    setPlataToEdit, plati, setPlataToDelete, tranzactii,
}) => {
    const [selectedFactura, setSelectedFactura] = useState<FacturaEntry | null>(null);
    const [filter, setFilter] = useState<'toate' | 'neachitate' | 'achitate'>('toate');

    const getTranzactie = (id: string | null) =>
        id ? tranzactii.find(t => t.id === id) ?? null : null;

    const getSportivNume = (id: string | null) => {
        if (!id) return null;
        const s = sportivi.find(x => x.id === id);
        return s ? `${s.nume} ${s.prenume}` : null;
    };

    const getFamilieName = (id: string | null) =>
        id ? familii.find(f => f.id === id)?.nume ?? null : null;

    const facturiFiltrate = istoricFacturi.filter(({ detalii }) => {
        if (filter === 'neachitate') return detalii.status !== 'Achitat';
        if (filter === 'achitate') return detalii.status === 'Achitat';
        return true;
    });

    const nrNeachitate = istoricFacturi.filter(f => f.detalii.status !== 'Achitat').length;

    return (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── SUMAR STÂNGA ──────────────────────────────── */}
            <div className="lg:col-span-1 space-y-4">
                <Card className="sticky top-4 space-y-4">
                    <h3 className="text-base font-bold text-white">Sumar Financiar</h3>

                    {/* Total restant */}
                    <div className={`p-4 rounded-xl border ${totalRestante > 0 ? 'bg-red-950/30 border-red-500/30' : 'bg-emerald-950/20 border-emerald-500/20'}`}>
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total de achitat</p>
                        <p className={`text-3xl font-black ${totalRestante > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {totalRestante.toFixed(2)}
                            <span className="text-sm font-normal text-slate-500 ml-1">RON</span>
                        </p>
                        {totalRestante === 0 && (
                            <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                                <CheckCircleIcon className="w-3 h-3" /> Toate facturile sunt achitate
                            </p>
                        )}
                    </div>

                    {/* Statistici rapide */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/40 text-center">
                            <p className="text-xl font-black text-white">{istoricFacturi.length}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Total facturi</p>
                        </div>
                        <div className={`p-3 rounded-xl border text-center ${nrNeachitate > 0 ? 'bg-red-950/20 border-red-500/20' : 'bg-slate-800/50 border-slate-700/40'}`}>
                            <p className={`text-xl font-black ${nrNeachitate > 0 ? 'text-red-400' : 'text-slate-400'}`}>{nrNeachitate}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Neachitate</p>
                        </div>
                    </div>

                    {/* Abonament */}
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">Abonament activ</p>
                        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/40 text-sm text-white">
                            {tipuriAbonament.find(t => t.id === sportiv.tip_abonament_id)?.denumire || (
                                <span className="text-slate-500 italic">Nespecificat</span>
                            )}
                        </div>
                    </div>

                    {/* Familie */}
                    {sportiv.familie_id && (
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">Familie</p>
                            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/40 flex items-center gap-2 text-sm text-white">
                                <UsersIcon className="w-4 h-4 text-violet-400 shrink-0" />
                                {getFamilieName(sportiv.familie_id) ?? 'Familie'}
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* ── LISTA FACTURI ─────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">

                {/* Filtre */}
                <div className="flex gap-2">
                    {(['toate', 'neachitate', 'achitate'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                                filter === f
                                    ? 'bg-sky-500 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50'
                            }`}
                        >
                            {f === 'toate' ? `Toate (${istoricFacturi.length})` :
                             f === 'neachitate' ? `Neachitate (${nrNeachitate})` :
                             `Achitate (${istoricFacturi.length - nrNeachitate})`}
                        </button>
                    ))}
                </div>

                {/* Lista */}
                {!vizualizarePlati ? (
                    <div className="space-y-2">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : possibleViewError ? (
                    <Card className="text-center p-6 border-red-900/50 bg-red-900/10">
                        <ExclamationTriangleIcon className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <p className="text-red-300 text-sm">Datele financiare sunt indisponibile.</p>
                    </Card>
                ) : facturiFiltrate.length === 0 ? (
                    <Card className="text-center py-12">
                        <BanknotesIcon className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                        <p className="text-slate-500 text-sm">
                            {filter === 'toate' ? 'Nu există facturi înregistrate.' : `Nu există facturi ${filter}.`}
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {facturiFiltrate.map((factura) => {
                            const { detalii: p, totalIncasat, incasari } = factura;
                            const ramasDePlata = Math.max(0, (p.suma_datorata || 0) - totalIncasat);
                            const procent = p.suma_datorata > 0 ? (totalIncasat / p.suma_datorata) * 100 : 0;
                            const isPaid = p.status === 'Achitat';
                            const isPartial = p.status === 'Achitat Parțial';
                            const isFamilie = !!p.familie_id;
                            const familieName = getFamilieName(p.familie_id ?? null);

                            return (
                                <div
                                    key={p.plata_id}
                                    className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden hover:border-slate-600/60 transition-colors"
                                >
                                    {/* Rând principal — click detalii */}
                                    <button
                                        className="w-full text-left p-4 space-y-3"
                                        onClick={() => setSelectedFactura(factura)}
                                    >
                                        {/* Linia 1: Cine + tip factură */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                {/* Avatar */}
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 text-xs font-bold text-slate-300 overflow-hidden">
                                                    {isFamilie ? (
                                                        <UsersIcon className="w-4 h-4 text-violet-400" />
                                                    ) : (
                                                        `${p.nume_complet?.split(' ')[0]?.[0] ?? ''}${p.nume_complet?.split(' ')[1]?.[0] ?? ''}`
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-slate-300 truncate">
                                                        {isFamilie ? `Familie ${familieName}` : p.nume_complet}
                                                    </p>
                                                    <p className="text-sm font-bold text-white truncate leading-tight">
                                                        {p.descriere}
                                                    </p>
                                                </div>
                                            </div>
                                            <StatusBadge status={p.status} />
                                        </div>

                                        {/* Linia 2: Progress bar */}
                                        <div className="space-y-1">
                                            <ProgressBar procent={procent} status={p.status} />
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500">
                                                    <CalendarDaysIcon className="w-3 h-3 inline mr-1" />
                                                    {new Date(p.data_emitere).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                                <span className={`font-bold ${isPaid ? 'text-emerald-400' : isPartial ? 'text-amber-400' : 'text-red-400'}`}>
                                                    {isPaid
                                                        ? `${totalIncasat.toFixed(2)} RON achitat`
                                                        : ramasDePlata > 0
                                                            ? `${ramasDePlata.toFixed(2)} RON neachitat`
                                                            : `${p.suma_datorata.toFixed(2)} RON`
                                                    }
                                                </span>
                                            </div>
                                        </div>

                                        {/* Linia 3: Încasări dacă parțial */}
                                        {incasari.length > 0 && !isPaid && (
                                            <div className="flex items-center gap-1.5 text-[11px] text-sky-400">
                                                <WalletIcon className="w-3 h-3" />
                                                {incasari.length} încasare{incasari.length !== 1 ? 'i' : ''} •
                                                {totalIncasat.toFixed(2)} RON din {p.suma_datorata.toFixed(2)} RON
                                            </div>
                                        )}
                                    </button>

                                    {/* Acțiuni */}
                                    <div className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-700/40 bg-slate-900/20">
                                        <Button size="sm" variant="secondary"
                                            onClick={() => setPlataToEdit(plati.find(pl => pl.id === p.plata_id) || null)}>
                                            <EditIcon className="w-3.5 h-3.5 mr-1" /> Editează
                                        </Button>
                                        <Button size="sm" variant="danger"
                                            onClick={() => setPlataToDelete(plati.find(pl => pl.id === p.plata_id) || null)}>
                                            <TrashIcon className="w-3.5 h-3.5 mr-1" /> Șterge
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>

        {/* ── MODAL DETALII ─────────────────────────────────────── */}
        {selectedFactura && (() => {
            const { detalii: p, incasari, totalIncasat } = selectedFactura;
            const ramasDePlata = Math.max(0, (p.suma_datorata || 0) - totalIncasat);
            const isPaid = p.status === 'Achitat';
            const procent = p.suma_datorata > 0 ? Math.min(100, (totalIncasat / p.suma_datorata) * 100) : 0;
            const isFamilie = !!p.familie_id;
            const familieName = getFamilieName(p.familie_id ?? null);

            return (
                <Modal isOpen={true} onClose={() => setSelectedFactura(null)} title="Detalii Factură">
                    <div className="space-y-5">

                        {/* Header factură */}
                        <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/40">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0 text-sm font-bold text-slate-300">
                                {isFamilie
                                    ? <UsersIcon className="w-5 h-5 text-violet-400" />
                                    : `${p.nume_complet?.split(' ')[0]?.[0] ?? ''}${p.nume_complet?.split(' ')[1]?.[0] ?? ''}`
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-400">
                                    {isFamilie ? `Familie ${familieName}` : p.nume_complet}
                                </p>
                                <p className="text-sm font-bold text-white leading-tight">{p.descriere}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Emis: {new Date(p.data_emitere).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                            <StatusBadge status={p.status} />
                        </div>

                        {/* Sume + progress */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="flex flex-col items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700/40">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total</span>
                                    <span className="text-lg font-black text-white">{p.suma_datorata.toFixed(2)}</span>
                                    <span className="text-[10px] text-slate-500">RON</span>
                                </div>
                                <div className="flex flex-col items-center p-3 bg-emerald-950/20 rounded-xl border border-emerald-500/20">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Încasat</span>
                                    <span className="text-lg font-black text-emerald-400">{totalIncasat.toFixed(2)}</span>
                                    <span className="text-[10px] text-slate-500">RON</span>
                                </div>
                                <div className={`flex flex-col items-center p-3 rounded-xl border ${ramasDePlata > 0 ? 'bg-red-950/20 border-red-500/20' : 'bg-emerald-950/10 border-emerald-500/10'}`}>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Rest</span>
                                    <span className={`text-lg font-black ${ramasDePlata > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {ramasDePlata.toFixed(2)}
                                    </span>
                                    <span className="text-[10px] text-slate-500">RON</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <ProgressBar procent={procent} status={p.status} />
                                <p className="text-right text-xs text-slate-500">{procent.toFixed(0)}% achitat</p>
                            </div>
                        </div>

                        {/* Timeline încasări */}
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                Istoric plăți
                            </p>

                            {/* Eveniment: emitere factură */}
                            <div className="relative pl-6">
                                <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-slate-600 border-2 border-slate-500" />
                                {incasari.length > 0 && <div className="absolute left-1.5 top-4 bottom-0 w-px bg-slate-700" />}
                                <div className="pb-4">
                                    <p className="text-xs font-semibold text-slate-400">Factură emisă</p>
                                    <p className="text-xs text-slate-500">
                                        {new Date(p.data_emitere).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })} •
                                        {' '}{p.suma_datorata.toFixed(2)} RON
                                    </p>
                                </div>
                            </div>

                            {/* Fiecare încasare */}
                            {incasari.map((inc, idx) => {
                                const trz = getTranzactie(inc.tranzactie_id);
                                const cineAPlata = getSportivNume(trz?.sportiv_id ?? null);
                                const isLast = idx === incasari.length - 1;
                                return (
                                    <div key={idx} className="relative pl-6">
                                        <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-emerald-400" />
                                        {(!isLast || !isPaid) && (
                                            <div className="absolute left-1.5 top-4 bottom-0 w-px bg-slate-700" />
                                        )}
                                        <div className="pb-4 space-y-0.5">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-bold text-emerald-400">
                                                    +{inc.suma_incasata.toFixed(2)} RON
                                                </p>
                                                {trz?.metoda_plata && (
                                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400">
                                                        {trz.metoda_plata}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                {new Date(inc.data_plata).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                {cineAPlata && <span className="ml-1.5 text-slate-400">• {cineAPlata}</span>}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Eveniment final: rest neachitat */}
                            {!isPaid && (
                                <div className="relative pl-6">
                                    <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-red-500/50 border-2 border-red-400/50 border-dashed" />
                                    <div className="pb-1">
                                        <p className="text-xs font-semibold text-red-400">Rest neachitat</p>
                                        <p className="text-xs text-slate-500">{ramasDePlata.toFixed(2)} RON</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Button variant="secondary" onClick={() => setSelectedFactura(null)} className="w-full">
                            Închide
                        </Button>
                    </div>
                </Modal>
            );
        })()}
        </>
    );
};
