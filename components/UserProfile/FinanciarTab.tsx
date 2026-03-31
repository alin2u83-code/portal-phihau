import React, { useState } from 'react';
import { Sportiv, TipAbonament, Familie, VizualizarePlata, Plata, Tranzactie } from '../../types';
import { Card, Button, Skeleton, Modal } from '../ui';
import { UsersIcon, ExclamationTriangleIcon, CalendarDaysIcon, EditIcon, TrashIcon, BanknotesIcon, CheckCircleIcon, ChevronRightIcon, WalletIcon } from '../icons';

interface Incasare {
    data_plata: string;
    suma_incasata: number;
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
    familii: Familie[];
    vizualizarePlati: VizualizarePlata[];
    possibleViewError: boolean;
    istoricFacturi: FacturaEntry[];
    setPlataToEdit: (plata: Plata | null) => void;
    plati: Plata[];
    setPlataToDelete: (plata: Plata | null) => void;
    tranzactii: Tranzactie[];
}

export const FinanciarTab: React.FC<FinanciarTabProps> = ({
    totalRestante,
    tipuriAbonament,
    sportiv,
    familii,
    vizualizarePlati,
    possibleViewError,
    istoricFacturi,
    setPlataToEdit,
    plati,
    setPlataToDelete,
    tranzactii,
}) => {
    const [selectedFactura, setSelectedFactura] = useState<FacturaEntry | null>(null);

    const getMetodaPlata = (plataId: string): string => {
        const tranzactie = tranzactii.find(t => t.plata_ids && t.plata_ids.includes(plataId));
        return tranzactie?.metoda_plata ?? '—';
    };

    return (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sumar stânga */}
            <div className="lg:col-span-1">
                <Card className="sticky top-4">
                    <h3 className="text-lg font-bold text-white mb-4">Sumar Financiar</h3>
                    <div className="space-y-4">
                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                            <p className="text-sm text-slate-400">Total Restant</p>
                            <p className={`text-3xl font-bold mt-1 ${totalRestante > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {totalRestante.toFixed(2)} <span className="text-sm text-slate-500 font-normal">RON</span>
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-300">Abonament Activ</p>
                            <div className="p-3 bg-slate-800 rounded border border-slate-700 text-sm text-white">
                                {tipuriAbonament.find(t => t.id === sportiv.tip_abonament_id)?.denumire || 'Nespecificat'}
                            </div>
                        </div>

                        {sportiv.familie_id && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-300">Familie</p>
                                <div className="p-3 bg-slate-800 rounded border border-slate-700 flex items-center gap-2 text-sm text-white">
                                    <UsersIcon className="w-4 h-4 text-slate-400" />
                                    {familii.find(f => f.id === sportiv.familie_id)?.nume || 'Familie'}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Lista facturi */}
            <div className="lg:col-span-2">
                <Card>
                    <h3 className="text-lg font-bold text-white mb-4">Istoric Facturi & Plăți</h3>
                    <div className="space-y-3">
                        {!vizualizarePlati ? (
                            <div className="space-y-2">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        ) : possibleViewError ? (
                            <div className="text-center p-6 bg-red-900/20 rounded-lg border border-red-900/50">
                                <ExclamationTriangleIcon className="w-8 h-8 text-red-500 mx-auto mb-2" />
                                <p className="text-red-300">Datele financiare sunt indisponibile.</p>
                            </div>
                        ) : istoricFacturi.length > 0 ? (
                            istoricFacturi.map((factura) => {
                                const { detalii: p, totalIncasat, incasari } = factura;
                                if (!p.data_plata && !p.data_emitere) return null;
                                const ramasDePlata = Math.max(0, (p.suma_datorata || 0) - totalIncasat);
                                const isPaid = p.status === 'Achitat';
                                const isPartial = p.status === 'Achitat Parțial';

                                return (
                                    <div
                                        key={p.plata_id}
                                        className="bg-slate-800/40 hover:bg-slate-800/70 transition-colors rounded-lg border border-slate-700/50 overflow-hidden"
                                    >
                                        {/* Rând principal — click pentru detalii */}
                                        <button
                                            className="w-full text-left p-4 flex flex-col sm:flex-row justify-between gap-3"
                                            onClick={() => setSelectedFactura(factura)}
                                        >
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${isPaid ? 'bg-emerald-500' : isPartial ? 'bg-amber-500' : 'bg-red-500'}`} />
                                                    <p className="font-bold text-white text-base leading-tight">{p.descriere}</p>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <CalendarDaysIcon className="w-3 h-3" />
                                                        Emis: {new Date(p.data_emitere).toLocaleDateString('ro-RO')}
                                                    </span>
                                                    {incasari.length > 0 && (
                                                        <span className="flex items-center gap-1 text-sky-400">
                                                            <WalletIcon className="w-3 h-3" />
                                                            {incasari.length} încasare{incasari.length !== 1 ? 'i' : ''}
                                                        </span>
                                                    )}
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                        isPaid ? 'bg-emerald-500/15 text-emerald-400'
                                                        : isPartial ? 'bg-amber-500/15 text-amber-400'
                                                        : 'bg-red-500/15 text-red-400'
                                                    }`}>
                                                        {p.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 sm:gap-6">
                                                <div className="text-right">
                                                    <p className={`font-bold text-xl ${isPaid ? 'text-emerald-400' : isPartial ? 'text-amber-400' : 'text-red-400'}`}>
                                                        {isPaid ? totalIncasat.toFixed(2) : ramasDePlata.toFixed(2)} RON
                                                    </p>
                                                    {!isPaid && (
                                                        <p className="text-xs text-slate-500">din {p.suma_datorata.toFixed(2)} RON</p>
                                                    )}
                                                </div>
                                                <ChevronRightIcon className="w-4 h-4 text-slate-500 shrink-0" />
                                            </div>
                                        </button>

                                        {/* Butoane acțiuni */}
                                        <div className="flex items-center gap-2 px-4 pb-3 border-t border-slate-700/40 pt-2">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => setPlataToEdit(plati.find(pl => pl.id === p.plata_id) || null)}
                                                title="Editează"
                                            >
                                                <EditIcon className="w-3.5 h-3.5 mr-1.5" /> Editează
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={() => setPlataToDelete(plati.find(pl => pl.id === p.plata_id) || null)}
                                                title="Șterge"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5 mr-1.5" /> Șterge
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-10 text-slate-500">
                                <BanknotesIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>Nu există istoric financiar înregistrat.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>

        {/* ── MODAL DETALII FACTURĂ ─────────────────────────────── */}
        {selectedFactura && (() => {
            const { detalii: p, incasari, totalIncasat } = selectedFactura;
            const ramasDePlata = Math.max(0, (p.suma_datorata || 0) - totalIncasat);
            const isPaid = p.status === 'Achitat';
            const isPartial = p.status === 'Achitat Parțial';
            const metoda = getMetodaPlata(p.plata_id);

            return (
                <Modal isOpen={true} onClose={() => setSelectedFactura(null)} title="Detalii Factură">
                    <div className="space-y-5">

                        {/* Status banner */}
                        <div className={`flex items-center gap-3 p-3 rounded-xl ${
                            isPaid ? 'bg-emerald-500/10 border border-emerald-500/20'
                            : isPartial ? 'bg-amber-500/10 border border-amber-500/20'
                            : 'bg-red-500/10 border border-red-500/20'
                        }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                isPaid ? 'bg-emerald-500/20' : isPartial ? 'bg-amber-500/20' : 'bg-red-500/20'
                            }`}>
                                {isPaid
                                    ? <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                                    : <ExclamationTriangleIcon className={`w-4 h-4 ${isPartial ? 'text-amber-400' : 'text-red-400'}`} />
                                }
                            </div>
                            <div>
                                <p className={`text-sm font-bold ${isPaid ? 'text-emerald-300' : isPartial ? 'text-amber-300' : 'text-red-300'}`}>
                                    {p.status}
                                </p>
                                <p className="text-xs text-slate-400">{p.descriere}</p>
                            </div>
                        </div>

                        {/* Grid sume */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="flex flex-col items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700/40">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">De plată</span>
                                <span className="text-lg font-black text-white">{p.suma_datorata.toFixed(2)}</span>
                                <span className="text-[10px] text-slate-500">RON</span>
                            </div>
                            <div className="flex flex-col items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700/40">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Încasat</span>
                                <span className="text-lg font-black text-emerald-400">{totalIncasat.toFixed(2)}</span>
                                <span className="text-[10px] text-slate-500">RON</span>
                            </div>
                            <div className={`flex flex-col items-center p-3 rounded-xl border ${
                                ramasDePlata > 0 ? 'bg-red-950/30 border-red-500/30' : 'bg-emerald-950/20 border-emerald-500/20'
                            }`}>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Rest</span>
                                <span className={`text-lg font-black ${ramasDePlata > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {ramasDePlata.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-500">RON</span>
                            </div>
                        </div>

                        {/* Info factură */}
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center py-2 border-b border-slate-700/40">
                                <span className="text-slate-400">Data emitere</span>
                                <span className="text-white font-medium">
                                    {new Date(p.data_emitere).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                            {metoda !== '—' && (
                                <div className="flex justify-between items-center py-2 border-b border-slate-700/40">
                                    <span className="text-slate-400">Metodă plată</span>
                                    <span className="text-white font-medium">{metoda}</span>
                                </div>
                            )}
                            {p.familie_id && (
                                <div className="flex justify-between items-center py-2 border-b border-slate-700/40">
                                    <span className="text-slate-400">Tip</span>
                                    <span className="flex items-center gap-1.5 text-violet-300 font-medium">
                                        <UsersIcon className="w-3.5 h-3.5" /> Factură familie
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Istoricul încasărilor */}
                        {incasari.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                    Încasări ({incasari.length})
                                </p>
                                <div className="space-y-2">
                                    {incasari.map((inc, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/40">
                                            <div className="flex items-center gap-2">
                                                <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                                                <span className="text-sm text-slate-300">
                                                    {new Date(inc.data_plata).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <span className="text-sm font-bold text-emerald-400">
                                                +{inc.suma_incasata.toFixed(2)} RON
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {incasari.length === 0 && !isPaid && (
                            <div className="text-center py-3 text-sm text-slate-500 italic">
                                Nicio încasare înregistrată pentru această factură.
                            </div>
                        )}

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
