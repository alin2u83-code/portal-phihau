import React, { useState } from 'react';
import { Familie } from '../types';
import { Button, Input, Card } from './ui';
import { PlusIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';

interface FamiliiManagementProps {
    familii: Familie[];
    setFamilii: React.Dispatch<React.SetStateAction<Familie[]>>;
    onBack: () => void;
}

export const FamiliiManagement: React.FC<FamiliiManagementProps> = ({ familii, setFamilii, onBack }) => {
    const [newNume, setNewNume] = useState('');
    const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
    const [loading, setLoading] = useState(false);

    const showFeedback = (type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 3000);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            showFeedback('error', "Eroare de configurare: Conexiunea la baza de date nu a putut fi stabilită.");
            return;
        }
        setFeedback(null);
        const trimmedName = newNume.trim();
        if (!trimmedName) {
            setFeedback({type: 'error', message: "Numele familiei este obligatoriu."});
            return;
        }

        const isDuplicate = familii.some(f => f.nume.toLowerCase() === trimmedName.toLowerCase());
        if (isDuplicate) {
            showFeedback('error', 'O familie cu acest nume există deja.');
            return;
        }
        
        setLoading(true);
        const { data, error } = await supabase.from('familii').insert({ nume: trimmedName }).select().single();
        setLoading(false);

        if (error) {
            showFeedback('error', `Eroare: ${error.message}`);
        } else if (data) {
            setFamilii(prev => [...prev, data as Familie]);
            setNewNume('');
            showFeedback('success', 'Familia a fost adăugată cu succes.');
        }
    };

    const handleEdit = async (id: string, updates: Partial<Familie>) => {
        if (!supabase) {
            showFeedback('error', "Eroare de configurare: Conexiunea la baza de date nu a putut fi stabilită.");
            return;
        }
        
        const trimmedName = updates.nume?.trim();
        if (!trimmedName) {
            showFeedback('error', 'Numele familiei nu poate fi gol.');
            setFamilii(prev => [...prev]); // Re-render to reset input
            return;
        }
    
        const originalFamilie = familii.find(f => f.id === id);
        if (originalFamilie && originalFamilie.nume.trim().toLowerCase() === trimmedName.toLowerCase()) {
            return; // No actual change, no need to save or validate
        }

        const isDuplicate = familii.some(f => f.id !== id && f.nume.toLowerCase() === trimmedName.toLowerCase());
        if (isDuplicate) {
            showFeedback('error', 'O familie cu acest nume există deja.');
            setFamilii(prev => [...prev]); // Re-render to reset input
            return;
        }

        const finalUpdates = { ...updates, nume: trimmedName };
        const { error } = await supabase.from('familii').update(finalUpdates).eq('id', id);

        if (error) {
            showFeedback('error', `Eroare la salvare: ${error.message}`);
        } else {
            setFamilii(prev => prev.map(f => f.id === id ? { ...f, ...finalUpdates } : f));
            showFeedback('success', 'Numele familiei a fost actualizat.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!supabase) {
            showFeedback('error', "Eroare de configurare: Conexiunea la baza de date nu a putut fi stabilită.");
            return;
        }
        if (window.confirm("Ești sigur? Sportivii din această familie vor trebui realocați manual.")) {
            const { error } = await supabase.from('familii').delete().eq('id', id);
            if (error) {
                showFeedback('error', `Eroare la ștergere: ${error.message}`);
            } else {
                setFamilii(prev => prev.filter(f => f.id !== id));
                showFeedback('success', 'Familia a fost ștearsă.');
            }
        }
    };

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Management Familii</h1>
            </div>

            {feedback && (
                <div className={`p-3 rounded-md mb-4 text-center font-semibold text-white ${feedback.type === 'success' ? 'bg-green-600/50' : 'bg-red-600/50'}`}>
                    {feedback.message}
                </div>
            )}

            <Card className="mb-6">
                <h3 className="text-xl font-bold text-white mb-4">Adaugă Familie Nouă</h3>
                <form onSubmit={handleAdd}>
                    <div className="grid grid-cols-1">
                        <Input label="Nume Familie" value={newNume} onChange={e => setNewNume(e.target.value)} placeholder="Ex: Popescu" required/>
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button type="submit" variant="info" disabled={loading}>
                            {loading ? 'Se adaugă...' : <><PlusIcon className="w-5 h-5 mr-2"/> Adaugă</>}
                        </Button>
                    </div>
                </form>
            </Card>

            <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-700">
                        <tr>
                            <th className="p-4 font-semibold">Nume Familie</th>
                            <th className="p-4 font-semibold text-right">Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {familii.map(f => (
                            <tr key={f.id} className="border-b border-slate-700">
                                <td className="p-2">
                                    <Input label="" defaultValue={f.nume} onBlur={e => handleEdit(f.id, { nume: e.target.value })} />
                                </td>
                                <td className="p-2 text-right">
                                    <Button onClick={() => handleDelete(f.id)} variant="danger" size="sm"><TrashIcon /></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {familii.length === 0 && <p className="p-4 text-center text-slate-400">Nicio familie definită.</p>}
            </div>
        </div>
    );
};