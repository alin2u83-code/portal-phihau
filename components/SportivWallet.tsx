import React, { useState, useMemo } from 'react';
import { Sportiv, Familie, Plata, Tranzactie } from '../types';
import { Modal, Button, Input, Select, Card } from './ui';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { PlusIcon, WalletIcon } from './icons';

interface SportivWalletProps {
    sportiv: Sportiv;
    familie: Familie | undefined;
    allPlati: Plata[];
    allTranzactii: Tranzactie[];
    setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
    onClose: () => void;
}

export const SportivWallet: React.FC<SportivWalletProps> = ({ sportiv, familie, allPlati, allTranzactii, setTranzactii, onClose }) => {
    const { showError, showSuccess } = useError();
    const [loading, setLoading] = useState(false);
    const [formState, setFormState] = useState({
        suma: '',
        data_platii: new Date().toISOString().split('T')[0],
        metoda_plata: 'Cash' as 'Cash' | 'Transfer Bancar',
        observatii: ''
    });

    const isFamilyWallet = !!sportiv.familie_id && !!familie;

    const { sold, history } = useMemo(() => {
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
            date: p.data,
            amount: -p.suma,
            description: p.descriere,
            type: 'debit' as const
        }));

        const tranzactiiHistory = relevantTranzactii.map(t => ({
            date: t.data_platii,
            amount: t.suma,
            description: t.descriere || `Încasare ${t.metoda_plata}`,
            type: 'credit' as const
        }));

        const combinedHistory = [...platiHistory, ...tranzactiiHistory].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        return { sold: currentSold, history: combinedHistory };

    }, [sportiv, isFamilyWallet, allPlati, allTranzactii]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormState(prev => ({...prev, [e.target.name]: e.target.value }));
    };

    const handlePlataRapida = async (e: React.FormEvent) => {
        e.preventDefault();
        const sumaNum = parseFloat(formState.suma);
        if (isNaN(sumaNum) || sumaNum <= 0) {
            showError("Sumă Invalidă", "Vă rugăm introduceți o sumă validă.");
            return;
        }
        setLoading(true);

        const newTranzactie: Omit<Tranzactie, 'id'> = {
            plata_ids: [],
            sportiv_id: isFamilyWallet ? null : sportiv.id,
            familie_id: sportiv.familie_id,
            suma: sumaNum,
            data_platii: formState.data_platii,
            metoda_plata: formState.metoda_plata,
            descriere: formState.observatii || 'Plată rapidă (avans)'
        };
        
        const { data, error } = await supabase.from('tranzactii').insert(newTranzactie).select().single();
        setLoading(false);
        if (error) {
            showError("Eroare la Salvare", error);
        } else if (data) {
            setTranzactii(prev => [...prev, data as Tranzactie]);
            showSuccess("Succes", "Plata a fost înregistrată cu succes.");
            setFormState({ suma: '', data_platii: new Date().toISOString().split('T')[0], metoda_plata: 'Cash', observatii: '' });
        }
    };
    
    const title = isFamilyWallet ? `Portofel Familie: ${familie?.nume}` : `Portofel Sportiv: ${sportiv.nume} ${sportiv.prenume}`;

    return (
        <Modal isOpen={true} onClose={onClose} title={title}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{fontSize: '13px'}}>
                {/* Left side: Balance and Quick Pay */}
                <div className="md:col-span-1 space-y-4">
                    <Card className="text-center bg-brand-primary/20">
                        <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider">Sold Curent</h3>
                        <p className={`text-4xl font-bold mt-2 ${sold >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                           {sold >= 0 ? '+' : ''}{sold.toFixed(2)}
                           <span className="text-xl ml-1">lei</span>
                        </p>
                        <p className={`text-xs font-semibold ${sold >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {sold >= 0 ? 'Avans / Credit' : 'Datorie / Restanță'}
                        </p>
                    </Card>
                    <form onSubmit={handlePlataRapida} className="space-y-3">
                        <h4 className="font-bold text-center text-white">Plată Rapidă</h4>
                        <Input label="Suma Primită (lei)" name="suma" type="number" step="0.01" value={formState.suma} onChange={handleChange} required/>
                        <Input label="Data Plății" name="data_platii" type="date" value={formState.data_platii} onChange={handleChange} required/>
                        <Select label="Metoda" name="metoda_plata" value={formState.metoda_plata} onChange={handleChange}>
                            <option>Cash</option>
                            <option>Transfer Bancar</option>
                        </Select>
                        <Input label="Observații (opțional)" name="observatii" value={formState.observatii} onChange={handleChange} placeholder="Ex: Avans"/>
                        <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
                            <PlusIcon className="w-5 h-5 mr-1"/> Înregistrează Plata
                        </Button>
                    </form>
                </div>

                {/* Right side: History */}
                <div className="md:col-span-2">
                     <h3 className="text-lg font-bold text-white mb-2 text-center">Extras de Cont</h3>
                     <div className="bg-slate-900/50 border border-slate-700 rounded-lg max-h-96 overflow-y-auto" style={{fontSize: '12px'}}>
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-slate-700/80 backdrop-blur-sm">
                                <tr>
                                    <th className="p-2 font-semibold">Data</th>
                                    <th className="p-2 font-semibold">Descriere</th>
                                    <th className="p-2 font-semibold text-right">Sumă (lei)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {history.map((item, index) => (
                                    <tr key={index} className="hover:bg-white/5">
                                        <td className="p-2 text-slate-400">{new Date(item.date).toLocaleDateString('ro-RO')}</td>
                                        <td className="p-2">{item.description}</td>
                                        <td className={`p-2 text-right font-bold ${item.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                                            {item.type === 'credit' ? '+' : ''}{item.amount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr><td colSpan={3} className="p-8 text-center text-slate-500 italic">Niciun istoric financiar.</td></tr>
                                )}
                            </tbody>
                             <tfoot className="sticky bottom-0 bg-slate-700/80 backdrop-blur-sm">
                                <tr className="font-bold text-white">
                                    <td colSpan={2} className="p-2 text-right">Sold Final:</td>
                                    <td className={`p-2 text-right ${sold >= 0 ? 'text-green-400' : 'text-red-400'}`}>{sold.toFixed(2)} lei</td>
                                </tr>
                             </tfoot>
                        </table>
                     </div>
                </div>
            </div>
        </Modal>
    );
};