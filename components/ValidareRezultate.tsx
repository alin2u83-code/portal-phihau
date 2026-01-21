import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Plata } from '../types';
import { Button, Card, Select } from './ui';
import { ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface ParticipantValidare {
    inscriere_id: string;
    sportiv_id: string;
    numeComplet: string;
    gradSustinut: string;
    gradAnteriorId: string | null;
    gradSustinutId: string;
    media: number | null;
    rezultatCurent: 'Admis' | 'Respins' | 'Neprezentat' | null;
    taxaAchitata: boolean;
}

interface ValidareRezultateProps {
    sesiune: SesiuneExamen;
    inscrieriSesiune: InscriereExamen[];
    sportivi: Sportiv[];
    grade: Grad[];
    plati: Plata[];
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    onBack: () => void;
}

export const ValidareRezultate: React.FC<ValidareRezultateProps> = ({ sesiune, inscrieriSesiune, sportivi, grade, plati, setInscrieri, setSportivi, onBack }) => {
    const { showError, showSuccess } = useError();
    const [participants, setParticipants] = useState<ParticipantValidare[]>([]);
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const enhancedParticipants = inscrieriSesiune.map(inscriere => {
            const sportiv = sportivi.find(s => s.id === inscriere.sportiv_id);
            const grad = grade.find(g => g.id === inscriere.grad_vizat_id);
            const taxa = plati.find(p => 
                p.sportiv_id === inscriere.sportiv_id &&
                p.tip === 'Taxa Examen' &&
                p.data === sesiune.data &&
                p.descriere.includes(grad?.nume || '---')
            );

            return {
                inscriere_id: inscriere.id,
                sportiv_id: inscriere.sportiv_id,
                numeComplet: sportiv ? `${sportiv.nume} ${sportiv.prenume}` : 'N/A',
                gradSustinut: grad?.nume || 'N/A',
                gradAnteriorId: inscriere.grad_actual_id,
                gradSustinutId: inscriere.grad_vizat_id,
                media: inscriere.media_generala,
                rezultatCurent: inscriere.rezultat,
                taxaAchitata: taxa?.status === 'Achitat',
            };
        }).sort((a,b) => a.numeComplet.localeCompare(b.numeComplet));
        setParticipants(enhancedParticipants);
    }, [inscrieriSesiune, sportivi, grade, plati, sesiune.data]);

    const handleStatusChange = useCallback(async (inscriere_id: string, newStatus: 'Admis' | 'Respins' | 'Neprezentat' | null) => {
        setLoadingStates(prev => ({...prev, [inscriere_id]: true}));
        
        const participant = participants.find(p => p.inscriere_id === inscriere_id);
        if(!participant) {
            showError("Eroare", "Participantul nu a fost găsit.");
            setLoadingStates(prev => ({...prev, [inscriere_id]: false}));
            return;
        }

        const oldStatus = participant.rezultatCurent;
        
        // Optimistic UI update
        setParticipants(prev => prev.map(p => p.inscriere_id === inscriere_id ? {...p, rezultatCurent: newStatus} : p));
        
        try {
            // 1. Update 'inscrieri_examene' table
            const { error: updateInscriereError } = await supabase.from('inscrieri_examene').update({ rezultat: newStatus }).eq('id', inscriere_id);
            if(updateInscriereError) throw updateInscriereError;

            // 2. Handle Promotion/Demotion logic
            const wasAdmis = oldStatus === 'Admis';
            const isAdmis = newStatus === 'Admis';

            if(isAdmis && !wasAdmis) { // Promote
                const { error: sportivError } = await supabase.from('sportivi').update({ grad_actual_id: participant.gradSustinutId }).eq('id', participant.sportiv_id);
                if(sportivError) throw sportivError;
                const { error: istoricError } = await supabase.from('istoric_grade').insert({ sportiv_id: participant.sportiv_id, grad_id: participant.gradSustinutId, data_obtinere: sesiune.data, sesiune_examen_id: sesiune.id });
                if(istoricError) throw istoricError;
            } else if (wasAdmis && !isAdmis) { // Revert promotion
                const { error: sportivError } = await supabase.from('sportivi').update({ grad_actual_id: participant.gradAnteriorId }).eq('id', participant.sportiv_id);
                if(sportivError) throw sportivError;
                const { error: istoricError } = await supabase.from('istoric_grade').delete().match({ sportiv_id: participant.sportiv_id, sesiune_examen_id: sesiune.id });
                if(istoricError) throw istoricError;
            }

            // 3. Update global state on success
            setInscrieri(prev => prev.map(i => i.id === inscriere_id ? {...i, rezultat: newStatus} : i));
            if (isAdmis || wasAdmis) {
                const newGradId = isAdmis ? participant.gradSustinutId : participant.gradAnteriorId;
                setSportivi(prev => prev.map(s => s.id === participant.sportiv_id ? {...s, grad_actual_id: newGradId} : s));
            }
            showSuccess("Succes", `Statusul pentru ${participant.numeComplet} a fost actualizat.`);

        } catch (err: any) {
            // Revert optimistic update on error
            setParticipants(prev => prev.map(p => p.inscriere_id === inscriere_id ? {...p, rezultatCurent: oldStatus} : p));
            showError("Eroare la Salvare", err);
        } finally {
            setLoadingStates(prev => ({...prev, [inscriere_id]: false}));
        }
    }, [participants, supabase, showError, showSuccess, setInscrieri, setSportivi, sesiune.data, sesiune.id]);
    
    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-4"><ArrowLeftIcon /> Înapoi la detalii</Button>
            <Card>
                 <h2 className="text-2xl font-bold text-white mb-1">Validare Rezultate Examen</h2>
                 <p className="text-slate-400 mb-4">Sesiunea din {new Date(sesiune.data + 'T00:00:00').toLocaleDateString('ro-RO')}</p>

                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="p-2 font-semibold">Nume Sportiv</th>
                                <th className="p-2 font-semibold">Grad Susținut</th>
                                <th className="p-2 font-semibold text-center">Media</th>
                                <th className="p-2 font-semibold text-center">Taxa Achitată</th>
                                <th className="p-2 font-semibold">Status Final</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-slate-700">
                             {participants.map(p => {
                                 const rowClass = p.rezultatCurent === 'Admis' ? 'bg-green-900/40' : p.rezultatCurent === 'Respins' ? 'bg-red-900/40' : '';
                                 const isLoading = loadingStates[p.inscriere_id];
                                 return (
                                     <tr key={p.inscriere_id} className={`${rowClass} hover:bg-slate-700/50`}>
                                        <td className="p-2 font-medium">{p.numeComplet}</td>
                                        <td className="p-2 text-slate-300">{p.gradSustinut}</td>
                                        <td className={`p-2 text-center font-bold ${ (p.media || 0) >= 5 ? 'text-green-400' : 'text-red-400'}`}>
                                            {p.media?.toFixed(2) ?? 'N/A'}
                                        </td>
                                        <td className="p-2 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.taxaAchitata ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'}`}>
                                                {p.taxaAchitata ? 'Achitată' : 'Neachitată'}
                                            </span>
                                        </td>
                                        <td className="p-2 w-48">
                                            <Select label="" value={p.rezultatCurent ?? 'Neprezentat'}
                                                onChange={e => handleStatusChange(p.inscriere_id, e.target.value as any)}
                                                disabled={!p.taxaAchitata || isLoading}
                                                className={isLoading ? 'animate-pulse' : ''}
                                            >
                                                <option value="Neprezentat">Așteptare</option>
                                                <option value="Admis">Admis</option>
                                                <option value="Respins">Respins</option>
                                            </Select>
                                        </td>
                                     </tr>
                                 );
                             })}
                         </tbody>
                    </table>
                 </div>
            </Card>
        </div>
    );
};
