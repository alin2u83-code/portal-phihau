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

// Simple Levenshtein-based similarity score (0 to 1)
function calculateSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    a = a.toLowerCase().trim();
    b = b.toLowerCase().trim();
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i += 1) { matrix[0][i] = i; }
    for (let j = 0; j <= b.length; j += 1) { matrix[j][0] = j; }
    for (let j = 1; j <= b.length; j += 1) {
        for (let i = 1; i <= a.length; i += 1) {
            const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
        }
    }
    const distance = matrix[b.length][a.length];
    return 1.0 - (distance / Math.max(a.length, b.length));
}

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
        const csvData = Papa.unparse([{ Nume: "Popescu", Prenume: "Ion", Grad_Nou_Ordine: "2", Rezultat: "Admis", Contributie: "100", Data_Examen: new Date().toISOString().split('T')[0], Sesiune_Denumire: "Examen Iarna", Localitate: "Iasi" }]);
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

        const generatedCodesThisBatch = new Map<string, string>();

        const validationPromises = data.map(async (row, index): Promise<PreviewRow> => {
            const sessionKey = `${row.Sesiune_Denumire?.trim()}-${row.Data_Examen?.trim()}`;
            const baseRow: Omit<PreviewRow, 'sessionInfo' | 'status' | 'message'> = { ...row, originalIndex: index };
            
            if (!row.Nume || !row.Prenume || !row.Grad_Nou_Ordine || !row.Sesiune_Denumire || !row.Data_Examen || !row.Localitate) {
                return { ...baseRow, status: 'error', message: 'Rând incomplet. Toate coloanele sunt obligatorii.', sessionInfo: {} as any };
            }

            const existingSession = initialSesiuni.find(s => s.denumire === row.Sesiune_Denumire.trim() && s.data === row.Data_Examen.trim());
            const sessionInfo = {
                key: sessionKey,
                isNew: !existingSession,
                sesiuneDenumire: row.Sesiune_Denumire.trim(),
                dataExamen: row.Data_Examen.trim(),
                localitate: row.Localitate.trim(),
                existingSessionId: existingSession?.id
            };

            if (!grades.some(g => String(g.ordine) === String(row.Grad_Nou_Ordine).trim())) {
                return { ...baseRow, status: 'error', message: `Cod grad invalid: ${row.Grad_Nou_Ordine}`, sessionInfo };
            }

            const fullNameKey = `${row.Nume.trim()} ${row.Prenume.trim()}`.toLowerCase();
            const exactMatch = allSportivi.find(s => `${s.nume} ${s.prenume}`.toLowerCase() === fullNameKey);
            if (exactMatch) return { ...baseRow, status: 'valid', message: `ID: ${exactMatch.id.substring(0,8)}...`, existingSportiv: exactMatch, sessionInfo };
            
            const potentialMatches = allSportivi.map(s => ({ ...s, similarity: calculateSimilarity(fullNameKey, `${s.nume} ${s.prenume}`) })).filter(s => s.similarity > 0.8).sort((a, b) => b.similarity - a.similarity);
            if (potentialMatches.length > 0) return { ...baseRow, status: 'conflict', message: `${potentialMatches.length} potriviri găsite`, conflicts: potentialMatches, sessionInfo };
            
            if (generatedCodesThisBatch.has(fullNameKey)) {
                return { ...baseRow, status: 'create', message: 'Va fi creat (cod duplicat în CSV)', generatedCode: generatedCodesThisBatch.get(fullNameKey), sessionInfo };
            }
            
            const { data: newCode, error: codeError } = await supabase.rpc('generate_sportiv_code', { p_an: new Date(row.Data_Examen).getFullYear(), p_nume: row.Nume, p_prenume: row.Prenume });
            if (codeError) return { ...baseRow, status: 'error', message: `Eroare generare cod: ${codeError.message}`, sessionInfo };
            generatedCodesThisBatch.set(fullNameKey, newCode);
            return { ...baseRow, status: 'create', message: `Cod nou: ${newCode}`, generatedCode: newCode, sessionInfo };
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
            // Pas 1: Creare Sesiuni
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

            // Pas 2: Procesare Sportivi
            for (const row of rowsToProcess) {
                const action = row.resolution?.action || (row.status === 'valid' ? 'use_existing' : 'create');
                const sportivId = row.resolution?.action === 'use_existing' ? row.resolution.sportivId : row.existingSportiv?.id;
                const sessionId = row.sessionInfo.existingSessionId || createdSessionIds.get(row.sessionInfo.key);
                if (!sessionId) throw new Error(`ID-ul sesiunii pentru ${row.Nume} ${row.Prenume} nu a putut fi determinat.`);

                try {
                    const { error: rpcError } = await supabase.rpc('process_exam_row_v2', { p_nume: row.Nume, p_prenume: row.Prenume, p_cod_sportiv: action === 'create' ? row.generatedCode : null, p_existing_sportiv_id: action === 'use_existing' ? sportivId : null, p_club_id: currentUser.club_id, p_ordine_grad: parseInt(row.Grad_Nou_Ordine), p_rezultat: row.Rezultat, p_contributie: parseFloat(row.Contributie) || 0, p_data_examen: row.Data_Examen, p_sesiune_id: sessionId });
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

    // FIX: Defined the missing `handleResolution` function.
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
                                <thead className="bg-slate-800 sticky top-0 z-10"><tr><th className="p-2 w-8"></th><th className="p-2">Sportiv</th><th className="p-2">Sesiune</th><th className="p-2">Acțiune</th></tr></thead>
                                <tbody className="divide-y divide-slate-800">{previewData.map(row => (
                                    <tr key={row.originalIndex} className={`${row.status === 'error' ? 'bg-red-900/30' : row.status === 'conflict' ? 'bg-yellow-900/30' : ''}`}>
                                        <td className="p-2 text-center">{['valid', 'resolved'].includes(row.status) ? <CheckCircleIcon className="w-5 h-5 text-green-500"/> : row.status === 'create' ? <UserPlusIcon className="w-5 h-5 text-sky-400"/> : row.status === 'error' ? <XCircleIcon className="w-5 h-5 text-red-500"/> : <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500"/>}</td>
                                        <td className="p-2">{row.Nume} {row.Prenume}</td>
                                        <td className="p-2 text-xs text-slate-400">{row.Sesiune_Denumire}</td>
                                        <td className="p-2">{row.status === 'conflict' ? ( <div className="flex gap-2 items-center"><Select label="" value="" onChange={e => handleResolution(row.originalIndex, { action: 'use_existing', sportivId: e.target.value })} className="!py-1 text-xs flex-grow"><option value="" disabled>Alege sportiv...</option>{(row.conflicts || []).map(c => <option key={c.id} value={c.id}>{c.nume} {c.prenume} (Cod: {c.cod_sportiv || 'N/A'})</option>)}</Select><Button size="sm" variant="secondary" onClick={() => handleResolution(row.originalIndex, { action: 'create' })}>Creează Nou</Button></div> ) : <span className="text-slate-400">{row.message}</span>}</td>
                                    </tr>))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            {errorLog && ( <div className="mt-6 p-4 bg-black border-l-4 border-red-600 rounded"><div className="flex justify-between items-center mb-2"><h4 className="text-red-500 font-bold">Raport Eroare Tehnică</h4><button onClick={() => { navigator.clipboard.writeText(JSON.stringify(errorLog, null, 2)); alert('Copiat!'); }} className="text-xs bg-red-900 px-3 py-1 rounded text-white hover:bg-red-800">Copiază Cod Debug</button></div><pre className="text-[10px] text-red-300 overflow-x-auto">{JSON.stringify(errorLog, null, 2)}</pre></div>)}
            {previewData.length > 0 && ( <div className="flex justify-end pt-4 border-t border-slate-700 mt-6"><Button variant="primary" onClick={confirmImport} isLoading={isProcessing} disabled={isProcessing || unresolvedConflicts || importableRowsCount === 0}>{unresolvedConflicts ? 'Rezolvă conflictele' : `Confirmă și Importă ${importableRowsCount} Înregistrări`}</Button></div>)}
        </Modal>
    );
};