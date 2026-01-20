import React, { useState } from 'react';
import { TipPlata, Plata } from '../types';
import { Button, Input, Card } from './ui';
import { PlusIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface GestionareNomenclatoareProps {
    tipuriPlati: TipPlata[];
    setTipuriPlati: React.Dispatch<React.SetStateAction<TipPlata[]>>;
    plati: Plata[];
    onBack: () => void;
}

export const GestionareNomenclatoare: React.FC<GestionareNomenclatoareProps> = ({ tipuriPlati, setTipuriPlati, plati, onBack }) => {
    const [newNume, setNewNume] = useState('');
    const [loading, setLoading] = useState(false);
    const [toDelete, setToDelete] = useState<TipPlata | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError, showSuccess } = useError();

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) { showError("Eroare Configurare", "Client Supabase neinițializat."); return; }
        
        const trimmedName = newNume.trim();
        if (!trimmedName) { showError("Validare Eșuată", "Numele este obligatoriu."); return; }

        if (tipuriPlati.some(tp => tp.nume.toLowerCase() === trimmedName.toLowerCase())) {
            showError("Conflict", "Un tip de plată cu acest nume există deja.");
            return;
        }

        const newTipPlata: Omit<TipPlata, 'id'> = { nume: trimmedName, is_system_type: false };
        
        setLoading(true);
        const { data, error: insertError } = await supabase.from('tipuri_plati').insert(newTipPlata).select().single();
        setLoading(false);

        if(insertError) { showError("Eroare la adăugare", insertError); }
        else if (data) {
            setTipuriPlati(prev => [...prev, data as TipPlata]);
            setNewNume('');
            showSuccess("Succes", "Noul tip de plată a fost adăugat.");
        }
    };

    const confirmDelete = async (tipPlata: TipPlata) => {
        if(!supabase) return;
        
        if (tipPlata.is_system_type) {
            showError("Ștergere Blocată", "Acesta este un tip de plată de sistem și nu poate fi șters.");
            setToDelete(null);
            return;
        }

        const isUsed = plati.some(p => p.tip.toLowerCase() === tipPlata.nume.toLowerCase());
        if (isUsed) {
            showError("Ștergere Blocată", `Tipul "${tipPlata.nume}" este utilizat în facturi existente și nu poate fi șters.`);
            setToDelete(null);
            return;
        }

        setIsDeleting(true);
        try {
            const { error } = await supabase.from('tipuri_plati').delete().eq('id', tipPlata.id);
            if (error) throw error;
            setTipuriPlati(prev => prev.filter(tp => tp.id !== tipPlata.id));
            showSuccess('Succes', 'Tipul de plată a fost șters.');
        } catch (err: any) {
            showError('Eroare la ștergere', err);
        } finally {
            setIsDeleting(false);
            setToDelete(null);
        }
    };
    
    return (
        <div className="max-w-3xl mx-auto space-y-6">
             <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <h1 className="text-3xl font-bold text-white">Gestiune Nomenclatoare</h1>

            <Card className="border-l-4 border-brand-secondary">
                 <h3 className="text-xl font-bold text-white mb-4">Adaugă Tip de Plată Nou</h3>
                 <form onSubmit={handleAdd} className="flex items-end gap-3">
                    <div className="flex-grow">
                        <Input label="Nume" name="nume" value={newNume} onChange={e => setNewNume(e.target.value)} placeholder="ex: Cotizație, Penalizare" required/>
                    </div>
                    <Button type="submit" variant="info" isLoading={loading}><PlusIcon className="w-5 h-5 mr-2"/> Adaugă</Button>
                 </form>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="p-4 bg-slate-700/50 font-bold text-white">Listă Tipuri de Plăți</div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-700/30 text-slate-400 text-xs uppercase">
                            <tr>
                                <th className="p-3">Nume</th>
                                <th className="p-3 text-center">Tip Sistem</th>
                                <th className="p-3 text-right">Acțiuni</th>
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
                tableName={`Tipul de Plată "${toDelete?.nume}"`} 
                isLoading={isDeleting} 
            />
        </div>
    );
};