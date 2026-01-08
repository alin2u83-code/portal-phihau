
import React, { useState } from 'react';
import { TipAbonament } from '../types';
import { Button, Input, Card } from './ui';
import { PlusIcon, TrashIcon, ArrowLeftIcon } from './icons';

interface TipuriAbonamentManagementProps {
    tipuriAbonament: TipAbonament[];
    setTipuriAbonament: React.Dispatch<React.SetStateAction<TipAbonament[]>>;
    onBack: () => void;
}

export const TipuriAbonamentManagement: React.FC<TipuriAbonamentManagementProps> = ({ tipuriAbonament, setTipuriAbonament, onBack }) => {
    const [newDenumire, setNewDenumire] = useState('');
    const [newPret, setNewPret] = useState(0);
    const [newNrMembri, setNewNrMembri] = useState(1);

    const handleAdd = () => {
        if (!newDenumire || newPret <= 0 || newNrMembri <= 0) {
            alert("Toate câmpurile sunt obligatorii și trebuie să fie pozitive.");
            return;
        }
        const newAbonament: TipAbonament = {
            id: `ab-${new Date().toISOString()}`,
            denumire: newDenumire,
            pret: newPret,
            numar_membri: newNrMembri
        };
        setTipuriAbonament(prev => [...prev, newAbonament]);
        setNewDenumire('');
        setNewPret(0);
        setNewNrMembri(1);
    };

    const handleEdit = (id: string, field: keyof TipAbonament, value: string | number) => {
        setTipuriAbonament(prev => prev.map(ab => ab.id === id ? { ...ab, [field]: value } : ab));
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Ești sigur? Sportivii cu acest abonament vor trebui actualizați manual.")) {
            setTipuriAbonament(prev => prev.filter(ab => ab.id !== id));
        }
    };
    
    const sortedAbonamente = [...tipuriAbonament].sort((a,b) => a.numar_membri - b.numar_membri);

    return (
        <div>
             <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <h1 className="text-3xl font-bold text-white mb-6">Management Tipuri Abonament</h1>
            <Card className="mb-6">
                <h3 className="text-xl font-bold text-white mb-4">Adaugă Tip Nou</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <Input className="md:col-span-2" label="Denumire Abonament" value={newDenumire} onChange={e => setNewDenumire(e.target.value)} placeholder="Ex: Familie 2 membri"/>
                    <Input label="Preț (RON)" type="number" value={newPret} onChange={e => setNewPret(parseFloat(e.target.value) || 0)} />
                    <Input label="Nr. Membri" type="number" min="1" value={newNrMembri} onChange={e => setNewNrMembri(parseInt(e.target.value) || 1)} />
                </div>
                 <div className="flex justify-end mt-4">
                     <Button onClick={handleAdd} variant="info"><PlusIcon className="w-5 h-5 mr-2"/> Adaugă</Button>
                 </div>
            </Card>

            <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-700">
                        <tr>
                            <th className="p-4 font-semibold">Denumire</th>
                            <th className="p-4 font-semibold">Nr. Membri</th>
                            <th className="p-4 font-semibold">Preț</th>
                            <th className="p-4 font-semibold text-right">Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAbonamente.map(ab => (
                            <tr key={ab.id} className="border-b border-slate-700">
                                <td className="p-2">
                                    <Input label="" value={ab.denumire} onChange={e => handleEdit(ab.id, 'denumire', e.target.value)} />
                                </td>
                                 <td className="p-2">
                                    <Input label="" type="number" min="1" value={ab.numar_membri} onChange={e => handleEdit(ab.id, 'numar_membri', parseInt(e.target.value) || 1)} className="w-24" />
                                </td>
                                <td className="p-2">
                                    <Input label="" type="number" value={ab.pret} onChange={e => handleEdit(ab.id, 'pret', parseFloat(e.target.value) || 0)} className="w-32" />
                                </td>
                                <td className="p-2 text-right">
                                    <Button onClick={() => handleDelete(ab.id)} variant="danger" size="sm"><TrashIcon /></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {tipuriAbonament.length === 0 && <p className="p-4 text-center text-slate-400">Niciun tip de abonament definit.</p>}
            </div>
        </div>
    );
};