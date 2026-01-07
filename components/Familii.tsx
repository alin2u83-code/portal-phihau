
import React, { useState } from 'react';
import { Familie } from '../types';
import { Button, Input, Card } from './ui';
import { PlusIcon, TrashIcon, ArrowLeftIcon } from './icons';

interface FamiliiManagementProps {
    familii: Familie[];
    setFamilii: React.Dispatch<React.SetStateAction<Familie[]>>;
    onBack: () => void;
}

export const FamiliiManagement: React.FC<FamiliiManagementProps> = ({ familii, setFamilii, onBack }) => {
    const [newNume, setNewNume] = useState('');

    const handleAdd = () => {
        if (!newNume.trim()) {
            alert("Numele familiei este obligatoriu.");
            return;
        }
        const newFamilie: Familie = {
            id: `fam-${new Date().toISOString()}`,
            nume: newNume.trim(),
        };
        setFamilii(prev => [...prev, newFamilie]);
        setNewNume('');
    };

    const handleEdit = (id: string, value: string) => {
        setFamilii(prev => prev.map(f => f.id === id ? { ...f, nume: value } : f));
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Ești sigur? Sportivii din această familie vor trebui realocați manual.")) {
            setFamilii(prev => prev.filter(f => f.id !== id));
        }
    };

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Management Familii</h1>
            </div>

            <Card className="mb-6">
                <h3 className="text-xl font-bold text-white mb-4">Adaugă Familie Nouă</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <Input className="md:col-span-2" label="Nume Familie" value={newNume} onChange={e => setNewNume(e.target.value)} placeholder="Ex: Popescu"/>
                    <Button onClick={handleAdd} variant="info"><PlusIcon className="w-5 h-5 mr-2"/> Adaugă</Button>
                </div>
            </Card>

            <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
                <table className="w-full text-left min-w-[400px]">
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
                                    <Input label="" value={f.nume} onChange={e => handleEdit(f.id, e.target.value)} />
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