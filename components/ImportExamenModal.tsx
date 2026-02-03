import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import { Grad } from '../types';
import { ExclamationTriangleIcon, CheckCircleIcon, DocumentArrowDownIcon, XCircleIcon } from './icons';
import { useError } from './ErrorProvider';
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
    Rezultat: 'Admis' | 'Respins' | 'Neprezentat';
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
        const validationPromises = data.map(async (row): Promise<PreviewRow> => {
            if (!row.CNP || !row.Grad_Nou_Ordine) {
                return { ...row, status: 'error', message: 'Rând incomplet (CNP, Grad Lipsă)' };
            }

            const { data: sportiv } = await supabase
                .from('sportivi')
                .select('id, nume, prenume, grad_actual_id')
                .eq('cnp', String(row.CNP).trim())
                .single();

            if (!sportiv) {
                return { ...row, status: 'error', message: 'Sportiv negăsit (CNP eronat)' };
            }

            const newGrad = grades.find(g => String(g.ordine) === String(row.Grad_Nou_Ordine).trim());
            if (!newGrad) {
                return { ...row, sportivId: sportiv.id, status: 'error', message: `Cod grad invalid: ${row.Grad_Nou_Ordine}` };
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
        const toImport = previewData.filter(r => r.status === 'valid' && r.Rezultat === 'Admis');
        let successCount = 0;
        let errorCount = 0;

        for (const row of toImport) {
            if (!row.sportivId || !row.newGradId) continue;
            
            try {
                // Creează Plata
                const { data: plata, error: plataError } = await supabase
                    .from('plati')
                    .insert({
                        sportiv_id: row.sportivId,
                        suma: parseFloat(row.Contributie) || 0,
                        status: 'Achitat',
                        tip: 'Taxa Examen',
                        descriere: `Taxa examen ${row.newGradName}`,
                        data: row.Data_Examen
                    })
                    .select()
                    .single();
                if (plataError) throw plataError;

                // Creează Tranzacția
                const { error: tranzactieError } = await supabase
                    .from('tranzactii')
                    .insert({
                        plata_ids: [plata.id],
                        sportiv_id: row.sportivId,
                        suma: parseFloat(row.Contributie) || 0,
                        metoda_plata: 'CSV Import',
                        data_platii: row.Data_Examen
                    });
                if (tranzactieError) throw tranzactieError;
                
                // Inserează în Istoric Grade
                const { error: istoricError } = await supabase
                    .from('istoric_grade')
                    .insert({
                        sportiv_id: row.sportivId,
                        grad_id: row.newGradId,
                        data_obtinere: row.Data_Examen,
                        sesiune_examen_id: sesiuneId
                    });
                if (istoricError) throw istoricError;

                // Actualizează Gradul Curent al Sportivului
                const { error: sportivUpdateError } = await supabase
                    .from('sportivi')
                    .update({ grad_actual_id: row.newGradId })
                    .eq('id', row.sportivId);
                if (sportivUpdateError) throw sportivUpdateError;
                
                successCount++;

            } catch (err: any) {
                errorCount++;
                console.error(`Eroare la import pentru CNP ${row.CNP}:`, err);
                showError(`Eroare la import (${row.CNP})`, err.message);
            }
        }
        
        setIsProcessing(false);
        showSuccess('Import Finalizat', `${successCount} înregistrări "Admis" procesate. ${errorCount} erori.`);
        onImportComplete();
        onClose();
    };

    const validRowsCount = previewData.filter(r => r.status === 'valid' && r.Rezultat === 'Admis').length;

    const quickLegendGrades = useMemo(() => {
        return grades.slice(0, 10);
    }, [grades]);
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import Rezultate Examen din CSV">
            <div className="flex flex-col md:flex-row gap-6">
                
                {/* Main Interaction Area */}
                <div className="flex-grow space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <h2 className="text-xl font-bold">Pasul 1: Pregătește fișierul</h2>
                        <div className="flex gap-2 flex-shrink-0">
                            <Button onClick={downloadTemplate} variant="secondary" size="sm">
                                <DocumentArrowDownIcon size={18} className="mr-2"/> Model CSV
                            </Button>
                            <Button onClick={downloadGradeLegend} variant="secondary" size="sm">
                                <DocumentArrowDownIcon size={18} className="mr-2"/> Coduri Grade
                            </Button>
                        </div>
                    </div>

                    <Input type="file" onChange={handleFileUpload} accept=".csv" label="Pasul 2: Încarcă fișierul CSV" />

                    {isProcessing && <p className="text-center text-slate-400">Se validează datele...</p>}

                    {previewData.length > 0 && (
                        <div className="space-y-4 animate-fade-in-down">
                            <h2 className="text-xl font-bold">Pasul 3: Previzualizare și Confirmare</h2>
                            <div className="max-h-60 overflow-y-auto border border-slate-700 rounded-lg">
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
                                            <tr key={idx} className={`${row.status === 'error' ? 'bg-red-900/30 text-red-400' : row.status === 'warning' ? 'bg-yellow-900/30 text-yellow-400' : 'text-slate-300'}`}>
                                                <td className="p-2 text-center">
                                                    {row.status === 'valid' && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                                                    {row.status === 'error' && <XCircleIcon className="w-5 h-5 text-red-500" />}
                                                    {row.status === 'warning' && <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />}
                                                </td>
                                                <td className="p-2">{row.Nume} {row.Prenume}</td>
                                                <td className="p-2">{row.newGradName || `Ordine Invalidă: ${row.Grad_Nou_Ordine}`}</td>
                                                <td className="p-2">{row.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Legend Area */}
                <div className="w-full md:w-64 flex-shrink-0 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <h3 className="font-bold text-white mb-2">Legendă rapidă coduri</h3>
                    <ul className="text-xs space-y-1 text-slate-300 max-h-60 overflow-y-auto pr-2">
                        {quickLegendGrades.map(g => (
                            <li key={g.id}>
                                <strong>Cod {g.ordine}:</strong> {g.nume}
                            </li>
                        ))}
                         {grades.length > 10 && <li className="italic text-slate-500">... și altele</li>}
                    </ul>
                </div>
            </div>

            {previewData.length > 0 && (
                <div className="flex justify-end pt-4 border-t border-slate-700 mt-6">
                    <Button variant="primary" onClick={confirmImport} isLoading={isProcessing} disabled={isProcessing || validRowsCount === 0}>
                        Confirmă și Importă {validRowsCount > 0 ? `${validRowsCount} Admiși` : ''}
                    </Button>
                </div>
            )}
        </Modal>
    );
};