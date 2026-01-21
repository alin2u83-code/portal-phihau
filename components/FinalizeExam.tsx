import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Plata } from '../types';
import { Button, Card, Input } from './ui';
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
    nota_thao_quyen: number | null;
    nota_song_doi: number | null;
    nota_tehnica_1: number | null;
    nota_tehnica_2: number | null;
    observatii: string;
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
    const [sortConfig, setSortConfig] = useState<{ key: 'numeComplet' | 'gradOrdine' }>({ key: 'gradOrdine' });
    const [promotingId, setPromotingId] = useState<string | null>(null);

    useEffect(() => {
        const validInscrieri = Array.isArray(inscrieriSesiune) ? inscrieriSesiune : [];
        
        const enhancedParticipants = validInscrieri.map(inscriere => {
            const sportiv = inscriere.sportivi;
            const grad = inscriere.grade;
            const taxa = plati.find(p => p.sportiv_id === inscriere.sportiv_id && p.tip === 'Taxa Examen' && p.data === sesiune.data && p.descriere.includes(grad?.nume || '---'));

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
                nota_thao_quyen: inscriere.nota_thao_quyen,
                nota_song_doi: inscriere.nota_song_doi,
                nota_tehnica_1: inscriere.nota_tehnica_1,
                nota_tehnica_2: inscriere.nota_tehnica_2,
                observatii: inscriere.observatii || '',
            };
        });
        
        setParticipants(enhancedParticipants);
        setIsFinalized(true);
    }, [inscrieriSesiune, plati, sesiune.data]);

    const sortedParticipants = useMemo(() => {
        return [...participants].sort((a, b) => {
            if (sortConfig.key === 'numeComplet') return a.numeComplet.localeCompare(b.numeComplet);
            if (sortConfig.key === 'gradOrdine') return b.gradOrdine - a.gradOrdine;
            return 0;
        });
    }, [participants, sortConfig]);

    const handleFieldChange = (inscriere_id: string, field: keyof ParticipantValidare, value: string) => {
        setParticipants(prev => {
            return prev.map(p => {
                if (p.inscriere_id !== inscriere_id) return p;

                let finalValue: string | number | null = value;
                const isNoteField = ['nota_thao_quyen', 'nota_song_doi', 'nota_tehnica_1', 'nota_tehnica_2'].includes(field as string);

                if (isNoteField) {
                    finalValue = value === '' ? null : parseFloat(value);
                }

                const updatedParticipant = { ...p, [field]: finalValue };

                if (isNoteField) {
                    const allNotes = { nota_thao_quyen: updatedParticipant.nota_thao_quyen, nota_song_doi: updatedParticipant.nota_song_doi, nota_tehnica_1: updatedParticipant.nota_tehnica_1, nota_tehnica_2: updatedParticipant.nota_tehnica_2, };
                    const validNotes = Object.values(allNotes).filter(n => n !== null && !isNaN(n as any)) as number[];
                    const media = validNotes.length > 0 ? validNotes.reduce((a, b) => a + b, 0) / validNotes.length : null;
                    const rezultat = media === null ? 'Neprezentat' : media >= 5 ? 'Admis' : 'Respins';
                    return { ...updatedParticipant, media: media, rezultatCurent: rezultat };
                }
                return updatedParticipant;
            });
        });
        setIsFinalized(false);
    };

    const handlePromovareRapida = async (participant: ParticipantValidare) => {
        if (!window.confirm(`Sunteți sigur că doriți să promovați instantaneu sportivul ${participant.numeComplet} la gradul ${participant.gradSustinut}, fără note?`)) {
            return;
        }
        setPromotingId(participant.inscriere_id);
        try {
            // 1. Update inscrieri_examene
            await supabase
                .from('inscrieri_examene')
                .update({ rezultat: 'Admis', media_generala: null })
                .eq('id', participant.inscriere_id)
                .throwOnError();

            // 2. Update sportivi
            await supabase
                .from('sportivi')
                .update({ grad_actual_id: participant.gradSustinutId })
                .eq('id', participant.sportiv_id)
                .throwOnError();

            // 3. Insert into istoric_grade
            await supabase
                .from('istoric_grade')
                .insert({
                    sportiv_id: participant.sportiv_id,
                    grad_id: participant.gradSustinutId,
                    data_obtinere: sesiune.data,
                    sesiune_examen_id: sesiune.id
                })
                .throwOnError();

            // Update local state to reflect changes instantly
            setParticipants(prev => prev.map(p => 
                p.inscriere_id === participant.inscriere_id 
                ? { ...p, rezultatCurent: 'Admis', media: null } 
                : p
            ));

            setSportivi(prev => prev.map(s => 
                s.id === participant.sportiv_id 
                ? { ...s, grad_actual_id: participant.gradSustinutId } 
                : s
            ));
            
            setInscrieri(prev => prev.map(i => 
                 i.id === participant.inscriere_id 
                 ? { ...i, rezultat: 'Admis', media_generala: null } 
                 : i
            ));

            showSuccess("Succes", `${participant.numeComplet} a fost promovat.`);

        } catch (err: any) {
            showError("Eroare la promovare rapidă", err.message);
        } finally {
            setPromotingId(null);
        }
    };

    const handleFinalizeAll = async () => {
        if (isFinalizing) return;
        setIsFinalizing(true);
        try {
            const changedParticipants = participants.filter(p => {
                const original = inscrieriSesiune.find(i => i.id === p.inscriere_id);
                if (!original) return true;
                return original.rezultat !== p.rezultatCurent || original.media_generala !== p.media || original.nota_thao_quyen !== p.nota_thao_quyen || original.nota_song_doi !== p.nota_song_doi || original.nota_tehnica_1 !== p.nota_tehnica_1 || original.nota_tehnica_2 !== p.nota_tehnica_2 || (original.observatii || '') !== p.observatii;
            });

            const probeMapping: { [key in keyof ParticipantValidare]?: string } = {
                nota_thao_quyen: 'Thao Quyen',
                nota_song_doi: 'Song Doi',
                nota_tehnica_1: 'Tehnica 1',
                nota_tehnica_2: 'Tehnica 2',
            };
            const noteFields = Object.keys(probeMapping) as (keyof ParticipantValidare)[];

            for (const participant of changedParticipants) {
                // 1. Salvează notele în tabelul normalizat `note_examene`
                const notesToUpsert = [];
                const probesToDelete = [];
                
                for (const field of noteFields) {
                    const probaName = probeMapping[field];
                    const nota = participant[field] as number | null;
                    if (nota !== null && !isNaN(nota) && probaName) {
                        notesToUpsert.push({
                            inscriere_id: participant.inscriere_id,
                            tip_proba: probaName,
                            nota: nota,
                        });
                    } else if (probaName) {
                        probesToDelete.push(probaName);
                    }
                }
                
                if (notesToUpsert.length > 0) {
                    await supabase.from('note_examene').upsert(notesToUpsert, { onConflict: 'inscriere_id, tip_proba' }).throwOnError();
                }
                if (probesToDelete.length > 0) {
                    await supabase.from('note_examene').delete().eq('inscriere_id', participant.inscriere_id).in('tip_proba', probesToDelete).throwOnError();
                }

                // 2. Actualizează `inscrieri_examene` cu media și rezultatul
                const updatesForInscriere = {
                    media_generala: participant.media,
                    rezultat: participant.rezultatCurent,
                    observatii: participant.observatii,
                };
                await supabase.from('inscrieri_examene').update(updatesForInscriere).eq('id', participant.inscriere_id).throwOnError();
                
                // 3. Logica de promovare (actualizare grad sportiv și istoric)
                const originalInscriere = inscrieriSesiune.find(i => i.id === participant.inscriere_id);
                const wasAdmis = originalInscriere?.rezultat === 'Admis';
                const isAdmis = participant.rezultatCurent === 'Admis';

                if (isAdmis && !wasAdmis) {
                    await supabase.from('sportivi').update({ grad_actual_id: participant.gradSustinutId }).eq('id', participant.sportiv_id).throwOnError();
                    await supabase.from('istoric_grade').insert({ sportiv_id: participant.sportiv_id, grad_id: participant.gradSustinutId, data_obtinere: sesiune.data, sesiune_examen_id: sesiune.id }).throwOnError();
                } else if (wasAdmis && !isAdmis) {
                    await supabase.from('sportivi').update({ grad_actual_id: participant.gradAnteriorId }).eq('id', participant.sportiv_id).throwOnError();
                    await supabase.from('istoric_grade').delete().match({ sportiv_id: participant.sportiv_id, sesiune_examen_id: sesiune.id }).throwOnError();
                }
            }
            
            if(changedParticipants.length > 0) {
                const sportivIdsToUpdate = changedParticipants.map(p => p.sportiv_id).filter((v, i, a) => a.indexOf(v) === i);
                if (sportivIdsToUpdate.length > 0) {
                    const { data: updatedSportivi, error: sportiviError } = await supabase.from('sportivi').select('*, roluri(id, nume)').in('id', sportivIdsToUpdate);
                    if (sportiviError) throw sportiviError;
                    setSportivi(prev => {
                        const otherSportivi = prev.filter(s => !sportivIdsToUpdate.includes(s.id));
                        const formattedSportivi = updatedSportivi.map((s: any) => ({ ...s, roluri: s.roluri || [] }));
                        return [...otherSportivi, ...formattedSportivi];
                    });
                }
                
                setInscrieri(prev => prev.map(i => {
                    const changed = participants.find(p => p.inscriere_id === i.id);
                    if (!changed) return i;
                    const { sportivi, grade, ...restOfInscriere } = i;
                    return { ...restOfInscriere, sportivi, grade, rezultat: changed.rezultatCurent, media_generala: changed.media, nota_thao_quyen: changed.nota_thao_quyen, nota_song_doi: changed.nota_song_doi, nota_tehnica_1: changed.nota_tehnica_1, nota_tehnica_2: changed.nota_tehnica_2, observatii: changed.observatii };
                }));
            }

            showSuccess("Finalizare cu Succes", "Toate rezultatele au fost salvate și gradele actualizate.");
            setIsFinalized(true);
        } catch (err: any) {
            if (err.message.includes('violates row-level security policy')) { showError("Permisiune Refuzată (RLS)", "Nu aveți permisiunile necesare pentru a modifica gradul acestui sportiv. Contactați un administrator."); } 
            else { showError("Eroare la Finalizare", err.message); }
        } finally {
            setIsFinalizing(false);
        }
    };
    
    return (
        <div>
             <style>{`@media print { body { background-color: white !important; font-size: 10pt; } body * { visibility: hidden; } #printable-exam-report, #printable-exam-report * { visibility: visible; } #printable-exam-report { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; color: black; } .no-print { display: none !important; } #printable-exam-report .print-logo { display: block !important; } #printable-exam-report .printable-title, #printable-exam-report .printable-subtitle { color: black !important; } #printable-exam-report .card-print-override { background-color: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; } #printable-exam-report .printable-table { color: black; width: 100%; border-collapse: collapse; } .printable-table th, .printable-table td { border: 1px solid #ccc; padding: 6px; text-align: left; } .printable-table th { background-color: #eee !important; color: black !important; } .printable-table .input-print-hidden { display: none; } .printable-table .print-only-text { display: inline-block !important; } .printable-table .status-indicator span { border: 1px solid #ccc; } }`}</style>
            <div className="flex justify-between items-center mb-4 no-print">
                <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2"/> Înapoi la detalii</Button>
                {isFinalized ? ( <div className="flex items-center gap-2 px-4 py-2 text-green-400 bg-green-900/50 rounded-md"><CheckCircleIcon className="w-5 h-5" /><span>Salvat!</span></div> ) : ( <Button onClick={handleFinalizeAll} variant="success" isLoading={isFinalizing}><SaveIcon className="w-5 h-5 mr-2"/>SALVEAZĂ NOTE & GRADE</Button> )}
                <Button onClick={() => window.print()} variant="info">Descarcă Tabel Federație</Button>
            </div>
            <div id="printable-exam-report">
                <div className="flex justify-between items-center mb-6"><img src="/logo-phi-hau.png" alt="Logo Club Phi Hau" className="h-20 w-auto print-logo hidden" /><div className="text-right flex-grow"><h1 className="text-3xl font-bold text-white printable-title">Tabelul Examenelor Locale</h1><p className="text-slate-400 printable-subtitle">Clubul Phi Hau Iași - Sesiunea din {new Date(sesiune.data + 'T00:00:00').toLocaleDateString('ro-RO')}</p></div></div>
                <Card className="card-print-override">
                    <div className="flex justify-between items-center mb-4 no-print"><h2 className="text-2xl font-bold text-white">Notare & Finalizare Examen</h2><div className="flex items-center gap-2"><span className="text-sm text-slate-400">Sortează după:</span><Button size="sm" onClick={() => setSortConfig({ key: 'numeComplet' })} variant={sortConfig.key === 'numeComplet' ? 'info' : 'secondary'}>Nume (A-Z)</Button><Button size="sm" onClick={() => setSortConfig({ key: 'gradOrdine' })} variant={sortConfig.key === 'gradOrdine' ? 'info' : 'secondary'}>Grad (Desc.)</Button></div></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm printable-table min-w-[1200px]">
                            <thead className="bg-slate-700/50"><tr><th className="p-2 font-semibold">Nume Sportiv</th><th className="p-2 font-semibold">Grad Susținut</th><th className="p-2 font-semibold w-24">Thao Quyen</th><th className="p-2 font-semibold w-24">Song Doi</th><th className="p-2 font-semibold w-24">Tehnica 1</th><th className="p-2 font-semibold w-24">Tehnica 2</th><th className="p-2 font-semibold text-center w-20">Media</th><th className="p-2 font-semibold text-center w-28">Status</th><th className="p-2 font-semibold">Observații</th><th className="p-2 font-semibold text-center">Acțiune Rapidă</th><th className="p-2 font-semibold text-center">Taxa</th></tr></thead>
                            <tbody className="divide-y divide-slate-700">{sortedParticipants.map(p => {
                                const rowClass = p.rezultatCurent === 'Admis' ? 'bg-green-900/40' : p.rezultatCurent === 'Respins' ? 'bg-red-900/40' : '';
                                return (<tr key={p.inscriere_id} className={`${rowClass} hover:bg-slate-700/50`}>
                                    <td className="p-2 font-medium">{p.numeComplet}</td>
                                    <td className="p-2 text-slate-300">{p.gradSustinut}</td>
                                    <td className="p-1"><Input type="number" step="0.01" label="" className="!py-1 input-print-hidden" value={p.nota_thao_quyen ?? ''} onChange={e => handleFieldChange(p.inscriere_id, 'nota_thao_quyen', e.target.value)} disabled={isFinalizing || promotingId !== null} /><span className="print-only-text hidden">{p.nota_thao_quyen}</span></td>
                                    <td className="p-1"><Input type="number" step="0.01" label="" className="!py-1 input-print-hidden" value={p.nota_song_doi ?? ''} onChange={e => handleFieldChange(p.inscriere_id, 'nota_song_doi', e.target.value)} disabled={isFinalizing || promotingId !== null} /><span className="print-only-text hidden">{p.nota_song_doi}</span></td>
                                    <td className="p-1"><Input type="number" step="0.01" label="" className="!py-1 input-print-hidden" value={p.nota_tehnica_1 ?? ''} onChange={e => handleFieldChange(p.inscriere_id, 'nota_tehnica_1', e.target.value)} disabled={isFinalizing || promotingId !== null} /><span className="print-only-text hidden">{p.nota_tehnica_1}</span></td>
                                    <td className="p-1"><Input type="number" step="0.01" label="" className="!py-1 input-print-hidden" value={p.nota_tehnica_2 ?? ''} onChange={e => handleFieldChange(p.inscriere_id, 'nota_tehnica_2', e.target.value)} disabled={isFinalizing || promotingId !== null} /><span className="print-only-text hidden">{p.nota_tehnica_2}</span></td>
                                    <td className={`p-2 text-center font-bold font-mono ${(p.media || 0) >= 5 ? 'text-green-400' : 'text-red-400'}`}>{p.media?.toFixed(2) ?? 'N/A'}</td>
                                    <td className="p-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${p.rezultatCurent === 'Admis' ? 'bg-green-600/20 text-green-400 border-green-600/50' : p.rezultatCurent === 'Respins' ? 'bg-red-900/40 text-red-400 border-red-900/50' : 'bg-slate-600/20 text-slate-400 border-slate-600/50'}`}>{p.rezultatCurent || 'Așteptare'}</span></td>
                                    <td className="p-1"><Input label="" placeholder="..." className="!py-1 input-print-hidden" value={p.observatii} onChange={e => handleFieldChange(p.inscriere_id, 'observatii', e.target.value)} disabled={isFinalizing || promotingId !== null}/><span className="print-only-text hidden">{p.observatii}</span></td>
                                    <td className="p-2 text-center">
                                        {p.rezultatCurent === 'Admis' ? (
                                            <CheckCircleIcon className="w-6 h-6 text-green-400 mx-auto" />
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="info"
                                                onClick={() => handlePromovareRapida(p)}
                                                isLoading={promotingId === p.inscriere_id}
                                                disabled={isFinalizing || promotingId !== null}
                                                className="input-print-hidden"
                                                title="Promovează instantaneu sportivul, fără a calcula notele."
                                            >
                                                Promovează
                                            </Button>
                                        )}
                                    </td>
                                    <td className="p-2 text-center status-indicator"><div className="flex justify-center items-center"><span className={`h-3 w-3 rounded-full ${p.taxaAchitata ? 'bg-green-500' : 'bg-red-500'}`} title={p.taxaAchitata ? 'Taxa a fost achitată' : 'Taxa este neachitată'}></span></div></td>
                                </tr>);
                            })}</tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};