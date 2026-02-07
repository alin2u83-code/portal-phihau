import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import { Grad, User, Sportiv, SesiuneExamen, Locatie } from '../types';
import { ExclamationTriangleIcon, CheckCircleIcon, DocumentArrowDownIcon, XCircleIcon, UserPlusIcon, ChevronDownIcon } from './icons';
import { useError } from './ErrorProvider';
import { Modal, Button, Input, Select } from './ui';

interface ImportExamenModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: () => void;
    currentUser: User;
    locatii: Locatie[];
    setLocatii: React.Dispatch<React.SetStateAction<Locatie[]>>;
    sesiuni: SesiuneExamen[];
    setSesiuni: React.Dispatch<React.SetStateAction<SesiuneExamen[]>>;
}

interface CsvRow {
    Nume: string;
    Prenume: string;
    CNP: string;
    Grad_Nou_Ordine: string;
    Rezultat: 'Admis' | 'Respins' | 'Neprezentat';
    Contributie: string;
    Data_Examen: string;
    Sesiune_Denumire: string;
    Localitate: string;
}

interface PotentialMatch extends Sportiv {
    similarity: number;
}

interface PreviewRow extends CsvRow {
    originalIndex: number;
    status: 'pending' | 'valid' | 'conflict' | 'create' | 'error' | 'resolved';
    message: string;
    existingSportiv?: Sportiv;
    generatedCode?: string;
    conflicts?: PotentialMatch[];
    resolution?: { action: 'create' } | { action: 'use_existing', sportivId: string };
    sessionInfo: {
        key: string;
        isNew: boolean;
        sesiuneDenumire: string;
        dataExamen: string;
        localitate: string;
        existingSessionId?: string;
    };
}

const stringSimilarity = (a: string, b: string): number => {
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    const setA = new Set(normalize(a));
    const setB = new Set(normalize(b));
    if (setA.size === 0 && setB.size === 0) return 1;
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
};


export const ImportExamenModal: React.FC<ImportExamenModalProps> = ({ isOpen, onClose, onImportComplete, currentUser, locatii: initialLocatii, setLocatii, sesiuni: initialSesiuni, setSesiuni }) => {
    const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [grades, setGrades] = useState<Grad[]>([]);
    const [errorLog, setErrorLog] = useState<any | null>(null);
    const { showError, showSuccess } = useError();

    useEffect(() => {
        if (isOpen) {
            const fetchGrades = async () => {
                if (supabase) {
                    const { data, error } = await supabase.from('grade').select('*').order('ordine');
                    if (error) showError("Eroare la preluare grade", error.message); else setGrades(data || []);
                }
            };
            fetchGrades();
            setPreviewData([]);
            setErrorLog(null);
        }
    }, [isOpen, showError]);

    const downloadTemplate = () => {
        const csvData = Papa.unparse([{ Nume: "Popescu", Prenume: "Ion", CNP: "1800101123456", Grad_Nou_Ordine: "2", Rezultat: "Admis", Contributie: "100", Data_Examen: new Date().toISOString().split('T')[0], Sesiune_Denumire: "Examen Iarna", Localitate: "Iasi" }]);
        const blob = new Blob([`\uFEFF${csvData}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "model_import_bulk_examen.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && grades.length > 0) {
            setIsProcessing(true);
            setPreviewData([]);
            setErrorLog(null);
            Papa.parse<CsvRow>(file, { header: true, skipEmptyLines: true, complete: async (results) => {
                const processed = await validateData(results.data);
                setPreviewData(processed);
                setIsProcessing(false);
            }});
        }
    };

    const validateData = useCallback(async (data: CsvRow[]): Promise<PreviewRow[]> => {
        const { data: allSportivi, error } = await supabase.from('sportivi').select('*');
        if (error) { showError("Eroare la validare", error.message); return []; }

        const validationPromises = data.map(async (row, index): Promise<PreviewRow> => {
            const baseRow: Omit<PreviewRow, 'sessionInfo' | 'status' | 'message'> = { ...row, originalIndex: index };
            
            const existingSession = (initialSesiuni || []).find(s => s.denumire === row.Sesiune_Denumire?.trim() && s.data === row.Data_Examen?.trim());
            const sessionInfo = {
                key: `${row.Sesiune_Denumire?.trim()}-${row.Data_Examen?.trim()}`,
                isNew: !existingSession,
                sesiuneDenumire: row.Sesiune_Denumire?.trim(),
                dataExamen: row.Data_Examen?.trim(),
                localitate: row.Localitate?.trim(),
                existingSessionId: existingSession?.id
            };

            if (!row.Nume || !row.Prenume || !row.Grad_Nou_Ordine || !row.Sesiune_Denumire || !row.Data_Examen || !row.Localitate) {
                return { ...baseRow, status: 'error', message: 'Rând incomplet. Toate coloanele sunt obligatorii.', sessionInfo };
            }

            if (!grades.some(g => String(g.ordine) === String(row.Grad_Nou_Ordine).trim())) {
                return { ...baseRow, status: 'error', message: `Cod Grad invalid: ${row.Grad_Nou_Ordine}`, sessionInfo };
            }

            const providedCnp = String(row.CNP || '').trim();
            if (providedCnp) {
                const cnpMatch = (allSportivi || []).find(s => s.cnp && String(s.cnp).trim() === providedCnp);
                if (cnpMatch) {
                    return { ...baseRow, status: 'valid', message: `Găsit (CNP): ${cnpMatch.nume} ${cnpMatch.prenume}`, existingSportiv: cnpMatch, sessionInfo };
                }
            }
            
            // Fuzzy match if CNP fails or is missing
            const fullNameCsv = `${row.Nume} ${row.Prenume}`;
            const potentialMatches = (allSportivi || [])
                .map(s => ({ ...s, similarity: stringSimilarity(fullNameCsv, `${s.nume} ${s.prenume}`) }))
                .filter(s => s.similarity > 0.7)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 3);
            
            if (potentialMatches.length > 0) {
                return { ...baseRow, status: 'conflict', message: 'Potriviri găsite', conflicts: potentialMatches, sessionInfo };
            }
            
            // Create new sportiv
            const { data: codeData, error: codeError } = await supabase.rpc('generate_sportiv_code', { p_an: new Date(row.Data_Examen).getFullYear(), p_nume: row.Nume, p_prenume: row.Prenume });
            if (codeError) return { ...baseRow, status: 'error', message: `Eroare generare cod: ${codeError.message}`, sessionInfo };
            
            return { ...baseRow, status: 'create', message: `Va fi creat (Cod: ${codeData})`, generatedCode: codeData, sessionInfo };
        });

        return Promise.all(validationPromises);
    }, [grades, showError, initialSesiuni]);

    const confirmImport = async () => {
        setIsProcessing(true);
        setErrorLog(null);
        let localLocatii = [...initialLocatii];
        let localSesiuni = [...initialSesiuni];
        const createdSessionIds = new Map<string, string>();
        let successCount = 0, errorCount = 0;
        const errorDetails: { row: number, name: string, error: string }[] = [];

        const rowsToProcess = previewData.filter(r => r.status === 'valid' || r.status === 'create' || r.status === 'resolved');

        try {
            // Pas 1: Creare Sesiuni & Locatii
            const newSessionsToCreate = new Map<string, PreviewRow['sessionInfo']>();
            rowsToProcess.forEach(row => { if (row.sessionInfo.isNew && !newSessionsToCreate.has(row.sessionInfo.key)) newSessionsToCreate.set(row.sessionInfo.key, row.sessionInfo); });

            for (const [key, sessionInfo] of newSessionsToCreate.entries()) {
                let locatie = localLocatii.find(l => l.nume.toLowerCase() === sessionInfo.localitate.toLowerCase());
                if (!locatie) {
                    const { data: newLoc, error: locError } = await supabase.from('nom_locatii').insert({ nume: sessionInfo.localitate }).select().single();
                    if (locError) throw new Error(`Nu s-a putut crea locația '${sessionInfo.localitate}': ${locError.message}`);
                    locatie = newLoc;
                    localLocatii.push(newLoc);
                }
                const { data: newSes, error: sesError } = await supabase.from('sesiuni_examene').insert({ denumire: sessionInfo.sesiuneDenumire, data: sessionInfo.dataExamen, locatie_id: locatie.id, club_id: currentUser.club_id }).select().single();
                if (sesError) throw new Error(`Nu s-a putut crea sesiunea '${sessionInfo.sesiuneDenumire}': ${sesError.message}`);
                createdSessionIds.set(key, newSes.id);
                localSesiuni.push(newSes);
            }
            setLocatii(localLocatii);
            setSesiuni(localSesiuni);

            // Pas 2: Procesare Rânduri
            for (const row of rowsToProcess) {
                const action = row.resolution?.action || (row.status === 'valid' ? 'use_existing' : 'create');
                const sportivId = action === 'use_existing' ? (row.resolution?.sportivId || row.existingSportiv?.id) : null;
                const sessionId = row.sessionInfo.existingSessionId || createdSessionIds.get(row.sessionInfo.key);
                if (!sessionId) throw new Error(`ID-ul sesiunii pentru ${row.Nume} ${row.Prenume} nu a putut fi determinat.`);

                try {
                    const { error: rpcError } = await supabase.rpc('process_exam_row_v2', {
                        p_nume: row.Nume,
                        p_prenume: row.Prenume,
                        p_cnp: String(row.CNP || '').trim(),
                        p_cod_sportiv: action === 'create' ? row.generatedCode : null,
                        p_existing_sportiv_id: sportivId,
                        p_club_id: currentUser.club_id, // FIX: Pass the club_id
                        p_ordine_grad: parseInt(row.Grad_Nou_Ordine),
                        p_rezultat: row.Rezultat,
                        p_contributie: parseFloat(row.Contributie) || 0,
                        p_data_examen: row.Data_Examen,
                        p_sesiune_id: sessionId
                    });
                    if (rpcError) throw rpcError;
                    successCount++;
                } catch (err: any) {
                    errorCount++;
                    errorDetails.push({ row: row.originalIndex + 1, name: `${row.Nume} ${row.Prenume}`, error: err.message });
                }
            }
        } catch (err: any) {
            setErrorLog(err);
            showError("Eroare Critică de Import", err.message);
        } finally {
            setIsProcessing(false);
            if (errorCount > 0) {
                setErrorLog({ general: "Erori la procesarea rândurilor.", details: errorDetails });
                showError(`Import finalizat cu ${errorCount} erori`, `${successCount} procesate. Verificați panoul de debug.`);
            } else if (!errorLog) {
                showSuccess('Import Finalizat', `${successCount} înregistrări procesate cu succes.`);
            }
            onImportComplete();
            if (errorCount === 0 && !errorLog) onClose();
        }
    };

    const handleResolution = (originalIndex: number, resolution: { action: 'create' } | { action: 'use_existing', sportivId: string }) => {
        setPreviewData(prev => prev.map(row => {
            if (row.originalIndex === originalIndex) {
                const message = resolution.action === 'create'
                    ? `Va fi creat (Cod: ${row.generatedCode})`
                    : `Se va folosi sportivul selectat.`;
                return { ...row, status: 'resolved', resolution, message };
            }
            return row;
        }));
    };

    const unresolvedConflicts = previewData.some(r => r.status === 'conflict');
    const importableRowsCount = previewData.filter(r => r.status === 'valid' || r.status === 'create' || r.status === 'resolved').length;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import Bulk Rezultate Examen">
            <div className="space-y-6">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"><h2 className="text-xl font-bold">Pasul 1: Pregătește fișierul</h2><Button onClick={downloadTemplate} variant="secondary" size="sm"><DocumentArrowDownIcon size={18} className="mr-2"/> Model CSV</Button></div>
                <Input type="file" onChange={handleFileUpload} accept=".csv" label="Pasul 2: Încarcă fișierul CSV" />
                
                {previewData.length > 0 && (
                    <div className="space-y-4 animate-fade-in-down">
                        <h2 className="text-xl font-bold">Pasul 3: Previzualizare și Confirmare</h2>
                        <div className="max-h-[45vh] overflow-y-auto border border-slate-700 rounded-lg">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-800 sticky top-0 z-10"><tr><th className="p-2">Sportiv</th><th className="p-2">Sesiune</th><th className="p-2 w-1/3">Acțiune/Status</th></tr></thead>
                                <tbody className="divide-y divide-slate-800">{previewData.map(row => (
                                    <tr key={row.originalIndex} className={`${row.status === 'error' ? 'bg-red-900/30' : ''}`}>
                                        <td className="p-2">{row.Nume} {row.Prenume}</td>
                                        <td className="p-2 text-xs text-slate-400">{row.Sesiune_Denumire}</td>
                                        <td className="p-2">
                                            {row.status === 'conflict' ? (
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1 text-amber-400 text-xs"><ExclamationTriangleIcon className="w-4 h-4"/><span>Potriviri găsite. Alegeți:</span></div>
                                                    <Select label="" onChange={(e) => { const [action, sportivId] = e.target.value.split(':'); handleResolution(row.originalIndex, { action: action as any, sportivId }); }}>
                                                        <option value="">Alege...</option><option value="create:">Creează Sportiv Nou ({row.generatedCode})</option>
                                                        {(row.conflicts || []).map(match => (<option key={match.id} value={`use_existing:${match.id}`}>Folosește: {match.nume} {match.prenume} (Sim: {Math.round(match.similarity * 100)}%)</option>))}
                                                    </Select>
                                                </div>
                                            ) : row.status === 'valid' || row.status === 'resolved' ? (
                                                <div className="flex items-center gap-2"><CheckCircleIcon className="w-5 h-5 text-green-500"/><span className="text-slate-400">{row.message}</span></div>
                                            ) : row.status === 'create' ? (
                                                <div className="flex items-center gap-2"><UserPlusIcon className="w-5 h-5 text-sky-400"/><span className="text-slate-400">{row.message}</span></div>
                                            ) : (
                                                <div className="flex items-center gap-2"><XCircleIcon className="w-5 h-5 text-red-500"/><span className="text-red-400">{row.message}</span></div>
                                            )}
                                        </td>
                                    </tr>))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            {errorLog && ( <div className="mt-6 p-4 bg-black border-l-4 border-red-600 rounded"><div className="flex justify-between items-center mb-2"><h4 className="text-red-500 font-bold">Raport Eroare Tehnică</h4><button onClick={() => { navigator.clipboard.writeText(JSON.stringify(errorLog, null, 2)); showSuccess('Copiat!', 'Codul de debug a fost copiat în clipboard.'); }} className="text-xs bg-red-900 px-3 py-1 rounded text-white hover:bg-red-800">Copiază Cod Debug</button></div><pre className="text-[10px] text-red-300 overflow-x-auto">{JSON.stringify(errorLog, null, 2)}</pre></div>)}
            {previewData.length > 0 && ( <div className="flex justify-end pt-4 border-t border-slate-700 mt-6"><Button variant="primary" onClick={confirmImport} isLoading={isProcessing} disabled={isProcessing || unresolvedConflicts || importableRowsCount === 0}>{unresolvedConflicts ? 'Rezolvă conflictele' : `Confirmă și Importă ${importableRowsCount} Înregistrări`}</Button></div>)}
        </Modal>
    );
};