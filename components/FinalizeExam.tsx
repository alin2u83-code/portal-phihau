import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Plata } from '../types';
import { Button, Card } from './ui';
import { ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface ParticipantFinalizare {
    inscriere_id: string;
    sportiv_id: string;
    numeComplet: string;
    gradSustinut: string;
    gradSustinutId: string;
    gradOrdine: number;
    rezultatCurent: 'Admis' | 'Respins' | 'Neprezentat' | null;
    taxaAchitata: boolean;
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
    const [participants, setParticipants] = useState<ParticipantFinalizare[]>([]);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    useEffect(() => {
        const enhancedParticipants = inscrieriSesiune.map(inscriere => {
            const sportiv = inscriere.sportivi;
            const grad = inscriere.grade;
            const taxa = plati.find(p => p.sportiv_id === inscriere.sportiv_id && p.tip === 'Taxa Examen' && p.data === sesiune.data);

            return {
                inscriere_id: inscriere.id,
                sportiv_id: inscriere.sportiv_id,
                numeComplet: sportiv ? `${sportiv.nume} ${sportiv.prenume}` : 'N/A',
                gradSustinut: grad?.nume || 'N/A',
                gradSustinutId: inscriere.grad_vizat_id,
                gradOrdine: grad?.ordine || 999,
                rezultatCurent: inscriere.rezultat,
                taxaAchitata: taxa?.status === 'Achitat',
            };
        });
        setParticipants(enhancedParticipants);
    }, [inscrieriSesiune, sportivi, grade, plati, sesiune.data]);

    const sortedParticipants = useMemo(() => {
        return [...participants].sort((a, b) => b.gradOrdine - a.gradOrdine);
    }, [participants]);

    const promoveazaSportiv = useCallback(async (participant: ParticipantFinalizare) => {
        setLoadingId(participant.inscriere_id);
        try {
            await supabase.from('inscrieri_examene').update({ rezultat: 'Admis' }).eq('id', participant.inscriere_id).throwOnError();
            await supabase.from('sportivi').update({ grad_actual_id: participant.gradSustinutId }).eq('id', participant.sportiv_id).throwOnError();
            await supabase.from('istoric_grade').insert({
                sportiv_id: participant.sportiv_id,
                grad_id: participant.gradSustinutId,
                data_obtinere: sesiune.data,
                sesiune_examen_id: sesiune.id
            }).throwOnError();

            setParticipants(prev => prev.map(p => p.inscriere_id === participant.inscriere_id ? { ...p, rezultatCurent: 'Admis' } : p));
            setInscrieri(prev => prev.map(i => i.id === participant.inscriere_id ? { ...i, rezultat: 'Admis', media_generala: null } : i));
            setSportivi(prev => prev.map(s => s.id === participant.sportiv_id ? { ...s, grad_actual_id: participant.gradSustinutId } : s));
            
            showSuccess("Succes", `${participant.numeComplet} a fost promovat.`);
        } catch (err: any) {
            showError(`Eroare la promovarea lui ${participant.numeComplet}`, err.message);
        } finally {
            setLoadingId(null);
        }
    }, [sesiune.id, sesiune.data, setInscrieri, setSportivi, showError, showSuccess]);

    const respingeSportiv = useCallback(async (participant: ParticipantFinalizare) => {
        setLoadingId(participant.inscriere_id);
        try {
            await supabase.from('inscrieri_examene').update({ rezultat: 'Respins' }).eq('id', participant.inscriere_id).throwOnError();
            
            setParticipants(prev => prev.map(p => p.inscriere_id === participant.inscriere_id ? { ...p, rezultatCurent: 'Respins' } : p));
            setInscrieri(prev => prev.map(i => i.id === participant.inscriere_id ? { ...i, rezultat: 'Respins', media_generala: null } : i));

            showSuccess("Info", `${participant.numeComplet} a fost marcat ca respins.`);
        } catch (err: any) {
            showError(`Eroare la respingerea lui ${participant.numeComplet}`, err.message);
        } finally {
            setLoadingId(null);
        }
    }, [setInscrieri, showError, showSuccess]);

    return (
        <div>
            <style>{`@media print { body { background-color: white !important; font-size: 10pt; } body * { visibility: hidden; } #printable-exam-report, #printable-exam-report * { visibility: visible; } #printable-exam-report { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; color: black; } .no-print { display: none !important; } #printable-exam-report .print-logo { display: block !important; } #printable-exam-report .printable-title, #printable-exam-report .printable-subtitle { color: black !important; } #printable-exam-report .card-print-override { background-color: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; } #printable-exam-report .printable-table { color: black; width: 100%; border-collapse: collapse; } .printable-table th, .printable-table td { border: 1px solid #ccc; padding: 6px; text-align: left; } .printable-table th { background-color: #eee !important; color: black !important; } .printable-table .status-indicator span { border: 1px solid #ccc; } }`}</style>
            
            <div className="flex justify-between items-center mb-6 no-print">
                <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2"/> Înapoi</Button>
                <h1 className="text-xl font-bold text-white text-center">Finalizare Examen</h1>
                <Button onClick={() => window.print()} variant="secondary">Descarcă Tabel</Button>
            </div>
            
            <div id="printable-exam-report">
                <div className="text-center mb-6">
                    <img src="/logo-phi-hau.png" alt="Logo Club Phi Hau" className="h-20 w-auto print-logo hidden mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-white printable-title">Rezultate Examen</h1>
                    <p className="text-slate-400 printable-subtitle">Sesiunea din {new Date(sesiune.data + 'T00:00:00').toLocaleDateString('ro-RO')}</p>
                </div>
                
                <Card className="card-print-override">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm printable-table min-w-[800px]">
                            <thead className="bg-slate-700/50">
                                <tr>
                                    <th className="p-3 font-semibold">Nume Sportiv</th>
                                    <th className="p-3 font-semibold">Grad Susținut</th>
                                    <th className="p-3 font-semibold text-center">Taxa</th>
                                    <th className="p-3 font-semibold text-center">Rezultat / Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {sortedParticipants.map(p => {
                                    const rowClass = p.rezultatCurent === 'Admis' ? 'bg-green-900/40' : p.rezultatCurent === 'Respins' ? 'bg-red-900/40' : '';
                                    return (
                                        <tr key={p.inscriere_id} className={`${rowClass} hover:bg-slate-700/50`}>
                                            <td className="p-3 font-medium">{p.numeComplet}</td>
                                            <td className="p-3 text-slate-300">{p.gradSustinut}</td>
                                            <td className="p-3 text-center status-indicator">
                                                <div className="flex justify-center items-center">
                                                    <span className={`h-3 w-3 rounded-full ${p.taxaAchitata ? 'bg-green-500' : 'bg-red-500'}`} title={p.taxaAchitata ? 'Taxa achitată' : 'Taxa neachitată'}></span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                {p.rezultatCurent === 'Admis' || p.rezultatCurent === 'Respins' ? (
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                                                        p.rezultatCurent === 'Admis' ? 'bg-green-600/20 text-green-400 border-green-600/50' : 
                                                        'bg-red-900/40 text-red-400 border-red-900/50'}`
                                                    }>
                                                        {p.rezultatCurent}
                                                    </span>
                                                ) : (
                                                    <div className="flex justify-center gap-2">
                                                        <Button 
                                                            size="sm" 
                                                            variant="success"
                                                            onClick={() => promoveazaSportiv(p)}
                                                            isLoading={loadingId === p.inscriere_id}
                                                            disabled={loadingId !== null}
                                                        >
                                                            Admis
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="danger"
                                                            onClick={() => respingeSportiv(p)}
                                                            isLoading={loadingId === p.inscriere_id}
                                                            disabled={loadingId !== null}
                                                        >
                                                            Respins
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {sortedParticipants.length === 0 && (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-500 italic">Niciun sportiv înscris la această sesiune.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};