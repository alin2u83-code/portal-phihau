import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import { Grad, SesiuneExamen } from '../types';
import { ExclamationTriangleIcon, CheckCircleIcon, DocumentArrowDownIcon, XCircleIcon } from './icons';
import { useError } from './ErrorProvider';
// FIX: Add 'Input' to the import from './ui' to resolve the 'Cannot find name' error.
import { Modal, Button, Input } from './ui';

interface ImportExamenModalProps {
    isOpen: boolean;
    onClose: () => void;
    sesiuneId: string;
    onImportComplete: () => void;
}

interface CsvRow {
    Nume: string;
    Prenume: string;
    CNP: string;
    Grad_Nou_Ordine: string;
    Contributie: string;
    Data_Examen: string;
}

interface PreviewRow extends CsvRow {
    sportivId?: string;
    gradActualId?: string | null;
    newGradId?: string;
    newGradName?: string;
    status: 'valid' | 'error' | 'warning';
    message: string;
}

export const ImportExamenModal: React.FC<ImportExamenModalProps> = ({ isOpen, onClose, sesiuneId, onImportComplete }) => {
    const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [grades, setGrades] = useState<Grad[]>([]);
    const { showError, showSuccess } = useError();

    useEffect(() => {
        const fetchGrades = async () => {
            if (isOpen && supabase) {
                const { data, error } = await supabase.from('grade').select('*');
                if (error) {
                    showError("Eroare la preluare grade", error.message);
                } else {
                    setGrades(data || []);
                }
            }
        };
        fetchGrades();
    }, [isOpen, showError]);

    const downloadModel = () => {
        const csvData = "Nume,Prenume,CNP,Grad_Nou_Ordine,Contributie,Data_Examen\nPopescu,Ion,1991231123456,2,100,2024-08-15";
        const blob = new Blob([`\uFEFF${csvData}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "model_import_examen.csv");
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
        const validationPromises = data.map(async (row): Promise<PreviewRow> => {
            if (!row.CNP || !row.Grad_Nou_Ordine) {
                return { ...row, status: 'error', message: 'Rând incomplet (CNP, Grad Lipsă)' };
            }

            const { data: sportiv } = await supabase
                .from('sportivi')
                .select('id, nume, prenume, grad_actual_id')
                .eq('cnp', row.CNP.trim())
                .single();

            if (!sportiv) {
                return { ...row, status: 'error', message: 'Sportiv negăsit (CNP eronat)' };
            }

            const newGrad = grades.find(g => String(g.ordine) === row.Grad_Nou_Ordine.trim());
            if (!newGrad) {
                return { ...row, sportivId: sportiv.id, status: 'error', message: `Gradul cu ordinul ${row.Grad_Nou_Ordine} nu există.` };
            }
            
            const { data: hasGrad } = await supabase
                .from('istoric_grade')
                .select('id')
                .eq('sportiv_id', sportiv.id)
                .eq('grad_id', newGrad.id)
                .maybeSingle();

            if (hasGrad) {
                return { ...row, sportivId: sportiv.id, newGradId: newGrad.id, newGradName: newGrad.nume, status: 'warning', message: 'Sportivul are deja acest grad.' };
            }

            return { ...row, sportivId: sportiv.id, gradActualId: sportiv.grad_actual_id, newGradId: newGrad.id, newGradName: newGrad.nume, status: 'valid', message: 'Gata pentru import' };
        });

        return Promise.all(validationPromises);
    };
    
    const confirmImport = async () => {
        setIsProcessing(true);
        const toImport = previewData.filter(r => r.status !== 'error');
        let successCount = 0;
        let errorCount = 0;

        for (const row of toImport) {
            if (row.status === 'warning' || !row.sportivId || !row.newGradId) {
                continue; // Skip warnings and invalid rows
            }
            
            try {
                // 1. Create Payment
                const { data: plata, error: plataError } = await supabase
                    .from('plati')
                    .insert({
                        sportiv_id: row.sportivId,
                        suma: parseFloat(row.Contributie) || 0,
                        status: 'Achitat',
                        tip: 'EXAMEN',
                        descriere: `Taxa examen ${row.newGradName}`,
                        data: row.Data_Examen
                    })
                    .select()
                    .single();
                if (plataError) throw plataError;

                // 2. Create Transaction
                const { error: tranzactieError } = await supabase
                    .from('tranzactii')
                    .insert({
                        plata_ids: [plata.id],
                        sportiv_id: row.sportivId,
                        suma: parseFloat(row.Contributie) || 0,
                        metoda_plata: 'Cash', // Assume Cash for bulk import
                        data_platii: row.Data_Examen
                    });
                if (tranzactieError) throw tranzactieError;
                
                // 3. Insert into Grade History
                const { error: istoricError } = await supabase
                    .from('istoric_grade')
                    .insert({
                        sportiv_id: row.sportivId,
                        grad_id: row.newGradId,
                        data_obtinere: row.Data_Examen,
                        sesiune_examen_id: sesiuneId
                    });
                if (istoricError) throw istoricError;

                // 4. Update Athlete's Current Grade
                const { error: sportivUpdateError } = await supabase
                    .from('sportivi')
                    .update({ grad_actual_id: row.newGradId })
                    .eq('id', row.sportivId);
                if (sportivUpdateError) throw sportivUpdateError;
                
                successCount++;

            } catch (err: any) {
                errorCount++;
                console.error(`Eroare la import pentru CNP ${row.CNP}:`, err);
                if (err.code === '23505') { // unique_violation for istoric_grade
                     showError(`Eroare de Duplicat (${row.CNP})`, "Sportivul are deja acest grad în istoric.");
                } else {
                     showError(`Eroare la import (${row.CNP})`, err.message);
                }
            }
        }
        
        setIsProcessing(false);
        showSuccess('Import Finalizat', `${successCount} înregistrări importate cu succes. ${errorCount} erori întâmpinate.`);
        onImportComplete();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import Rezultate Examen din CSV">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Import Rezultate Examene</h2>
                    <Button onClick={downloadModel} variant="secondary" size="sm">
                        <DocumentArrowDownIcon size={18} className="mr-2"/> Model CSV
                    </Button>
                </div>

                <Input type="file" onChange={handleFileUpload} accept=".csv" label="Încarcă fișier CSV" />

                {isProcessing && <p className="text-center text-slate-400">Se validează datele...</p>}

                {previewData.length > 0 && (
                    <div className="space-y-4">
                        <div className="max-h-80 overflow-y-auto border border-slate-700 rounded-lg">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-800 sticky top-0">
                                    <tr>
                                        <th className="p-2 w-8"></th>
                                        <th className="p-2">Sportiv</th>
                                        <th className="p-2">Grad Nou</th>
                                        <th className="p-2">Mesaj</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {previewData.map((row, idx) => (
                                        <tr key={idx} className={`${row.status === 'error' ? 'bg-red-900/30' : row.status === 'warning' ? 'bg-yellow-900/30' : ''}`}>
                                            <td className="p-2 text-center">
                                                {row.status === 'valid' && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                                                {row.status === 'error' && <XCircleIcon className="w-5 h-5 text-red-500" />}
                                                {row.status === 'warning' && <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />}
                                            </td>
                                            <td className="p-2">{row.Nume} {row.Prenume}</td>
                                            <td className="p-2">{grades.find(g => String(g.ordine) === row.Grad_Nou_Ordine)?.nume || `Ordine Invalidă: ${row.Grad_Nou_Ordine}`}</td>
                                            <td className="p-2 text-slate-400">{row.message}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end pt-4 border-t border-slate-700">
                            <Button variant="primary" onClick={confirmImport} isLoading={isProcessing} disabled={isProcessing || previewData.every(r => r.status === 'error')}>
                                Confirmă și Importă {previewData.filter(r => r.status !== 'error').length} Înregistrări
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};