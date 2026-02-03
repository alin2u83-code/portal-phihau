import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import { Grad, User } from '../types';
import { ExclamationTriangleIcon, CheckCircleIcon, DocumentArrowDownIcon, XCircleIcon, UserPlusIcon } from './icons';
import { useError } from './ErrorProvider';
import { Modal, Button, Input } from './ui';

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
    CNP: string;
    Grad_Nou_Ordine: string;
    Rezultat: 'Admis' | 'Respins' | 'Neprezentat';
    Contributie: string;
    Data_Examen: string;
}

interface PreviewRow extends CsvRow {
    status: 'valid' | 'error' | 'warning' | 'create';
    message: string;
}

export const ImportExamenModal: React.FC<ImportExamenModalProps> = ({ isOpen, onClose, sesiuneId, onImportComplete, currentUser }) => {
    const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [grades, setGrades] = useState<Grad[]>([]);
    const { showError, showSuccess } = useError();

    useEffect(() => {
        const fetchGrades = async () => {
            if (isOpen && supabase) {
                const { data, error } = await supabase.from('grade').select('*').order('ordine');
                if (error) {
                    showError("Eroare la preluare grade", error.message);
                } else {
                    setGrades(data || []);
                }
            }
        };
        fetchGrades();
    }, [isOpen, showError]);

    const downloadGradeLegend = () => {
        if (grades.length === 0) {
            showError("Date lipsă", "Nomenclatorul de grade nu a putut fi încărcat.");
            return;
        }
        const legenda = grades.map(g => ({
            "Cod Grad (De pus in CSV)": g.ordine,
            "Denumire Grad Qwan Ki Do": g.nume
        }));
        const csv = Papa.unparse(legenda);
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "Legenda_Grade_PhiHau.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const downloadTemplate = () => {
        const csvData = Papa.unparse([
            {
                Nume: "Popescu",
                Prenume: "Ion",
                CNP: "1991231123456",
                Grad_Nou_Ordine: "2",
                Rezultat: "Admis",
                Contributie: "100",
                Data_Examen: new Date().toISOString().split('T')[0]
            }
        ]);
        const blob = new Blob([`\uFEFF${csvData}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "model_import_examen_phihau.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && grades.length > 0) {
            setIsProcessing(true);
            setPreviewData([]);
            Papa.parse<CsvRow>(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    const processed = await validateData(results.data);
                    setPreviewData(processed);
                    setIsProcessing(false);
                }
            });
        }
    };

    const validateData = async (data: CsvRow[]): Promise<PreviewRow[]> => {
        const cnps = data.map(row => String(row.CNP).trim());
        const { data: sportiviData, error } = await supabase.from('sportivi').select('id, cnp, grad_actual_id').in('cnp', cnps);
        if (error) {
            showError("Eroare la validare", error.message);
            return data.map(row => ({ ...row, status: 'error', message: 'Eroare la validarea sportivilor' }));
        }

        const sportiviMap = new Map(sportiviData.map(s => [s.cnp, s]));

        const validationPromises = data.map(async (row): Promise<PreviewRow> => {
            const cleanCNP = String(row.CNP).trim();
            if (!cleanCNP || !row.Grad_Nou_Ordine) {
                return { ...row, status: 'error', message: 'Rând incomplet (CNP, Grad Lipsă)' };
            }

            const newGrad = grades.find(g => String(g.ordine) === String(row.Grad_Nou_Ordine).trim());
            if (!newGrad) {
                return { ...row, status: 'error', message: `Cod grad invalid: ${row.Grad_Nou_Ordine}` };
            }

            const sportiv = sportiviMap.get(cleanCNP);
            if (!sportiv) {
                return { ...row, status: 'create', message: 'Sportiv nou - Va fi creat' };
            }

            // FIX: Corrected destructuring for count query. The `count` property is top-level, not inside `data`.
            const { count, error: countError } = await supabase.from('istoric_grade').select('id', { count: 'exact', head: true }).eq('sportiv_id', sportiv.id).eq('grad_id', newGrad.id);
            if (countError) {
                return { ...row, status: 'error', message: 'Eroare la validare istoric' };
            }
            if (count && count > 0) {
                return { ...row, status: 'warning', message: 'Sportivul are deja acest grad.' };
            }

            return { ...row, status: 'valid', message: 'Gata pentru import' };
        });

        return Promise.all(validationPromises);
    };
    
    const confirmImport = async () => {
        setIsProcessing(true);
        let successCount = 0;
        let errorCount = 0;
        let warningCount = 0;
        const errorDetails: string[] = [];

        for (const row of previewData.filter(r => r.status !== 'error')) {
            try {
                const { data: rpcResult, error: rpcError } = await supabase.rpc('process_exam_row_with_upsert', {
                    p_cnp: row.CNP.toString().trim(),
                    p_nume: row.Nume,
                    p_prenume: row.Prenume,
                    p_club_id: 'cbb0b228-b3e0-4735-9658-70999eb256c6', // Phi Hau ID
                    p_ordine_grad: parseInt(row.Grad_Nou_Ordine),
                    p_rezultat: row.Rezultat,
                    p_contributie: parseFloat(row.Contributie) || 0,
                    p_data_examen: row.Data_Examen,
                    p_sesiune_id: sesiuneId
                });

                if (rpcError) throw new Error(rpcError.message);
                
                if (typeof rpcResult === 'string' && rpcResult.startsWith('DUPLICATE_IGNORED')) {
                    warningCount++;
                } else {
                    successCount++;
                }

            } catch (err: any) {
                errorCount++;
                errorDetails.push(`CNP ${row.CNP}: ${err.message}`);
            }
        }
        
        setIsProcessing(false);
        let finalMessage = `${successCount} înregistrări procesate cu succes`;
        if (warningCount > 0) finalMessage += `, ${warningCount} avertismente (grade duplicate ignorate)`;

        if (errorCount > 0) {
            showError(`Import finalizat cu ${errorCount} erori`, `${finalMessage}. Detalii: ${errorDetails.join('; ')}`);
        } else {
            showSuccess('Import Finalizat', finalMessage);
        }
        onImportComplete();
        onClose();
    };

    const importableRowsCount = previewData.filter(r => r.status === 'valid' || r.status === 'create').length;

    const quickLegendGrades = useMemo(() => grades.slice(0, 10), [grades]);
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import Rezultate Examen din CSV">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-grow space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <h2 className="text-xl font-bold">Pasul 1: Pregătește fișierul</h2>
                        <div className="flex gap-2 flex-shrink-0">
                            <Button onClick={downloadTemplate} variant="secondary" size="sm"><DocumentArrowDownIcon size={18} className="mr-2"/> Model CSV</Button>
                            <Button onClick={downloadGradeLegend} variant="secondary" size="sm"><DocumentArrowDownIcon size={18} className="mr-2"/> Coduri Grade</Button>
                        </div>
                    </div>
                    <Input type="file" onChange={handleFileUpload} accept=".csv" label="Pasul 2: Încarcă fișierul CSV" />
                    {isProcessing && <p className="text-center text-slate-400">Se validează datele...</p>}
                    {previewData.length > 0 && (
                        <div className="space-y-4 animate-fade-in-down">
                            <h2 className="text-xl font-bold">Pasul 3: Previzualizare și Confirmare</h2>
                            <div className="max-h-60 overflow-y-auto border border-slate-700 rounded-lg">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-800 sticky top-0"><tr><th className="p-2 w-8"></th><th className="p-2">Sportiv</th><th className="p-2">Mesaj</th></tr></thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {previewData.map((row, idx) => (
                                            <tr key={idx} className={`${row.status === 'error' ? 'bg-red-900/30 text-red-400' : row.status === 'warning' ? 'bg-yellow-900/30 text-yellow-400' : 'text-slate-300'}`}>
                                                <td className="p-2 text-center">
                                                    {row.status === 'valid' && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                                                    {row.status === 'create' && <UserPlusIcon className="w-5 h-5 text-sky-400" />}
                                                    {row.status === 'error' && <XCircleIcon className="w-5 h-5 text-red-500" />}
                                                    {row.status === 'warning' && <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />}
                                                </td><td className="p-2">{row.Nume} {row.Prenume}</td><td className="p-2">{row.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
                <div className="w-full md:w-64 flex-shrink-0 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <h3 className="font-bold text-white mb-2">Legendă rapidă coduri</h3>
                    <ul className="text-xs space-y-1 text-slate-300 max-h-60 overflow-y-auto pr-2">
                        {quickLegendGrades.map(g => <li key={g.id}><strong>Cod {g.ordine}:</strong> {g.nume}</li>)}
                        {grades.length > 10 && <li className="italic text-slate-500">... și altele</li>}
                    </ul>
                </div>
            </div>
            {previewData.length > 0 && (
                <div className="flex justify-end pt-4 border-t border-slate-700 mt-6">
                    <Button variant="primary" onClick={confirmImport} isLoading={isProcessing} disabled={isProcessing || importableRowsCount === 0}>
                        Confirmă și Importă {importableRowsCount > 0 ? `${importableRowsCount} Înregistrări` : ''}
                    </Button>
                </div>
            )}
        </Modal>
    );
};