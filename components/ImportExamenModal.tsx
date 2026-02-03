import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import { Grad, User, Sportiv } from '../types';
import { ExclamationTriangleIcon, CheckCircleIcon, DocumentArrowDownIcon, XCircleIcon, UserPlusIcon, ChevronDownIcon } from './icons';
import { useError } from './ErrorProvider';
import { Modal, Button, Input, Select } from './ui';

interface ImportExamenModalProps {
    isOpen: boolean;
    onClose: () => void;
    sesiuneId: string;
    onImportComplete: () => void;
    currentUser: User;
}

interface CsvRow {
    Nume: string;
    Prenume: string;
    Grad_Nou_Ordine: string;
    Rezultat: 'Admis' | 'Respins' | 'Neprezentat';
    Contributie: string;
    Data_Examen: string;
}

interface PotentialMatch extends Sportiv {
    similarity: number;
}

interface PreviewRow extends CsvRow {
    originalIndex: number;
    status: 'pending' | 'valid' | 'conflict' | 'create' | 'error' | 'resolved';
    message: string;
    existingSportiv?: Sportiv; // For 'valid'
    generatedCode?: string; // For 'create'
    conflicts?: PotentialMatch[];
    resolution?: { action: 'create' } | { action: 'use_existing', sportivId: string };
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

export const ImportExamenModal: React.FC<ImportExamenModalProps> = ({ isOpen, onClose, sesiuneId, onImportComplete, currentUser }) => {
    const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [grades, setGrades] = useState<Grad[]>([]);
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
        }
    }, [isOpen, showError]);

    const downloadTemplate = () => {
        const csvData = Papa.unparse([{ Nume: "Popescu", Prenume: "Ion", Grad_Nou_Ordine: "2", Rezultat: "Admis", Contributie: "100", Data_Examen: new Date().toISOString().split('T')[0] }]);
        const blob = new Blob([`\uFEFF${csvData}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "model_import_examen.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && grades.length > 0) {
            setIsProcessing(true);
            setPreviewData([]);
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

        const generatedCodesThisBatch = new Map<string, string>(); // Key: "Nume Prenume", Value: "code"

        const validationPromises = data.map(async (row, index): Promise<PreviewRow> => {
            const baseRow = { ...row, originalIndex: index, status: 'pending' as const, message: '' };
            if (!row.Nume || !row.Prenume || !row.Grad_Nou_Ordine) return { ...baseRow, status: 'error', message: 'Rând incomplet (Nume, Prenume, Grad Lipsă)' };
            if (!grades.some(g => String(g.ordine) === String(row.Grad_Nou_Ordine).trim())) return { ...baseRow, status: 'error', message: `Cod grad invalid: ${row.Grad_Nou_Ordine}` };

            const fullNameKey = `${row.Nume.trim()} ${row.Prenume.trim()}`.toLowerCase();
            const exactMatch = allSportivi.find(s => `${s.nume} ${s.prenume}`.toLowerCase() === fullNameKey);
            if (exactMatch) return { ...baseRow, status: 'valid', message: `ID: ${exactMatch.id.substring(0,8)}...`, existingSportiv: exactMatch };
            
            const potentialMatches = allSportivi.map(s => ({ ...s, similarity: calculateSimilarity(fullNameKey, `${s.nume} ${s.prenume}`) }))
                .filter(s => s.similarity > 0.75)
                .sort((a, b) => b.similarity - a.similarity);

            if (potentialMatches.length > 0) return { ...baseRow, status: 'conflict', message: `${potentialMatches.length} potriviri găsite`, conflicts: potentialMatches };
            
            if (generatedCodesThisBatch.has(fullNameKey)) {
                return { ...baseRow, status: 'create', message: 'Va fi creat (cod duplicat în CSV)', generatedCode: generatedCodesThisBatch.get(fullNameKey) };
            } else {
                const anExamen = new Date(row.Data_Examen).getFullYear();
                const { data: newCode, error: codeError } = await supabase.rpc('generate_sportiv_code', { p_an: anExamen, p_nume: row.Nume, p_prenume: row.Prenume });
                if (codeError) return { ...baseRow, status: 'error', message: `Eroare generare cod: ${codeError.message}` };
                generatedCodesThisBatch.set(fullNameKey, newCode);
                return { ...baseRow, status: 'create', message: `Cod nou: ${newCode}`, generatedCode: newCode };
            }
        });

        return Promise.all(validationPromises);
    }, [grades, showError]);

    const handleResolution = (originalIndex: number, resolution: PreviewRow['resolution']) => {
        setPreviewData(prev => prev.map(row => {
            if (row.originalIndex === originalIndex) {
                const existing = resolution?.action === 'use_existing' ? row.conflicts?.find(c => c.id === resolution.sportivId) : undefined;
                return { ...row, resolution, status: 'resolved', message: resolution?.action === 'create' ? `Va fi creat (cod: ${row.generatedCode})` : `Va folosi: ${existing?.nume} ${existing?.prenume}` };
            }
            return row;
        }));
    };

    const confirmImport = async () => {
        setIsProcessing(true);
        let successCount = 0, errorCount = 0;
        const errorDetails: string[] = [];

        for (const row of previewData) {
            if (row.status === 'error' || row.status === 'pending' || row.status === 'conflict') continue;
            
            const action = row.resolution?.action || (row.status === 'valid' ? 'use_existing' : 'create');
            const sportivId = row.resolution?.action === 'use_existing' ? row.resolution.sportivId : row.existingSportiv?.id;

            try {
                const { error: rpcError } = await supabase.rpc('process_exam_row_v2', {
                    p_nume: row.Nume,
                    p_prenume: row.Prenume,
                    p_cod_sportiv: action === 'create' ? row.generatedCode : null,
                    p_existing_sportiv_id: action === 'use_existing' ? sportivId : null,
                    p_club_id: currentUser.club_id,
                    p_ordine_grad: parseInt(row.Grad_Nou_Ordine),
                    p_rezultat: row.Rezultat,
                    p_contributie: parseFloat(row.Contributie) || 0,
                    p_data_examen: row.Data_Examen,
                    p_sesiune_id: sesiuneId
                });

                if (rpcError) throw new Error(rpcError.message);
                successCount++;

            } catch (err: any) {
                errorCount++;
                errorDetails.push(`${row.Nume} ${row.Prenume}: ${err.message}`);
            }
        }
        
        setIsProcessing(false);
        if (errorCount > 0) showError(`Import finalizat cu ${errorCount} erori`, `${successCount} procesate. Detalii: ${errorDetails.join('; ')}`);
        else showSuccess('Import Finalizat', `${successCount} înregistrări procesate cu succes.`);
        
        onImportComplete();
        onClose();
    };

    const unresolvedConflicts = previewData.some(r => r.status === 'conflict');
    const importableRowsCount = previewData.filter(r => r.status === 'valid' || r.status === 'create' || r.status === 'resolved').length;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import Rezultate Examen din CSV">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h2 className="text-xl font-bold">Pasul 1: Pregătește fișierul (fără CNP)</h2>
                    <Button onClick={downloadTemplate} variant="secondary" size="sm"><DocumentArrowDownIcon size={18} className="mr-2"/> Model CSV</Button>
                </div>
                <Input type="file" onChange={handleFileUpload} accept=".csv" label="Pasul 2: Încarcă fișierul CSV" />
                
                {previewData.length > 0 && (
                    <div className="space-y-4 animate-fade-in-down">
                        <h2 className="text-xl font-bold">Pasul 3: Previzualizare și Confirmare</h2>
                        <div className="max-h-[50vh] overflow-y-auto border border-slate-700 rounded-lg">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-800 sticky top-0 z-10"><tr>
                                    <th className="p-2 w-8"></th><th className="p-2">Sportiv</th><th className="p-2">Mesaj / Acțiune</th>
                                </tr></thead>
                                <tbody className="divide-y divide-slate-800">
                                    {previewData.map(row => (
                                        <tr key={row.originalIndex} className={`${row.status === 'error' ? 'bg-red-900/30' : row.status === 'conflict' ? 'bg-yellow-900/30' : ''}`}>
                                            <td className="p-2 text-center">
                                                {['valid', 'resolved'].includes(row.status) && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                                                {row.status === 'create' && <UserPlusIcon className="w-5 h-5 text-sky-400" />}
                                                {row.status === 'error' && <XCircleIcon className="w-5 h-5 text-red-500" />}
                                                {row.status === 'conflict' && <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />}
                                            </td>
                                            <td className="p-2">{row.Nume} {row.Prenume}</td>
                                            <td className="p-2">
                                                {row.status === 'conflict' ? (
                                                    <div className="flex gap-2 items-center">
                                                        <Select label="" value="" onChange={e => handleResolution(row.originalIndex, { action: 'use_existing', sportivId: e.target.value })} className="!py-1 text-xs flex-grow">
                                                            <option value="" disabled>Alege sportiv existent...</option>
                                                            {(row.conflicts || []).map(c => <option key={c.id} value={c.id}>{c.nume} {c.prenume} (Cod: {c.cod_sportiv || 'N/A'})</option>)}
                                                        </Select>
                                                        <Button size="sm" variant="secondary" onClick={() => handleResolution(row.originalIndex, { action: 'create' })}>Creează Nou</Button>
                                                    </div>
                                                ) : <span className="text-slate-400">{row.message}</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            {previewData.length > 0 && (
                <div className="flex justify-end pt-4 border-t border-slate-700 mt-6">
                    <Button variant="primary" onClick={confirmImport} isLoading={isProcessing} disabled={isProcessing || unresolvedConflicts || importableRowsCount === 0}>
                        {unresolvedConflicts ? 'Rezolvă conflictele' : `Confirmă și Importă ${importableRowsCount} Înregistrări`}
                    </Button>
                </div>
            )}
        </Modal>
    );
};
