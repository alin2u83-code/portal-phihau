import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { InscriereExamen, Sportiv, SesiuneExamen } from '../types';
import { Button } from './ui';
import { useError } from './ErrorProvider';
import { Check, X } from 'lucide-react';

interface ExamenPhiHauSimpluProps {
    sesiune: SesiuneExamen;
    inscrieriInitiale: InscriereExamen[];
    setInscrieriSesiune: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
    setSportiviGlobal: React.Dispatch<React.SetStateAction<Sportiv[]>>;
}

export const ExamenPhiHauSimplu: React.FC<ExamenPhiHauSimpluProps> = ({ sesiune, inscrieriInitiale, setInscrieriSesiune, setSportiviGlobal }) => {
    const [participanti, setParticipanti] = useState<InscriereExamen[]>([]);
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);
    const { showError, showSuccess } = useError();

    useEffect(() => {
        const sorted = [...inscrieriInitiale].sort((a, b) => (b.grades?.ordine ?? 0) - (a.grades?.ordine ?? 0));
        setParticipanti(sorted);
        if (sorted.length === 0) {
            setError('EROARE: NU SUNT DATE');
        } else {
            setError(null);
        }
    }, [inscrieriInitiale]);

    const handleToggleResult = useCallback(async (inscriere: InscriereExamen, toggledResult: 'Admis' | 'Respins') => {
        const sportivNume = inscriere.sportiv_nume || (inscriere.sportivi?.nume + ' ' + inscriere.sportivi?.prenume) || 'Necunoscut';
        console.log(`[PHI HAU DEBUG] Click event declanșat pentru: ${sportivNume}, Decizie: ${toggledResult}`);
        if (!supabase) {
            showError("Eroare Configurare", "Client Supabase neinițializat.");
            return;
        }

        const oldResult = inscriere.rezultat || 'Neprezentat';
        const newResult: 'Admis' | 'Respins' | 'Neprezentat' = oldResult === toggledResult ? 'Neprezentat' : toggledResult;

        setLoadingStates(prev => ({ ...prev, [inscriere.id]: true }));

        try {
            const promises = [];
            let sportivGradUpdate: string | null | undefined = undefined;
            
            promises.push(supabase.from('inscrieri_examene').update({ rezultat: newResult }).eq('id', inscriere.id));

            if (newResult === 'Admis') {
                promises.push(supabase.from('sportivi').update({ grad_actual_id: inscriere.grad_sustinut_id }).eq('id', inscriere.sportiv_id));
                sportivGradUpdate = inscriere.grad_sustinut_id;
            } else if (oldResult === 'Admis') {
                promises.push(supabase.from('sportivi').update({ grad_actual_id: inscriere.grad_actual_id }).eq('id', inscriere.sportiv_id));
                sportivGradUpdate = inscriere.grad_actual_id;
            }

            const results = await Promise.all(promises);
            const anyError = results.find(res => res.error);
            if (anyError) throw anyError.error;

            const updatedInscrieri = participanti.map(p => p.id === inscriere.id ? { ...p, rezultat: newResult } : p);
            setParticipanti(updatedInscrieri);
            setInscrieriSesiune(prev => prev.map(p => p.id === inscriere.id ? { ...p, rezultat: newResult } : p));
            
            if (sportivGradUpdate !== undefined) {
                setSportiviGlobal(prev => prev.map(s => s.id === inscriere.sportiv_id ? { ...s, grad_actual_id: sportivGradUpdate } : s));
            }
            
            showSuccess("Succes", `Gradul a fost actualizat și arhivat în istoric.`);
        } catch (err: any) {
            setError(err.message);
            showError("Eroare la Salvare", err.message);
        } finally {
            setLoadingStates(prev => ({ ...prev, [inscriere.id]: false }));
        }
    }, [participanti, sesiune.id, sesiune.data, sesiune.data_examen, setInscrieriSesiune, setSportiviGlobal, showError, showSuccess]);

    if (error) {
        return <div className="p-10 text-center font-bold text-red-500 bg-red-900/20 rounded-lg">{error}</div>
    }

    return (
        <div className="overflow-hidden">
            <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-slate-700/50 border-b border-slate-600">
                    <tr>
                        <th className="p-4 font-bold">Sportiv</th>
                        <th className="p-4 font-bold">Grad Vizat</th>
                        <th className="p-4 font-bold text-center">Alegere Manuală</th>
                    </tr>
                </thead>
                <tbody>
                    {participanti.map((item) => {
                        const isLoading = loadingStates[item.id];
                        return (
                            <tr key={item.id} className="border-b border-slate-700 hover:bg-brand-secondary/10 transition-colors">
                                <td className="p-4 font-medium">{item.sportiv_nume || (item.sportivi?.nume + ' ' + item.sportivi?.prenume) || 'Necunoscut'}</td>
                                <td className="p-4 text-brand-secondary font-bold">{item.grad_sustinut || item.grades?.nume || 'Necunoscut'}</td>
                                <td className="p-4">
                                    <div className="flex justify-center gap-3">
                                        <Button
                                            onClick={() => handleToggleResult(item, 'Admis')}
                                            variant={item.rezultat === 'Admis' ? 'success' : 'secondary'}
                                            className="flex-1"
                                            isLoading={isLoading}
                                            disabled={isLoading}
                                        >
                                            <Check size={18} className="mr-2"/> ADMIS
                                        </Button>
                                        <Button
                                            onClick={() => handleToggleResult(item, 'Respins')}
                                            variant={item.rezultat === 'Respins' ? 'danger' : 'secondary'}
                                            className="flex-1"
                                            isLoading={isLoading}
                                            disabled={isLoading}
                                        >
                                            <X size={18} className="mr-2"/> RESPINS
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};