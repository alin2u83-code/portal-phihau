import React, { useMemo, useState } from 'react';
import { Sportiv, Familie, Plata, Tranzactie, VizualizarePlata } from '../types';
import { Modal, Button, Input, Select, Card } from './ui';
import { BanknotesIcon, BookOpenIcon, TrophyIcon, WalletIcon, PlusIcon } from './icons';
import { useError } from './ErrorProvider';
import { supabase } from '../supabaseClient';

interface SportivWalletProps {
    sportiv: Sportiv;
    familie: Familie | undefined;
    allSportivi: Sportiv[];
    vizualizarePlati: VizualizarePlata[];
    allPlati: Plata[]; // Still needed for write operations
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
    onClose: () => void;
}

const getPaymentIcon = (type: string) => {
    const normalizedType = type.toLowerCase();
    if (normalizedType.includes('abonament')) return <BanknotesIcon className="w-5 h-5 text-sky-400" />;
    if (normalizedType.includes('examen')) return <BookOpenIcon className="w-5 h-5 text-amber-400" />;
    if (normalizedType.includes('stagiu') || normalizedType.includes('competitie')) return <TrophyIcon className="w-5 h-5 text-fuchsia-400" />;
    return <WalletIcon className="w-5 h-5 text-slate-400" />;
};

type InvoiceHistoryItem = {
    details: VizualizarePlata;
    payments: VizualizarePlata[];
    totalPaid: number;
    remaining: number;
};

export const SportivWallet: React.FC<SportivWalletProps> = ({ sportiv, familie, allSportivi, vizualizarePlati, allPlati, setPlati, setTranzactii, onClose }) => {
    
    const isFamilyWallet = !!sportiv.familie_id && !!familie;
    const { showError, showSuccess } = useError();
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Transfer Bancar'>('Cash');
    const [isSaving, setIsSaving] = useState(false);

    const { sold, totalDue, invoiceHistory } = useMemo(() => {
        if (!vizualizarePlati || !allSportivi) {
             return { sold: 0, invoiceHistory: [], totalDue: 0 };
        }
        
        const memberIds = isFamilyWallet
            ? new Set(allSportivi.filter(s => s.familie_id === sportiv.familie_id).map(s => s.id))
            : new Set([sportiv.id]);

        const relevantPlatiView = vizualizarePlati.filter(p => memberIds.has(p.sportiv_id));

        const invoices = new Map<string, InvoiceHistoryItem>();
        let totalPaidOverall = 0;
        let totalBilledOverall = 0;

        relevantPlatiView.forEach(p => {
            if (!invoices.has(p.plata_id)) {
                invoices.set(p.plata_id, {
                    details: p,
                    payments: [],
                    totalPaid: 0,
                    remaining: p.suma_datorata,
                });
                totalBilledOverall += p.suma_datorata;
            }
            if (p.tranzactie_id && p.suma_incasata && p.data_plata) {
                invoices.get(p.plata_id)!.payments.push(p);
            }
        });

        invoices.forEach(invoice => {
            const totalPaidForInvoice = invoice.payments.reduce((sum, payment) => sum + (payment.suma_incasata || 0), 0);
            invoice.totalPaid = totalPaidForInvoice;
            invoice.remaining = invoice.details.suma_datorata - totalPaidForInvoice;
            totalPaidOverall += totalPaidForInvoice;
        });
        
        const currentSold = totalPaidOverall - totalBilledOverall;
        const dueAmount = Array.from(invoices.values()).reduce((sum, inv) => sum + inv.remaining, 0);
        
        const sortedHistory = Array.from(invoices.values()).sort((a,b) => new Date(b.details.data_emitere).getTime() - new Date(a.details.data_emitere).getTime());

        return { sold: currentSold, totalDue: dueAmount, invoiceHistory: sortedHistory };

    }, [sportiv, isFamilyWallet, vizualizarePlati, allSportivi]);

    const handleConfirmPayment = async () => {
        setIsSaving(true);
        const unpaidPlati = (allPlati || [])
            .filter(p => {
                const isForEntity = isFamilyWallet ? p.familie_id === sportiv.familie_id : p.sportiv_id === sportiv.id;
                return isForEntity && (p.status === 'Neachitat' || p.status === 'Achitat Parțial');
            })
            .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

        let amountToSettle = parseFloat(paymentAmount);
        if (isNaN(amountToSettle) || amountToSettle <= 0) {
            showError("Sumă invalidă", "Introduceți o sumă validă.");
            setIsSaving(false);
            return;
        }
        if (amountToSettle > totalDue + 0.01) {
             showError("Sumă Excesivă", "Suma încasată nu poate depăși totalul datorat. Pentru plăți în avans, folosiți modulul dedicat.");
             setIsSaving(false);
             return;
        }

        const platiToUpdate: Partial<Plata>[] = [];
        const platiIdsToLink: string[] = [];
        let amountToApply = amountToSettle;

        for (const plata of unpaidPlati) {
            if (amountToApply < 0.01) break;
            const paymentForThisPlata = Math.min(amountToApply, plata.suma);
            const newRemaining = plata.suma - paymentForThisPlata;
            const newStatus: Plata['status'] = newRemaining < 0.01 ? 'Achitat' : 'Achitat Parțial';
            platiToUpdate.push({ id: plata.id, status: newStatus });
            platiIdsToLink.push(plata.id);
            amountToApply -= paymentForThisPlata;
        }

        try {
            const { data: tx, error: txError } = await supabase.from('tranzactii').insert({ plata_ids: platiIdsToLink, sportiv_id: isFamilyWallet ? null : sportiv.id, familie_id: isFamilyWallet ? familie?.id : null, suma: amountToSettle, data_platii: new Date().toISOString().split('T')[0], metoda_plata: paymentMethod }).select().single();
            if (txError) throw txError;
            
            const { data: updatedPlati, error: updateError } = await supabase.from('plati').upsert(platiToUpdate).select();
            if (updateError) throw updateError;
            
            setTranzactii(prev => [...prev, tx as Tranzactie]);
            setPlati(prev => {
                const updatesMap = new Map((updatedPlati as Plata[]).map(p => [p.id, p]));
                return prev.map(p => updatesMap.has(p.id) ? { ...p, ...updatesMap.get(p.id)!} : p);
            });

            showSuccess('Succes', `Încasare de ${amountToSettle.toFixed(2)} RON confirmată!`);
            setShowPaymentForm(false);
            setPaymentAmount('');
        } catch (err: any) {
            showError("Eroare la procesarea încasării", err.message);
        } finally {
            setIsSaving(false);
        }
    };
    
    const title = isFamilyWallet ? `Portofel Familie: ${familie?.nume}` : `Portofel Personal: ${sportiv.nume} ${sportiv.prenume}`;

    return (
        <Modal isOpen={true} onClose={onClose} title={title}>
            <div className="space-y-6">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 shadow-2xl border border-slate-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-bold uppercase text-slate-400 tracking-wider">Sold Curent</p>
                            <p className={`text-5xl font-black mt-2 ${sold >= 0 ? 'text-green-400' : 'text-red-400'}`}>{sold.toFixed(2)}<span className="text-2xl ml-1">RON</span></p>
                        </div>
                        <div className={`text-right ${totalDue > 0 ? 'text-red-400' : 'text-green-400'}`}>
                             <p className="text-sm font-bold uppercase tracking-wider">Total Datorat</p>
                            <p className="text-lg font-bold">{totalDue.toFixed(2)} RON</p>
                        </div>
                    </div>
                </div>

                {showPaymentForm ? (
                    <Card className="bg-slate-900/50 border-brand-secondary">
                        <h3 className="text-lg font-bold text-white mb-4">Adaugă Încasare</h3>
                        <div className="space-y-4">
                            <Input label="Sumă Încasată (RON)" type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder={`Max ${totalDue.toFixed(2)}`} />
                            <Select label="Metoda de Plată" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}><option value="Cash">Cash</option><option value="Transfer Bancar">Transfer Bancar</option></Select>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="secondary" onClick={() => setShowPaymentForm(false)} disabled={isSaving}>Anulează</Button>
                                <Button variant="success" onClick={handleConfirmPayment} isLoading={isSaving} disabled={!paymentAmount}>Confirmă Plata</Button>
                            </div>
                        </div>
                    </Card>
                ) : (
                    totalDue > 0 && <Button variant="primary" onClick={() => setShowPaymentForm(true)} className="w-full"><PlusIcon className="w-5 h-5 mr-2" /> Adaugă o Încasare</Button>
                )}

                <div>
                     <h3 className="text-lg font-bold text-white mb-2">Istoric Facturi</h3>
                     <div className="bg-slate-900/50 border border-slate-700 rounded-lg max-h-80 overflow-y-auto">
                        {invoiceHistory.length > 0 ? (
                            <ul className="divide-y divide-slate-800">
                                {invoiceHistory.map(invoice => (
                                    <li key={invoice.details.plata_id} className="p-3">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-slate-700/50 rounded-full">{getPaymentIcon(invoice.details.descriere)}</div>
                                            <div className="flex-grow">
                                                <p className="font-semibold text-white text-sm">{invoice.details.descriere}</p>
                                                <p className="text-xs text-slate-400">{new Date(invoice.details.data_emitere).toLocaleDateString('ro-RO')}</p>
                                            </div>
                                            <p className={`text-base font-bold text-right ${invoice.remaining > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                {invoice.remaining > 0 ? `-${invoice.remaining.toFixed(2)}` : invoice.details.suma_datorata.toFixed(2)}
                                            </p>
                                        </div>
                                        {invoice.payments.length > 0 && (
                                            <div className="pl-10 mt-2 space-y-1">
                                                {invoice.payments.map(p => (
                                                    <div key={p.tranzactie_id} className="text-xs flex justify-between items-center text-green-400">
                                                        <span>&#8627; Încasat la {p.data_plata ? new Date(p.data_plata).toLocaleDateString('ro-RO') : '-'}</span>
                                                        <span className="font-bold">+{p.suma_incasata?.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : ( <p className="p-8 text-center text-slate-500 italic">Nu există istoric financiar.</p> )}
                     </div>
                </div>

                 <div className="flex justify-end pt-4">
                    <Button variant="secondary" onClick={onClose}>Închide</Button>
                </div>
            </div>
        </Modal>
    );
};
