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
    taxaSuma: number | null;
}

interface FinalizeExamProps {
    sesiune: SesiuneExamen;
    inscrieriSesiune: InscriereExamen[];
    sportivi: Sportiv[];
    grade: Grad[];
    plati: Plata[];
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    onBack: () => void;
}

export const FinalizeExam: React.FC<FinalizeExamProps> = ({ sesiune, inscrieriSesiune, sportivi, grade, plati, setInscrieri, setSportivi, onBack }) => {
    const { showError, showSuccess } = useError();
    const [participants, setParticipants] = useState<ParticipantValidare[]>([]);
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const validInscrieri = Array.isArray(inscrieriSesiune) ? inscrieriSesiune : [];
        
        const enhancedParticipants = validInscrieri.map(inscriere => {
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
                taxaSuma: taxa?.suma ?? null,
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
        
        setParticipants(prev => prev.map(p => p.inscriere_id === inscriere_id ? {...p, rezultatCurent: newStatus} : p));
        
        try {
            const { error: updateInscriereError } = await supabase.from('inscrieri_examene').update({ rezultat: newStatus }).eq('id', inscriere_id);
            if(updateInscriereError) throw updateInscriereError;

            const wasAdmis = oldStatus === 'Admis';
            const isAdmis = newStatus === 'Admis';

            if(isAdmis && !wasAdmis) {
                const { error: sportivError } = await supabase.from('sportivi').update({ grad_actual_id: participant.gradSustinutId }).eq('id', participant.sportiv_id);
                if(sportivError) throw sportivError;
                const { error: istoricError } = await supabase.from('istoric_grade').insert({ sportiv_id: participant.sportiv_id, grad_id: participant.gradSustinutId, data_obtinere: sesiune.data, sesiune_examen_id: sesiune.id });
                if(istoricError) throw istoricError;
            } else if (wasAdmis && !isAdmis) {
                const { error: sportivError } = await supabase.from('sportivi').update({ grad_actual_id: participant.gradAnteriorId }).eq('id', participant.sportiv_id);
                if(sportivError) throw sportivError;
                const { error: istoricError } = await supabase.from('istoric_grade').delete().match({ sportiv_id: participant.sportiv_id, sesiune_examen_id: sesiune.id });
                if(istoricError) throw istoricError;
            }

            setInscrieri(prev => prev.map(i => i.id === inscriere_id ? {...i, rezultat: newStatus} : i));
            if (isAdmis || wasAdmis) {
                const newGradId = isAdmis ? participant.gradSustinutId : participant.gradAnteriorId;
                setSportivi(prev => prev.map(s => s.id === participant.sportiv_id ? {...s, grad_actual_id: newGradId} : s));
            }

            if (isAdmis && !wasAdmis) {
                showSuccess("Promovare Automată", `Gradul sportivului ${participant.numeComplet} a fost actualizat în profil!`);
            } else if (wasAdmis && !isAdmis) {
                showSuccess("Retrogradare Automată", `Promovarea pentru ${participant.numeComplet} a fost anulată.`);
            } else {
                showSuccess("Status Actualizat", `Statusul pentru ${participant.numeComplet} a fost salvat.`);
            }

        } catch (err: any) {
            setParticipants(prev => prev.map(p => p.inscriere_id === inscriere_id ? {...p, rezultatCurent: oldStatus} : p));
            if (err.message.includes('violates row-level security policy')) {
                showError("Permisiune Refuzată (RLS)", "Nu aveți permisiunile necesare pentru a modifica gradul acestui sportiv. Contactați un administrator.");
            } else {
                showError("Eroare la Salvare", err.message);
            }
        } finally {
            setLoadingStates(prev => ({...prev, [inscriere_id]: false}));
        }
    }, [participants, supabase, showError, showSuccess, setInscrieri, setSportivi, sesiune.data, sesiune.id]);
    
    return (
        <div>
             <style>{`
                @media print {
                    body { background-color: white !important; font-size: 10pt; }
                    body * { visibility: hidden; }
                    #printable-exam-report, #printable-exam-report * { visibility: visible; }
                    #printable-exam-report { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; color: black; }
                    .no-print { display: none !important; }
                    #printable-exam-report .printable-title, #printable-exam-report .printable-subtitle { color: black !important; }
                    #printable-exam-report .card-print-override { background-color: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
                    #printable-exam-report .printable-table { color: black; width: 100%; border-collapse: collapse; }
                    .printable-table th, .printable-table td { border: 1px solid #ccc; padding: 6px; text-align: left; }
                    .printable-table th { background-color: #eee !important; }
                    .printable-table .select-wrapper { display: none; }
                    .printable-table .print-only-text { display: inline-block !important; }
                    .printable-table .status-indicator span { border: 1px solid #ccc; }
                }
            `}</style>
            <div className="flex justify-between items-center mb-4 no-print">
                <Button onClick={onBack} variant="secondary"><ArrowLeftIcon /> Înapoi la detalii</Button>
                <Button onClick={() => window.print()} variant="info">Descarcă Tabel Federație</Button>
            </div>
            
            <div id="printable-exam-report">
                 <div className="flex items-center gap-4 mb-6">
                    <svg className="w-16 h-16 text-brand-secondary shrink-0" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                    <div>
                        <h1 className="text-3xl font-bold text-white printable-title">Proces Verbal de Examinare</h1>
                        <p className="text-slate-400 printable-subtitle">Clubul Phi Hau Iași - Sesiunea din {new Date(sesiune.data + 'T00:00:00').toLocaleDateString('ro-RO')}</p>
                    </div>
                </div>

                <Card className="card-print-override">
                    <h2 className="text-2xl font-bold text-white mb-4 no-print">Finalizare Interactivă Examen</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm printable-table">
                            <thead className="bg-slate-700/50">
                                <tr>
                                    <th className="p-2 font-semibold">Nume Sportiv</th>
                                    <th className="p-2 font-semibold">Grad Susținut</th>
                                    <th className="p-2 font-semibold text-center">Media</th>
                                    <th className="p-2 font-semibold">Contribuție FRQD</th>
                                    <th className="p-2 font-semibold text-center">Taxa Achitată</th>
                                    <th className="p-2 font-semibold">Status Final</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {Array.isArray(participants) && participants.map(p => {
                                    const rowClass = p.rezultatCurent === 'Admis' ? 'bg-green-900/40' : p.rezultatCurent === 'Respins' ? 'bg-red-900/40' : '';
                                    const isLoading = loadingStates[p.inscriere_id];
                                    return (
                                        <tr key={p.inscriere_id} className={`${rowClass} hover:bg-slate-700/50`}>
                                            <td className="p-2 font-medium">{p.numeComplet}</td>
                                            <td className="p-2 text-slate-300">{p.gradSustinut}</td>
                                            <td className={`p-2 text-center font-bold ${ (p.media || 0) >= 5 ? 'text-green-400' : 'text-red-400'}`}>
                                                {p.media?.toFixed(2) ?? 'N/A'}
                                            </td>
                                            <td className="p-2 text-center">{p.taxaSuma ? `${p.taxaSuma.toFixed(2)} lei` : 'N/A'}</td>
                                            <td className="p-2 text-center status-indicator">
                                                <div className="flex justify-center items-center">
                                                    <span
                                                        className={`h-3 w-3 rounded-full ${p.taxaAchitata ? 'bg-green-500' : 'bg-red-500'}`}
                                                        title={p.taxaAchitata ? 'Taxa a fost achitată' : 'Taxa este neachitată'}
                                                    ></span>
                                                </div>
                                            </td>
                                            <td className="p-2 w-48">
                                                <div className="select-wrapper">
                                                    <Select label="" value={p.rezultatCurent ?? 'Neprezentat'}
                                                        onChange={e => handleStatusChange(p.inscriere_id, e.target.value as any)}
                                                        disabled={isLoading}
                                                        className={isLoading ? 'animate-pulse' : ''}
                                                    >
                                                        <option value="Neprezentat">Așteptare</option>
                                                        <option value="Admis">Admis</option>
                                                        <option value="Respins">Respins</option>
                                                    </Select>
                                                </div>
                                                <span className="print-only-text hidden">{p.rezultatCurent || 'Așteptare'}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};
