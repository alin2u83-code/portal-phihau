import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Plata } from '../types';
import { Button, Card, Select } from './ui';
import { ArrowLeftIcon, SaveIcon, CheckCircleIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface ParticipantValidare {
    inscriere_id: string;
    sportiv_id: string;
    numeComplet: string;
    gradSustinut: string;
    gradAnteriorId: string | null;
    gradSustinutId: string;
    gradOrdine: number;
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
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [isFinalized, setIsFinalized] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ key: 'numeComplet' | 'gradOrdine' }>({ key: 'numeComplet' });

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
                gradOrdine: grad?.ordine || 999,
                media: inscriere.media_generala,
                rezultatCurent: inscriere.rezultat,
                taxaAchitata: taxa?.status === 'Achitat',
                taxaSuma: taxa?.suma ?? null,
            };
        });
        
        setParticipants(enhancedParticipants);
        setIsFinalized(true);
    }, [inscrieriSesiune, sportivi, grade, plati, sesiune.data]);

    const sortedParticipants = useMemo(() => {
        return [...participants].sort((a, b) => {
            if (sortConfig.key === 'numeComplet') {
                return a.numeComplet.localeCompare(b.numeComplet);
            }
            if (sortConfig.key === 'gradOrdine') {
                return b.gradOrdine - a.gradOrdine;
            }
            return 0;
        });
    }, [participants, sortConfig]);

    const handleLocalStatusChange = (inscriere_id: string, newStatus: 'Admis' | 'Respins' | 'Neprezentat' | null) => {
        setParticipants(prev => 
            prev.map(p => 
                p.inscriere_id === inscriere_id 
                ? {...p, rezultatCurent: newStatus} 
                : p
            )
        );
        setIsFinalized(false);
    };

    const handleFinalizeAll = async () => {
        setIsFinalizing(true);
        try {
            for (const participant of participants) {
                const originalInscriere = inscrieriSesiune.find(i => i.id === participant.inscriere_id);
                const oldStatus = originalInscriere?.rezultat;
                const newStatus = participant.rezultatCurent;

                if (oldStatus === newStatus) continue;

                await supabase.from('inscrieri_examene').update({ rezultat: newStatus }).eq('id', participant.inscriere_id).throwOnError();
                
                const wasAdmis = oldStatus === 'Admis';
                const isAdmis = newStatus === 'Admis';

                if (isAdmis && !wasAdmis) {
                    await supabase.from('sportivi').update({ grad_actual_id: participant.gradSustinutId }).eq('id', participant.sportiv_id).throwOnError();
                    await supabase.from('istoric_grade').insert({ 
                        sportiv_id: participant.sportiv_id, 
                        grad_id: participant.gradSustinutId, 
                        data_obtinere: sesiune.data,
                        sesiune_examen_id: sesiune.id 
                    }).throwOnError();
                } else if (wasAdmis && !isAdmis) {
                    await supabase.from('sportivi').update({ grad_actual_id: participant.gradAnteriorId }).eq('id', participant.sportiv_id).throwOnError();
                    await supabase.from('istoric_grade').delete().match({ sportiv_id: participant.sportiv_id, sesiune_examen_id: sesiune.id }).throwOnError();
                }
            }

            const sportivIdsToUpdate = participants.map(p => p.sportiv_id).filter((v, i, a) => a.indexOf(v) === i);
            const { data: updatedSportivi, error: sportiviError } = await supabase.from('sportivi').select('*').in('id', sportivIdsToUpdate);
            if (sportiviError) throw sportiviError;
            
            setInscrieri(prev => prev.map(i => {
                const changed = participants.find(p => p.inscriere_id === i.id);
                return changed ? { ...i, rezultat: changed.rezultatCurent } : i;
            }));
            setSportivi(prev => {
                const otherSportivi = prev.filter(s => !sportivIdsToUpdate.includes(s.id));
                return [...otherSportivi, ...updatedSportivi];
            });

            showSuccess("Finalizare cu Succes", "Toate rezultatele au fost salvate și gradele actualizate.");
            setIsFinalized(true);

        } catch (err: any) {
             if (err.message.includes('violates row-level security policy')) {
                showError("Permisiune Refuzată (RLS)", "Nu aveți permisiunile necesare pentru a modifica gradul acestui sportiv. Contactați un administrator.");
            } else {
                showError("Eroare la Finalizare", err.message);
            }
        } finally {
            setIsFinalizing(false);
        }
    };
    
    return (
        <div>
             <style>{`
                @media print {
                    body { background-color: white !important; font-size: 10pt; }
                    body * { visibility: hidden; }
                    #printable-exam-report, #printable-exam-report * { visibility: visible; }
                    #printable-exam-report { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; color: black; }
                    .no-print { display: none !important; }
                    #printable-exam-report .print-logo { display: block !important; }
                    #printable-exam-report .printable-title, #printable-exam-report .printable-subtitle { color: black !important; }
                    #printable-exam-report .card-print-override { background-color: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
                    #printable-exam-report .printable-table { color: black; width: 100%; border-collapse: collapse; }
                    .printable-table th, .printable-table td { border: 1px solid #ccc; padding: 6px; text-align: left; }
                    .printable-table th { background-color: #eee !important; color: black !important; }
                    .printable-table .select-wrapper { display: none; }
                    .printable-table .print-only-text { display: inline-block !important; }
                    .printable-table .status-indicator span { border: 1px solid #ccc; }
                }
            `}</style>
            <div className="flex justify-between items-center mb-4 no-print">
                <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2"/> Înapoi la detalii</Button>
                {isFinalized ? (
                    <div className="flex items-center gap-2 px-4 py-2 text-green-400 bg-green-900/50 rounded-md">
                        <CheckCircleIcon className="w-5 h-5" />
                        <span>Salvat!</span>
                    </div>
                ) : (
                    <Button onClick={handleFinalizeAll} variant="success" isLoading={isFinalizing}>
                        <SaveIcon className="w-5 h-5 mr-2"/>
                        SALVEAZĂ & ACTUALIZEAZĂ GRADELE
                    </Button>
                )}
                <Button onClick={() => window.print()} variant="info">Descarcă Tabel Federație</Button>
            </div>
            
            <div id="printable-exam-report">
                <div className="flex justify-between items-center mb-6">
                    <img src="/logo-phi-hau.png" alt="Logo Club Phi Hau" className="h-20 w-auto print-logo hidden" />
                    <div className="text-right flex-grow">
                        <h1 className="text-3xl font-bold text-white printable-title">Tabelul Examenelor Locale</h1>
                        <p className="text-slate-400 printable-subtitle">Clubul Phi Hau Iași - Sesiunea din {new Date(sesiune.data + 'T00:00:00').toLocaleDateString('ro-RO')}</p>
                    </div>
                </div>

                <Card className="card-print-override">
                    <div className="flex justify-between items-center mb-4 no-print">
                        <h2 className="text-2xl font-bold text-white">Finalizare Interactivă Examen</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400">Sortează după:</span>
                            <Button size="sm" onClick={() => setSortConfig({ key: 'numeComplet' })} variant={sortConfig.key === 'numeComplet' ? 'info' : 'secondary'}>Nume (A-Z)</Button>
                            <Button size="sm" onClick={() => setSortConfig({ key: 'gradOrdine' })} variant={sortConfig.key === 'gradOrdine' ? 'info' : 'secondary'}>Grad (Desc.)</Button>
                        </div>
                    </div>
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
                                {sortedParticipants.map(p => {
                                    const rowClass = p.rezultatCurent === 'Admis' ? 'bg-green-900/40' : p.rezultatCurent === 'Respins' ? 'bg-red-900/40' : '';
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
                                                        onChange={e => handleLocalStatusChange(p.inscriere_id, e.target.value as any)}
                                                        disabled={isFinalizing}
                                                        className={isFinalizing ? 'animate-pulse' : ''}
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