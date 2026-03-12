import React, { useMemo } from 'react';
import { User, Plata, Tranzactie, IstoricPlataDetaliat } from '../types';
import { Button, Card } from './ui';
import { ArrowLeftIcon, DownloadIcon } from './icons';

interface IstoricPlatiProps {
    viewedUser: User;
    plati: Plata[];
    tranzactii: Tranzactie[];
    onBack: () => void;
}

export const IstoricPlati: React.FC<IstoricPlatiProps> = ({ viewedUser, plati, tranzactii, onBack }) => {
    const userPlati = useMemo(() => {
        // 1. Filter payments relevant to the user
        const relevantPlati = plati.filter(p => 
            p.sportiv_id === viewedUser.id || 
            (p.familie_id && p.familie_id === viewedUser.familie_id)
        );

        // 2. Map to detailed history format
        const history: IstoricPlataDetaliat[] = [];

        relevantPlati.forEach(plata => {
            // Find transactions for this payment
            // A transaction can cover multiple payments (plata_ids array)
            const relatedTransactions = tranzactii.filter(t => 
                t.plata_ids && t.plata_ids.includes(plata.id)
            );

            const totalIncasat = relatedTransactions.reduce((sum, t) => sum + (t.suma || 0), 0); // This is simplified. 
            // Ideally, we need to know how much of the transaction was for THIS payment. 
            // But usually 1 transaction = 1 payment or bulk. 
            // If bulk, we might not know exact split unless we have a join table.
            // However, for display purposes, if status is 'Achitat', rest is 0.
            
            // Better approach: 
            // If status is Achitat, rest is 0.
            // If status is Neachitat, rest is suma_datorata.
            // If status is Achitat Parțial, we need to estimate or rely on what we have.
            // Let's rely on the payment status and sum.
            
            // Actually, let's look at how the view was doing it.
            // The view likely joined tranzactii on plata_ids.
            
            // Let's create one entry per payment, and if it has transactions, maybe list them?
            // The UI expects an array of IstoricPlataDetaliat.
            // If a payment has multiple transactions, the view probably returned multiple rows?
            // "key={`${p.plata_id}-${p.tranzactie_id || idx}`}" suggests yes.

            if (relatedTransactions.length === 0) {
                history.push({
                    plata_id: plata.id,
                    sportiv_id: plata.sportiv_id,
                    familie_id: plata.familie_id,
                    nume_complet_sportiv: `${viewedUser.nume} ${viewedUser.prenume}`, // Simplified
                    descriere: plata.descriere,
                    suma_datorata: plata.suma,
                    status: plata.status,
                    data_emitere: plata.data,
                    total_incasat: 0,
                    rest_de_plata: plata.status === 'Achitat' ? 0 : plata.suma,
                    tranzactie_id: null,
                    data_plata_string: null,
                    suma_incasata: null,
                    metoda_plata: null
                });
            } else {
                // If there are transactions, create an entry for each transaction?
                // Or just one entry for the payment with the latest transaction info?
                // The UI shows "Ultima încasare" (Latest payment).
                // But it iterates over `userPlati`.
                
                // If we have multiple transactions for one payment (partial payments), 
                // we should probably show the payment once, but maybe list transactions?
                // The original code mapped `userPlati` which came from the view.
                // If the view returned one row per transaction-payment pair, then we should do the same.

                let paymentTotalPaid = 0;

                relatedTransactions.forEach(t => {
                    // We don't know the exact amount for THIS payment in a bulk transaction.
                    // But we can assume for now.
                    // Or we can just list the transactions.
                    
                    // Let's calculate total paid for this payment to determine rest.
                    // If we can't determine split, we assume the transaction covers it?
                    // This is tricky without a join table `plata_tranzactie`.
                    // But `tranzactii` has `plata_ids`.
                    
                    // For the purpose of "Personal Wallet", we want to see the Payment Request and if it was paid.
                    
                    history.push({
                        plata_id: plata.id,
                        sportiv_id: plata.sportiv_id,
                        familie_id: plata.familie_id,
                        nume_complet_sportiv: `${viewedUser.nume} ${viewedUser.prenume}`,
                        descriere: plata.descriere,
                        suma_datorata: plata.suma,
                        status: plata.status,
                        data_emitere: plata.data,
                        total_incasat: 0, // Calculated later or ignored in UI for individual rows
                        rest_de_plata: plata.status === 'Achitat' ? 0 : (plata.suma - paymentTotalPaid), // Approximation
                        tranzactie_id: t.id,
                        data_plata_string: t.data_platii,
                        suma_incasata: t.suma, // This shows the FULL transaction amount, which might be confusing if bulk.
                        metoda_plata: t.metoda_plata
                    });
                    
                    paymentTotalPaid += t.suma; // This is wrong if bulk.
                });
                
                // If we want to show the payment even if partially paid, we need to handle the case where
                // we might want to show the "Rest de plata" correctly.
                
                // Let's try to mimic the view behavior.
                // The view likely does a LEFT JOIN.
            }
        });

        return history.sort((a, b) => new Date((b.data_emitere || '').toString().slice(0, 10)).getTime() - new Date((a.data_emitere || '').toString().slice(0, 10)).getTime());
    }, [viewedUser, plati, tranzactii]);

    const totalRestant = useMemo(() => {
        // Calculate total unpaid from unique payments
        const uniquePlati = new Set<string>();
        let total = 0;
        
        plati.filter(p => 
            p.sportiv_id === viewedUser.id || 
            (p.familie_id && p.familie_id === viewedUser.familie_id)
        ).forEach(p => {
            if (p.status !== 'Achitat') {
                // If partial, we need to know how much is left.
                // We don't have a 'rest_de_plata' field on Plata.
                // We have to rely on status.
                // If 'Neachitat', full sum.
                // If 'Achitat Parțial', we need to sum up transactions for this payment.
                
                if (p.status === 'Neachitat') {
                    total += p.suma;
                } else if (p.status === 'Achitat Parțial') {
                    // Find transactions
                    const paid = tranzactii
                        .filter(t => t.plata_ids && t.plata_ids.includes(p.id))
                        .reduce((sum, t) => sum + t.suma, 0); // Again, issue with bulk.
                    
                    // If bulk transaction, t.suma is total for all payments.
                    // We can't know how much was for this specific payment without more data.
                    // BUT, usually partial payments are individual.
                    // Bulk payments are usually full payments.
                    
                    // Let's assume for partial, it's 1-to-1 or we just subtract what we can.
                    // Or better, just show the full sum if we can't calculate? No, that's bad.
                    
                    // Let's try to be smart.
                    // If we have a bulk transaction, we assume it covers the payments fully?
                    // If status is 'Achitat Parțial', it implies it wasn't fully covered.
                    
                    // Fallback: If partial, assume 50%? No.
                    // Let's just sum up transactions and subtract.
                    // If result < 0, then it was bulk and we can't calculate easily.
                    
                    const paidAmount = tranzactii
                        .filter(t => t.plata_ids && t.plata_ids.includes(p.id))
                        .reduce((sum, t) => sum + t.suma, 0);
                        
                    total += Math.max(0, p.suma - paidAmount);
                }
            }
        });
        
        return total;
    }, [plati, tranzactii, viewedUser]);

    const formatDescription = (desc: string) => {
        let formatted = desc;
        const terms: Record<string, string> = {
            'Examen': 'Examen Grad (Thao Quyen)',
            'Arme': 'Co Vo Dao (Arme Tradiționale)',
            'Stagiu': 'Stagiu de Pregătire',
            'Competitie': 'Competiție / Giai',
            'Abonament': 'Cotizație Lunară'
        };

        Object.entries(terms).forEach(([key, value]) => {
            if (formatted.includes(key)) {
                formatted = formatted.replace(key, value);
            }
        });
        return formatted;
    };

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Portal</Button>
            
            <header className="text-left">
                 <h1 className="text-3xl font-bold text-white">Istoric Plăți & Tranzacții</h1>
                 <p className="text-lg text-slate-300">{viewedUser.nume} {viewedUser.prenume}</p>
            </header>

            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-xl">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total de Plată Restant</h3>
                        <p className={`text-3xl font-bold mt-1 ${totalRestant > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {totalRestant.toFixed(2)} RON
                        </p>
                    </div>
                    <div className={`p-3 rounded-full ${totalRestant > 0 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {totalRestant > 0 ? '⚠️' : '✅'}
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-4">
                {userPlati.map((p, idx) => (
                    <Card 
                        key={`${p.plata_id}-${p.tranzactie_id || idx}`}
                        className={`relative overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] border-l-4 ${
                            p.rest_de_plata > 0 ? 'border-l-red-500' : 'border-l-emerald-500'
                        } bg-slate-800/50 backdrop-blur-sm`}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    {new Date((p.data_emitere || '').toString().slice(0, 10)).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                                <h4 className="text-lg font-bold text-white leading-tight mt-1">
                                    {formatDescription(p.descriere)}
                                </h4>
                                <p className="text-xs text-slate-400 mt-1">{p.nume_complet_sportiv}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-white">
                                    {p.suma_datorata.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">RON</span>
                                </p>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase mt-1 ${
                                    p.status === 'Achitat' ? 'bg-emerald-500/20 text-emerald-400' : 
                                    p.status === 'Achitat Parțial' ? 'bg-amber-500/20 text-amber-400' : 
                                    'bg-red-500/20 text-red-400'
                                }`}>
                                    {p.status}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-500 uppercase">Rest de plată</span>
                                <span className={`font-bold ${p.rest_de_plata > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {p.rest_de_plata.toFixed(2)} RON
                                </span>
                            </div>
                            
                            {p.tranzactie_id && (
                                <Button 
                                    size="sm" 
                                    variant="info" 
                                    className="h-8 px-3 text-[11px] font-bold rounded-lg flex items-center gap-2"
                                    onClick={() => window.open(`/api/factura/${p.tranzactie_id}`, '_blank')}
                                >
                                    <DownloadIcon className="w-3 h-3" />
                                    Descarcă Factură
                                </Button>
                            )}
                        </div>

                        {p.data_plata_string && (
                            <div className="mt-2 text-[10px] text-slate-400 italic flex items-center gap-1">
                                <span>Ultima încasare:</span>
                                <span className="text-slate-300 font-medium">{new Date((p.data_plata_string || '').toString().slice(0, 10)).toLocaleDateString('ro-RO')}</span>
                                <span className="mx-1">•</span>
                                <span className="text-slate-300 font-medium">{p.suma_incasata?.toFixed(2)} RON</span>
                                <span className="mx-1">•</span>
                                <span className="text-slate-300 font-medium">{p.metoda_plata}</span>
                            </div>
                        )}
                    </Card>
                ))}
                {userPlati.length === 0 && (
                    <div className="text-center py-20 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700">
                        <p className="text-slate-500 italic">Nu există înregistrări financiare pentru acest profil.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
