import React, { useState } from 'react';
import { Reducere } from '../types';
import { Button, Input, Card, Select } from './ui';
import { PlusIcon, TrashIcon, ArrowLeftIcon, EditIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface ReduceriManagementProps {
    reduceri: Reducere[];
    setReduceri: React.Dispatch<React.SetStateAction<Reducere[]>>;
    onBack: () => void;
}

const initialFormState: Omit<Reducere, 'id'> = {
    nume: '',
    tip: 'procent',
    valoare: 0,
    este_activa: true,
    categorie_aplicabila: 'Toate'
};

export const ReduceriManagement: React.FC<ReduceriManagementProps> = ({ reduceri, setReduceri, onBack }) => {
    const [formState, setFormState] = useState(initialFormState);
    const [editingReducere, setEditingReducere] = useState<Reducere | null>(null);
    const [toDelete, setToDelete] = useState<Reducere | null>(null);
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError, showSuccess } = useError();
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
             const { checked } = e.target as HTMLInputElement;
             setFormState(p => ({ ...p, [name]: checked }));
        } else {
             setFormState(p => ({ ...p, [name]: (name === 'valoare' ? parseFloat(value) || 0 : value) }));
        }
    };
    
    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) { showError("Eroare Configurare", "Client Supabase neinițializat."); return; }
        if (!formState.nume.trim()) { showError("Validare Eșuată", "Numele este obligatoriu."); return; }
        
        setLoading(true);
        const { data, error } = await supabase.from('reduceri').insert(formState).select().single();
        setLoading(false);
        
        if(error) { showError("Eroare la adăugare", error); }
        else if (data) {
            setReduceri(prev => [...prev, data as Reducere]);
            setFormState(initialFormState);
            showSuccess("Succes", "Reducerea a fost adăugată.");
        }
    };
    
     const handleSaveEdit = async () => {
        if (!editingReducere || !supabase) return;
        setLoading(true);
        const { id, ...updates } = editingReducere;
        try {
            const { data, error } = await supabase.from('reduceri').update(updates).eq('id', id).select().single();
            if (error) throw error;
            if (data) {
                setReduceri(p => p.map(r => r.id === id ? data as Reducere : r));
                setEditingReducere(null);
                showSuccess("Succes", "Modificările au fost salvate.");
            }
        } catch (err) {
            showError("Eroare la salvare", err);
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async (id: string) => {
        if(!supabase) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('reduceri').delete().eq('id', id);
            if (error) throw error;
            setReduceri(prev => prev.filter(r => r.id !== id));
            showSuccess('Succes', 'Reducerea a fost ștearsă.');
        } catch (err: any) {
            showError('Eroare la ștergere', err);
        } finally {
            setIsDeleting(false);
            setToDelete(null);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
             <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <h1 className="text-3xl font-bold text-white">Management Reduceri</h1>

            <Card className="border-l-4 border-brand-secondary">
                 <h3 className="text-xl font-bold text-white mb-4">Adaugă Reducere Nouă</h3>
                 <form onSubmit={handleAdd} className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Nume Reducere" name="nume" value={formState.nume} onChange={handleChange} placeholder="ex: Reducere Familie" required/>
                        <Select label="Tip Reducere" name="tip" value={formState.tip} onChange={handleChange}>
                            <option value="procent">Procent (%)</option>
                            <option value="suma_fixa">Sumă Fixă (RON)</option>
                        </Select>
                        <Input label="Valoare" type="number" name="valoare" value={formState.valoare} onChange={handleChange} required/>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                         <Select label="Se aplică la" name="categorie_aplicabila" value={formState.categorie_aplicabila} onChange={handleChange}>
                            <option value="Toate">Toate</option>
                            <option value="Abonament">Abonament</option>
                            <option value="Echipament">Echipament</option>
                        </Select>
                        <label className="flex items-center space-x-2 pt-5 cursor-pointer"><input type="checkbox" name="este_activa" checked={formState.este_activa} onChange={handleChange} className="h-4 w-4 rounded" /><span>Activă</span></label>
                        <Button type="submit" variant="info" isLoading={loading}><PlusIcon className="w-5 h-5 mr-2"/> Adaugă</Button>
                     </div>
                 </form>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="p-4 bg-slate-700/50 font-bold text-white">Listă Reduceri Active</div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[700px] text-sm">
                        <thead className="bg-slate-700/30 text-slate-400 text-xs uppercase"><tr><th className="p-3">Nume</th><th className="p-3">Valoare</th><th className="p-3">Categorie</th><th className="p-3 text-center">Status</th><th className="p-3 text-right">Acțiuni</th></tr></thead>
                        <tbody className="divide-y divide-slate-700">
                            {reduceri.map(r => (
                                <tr key={r.id}>
                                    <td className="p-3 font-semibold">{r.nume}</td>
                                    <td className="p-3 font-bold text-brand-secondary">{r.tip === 'procent' ? `${r.valoare}%` : `${r.valoare.toFixed(2)} RON`}</td>
                                    <td className="p-3">{r.categorie_aplicabila}</td>
                                    <td className="p-3 text-center"><span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${r.este_activa ? 'bg-green-600/30 text-green-400' : 'bg-slate-600/30 text-slate-400'}`}>{r.este_activa ? 'Activă' : 'Inactivă'}</span></td>
                                    <td className="p-3 text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={() => alert('Funcționalitate în dezvoltare.')}><EditIcon className="w-4 h-4"/></Button><Button size="sm" variant="danger" onClick={() => setToDelete(r)}><TrashIcon className="w-4 h-4"/></Button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </Card>

            <ConfirmDeleteModal isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => { if(toDelete) confirmDelete(toDelete.id) }} tableName="Reducere" isLoading={isDeleting} />
        </div>
    );
};