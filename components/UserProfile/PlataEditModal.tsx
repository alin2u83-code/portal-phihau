import React, { useState, useEffect } from 'react';
import { Plata, Tranzactie } from '../../types';
import { Modal, Input, Select, Button } from '../ui';
import { BanknotesIcon, WalletIcon, CalendarDaysIcon, CheckCircleIcon } from '../icons';

export interface PlataEditModalProps {
    plata: Plata | null;
    onClose: () => void;
    onSave: (plata: Plata) => Promise<void>;
    onSaveTranzactie: (tranzactie: Tranzactie) => Promise<void>;
    isLoading: boolean;
    tranzactii: Tranzactie[];
}

export const PlataEditModal: React.FC<PlataEditModalProps> = ({
    plata, onClose, onSave, onSaveTranzactie, isLoading, tranzactii
}) => {
    const [formPlata, setFormPlata] = useState<Plata | null>(plata);
    const [formTrz, setFormTrz] = useState<Tranzactie | null>(null);
    const [savingTrz, setSavingTrz] = useState(false);

    useEffect(() => {
        setFormPlata(plata);
        setFormTrz(tranzactii.length > 0 ? { ...tranzactii[0] } : null);
    }, [plata, tranzactii]);

    if (!formPlata) return null;

    const handlePlataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormPlata(prev => prev ? { ...prev, [name]: name === 'suma' ? parseFloat(value) || 0 : value } : null);
    };

    const handleTrzChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormTrz(prev => prev ? { ...prev, [name]: name === 'suma' ? parseFloat(value) || 0 : value } : null);
    };

    const handleSaveTrz = async () => {
        if (!formTrz) return;
        setSavingTrz(true);
        await onSaveTranzactie(formTrz);
        setSavingTrz(false);
    };

    const ramasDePlata = formTrz
        ? Math.max(0, (formPlata.suma || 0) - (formTrz.suma || 0))
        : formPlata.suma || 0;

    return (
        <Modal isOpen={!!plata} onClose={onClose} title="Editare Factură & Încasare">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                {/* ── STÂNGA: Factură ─────────────────────── */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-700/60">
                        <div className="w-7 h-7 rounded-lg bg-sky-500/15 flex items-center justify-center">
                            <BanknotesIcon className="w-4 h-4 text-sky-400" />
                        </div>
                        <p className="text-sm font-bold text-white">Factură</p>
                    </div>

                    <Input
                        label="Descriere"
                        name="descriere"
                        value={formPlata.descriere}
                        onChange={handlePlataChange}
                    />
                    <Input
                        label="Sumă totală (RON)"
                        name="suma"
                        type="number"
                        step="0.01"
                        value={formPlata.suma}
                        onChange={handlePlataChange}
                    />
                    <Input
                        label="Data emitere"
                        name="data"
                        type="date"
                        value={(formPlata.data || '').toString().slice(0, 10)}
                        onChange={handlePlataChange}
                    />
                    <Select
                        label="Status"
                        name="status"
                        value={formPlata.status}
                        onChange={handlePlataChange}
                    >
                        <option value="Neachitat">Neachitat</option>
                        <option value="Achitat Parțial">Achitat Parțial</option>
                        <option value="Achitat">Achitat</option>
                    </Select>

                    {/* Rest de plată */}
                    {formTrz && (
                        <div className={`p-3 rounded-xl border text-sm ${ramasDePlata > 0 ? 'bg-red-950/20 border-red-500/20' : 'bg-emerald-950/20 border-emerald-500/20'}`}>
                            <span className="text-slate-400">Rest de plată: </span>
                            <span className={`font-bold ${ramasDePlata > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {ramasDePlata.toFixed(2)} RON
                            </span>
                        </div>
                    )}

                    <Button
                        variant="primary"
                        className="w-full"
                        onClick={() => formPlata && onSave(formPlata)}
                        isLoading={isLoading}
                    >
                        Salvează Factura
                    </Button>
                </div>

                {/* ── DREAPTA: Încasare ────────────────────── */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-700/60">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                            <WalletIcon className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p className="text-sm font-bold text-white">Încasare</p>
                    </div>

                    {formTrz ? (
                        <>
                            <Input
                                label="Sumă încasată (RON)"
                                name="suma"
                                type="number"
                                step="0.01"
                                value={formTrz.suma}
                                onChange={handleTrzChange}
                            />
                            <Input
                                label="Data plății"
                                name="data_platii"
                                type="date"
                                value={(formTrz.data_platii || '').toString().slice(0, 10)}
                                onChange={handleTrzChange}
                            />
                            <Select
                                label="Metodă plată"
                                name="metoda_plata"
                                value={formTrz.metoda_plata}
                                onChange={handleTrzChange}
                            >
                                <option value="Cash">Cash</option>
                                <option value="Transfer Bancar">Transfer Bancar</option>
                            </Select>

                            {/* Sumar vizual */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col items-center p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/40">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Total factură</span>
                                    <span className="text-base font-black text-white mt-0.5">{formPlata.suma.toFixed(2)}</span>
                                    <span className="text-[10px] text-slate-500">RON</span>
                                </div>
                                <div className="flex flex-col items-center p-2.5 bg-emerald-950/20 rounded-xl border border-emerald-500/20">
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Încasat</span>
                                    <span className="text-base font-black text-emerald-400 mt-0.5">{(formTrz.suma || 0).toFixed(2)}</span>
                                    <span className="text-[10px] text-slate-500">RON</span>
                                </div>
                            </div>

                            <Button
                                variant="success"
                                className="w-full"
                                onClick={handleSaveTrz}
                                isLoading={savingTrz}
                            >
                                <CheckCircleIcon className="w-4 h-4 mr-1.5" />
                                Salvează Încasarea
                            </Button>

                            {tranzactii.length > 1 && (
                                <p className="text-[11px] text-slate-500 text-center italic">
                                    {tranzactii.length} încasări totale — se editează prima
                                </p>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full min-h-[180px] text-center py-6 bg-slate-800/20 rounded-xl border border-dashed border-slate-700/40">
                            <CalendarDaysIcon className="w-8 h-8 text-slate-600 mb-2" />
                            <p className="text-sm text-slate-500 font-medium">Fără încasare</p>
                            <p className="text-xs text-slate-600 mt-1">
                                Această factură nu are<br />nicio plată înregistrată.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer mobil */}
            <div className="pt-4 mt-2 border-t border-slate-700/40">
                <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
                    Închide
                </Button>
            </div>
        </Modal>
    );
};
