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
    const [isBulkPromoting, setIsBulkPromoting] = useState(false);

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
    }, [inscrieriSesiune, plati, sesiune.data]);

    const sortedParticipants = useMemo(() => {
        return [...participants].sort((a, b) => b.gradOrdine - a.gradOrdine);
    }, [participants]);

    const participantsToPromote = useMemo(() => {
        return sortedParticipants.filter(p => p.rezultatCurent !== 'Admis');
    }, [sortedParticipants]);

    const promoveazaGrup = async () => {
        if (participantsToPromote.length === 0) {
            showSuccess("Info", "Toți sportivii sunt deja promovați.");
            return;
        }

        if (!window.confirm(`Sunteți sigur că doriți să promovați ${participantsToPromote.length} sportivi? Această acțiune este ireversibilă.`)) {
            return;
        }

        setIsBulkPromoting(true);
        let successCount = 0;
        
        for (const participant of participantsToPromote) {
            try {
                await supabase.from('inscrieri_examene').update({ rezultat: 'Admis' }).eq('id', participant.inscriere_id).throwOnError();
                await supabase.from('sportivi').update({ grad_actual_id: participant.gradSustinutId }).eq('id', participant.sportiv_id).throwOnError();
                await supabase.from('istoric_grade').insert({
                    sportiv_id: participant.sportiv_id,
                    grad_id: participant.gradSustinutId,
                    data_obtinere: sesiune.data,
                    sesiune_examen_id: sesiune.id
                }).throwOnError();
                
                successCount++;
            } catch (err: any) {
                showError(`Eroare la promovarea lui ${participant.numeComplet}`, err.message);
                break; 
            }
        }
        
        if (successCount > 0) {
            const promotedInscrieriIds = new Set(participantsToPromote.slice(0, successCount).map(p => p.inscriere_id));
            const promotedSportiviMap = new Map(participantsToPromote.slice(0, successCount).map(p => [p.sportiv_id, p.gradSustinutId]));

            setParticipants(prev => prev.map(p => 
                promotedInscrieriIds.has(p.inscriere_id) ? { ...p, rezultatCurent: 'Admis' } : p
            ));
            setInscrieri(prev => prev.map(i => 
                promotedInscrieriIds.has(i.id) ? { ...i, rezultat: 'Admis', media_generala: null } : i
            ));
            setSportivi(prev => prev.map(s => 
                promotedSportiviMap.has(s.id) ? { ...s, grad_actual_id: promotedSportiviMap.get(s.id)! } : s
            ));

            showSuccess("Operațiune finalizată", `S-au actualizat ${successCount} profile de sportivi.`);
        }

        setIsBulkPromoting(false);
    };

    return (
        <div>
            <style>{`@media print { body { background-color: white !important; font-size: 10pt; } body * { visibility: hidden; } #printable-exam-report, #printable-exam-report * { visibility: visible; } #printable-exam-report { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; color: black; } .no-print { display: none !important; } #printable-exam-report .print-logo { display: block !important; } #printable-exam-report .printable-title, #printable-exam-report .printable-subtitle { color: black !important; } #printable-exam-report .card-print-override { background-color: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; } #printable-exam-report .printable-table { color: black; width: 100%; border-collapse: collapse; } .printable-table th, .printable-table td { border: 1px solid #ccc; padding: 6px; text-align: left; } .printable-table th { background-color: #eee !important; color: black !important; } .printable-table .status-indicator span { border: 1px solid #ccc; } }`}</style>
            
            <div className="flex justify-between items-center mb-6 no-print">
                <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2"/> Înapoi</Button>
                
                <Button 
                    onClick={promoveazaGrup} 
                    variant="success" 
                    className="!px-6 !py-3 !text-base"
                    isLoading={isBulkPromoting}
                    disabled={participantsToPromote.length === 0 || isBulkPromoting}
                >
                    APROBĂ TOȚI SPORTIVII ({participantsToPromote.length})
                </Button>

                <Button onClick={() => window.print()} variant="secondary">Descarcă Tabel</Button>
            </div>
            
            <div id="printable-exam-report">
                <div className="text-center mb-6">
                    <img src="/logo-phi-hau.png" alt="Logo Club Phi Hau" className="h-20 w-auto print-logo hidden mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-white printable-title">Finalizare Examen</h1>
                    <p className="text-slate-400 printable-subtitle">Sesiunea din {new Date(sesiune.data + 'T00:00:00').toLocaleDateString('ro-RO')}</p>
                </div>
                
                <Card className="card-print-override">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm printable-table min-w-[800px]">
                            <thead className="bg-slate-700/50">
                                <tr>
                                    <th className="p-3 font-semibold">Nume Sportiv</th>
                                    <th className="p-3 font-semibold">Grad Susținut</th>
                                    <th className="p-3 font-semibold text-center">Status Actual</th>
                                    <th className="p-3 font-semibold text-center">Taxa</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {sortedParticipants.map(p => {
                                    const rowClass = p.rezultatCurent === 'Admis' ? 'bg-green-900/40' : '';
                                    return (
                                        <tr key={p.inscriere_id} className={`${rowClass} hover:bg-slate-700/50`}>
                                            <td className="p-3 font-medium">{p.numeComplet}</td>
                                            <td className="p-3 text-slate-300">{p.gradSustinut}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                                                    p.rezultatCurent === 'Admis' ? 'bg-green-600/20 text-green-400 border-green-600/50' : 
                                                    p.rezultatCurent === 'Respins' ? 'bg-red-900/40 text-red-400 border-red-900/50' : 
                                                    'bg-slate-600/20 text-slate-400 border-slate-600/50'}`
                                                }>
                                                    {p.rezultatCurent || 'În așteptare'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center status-indicator">
                                                <div className="flex justify-center items-center">
                                                    <span className={`h-3 w-3 rounded-full ${p.taxaAchitata ? 'bg-green-500' : 'bg-red-500'}`} title={p.taxaAchitata ? 'Taxa achitată' : 'Taxa neachitată'}></span>
                                                </div>
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