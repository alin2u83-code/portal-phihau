import React, { useMemo } from 'react';
import { Sportiv, Familie, Plata, Tranzactie } from '../types';
import { Modal, Button } from './ui';
import { BanknotesIcon, BookOpenIcon, TrophyIcon, WalletIcon } from './icons';

interface SportivWalletProps {
    sportiv: Sportiv;
    familie: Familie | undefined;
    allPlati: Plata[];
    allTranzactii: Tranzactie[];
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

export const SportivWallet: React.FC<SportivWalletProps> = ({ sportiv, familie, allPlati, allTranzactii, setTranzactii, onClose }) => {
    
    const isFamilyWallet = !!sportiv.familie_id && !!familie;

    const { sold, history, lastPaymentDate } = useMemo(() => {
        if (!allPlati || !allTranzactii) {
             return { sold: 0, history: [], lastPaymentDate: null };
        }
        const relevantPlati = isFamilyWallet
            ? allPlati.filter(p => p.familie_id === sportiv.familie_id)
            : allPlati.filter(p => p.sportiv_id === sportiv.id && !p.familie_id);
        
        const relevantTranzactii = isFamilyWallet
            ? allTranzactii.filter(t => t.familie_id === sportiv.familie_id)
            : allTranzactii.filter(t => t.sportiv_id === sportiv.id && !t.familie_id);

        const totalDatorii = relevantPlati.reduce((sum, p) => sum + p.suma, 0);
        const totalIncasari = relevantTranzactii.reduce((sum, t) => sum + t.suma, 0);
        
        const currentSold = totalIncasari - totalDatorii;
        
        const platiHistory = relevantPlati.map(p => ({
            id: p.id, date: p.data, amount: -p.suma,
            description: p.descriere, type: 'debit' as const, paymentType: p.tip
        }));

        const tranzactiiHistory = relevantTranzactii.map(t => ({
            id: t.id, date: t.data_platii, amount: t.suma,
            description: t.descriere || `Încasare ${t.metoda_plata}`, type: 'credit' as const, paymentType: 'Incasare'
        }));

        const combinedHistory = [...platiHistory, ...tranzactiiHistory].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const lastPayment = [...relevantTranzactii].sort((a,b) => new Date(b.data_platii).getTime() - new Date(a.data_platii).getTime())[0];

        return { sold: currentSold, history: combinedHistory, lastPaymentDate: lastPayment?.data_platii };

    }, [sportiv, isFamilyWallet, allPlati, allTranzactii]);

    const cotisationStatus = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const hasRecentPayment = lastPaymentDate && new Date(lastPaymentDate) > thirtyDaysAgo;
        if (sold < 0 && !hasRecentPayment) return { text: "Restant", color: "text-red-400" };
        return { text: "Activ", color: "text-green-400" };
    }, [sold, lastPaymentDate]);

    const title = isFamilyWallet ? `Portofel Familie: ${familie?.nume}` : `Portofel Personal: ${sportiv.nume} ${sportiv.prenume}`;

    return (
        <Modal isOpen={true} onClose={onClose} title={title}>
            <div className="space-y-6">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 shadow-2xl border border-slate-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-bold uppercase text-slate-400 tracking-wider">Sold Curent</p>
                            <p className={`text-5xl font-black mt-2 ${sold >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                               {sold.toFixed(2)}
                               <span className="text-2xl ml-1">RON</span>
                            </p>
                        </div>
                        <div className={`text-right ${cotisationStatus.color}`}>
                            <p className="text-sm font-bold uppercase tracking-wider">Status Cotizație</p>
                            <p className="text-lg font-bold">{cotisationStatus.text}</p>
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-700 flex justify-between items-center text-sm">
                        <span className="text-slate-400">Ultima Plată:</span>
                        <span className="font-bold text-white">{lastPaymentDate ? new Date(lastPaymentDate + 'T00:00:00').toLocaleDateString('ro-RO') : 'N/A'}</span>
                    </div>
                </div>

                <div>
                     <h3 className="text-lg font-bold text-white mb-2">Istoric Tranzacții</h3>
                     <div className="bg-slate-900/50 border border-slate-700 rounded-lg max-h-80 overflow-y-auto">
                        {history.length > 0 ? (
                            <ul className="divide-y divide-slate-800">
                                {history.map((item, index) => (
                                    <li key={`${item.id}-${index}`} className="flex items-center p-3 gap-3">
                                        <div className="p-2 bg-slate-700/50 rounded-full">{getPaymentIcon(item.paymentType)}</div>
                                        <div className="flex-grow">
                                            <p className="font-semibold text-white text-sm">{item.description}</p>
                                            <p className="text-xs text-slate-400">{new Date(item.date).toLocaleDateString('ro-RO')}</p>
                                        </div>
                                        <p className={`text-base font-bold text-right ${item.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                                            {item.type === 'credit' ? '+' : ''}{item.amount.toFixed(2)}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="p-8 text-center text-slate-500 italic">Momentan nu există plăți înregistrate pentru profilul tău.</p>
                        )}
                     </div>
                </div>

                 <div className="flex justify-end pt-4">
                    <Button variant="secondary" onClick={onClose}>Închide</Button>
                </div>
            </div>
        </Modal>
    );
};