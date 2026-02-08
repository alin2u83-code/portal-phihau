import React, { useMemo, useState } from 'react';
import { Sportiv, Familie, Plata, Tranzactie } from '../types';
import { Modal, Button, Input, Select, Card } from './ui';
import { BanknotesIcon, BookOpenIcon, TrophyIcon, WalletIcon, PlusIcon } from './icons';
import { useError } from './ErrorProvider';
import { supabase } from '../supabaseClient';

interface SportivWalletProps {
    sportiv: Sportiv;
    familie: Familie | undefined;
    allPlati: Plata[];
    allTranzactii: Tranzactie[];
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

export const SportivWallet: React.FC<SportivWalletProps> = ({ sportiv, familie, allPlati, allTranzactii, setPlati, setTranzactii, onClose }) => {
    
    const isFamilyWallet = !!sportiv.familie_id && !!familie;
    const { showError, showSuccess } = useError();
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Transfer Bancar'>('Cash');
    const [isSaving, setIsSaving] = useState(false);

    const { sold, history, lastPaymentDate, relevantPlati, totalDue } = useMemo(() => {
        if (!allPlati || !allTranzactii) {
             return { sold: 0, history: [], lastPaymentDate: null, relevantPlati: [], totalDue: 0 };
        }
        const relPlati = isFamilyWallet
            ? allPlati.filter(p => p.familie_id === sportiv.familie_id)
            : allPlati.filter(p => p.sportiv_id === sportiv.id && !p.familie_id);
        
        const relTranzactii = isFamilyWallet
            ? allTranzactii.filter(t => t.familie_id === sportiv.familie_id)
            : allTranzactii.filter(t => t.sportiv_id === sportiv.id && !t.familie_id);

        const totalDatorii = relPlati.reduce((sum, p) => sum + p.suma, 0);
        const totalIncasari = relTranzactii.reduce((sum, t) => sum + t.suma, 0);
        
        const currentSold = totalIncasari - totalDatorii;
        
        const platiHistory = relPlati.map(p => ({
            id: p.id, date: p.data, amount: -p.suma,
            description: p.descriere, type: 'debit' as const, paymentType: p.tip,
            suma_initiala: p.suma_initiala, status: p.status
        }));

        const tranzactiiHistory = relTranzactii.map(t => ({
            id: t.id, date: t.data_platii, amount: t.suma,
            description: t.descriere || `Încasare ${t.metoda_plata}`, type: 'credit' as const, paymentType: 'Incasare',
            suma_initiala: null, status: 'Achitat' as const
        }));

        const combinedHistory = [...platiHistory, ...tranzactiiHistory].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastPayment = [...relTranzactii].sort((a,b) => new Date(b.data_platii).getTime() - new Date(a.data_platii).getTime())[0];
        const dueAmount = relPlati.filter(p => p.status !== 'Achitat').reduce((acc, p) => acc + p.suma, 0);

        return { sold: currentSold, history: combinedHistory, lastPaymentDate: lastPayment?.data_platii, relevantPlati: relPlati, totalDue: dueAmount };

    }, [sportiv, isFamilyWallet, allPlati, allTranzactii]);

    const handleConfirmPayment = async () => {
        setIsSaving(true);
        const unpaidPlati = relevantPlati
            .filter(p => p.status === 'Neachitat' || p.status === 'Achitat Parțial')
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
            platiToUpdate.push({ id: plata.id, suma: newRemaining < 0.01 ? (plata.suma_initiala || plata.suma) : newRemaining, status: newStatus });
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
                return prev.map(p => updatesMap.has(p.id) ? updatesMap.get(p.id)! : p);
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
                    <Button variant="primary" onClick={() => setShowPaymentForm(true)} className="w-full"><PlusIcon className="w-5 h-5 mr-2" /> Adaugă o Încasare</Button>
                )}

                <div>
                     <h3 className="text-lg font-bold text-white mb-2">Istoric Tranzacții</h3>
                     <div className="bg-slate-900/50 border border-slate-700 rounded-lg max-h-80 overflow-y-auto">
                        {history.length > 0 ? (
                            <ul className="divide-y divide-slate-800">
                                {history.map((item) => {
                                    const isDebit = item.type === 'debit';
                                    const isPartiallyPaid = isDebit && item.suma_initiala && (item.status === 'Achitat Parțial' || (item.status === 'Achitat' && item.suma_initiala > -item.amount));
                                    const originalAmount = item.suma_initiala || -item.amount;
                                    const remainingAmount = -item.amount;
                                    const paidAmount = originalAmount - remainingAmount;
                                    const progress = originalAmount > 0 ? (paidAmount / originalAmount) * 100 : (item.status === 'Achitat' ? 100 : 0);

                                    return (
                                        <li key={`${item.id}-${item.date}`} className="p-3">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-slate-700/50 rounded-full">{getPaymentIcon(item.paymentType)}</div>
                                                <div className="flex-grow">
                                                    <p className="font-semibold text-white text-sm">{item.description}</p>
                                                    <p className="text-xs text-slate-400">{new Date(item.date).toLocaleDateString('ro-RO')}</p>
                                                     {isDebit && (item.status !== 'Achitat' || isPartiallyPaid) && item.suma_initiala && (
                                                        <div className="mt-1.5">
                                                            <div className="w-full bg-slate-600 rounded-full h-1.5"><div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div></div>
                                                            {item.status === 'Achitat Parțial' && <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-600/30 text-amber-400 mt-1 inline-block">Rest: {remainingAmount.toFixed(2)} RON</span>}
                                                        </div>
                                                    )}
                                                </div>
                                                <p className={`text-base font-bold text-right ${item.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                                                    {item.type === 'credit' ? '+' : ''}
                                                    {isDebit && item.suma_initiala ? (-item.suma_initiala).toFixed(2) : item.amount.toFixed(2)}
                                                </p>
                                            </div>
                                        </li>
                                    );
                                })}
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