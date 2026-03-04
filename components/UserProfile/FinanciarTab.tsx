import React from 'react';
import { Sportiv, TipAbonament, Familie, VizualizarePlata, Plata } from '../../types';
import { Card, Button, Skeleton } from '../ui';
import { UsersIcon, ExclamationTriangleIcon, CalendarDaysIcon, EditIcon, TrashIcon, BanknotesIcon } from '../icons';

interface FinanciarTabProps {
    totalRestante: number;
    tipuriAbonament: TipAbonament[];
    sportiv: Sportiv;
    familii: Familie[];
    vizualizarePlati: VizualizarePlata[];
    possibleViewError: boolean;
    istoricFacturi: { detalii: VizualizarePlata; totalIncasat: number }[];
    setPlataToEdit: (plata: Plata | null) => void;
    plati: Plata[];
    setPlataToDelete: (plata: Plata | null) => void;
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
    setPlataToDelete
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                            <div className="p-3 bg-slate-800 rounded border border-slate-700">
                                {tipuriAbonament.find(t => t.id === sportiv.tip_abonament_id)?.denumire || 'Nespecificat'}
                            </div>
                        </div>

                        {sportiv.familie_id && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-300">Familie</p>
                                <div className="p-3 bg-slate-800 rounded border border-slate-700 flex items-center gap-2">
                                    <UsersIcon className="w-4 h-4 text-slate-400" />
                                    {familii.find(f => f.id === sportiv.familie_id)?.nume || 'Familie'}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            <div className="lg:col-span-2">
                <Card>
                    <h3 className="text-lg font-bold text-white mb-4">Istoric Facturi & Plăți</h3>
                    <div className="space-y-3">
                        {!vizualizarePlati ? (
                            <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
                        ) : possibleViewError ? (
                            <div className="text-center p-6 bg-red-900/20 rounded-lg border border-red-900/50">
                                <ExclamationTriangleIcon className="w-8 h-8 text-red-500 mx-auto mb-2" />
                                <p className="text-red-300">Datele financiare sunt indisponibile.</p>
                            </div>
                        ) : istoricFacturi.length > 0 ? (
                            istoricFacturi.map(({ detalii: p, totalIncasat }) => {
                                if (!p.data_plata && !p.data_emitere) return null;
                                const ramasDePlata = (p.suma_datorata || 0) - (totalIncasat || 0);
                                const isPaid = p.status === 'Achitat';
                                const isPartial = p.status === 'Achitat Parțial';

                                return (
                                    <div key={p.plata_id} className="bg-slate-800/40 hover:bg-slate-800/80 transition-colors p-4 rounded-lg border border-slate-700/50 flex flex-col sm:flex-row justify-between gap-4">
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-500' : isPartial ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                                                <p className="font-bold text-white text-lg">{p.descriere}</p>
                                            </div>
                                            <p className="text-sm text-slate-400 flex items-center gap-2">
                                                <CalendarDaysIcon className="w-3 h-3" /> 
                                                Emis: {new Date(p.data_emitere).toLocaleDateString('ro-RO')}
                                            </p>
                                        </div>
                                        
                                        <div className="text-right min-w-[120px]">
                                            <p className={`font-bold text-xl ${isPaid ? 'text-emerald-400' : isPartial ? 'text-amber-400' : 'text-red-400'}`}>
                                                {isPaid ? totalIncasat.toFixed(2) : ramasDePlata.toFixed(2)} RON
                                            </p>
                                            {!isPaid && (
                                                <p className="text-xs text-slate-500">din {p.suma_datorata.toFixed(2)} RON</p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 border-l border-slate-700 pl-4 ml-2">
                                            <Button size="sm" variant="secondary" onClick={() => setPlataToEdit(plati.find(pl => pl.id === p.plata_id) || null)} title="Editează">
                                                <EditIcon className="w-4 h-4"/>
                                            </Button>
                                            <Button size="sm" variant="danger" onClick={() => setPlataToDelete(plati.find(pl => pl.id === p.plata_id) || null)} title="Șterge">
                                                <TrashIcon className="w-4 h-4"/>
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
    );
};
