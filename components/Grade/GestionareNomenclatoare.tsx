import React, { useState } from 'react';
import { TipPlata, Plata } from '../../types';
import { Button, Input, Card } from '../ui';
import { PlusIcon, TrashIcon, ArrowLeftIcon } from '../icons';
import { useError } from '../ErrorProvider';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { useNomenclatoare } from '../../hooks/useNomenclatoare';

interface GestionareNomenclatoareProps {
    tipuriPlati: TipPlata[];
    setTipuriPlati: React.Dispatch<React.SetStateAction<TipPlata[]>>;
    plati: Plata[];
    onBack: () => void;
}

export const GestionareNomenclatoare: React.FC<GestionareNomenclatoareProps> = ({ tipuriPlati, setTipuriPlati, plati, onBack }) => {
    const [newNume, setNewNume] = useState('');
    const [toDelete, setToDelete] = useState<TipPlata | null>(null);
    const { showError } = useError();
    const { addTipPlata, deleteTipPlata, loading } = useNomenclatoare();

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const trimmedName = newNume.trim();
        if (!trimmedName) { showError("Validare EÈ™uatÄƒ", "Numele este obligatoriu."); return; }

        if (tipuriPlati.some(tp => tp.nume.toLowerCase() === trimmedName.toLowerCase())) {
            showError("Conflict", "Un tip de platÄƒ cu acest nume existÄƒ deja.");
            return;
        }

        const newTipPlata: Omit<TipPlata, 'id'> = { nume: trimmedName, is_system_type: false };
        
        const data = await addTipPlata(newTipPlata);

        if (data) {
            setTipuriPlati(prev => [...prev, data]);
            setNewNume('');
        }
    };

    const confirmDelete = async (tipPlata: TipPlata) => {
        if (tipPlata.is_system_type) {
            showError("È˜tergere BlocatÄƒ", "Acesta este un tip de platÄƒ de sistem È™i nu poate fi È™ters.");
            setToDelete(null);
            return;
        }

        const isUsed = plati.some(p => p.tip.toLowerCase() === tipPlata.nume.toLowerCase());
        if (isUsed) {
            showError("È˜tergere BlocatÄƒ", `Tipul "${tipPlata.nume}" este utilizat Ã®n facturi existente È™i nu poate fi È™ters.`);
            setToDelete(null);
            return;
        }

        const success = await deleteTipPlata(tipPlata.id);
        if (success) {
            setTipuriPlati(prev => prev.filter(tp => tp.id !== tipPlata.id));
        }
        setToDelete(null);
    };
    
    return (
        <div className="max-w-3xl mx-auto space-y-6">
             <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> ÃŽnapoi la Meniu</Button>
            <h1 className="text-3xl font-bold text-white">Gestiune Nomenclatoare</h1>

            <Card className="border-l-4 border-brand-secondary">
                 <h3 className="text-xl font-bold text-white mb-4">AdaugÄƒ Tip de PlatÄƒ Nou</h3>
                 <form onSubmit={handleAdd} className="flex items-end gap-3">
                    <div className="flex-grow">
                        <Input label="Nume" name="nume" value={newNume} onChange={e => setNewNume(e.target.value)} placeholder="ex: CotizaÈ›ie, Penalizare" required/>
                    </div>
                    <Button type="submit" variant="info" isLoading={loading}><PlusIcon className="w-5 h-5 mr-2"/> AdaugÄƒ</Button>
                 </form>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="p-4 bg-slate-700/50 font-bold text-white">ListÄƒ Tipuri de PlÄƒÈ›i</div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-700/30 text-slate-400 text-xs uppercase">
                            <tr>
                                <th className="p-3">Nume</th>
                                <th className="p-3 text-center">Tip Sistem</th>
                                <th className="p-3 text-right">AcÈ›iuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {tipuriPlati.sort((a,b) => a.nume.localeCompare(b.nume)).map(tp => (
                                <tr key={tp.id}>
                                    <td className="p-3 font-semibold">{tp.nume}</td>
                                    <td className="p-3 text-center">
                                        {tp.is_system_type && <span className="px-2 py-0.5 text-[10px] rounded-full font-bold bg-sky-600/30 text-sky-400">DA</span>}
                                    </td>
                                    <td className="p-3 text-right">
                                        <Button size="sm" variant="danger" onClick={() => setToDelete(tp)} disabled={tp.is_system_type}>
                                            <TrashIcon className="w-4 h-4"/>
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </Card>

            <ConfirmDeleteModal 
                isOpen={!!toDelete} 
                onClose={() => setToDelete(null)} 
                onConfirm={() => { if(toDelete) confirmDelete(toDelete) }} 
                tableName={`Tipul de PlatÄƒ "${toDelete?.nume}"`} 
                isLoading={loading} 
            />
        </div>
    );
};
