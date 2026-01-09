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
    const [newPret, setNewPret] = useState<number | string>(0);
    const [newNrMembri, setNewNrMembri] = useState<number | string>(1);
    const [error, setError] = useState<string | null>(null);

    const handleAdd = () => {
        setError(null);
        
        const pretNum = typeof newPret === 'string' ? parseFloat(newPret) : newPret;
        const nrMembriNum = typeof newNrMembri === 'string' ? parseInt(newNrMembri) : newNrMembri;

        // Validări
        if (!newDenumire.trim()) {
            setError("Denumirea abonamentului este obligatorie.");
            return;
        }
        if (isNaN(pretNum) || pretNum <= 0) {
            setError("Prețul trebuie să fie un număr pozitiv valid.");
            return;
        }
        if (isNaN(nrMembriNum) || nrMembriNum <= 0) {
            setError("Numărul de membri trebuie să fie cel puțin 1.");
            return;
        }

        // Validare logică pentru abonamente de familie
        if (nrMembriNum > 1 && !newDenumire.toLowerCase().includes('familie')) {
            if (!window.confirm("Ați introdus mai mult de 1 membru, dar denumirea nu conține 'Familie'. Doriți să continuați?")) {
                return;
            }
        }

        const newAbonament: TipAbonament = {
            id: `ab-${new Date().getTime()}`,
            denumire: newDenumire.trim(),
            pret: pretNum,
            numar_membri: nrMembriNum
        };

        setTipuriAbonament(prev => [...prev, newAbonament]);
        
        // Resetare form
        setNewDenumire('');
        setNewPret(0);
        setNewNrMembri(1);
    };

    const handleEdit = (id: string, field: keyof TipAbonament, value: string | number) => {
        setTipuriAbonament(prev => prev.map(ab => {
            if (ab.id === id) {
                let finalValue = value;
                
                // Validări instantanee la editare
                if (field === 'pret') {
                    const num = typeof value === 'string' ? parseFloat(value) : (value as number);
                    finalValue = isNaN(num) ? 0 : num;
                }
                if (field === 'numar_membri') {
                    const num = typeof value === 'string' ? parseInt(value) : (value as number);
                    finalValue = isNaN(num) || num < 1 ? 1 : num;
                }

                return { ...ab, [field]: finalValue };
            }
            return ab;
        }));
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Sunteți sigur că doriți să ștergeți acest tip de abonament? Această acțiune poate afecta sportivii care îl au deja alocat.")) {
            setTipuriAbonament(prev => prev.filter(ab => ab.id !== id));
        }
    };
    
    const sortedAbonamente = [...tipuriAbonament].sort((a,b) => a.numar_membri - b.numar_membri);

    return (
        <div className="max-w-5xl mx-auto">
             <Button onClick={onBack} variant="secondary" className="mb-6">
                <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu
             </Button>
            
            <h1 className="text-3xl font-bold text-white mb-6">Management Tipuri Abonament</h1>
            
            <Card className="mb-8 border-l-4 border-brand-secondary">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <PlusIcon className="w-5 h-5 text-brand-secondary" /> Definește Abonament Nou
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <Input 
                            label="Denumire (ex: Individual, Familie 2)" 
                            value={newDenumire} 
                            onChange={e => setNewDenumire(e.target.value)} 
                            placeholder="Introduceți numele..."
                        />
                    </div>
                    <Input 
                        label="Preț (RON)" 
                        type="number" 
                        step="0.01"
                        value={newPret} 
                        onChange={e => setNewPret(e.target.value)} 
                    />
                    <Input 
                        label="Nr. Membri" 
                        type="number" 
                        min="1" 
                        value={newNrMembri} 
                        onChange={e => setNewNrMembri(e.target.value)} 
                    />
                </div>

                {error && (
                    <div className="mt-4 p-2 bg-red-900/30 border border-red-500/50 text-red-400 text-sm rounded flex items-center gap-2">
                        <span className="font-bold">!</span> {error}
                    </div>
                )}

                <div className="flex justify-end mt-6">
                    <Button onClick={handleAdd} variant="info" className="px-8 shadow-lg shadow-cyan-900/20">
                        <PlusIcon className="w-5 h-5 mr-2"/> Adaugă în Listă
                    </Button>
                </div>
            </Card>

            <Card className="overflow-hidden p-0">
                <div className="bg-slate-700/50 p-4 border-b border-slate-700">
                    <h3 className="font-bold text-white">Nomenclator Abonamente Active</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                        <thead className="bg-slate-700/30 text-slate-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="p-4 font-semibold">Denumire</th>
                                <th className="p-4 font-semibold text-center">Membri Alocați</th>
                                <th className="p-4 font-semibold">Tarif Lunar</th>
                                <th className="p-4 font-semibold text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {sortedAbonamente.map(ab => (
                                <tr key={ab.id} className="hover:bg-slate-700/20 transition-colors">
                                    <td className="p-3">
                                        <Input 
                                            label="" 
                                            value={ab.denumire} 
                                            onChange={e => handleEdit(ab.id, 'denumire', e.target.value)} 
                                            className="bg-transparent border-slate-700 focus:bg-slate-700"
                                        />
                                    </td>
                                     <td className="p-3">
                                        <Input 
                                            label="" 
                                            type="number" 
                                            min="1" 
                                            value={ab.numar_membri} 
                                            onChange={e => handleEdit(ab.id, 'numar_membri', e.target.value)} 
                                            className="w-24 mx-auto text-center bg-transparent border-slate-700"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                label="" 
                                                type="number" 
                                                step="0.01"
                                                value={ab.pret} 
                                                onChange={e => handleEdit(ab.id, 'pret', e.target.value)} 
                                                className="w-32 bg-transparent border-slate-700 text-brand-secondary font-bold"
                                            />
                                            <span className="text-slate-500 text-xs">RON</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-right">
                                        <Button 
                                            onClick={() => handleDelete(ab.id)} 
                                            variant="danger" 
                                            size="sm" 
                                            className="opacity-60 hover:opacity-100 transition-opacity"
                                            title="Șterge acest tip"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {tipuriAbonament.length === 0 && (
                        <div className="p-12 text-center text-slate-500 italic bg-slate-800/20">
                            Nu există tipuri de abonament definite. Folosiți formularul de mai sus pentru a începe.
                        </div>
                    )}
                </div>
            </Card>

            <div className="mt-8 bg-slate-800/40 p-4 rounded-lg border border-slate-700">
                <h4 className="text-sm font-bold text-slate-400 uppercase mb-2">Ghid de utilizare</h4>
                <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                    <li>Abonamentele <strong>Individuale</strong> trebuie să aibă Nr. Membri setat la <strong>1</strong>.</li>
                    <li>Abonamentele de <strong>Familie</strong> trebuie să aibă Nr. Membri setat la <strong>2 sau mai mult</strong>.</li>
                    <li>Sistemul de generare automată a plăților folosește aceste configurații pentru a calcula restanțele lunare.</li>
                </ul>
            </div>
        </div>
    );
};