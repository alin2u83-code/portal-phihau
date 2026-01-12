import React, { useState, useMemo } from 'react';
import { Sportiv, Grupa, TipAbonament, Familie, Rol, Plata, Tranzactie } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SportivFormModal } from './Sportivi';

// --- Componenta Management Principală ---
export const SportiviManagement: React.FC<{
    onBack: () => void;
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    grupe: Grupa[];
    setGrupe: React.Dispatch<React.SetStateAction<Grupa[]>>;
    tipuriAbonament: TipAbonament[];
    familii: Familie[];
    setFamilii: React.Dispatch<React.SetStateAction<Familie[]>>;
    allRoles: Rol[];
    plati: Plata[];
    tranzactii: Tranzactie[];
    setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
    onViewSportiv: (sportiv: Sportiv) => void;
}> = ({ onBack, sportivi, setSportivi, grupe, setGrupe, tipuriAbonament, familii, setFamilii, allRoles, plati, tranzactii, setTranzactii, onViewSportiv }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sportivToEdit, setSportivToEdit] = useState<Sportiv | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { showError } = useError();


    const familyBalances = useMemo(() => {
        const balances = new Map<string, number>();
        if (!familii || !plati || !tranzactii) return balances;
        familii.forEach(f => balances.set(f.id, 0));
        tranzactii.forEach(t => { if (t.familie_id) balances.set(t.familie_id, (balances.get(t.familie_id) || 0) + t.suma); });
        plati.forEach(p => { if (p.familie_id) balances.set(p.familie_id, (balances.get(p.familie_id) || 0) - p.suma); });
        return balances;
    }, [familii, plati, tranzactii]);

    const filteredSportivi = useMemo(() => {
        return sportivi.filter((s: Sportiv) => 
            `${s.nume} ${s.prenume}`.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a: Sportiv, b: Sportiv) => a.nume.localeCompare(b.nume));
    }, [sportivi, searchTerm]);

    const handleSave = async (formData: Partial<Sportiv>) => {
        const { roluri, ...sportivData } = formData;
        try {
            if (sportivToEdit) {
                const { data, error } = await supabase.from('sportivi').update(sportivData).eq('id', sportivToEdit.id).select().single();
                if (error) throw error;
                setSportivi(prev => prev.map(s => s.id === sportivToEdit.id ? { ...s, ...data } : s));
            } else {
                const { data, error } = await supabase.from('sportivi').insert(sportivData).select().single();
                if (error) throw error;
                setSportivi(prev => [...prev, { ...data, roluri: [] }]);
            }
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary" className="mb-2"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            
            <div className="flex justify-between items-center gap-4">
                <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Management Sportivi</h1>
                <Button variant="primary" onClick={() => { setSportivToEdit(null); setIsModalOpen(true); }}>
                    <PlusIcon className="w-5 h-5 mr-1"/> Adaugă Sportiv
                </Button>
            </div>

            <Card className="flex flex-col sm:flex-row gap-4">
                <Input label="Caută Sportiv" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Nume sau prenume..." />
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="p-3 font-bold uppercase text-[10px]">Nume Prenume</th>
                                <th className="p-3 font-bold uppercase text-[10px]">Grupă</th>
                                <th className="p-3 font-bold uppercase text-[10px]">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredSportivi.map((s: Sportiv) => {
                                const familie = s.familie_id ? familii.find(f => f.id === s.familie_id) : null;
                                const familieBalance = s.familie_id ? familyBalances.get(s.familie_id) : undefined;
                                
                                return (
                                <tr key={s.id} className="hover:bg-brand-secondary/10 transition-colors">
                                    <td className="p-3 font-semibold cursor-pointer" onClick={() => onViewSportiv(s)}>
                                        <div className="hover:text-brand-secondary">{s.nume} {s.prenume}</div>
                                        {familie && familieBalance !== undefined && (
                                            <div className="text-xs font-normal text-slate-400" style={{fontSize: '13px'}}>
                                                Familia {familie.nume}
                                                <span className={`ml-2 font-bold ${familieBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    Sold: {familieBalance >= 0 ? '+' : ''}{familieBalance.toFixed(2)} lei
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3 text-slate-400 text-xs">{grupe.find((g: any) => g.id === s.grupa_id)?.denumire || '-'}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'Activ' ? 'bg-green-600/20 text-green-400 border border-green-600/50' : 'bg-red-600/20 text-red-400 border border-red-600/50'}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredSportivi.length === 0 && <p className="p-8 text-center text-slate-500 italic">Niciun sportiv găsit.</p>}
                </div>
            </Card>

            {isModalOpen && (
                 <SportivFormModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    sportivToEdit={sportivToEdit}
                    grupe={grupe}
                    setGrupe={setGrupe}
                    familii={familii}
                    setFamilii={setFamilii}
                    tipuriAbonament={tipuriAbonament}
                />
            )}
        </div>
    );
};