import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Plata } from '../types';
import { Button, Card, Select } from './ui';
import { ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface FinalizareSimplaExamenProps {
    sesiune: SesiuneExamen;
    inscrieriSesiune: InscriereExamen[];
    sportivi: Sportiv[];
    grade: Grad[];
    plati: Plata[];
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    onBack: () => void;
}

export const FinalizareSimplaExamen: React.FC<FinalizareSimplaExamenProps> = ({ sesiune, inscrieriSesiune, sportivi, grade, plati, setInscrieri, setSportivi, onBack }) => {
    const { showError, showSuccess } = useError();
    const [rezultateLocale, setRezultateLocale] = useState<Record<string, 'Admis' | 'Respins' | 'Neprezentat'>>({});
    const [loading, setLoading] = useState(false);

    const initialRezultate = useMemo(() => {
        const initial: Record<string, 'Admis' | 'Respins' | 'Neprezentat'> = {};
        inscrieriSesiune.forEach(i => {
            initial[i.id] = i.rezultat || 'Neprezentat';
        });
        return initial;
    }, [inscrieriSesiune]);

    useEffect(() => {
        setRezultateLocale(initialRezultate);
    }, [initialRezultate]);

    const sortedParticipants = useMemo(() => {
        return [...inscrieriSesiune]
            .sort((a, b) => (b.grade?.ordine ?? 0) - (a.grade?.ordine ?? 0));
    }, [inscrieriSesiune]);

    const handleResultChange = (inscriereId: string, newResult: 'Admis' | 'Respins' | 'Neprezentat') => {
        setRezultateLocale(prev => ({ ...prev, [inscriereId]: newResult }));
    };

    const handleSaveAll = async () => {
        if (!supabase) {
            showError("Eroare de configurare", "Clientul Supabase nu este inițializat.");
            return;
        }
        setLoading(true);
        const changes = Object.entries(rezultateLocale)
            .filter(([id, rezultat]) => rezultat !== initialRezultate[id]);

        if (changes.length === 0) {
            showSuccess("Info", "Nicio modificare de salvat.");
            setLoading(false);
            return;
        }

        const allPromises: Promise<any>[] = [];
        const sportiviUpdatesLocal: Partial<Sportiv>[] = [];

        for (const [id, rezultat] of changes) {
            const inscriere = inscrieriSesiune.find(i => i.id === id);
            if (!inscriere) continue;

            // 1. Update inscrieri_examene (pentru toate statusurile)
            allPromises.push(
                supabase.from('inscrieri_examene').update({ rezultat }).eq('id', id)
            );

            // 2. Dacă este 'Admis', pregătește datele pentru promovare
            if (rezultat === 'Admis') {
                allPromises.push(
                    supabase.from('sportivi').update({ grad_actual_id: inscriere.grad_vizat_id }).eq('id', inscriere.sportiv_id)
                );
                allPromises.push(
                    supabase.from('istoric_grade').insert({
                        sportiv_id: inscriere.sportiv_id,
                        grad_id: inscriere.grad_vizat_id,
                        data_obtinere: sesiune.data,
                        sesiune_examen_id: sesiune.id
                    })
                );
                sportiviUpdatesLocal.push({ id: inscriere.sportiv_id, grad_actual_id: inscriere.grad_vizat_id });
            }
        }

        try {
            // FIX: Removed incorrect spread operator. Promise.all expects an array of promises, which `allPromises` already is.
            const results = await Promise.all(allPromises);

            const anyError = results.find(res => res.error);
            if (anyError) throw anyError.error;

            // Actualizează starea locală la succes
            setInscrieri(prev => prev.map(i => {
                const change = changes.find(([id]) => id === i.id);
                return change ? { ...i, rezultat: change[1] as any } : i;
            }));

            setSportivi(prev => {
                const updatedSportiviMap = new Map(prev.map(s => [s.id, s]));
                sportiviUpdatesLocal.forEach(update => {
                    const existing = updatedSportiviMap.get(update.id!);
                    if (existing) {
                        updatedSportiviMap.set(update.id!, { ...existing, ...update });
                    }
                });
                return Array.from(updatedSportiviMap.values());
            });

            showSuccess("Succes", `${changes.length} rezultate au fost salvate cu succes!`);
            onBack();

        } catch (err: any) {
            showError("Eroare la Salvare", `Una sau mai multe operațiuni au eșuat. Detalii: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold text-white text-center">Finalizare Simplă Examen</h1>
                <Button onClick={handleSaveAll} variant="success" isLoading={loading}>Salvează Toate Rezultatele</Button>
            </div>
            
            <Card>
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-white">Rezultate Examen</h1>
                    <p className="text-slate-400">Sesiunea din {new Date(sesiune.data + 'T00:00:00').toLocaleDateString('ro-RO')}</p>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[700px]">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="p-3 font-semibold">Nume Sportiv</th>
                                <th className="p-3 font-semibold">Grad Vizat</th>
                                <th className="p-3 font-semibold w-56">Rezultat</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {sortedParticipants.map(p => {
                                const rezultat = rezultateLocale[p.id] || 'Neprezentat';
                                let statusColorClass = '';
                                if (rezultat === 'Admis') statusColorClass = 'bg-green-900/40 text-green-300';
                                else if (rezultat === 'Respins') statusColorClass = 'bg-red-900/40 text-red-300';
                                
                                return (
                                <tr key={p.id} className={`hover:bg-slate-700/50`}>
                                    <td className="p-2 font-medium">{p.sportivi?.nume} {p.sportivi?.prenume}</td>
                                    <td className="p-2 text-slate-300">{p.grade?.nume}</td>
                                    <td className="p-2">
                                        <Select 
                                            label="" 
                                            value={rezultat}
                                            onChange={(e) => handleResultChange(p.id, e.target.value as any)}
                                            className={`!py-1 ${statusColorClass}`}
                                        >
                                            <option value="Neprezentat">În așteptare</option>
                                            <option value="Admis">Admis</option>
                                            <option value="Respins">Respins</option>
                                        </Select>
                                    </td>
                                </tr>
                            )})}
                            {sortedParticipants.length === 0 && (
                                <tr><td colSpan={3} className="p-8 text-center text-slate-500 italic">Niciun sportiv înscris la această sesiune.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};