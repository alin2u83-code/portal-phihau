import React, { useState } from 'react';
import { Familie, Sportiv, TipAbonament } from '../types';
import { Button, Input, Card, Select } from './ui';
import { PlusIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface FamiliiManagementProps {
    familii: Familie[];
    setFamilii: React.Dispatch<React.SetStateAction<Familie[]>>;
    sportivi: Sportiv[];
    onBack?: () => void;
    isEmbedded?: boolean;
    tipuriAbonament: TipAbonament[];
}

export const FamiliiManagement: React.FC<FamiliiManagementProps> = ({ familii, setFamilii, sportivi, onBack, isEmbedded = false, tipuriAbonament }) => {
    const [newNume, setNewNume] = useState('');
    const [loading, setLoading] = useState(false);
    const [toDelete, setToDelete] = useState<Familie | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError, showSuccess } = useError();

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            showError("Eroare Configurare", "Conexiunea la baza de date nu a putut fi stabilită.");
            return;
        }
        const trimmedName = newNume.trim();
        if (!trimmedName) {
            showError("Validare Eșuată", "Numele familiei este obligatoriu.");
            return;
        }

        const isDuplicate = familii.some(f => f.nume.toLowerCase() === trimmedName.toLowerCase());
        if (isDuplicate) {
            showError("Conflict", "O familie cu acest nume există deja.");
            return;
        }
        
        setLoading(true);
        const { data, error } = await supabase.from('familii').insert({ nume: trimmedName }).select().single();
        setLoading(false);

        if (error) {
            showError("Eroare la adăugare", error);
        } else if (data) {
            setFamilii(prev => [...prev, data as Familie]);
            setNewNume('');
            showSuccess('Succes', 'Familia a fost adăugată cu succes.');
        }
    };

    const handleEdit = async (id: string, updates: Partial<Familie>) => {
        if (!supabase) {
            showError("Eroare Configurare", "Conexiunea la baza de date nu a putut fi stabilită.");
            return;
        }

        const finalUpdates = { ...updates };

        if (finalUpdates.nume !== undefined) {
            const trimmedName = finalUpdates.nume.trim();
            if (!trimmedName) {
                showError("Validare Eșuată", "Numele familiei nu poate fi gol.");
                setFamilii(prev => [...prev]); // Re-render to reset input
                return;
            }

            const isDuplicate = familii.some(f => f.id !== id && f.nume.toLowerCase() === trimmedName.toLowerCase());
            if (isDuplicate) {
                showError("Conflict", "O familie cu acest nume există deja.");
                setFamilii(prev => [...prev]); // Re-render to reset input
                return;
            }
            finalUpdates.nume = trimmedName;
        }

        const { error } = await supabase.from('familii').update(finalUpdates).eq('id', id);

        if (error) {
            showError("Eroare la salvare", error);
        } else {
            setFamilii(prev => prev.map(f => (f.id === id ? { ...f, ...finalUpdates } : f)));
        }
    };

    const confirmDelete = async (id: string) => {
        if (!supabase) return;

        const membri = sportivi.filter(s => s.familie_id === id);
        if (membri.length > 0) {
            showError("Ștergere Blocată", `Nu puteți șterge familia "${familii.find(f => f.id === id)?.nume}" deoarece conține ${membri.length} membri. Vă rugăm să reasignați sau să eliminați membrii mai întâi.`);
            setToDelete(null);
            return;
        }
        
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('familii').delete().eq('id', id);
            if (error) throw error;
            setFamilii(prev => prev.filter(f => f.id !== id));
            showSuccess('Succes', 'Familia a fost ștearsă.');
        } catch (err: any) {
             showError("Eroare la ștergere", err);
        } finally {
            setIsDeleting(false);
            setToDelete(null);
        }
    };

    return (
        <div>
            {!isEmbedded && onBack && <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>}
            
            {!isEmbedded && (
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white">Management Familii</h1>
                </div>
            )}

            <Card className="mb-6">
                <h3 className="text-xl font-bold text-white mb-4">Adaugă Familie Nouă</h3>
                <form onSubmit={handleAdd}>
                    <div className="grid grid-cols-1">
                        <Input label="Nume Familie" value={newNume} onChange={e => setNewNume(e.target.value)} placeholder="Ex: Popescu" required/>
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button type="submit" variant="info" isLoading={loading}>
                            <PlusIcon className="w-5 h-5 mr-2"/> Adaugă
                        </Button>
                    </div>
                </form>
            </Card>

            <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-700">
                        <tr>
                            <th className="p-4 font-semibold">Nume Familie</th>
                            <th className="p-4 font-semibold">Tip Abonament</th>
                            <th className="p-4 font-semibold text-right">Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {familii.map(f => (
                            <tr key={f.id} className="border-b border-slate-700">
                                <td className="p-2">
                                    <Input label="" defaultValue={f.nume} onBlur={e => handleEdit(f.id, { nume: e.target.value })} />
                                </td>
                                <td className="p-2 w-72">
                                    <Select
                                        label=""
                                        value={f.tip_abonament_id || ''}
                                        onChange={(e) => {
                                            const newId = e.target.value || null;
                                            handleEdit(f.id, { tip_abonament_id: newId });
                                        }}
                                    >
                                        <option value="">Automat (după nr. membri)</option>
                                        {tipuriAbonament.filter(t => t.numar_membri > 1).map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.denumire} ({t.numar_membri} membri) - {t.pret} RON
                                            </option>
                                        ))}
                                    </Select>
                                </td>
                                <td className="p-2 text-right w-32">
                                    <Button onClick={() => setToDelete(f)} variant="danger" size="sm"><TrashIcon /></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {familii.length === 0 && <p className="p-4 text-center text-slate-400">Nicio familie definită.</p>}
            </div>
            <ConfirmDeleteModal isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => { if(toDelete) confirmDelete(toDelete.id) }} tableName="Familii" isLoading={isDeleting} />
        </div>
    );
};