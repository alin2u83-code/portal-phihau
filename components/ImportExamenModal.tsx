import React, { useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import { SesiuneExamen } from '../types';
import { Modal, Button } from './ui';
import { UploadCloudIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface CsvRow {
  cnp: string;
  ordine_grad: string;
  rezultat: 'Admis' | 'Respins' | 'Neprezentat';
  contributie: string;
  data_examen?: string;
}

interface ProcessResult {
  status: 'Succes' | 'Eroare' | 'Avertisment';
  message: string;
  rowData: CsvRow;
}

interface ImportExamenModalProps {
    isOpen: boolean;
    onClose: () => void;
    sesiune: SesiuneExamen;
    onImportComplete: () => void;
}

export const ImportExamenModal: React.FC<ImportExamenModalProps> = ({ isOpen, onClose, sesiune, onImportComplete }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<CsvRow[]>([]);
    const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'results'>('upload');
    const [importResults, setImportResults] = useState<ProcessResult[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const { showError } = useError();
    
    const REQUIRED_HEADERS = ['cnp', 'ordine_grad', 'rezultat', 'contributie'];

    const resetState = useCallback(() => {
        setFile(null);
        setParsedData([]);
        setStep('upload');
        setImportResults([]);
    }, []);

    const handleClose = useCallback(() => {
        resetState();
        onClose();
    }, [resetState, onClose]);

    const handleFileParse = (fileToParse: File) => {
        setFile(fileToParse);
        setStep('preview');
        Papa.parse<CsvRow>(fileToParse, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const headers = results.meta.fields || [];
                const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.map(h => h.toLowerCase()).includes(h));
                if (missingHeaders.length > 0) {
                    showError("Format CSV Invalid", `Coloanele următoare lipsesc: ${missingHeaders.join(', ')}`);
                    resetState();
                    return;
                }
                setParsedData(results.data);
            },
            error: (error) => {
                showError("Eroare la Parsare CSV", error.message);
                resetState();
            }
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileParse(e.target.files[0]);
        }
    };
    
    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(isEntering);
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        handleDragEvents(e, false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileParse(e.dataTransfer.files[0]);
        }
    };

    const handleImport = async () => {
        if (!supabase) { showError("Eroare Configurare", "Client Supabase neinițializat."); return; }
        
        setStep('importing');
        const results: ProcessResult[] = [];

        for (const row of parsedData) {
            try {
                if (!row.cnp || !row.ordine_grad || !row.rezultat) {
                    throw new Error('Rând invalid. Asigurați-vă că `cnp`, `ordine_grad` și `rezultat` sunt completate.');
                }
                
                // Pentru a asigura integritatea datelor și securitatea, toată logica de procesare
                // este încapsulată în funcția `process_exam_row` din baza de date (PostgreSQL).
                // Aceasta este cea mai bună practică din următoarele motive:
                // 1. Atomicitate: Toți pașii (găsire sportiv, verificare duplicate, update grad, creare plată)
                //    se execută într-o singură tranzacție. Dacă un pas eșuează, totul este anulat automat.
                // 2. Performanță: O singură cerere RPC este mult mai rapidă decât multiple interogări separate.
                // 3. Securitate: Logica rulează cu privilegii controlate pe server, nu pe client.
                //
                // Funcția RPC gestionează deja următoarele validări solicitate:
                // - Validare CNP: Aruncă o eroare dacă CNP-ul nu este găsit în `public.sportivi`.
                // - Prevenire Duplicate: Verifică `istoric_grade` și returnează un avertisment dacă gradul există deja.
                // - Automatizare Plăți: Creează o factură 'Achitat' și o tranzacție pentru fiecare rezultat 'Admis'.
                // - Tratare Erori: Orice eroare de validare din RPC este prinsă în blocul `catch` de mai jos și afișată în lista finală.
                const { data: rpcResult, error: rpcError } = await supabase.rpc('process_exam_row', {
                    p_cnp: String(row.cnp).trim(),
                    p_ordine_grad: Number(row.ordine_grad),
                    p_rezultat: row.rezultat,
                    p_contributie: Number(row.contributie) || 0,
                    p_data_examen: row.data_examen || sesiune.data,
                    p_sesiune_id: sesiune.id,
                });

                if (rpcError) throw rpcError;
                
                const status = typeof rpcResult === 'string' && rpcResult.startsWith('DUPLICATE_IGNORED:') ? 'Avertisment' : 'Succes';
                results.push({ status, message: rpcResult, rowData: row });

            } catch (error: any) {
                results.push({ status: 'Eroare', message: error.message.replace(/error: /g, '').replace(/hint: .*/, '').trim(), rowData: row });
            }
            setImportResults([...results]);
        }

        setStep('results');
    };

    const importSummary = useMemo(() => {
        return {
            succes: importResults.filter(r => r.status === 'Succes').length,
            avertismente: importResults.filter(r => r.status === 'Avertisment').length,
            erori: importResults.filter(r => r.status === 'Eroare').length,
            total: importResults.length
        };
    }, [importResults]);
    
    const renderContent = () => {
        switch (step) {
            case 'upload': return (
                <div 
                    onDragEnter={(e) => handleDragEvents(e, true)}
                    onDragLeave={(e) => handleDragEvents(e, false)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className={`p-12 border-2 border-dashed rounded-lg text-center transition-colors ${isDragging ? 'border-brand-secondary bg-brand-primary/10' : 'border-slate-600'}`}
                >
                    <UploadCloudIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <label htmlFor="csv-upload" className="font-semibold text-brand-secondary cursor-pointer hover:underline">Alege un fișier</label>
                    <p className="text-sm text-slate-500 mt-1">sau trage-l aici</p>
                    <input id="csv-upload" type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                </div>
            );
            case 'preview': return (
                <div className="space-y-4">
                    <p>Au fost detectate <strong>{parsedData.length}</strong> înregistrări în fișierul <strong>{file?.name}</strong>. Apasă "Start Import" pentru a le procesa.</p>
                    <div className="max-h-60 overflow-y-auto bg-slate-900/50 p-2 rounded-md border border-slate-700">
                        <table className="w-full text-left text-xs">
                            <thead className="text-slate-400"><tr>{REQUIRED_HEADERS.map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead>
                            <tbody className="divide-y divide-slate-700">
                                {parsedData.slice(0,5).map((row, i) => (
                                    <tr key={i}>{REQUIRED_HEADERS.map(h => <td key={h} className="p-2 truncate max-w-xs">{String(row[h as keyof CsvRow] || '')}</td>)}</tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                        <Button variant="secondary" onClick={resetState}>Anulează</Button>
                        <Button variant="primary" onClick={handleImport}>Start Import</Button>
                    </div>
                </div>
            );
            case 'importing': return (
                <div className="text-center p-8 space-y-4">
                    <svg className="animate-spin h-10 w-10 text-brand-secondary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                    <h3 className="text-lg font-bold text-white">Se importă datele...</h3>
                    <p className="text-sm text-slate-400">S-au procesat {importResults.length} / {parsedData.length} înregistrări.</p>
                </div>
            );
            case 'results': return (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">Rezultate Import</h3>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-green-900/50 rounded"><p className="text-xl font-bold text-green-400">{importSummary.succes}</p><p className="text-xs text-slate-400">Succes</p></div>
                        <div className="p-2 bg-amber-900/50 rounded"><p className="text-xl font-bold text-amber-400">{importSummary.avertismente}</p><p className="text-xs text-slate-400">Avertismente</p></div>
                        <div className="p-2 bg-red-900/50 rounded"><p className="text-xl font-bold text-red-400">{importSummary.erori}</p><p className="text-xs text-slate-400">Erori</p></div>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-slate-900/50 rounded-md border border-slate-700">
                        {importResults.map((res, i) => (
                             <div key={i} className={`p-2 rounded text-xs flex gap-2 items-start ${res.status === 'Succes' ? 'bg-green-900/20' : res.status === 'Avertisment' ? 'bg-amber-900/20' : 'bg-red-900/20'}`}>
                                {res.status === 'Succes' && <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />}
                                {res.status === 'Avertisment' && <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 shrink-0" />}
                                {res.status === 'Eroare' && <XCircleIcon className="w-4 h-4 text-red-500 shrink-0" />}
                                <p><strong className="text-white">{res.rowData.cnp}:</strong> <span className="text-slate-300">{res.message}</span></p>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end pt-4 border-t border-slate-700">
                         <Button variant="primary" onClick={() => { handleClose(); onImportComplete(); }}>Finalizează</Button>
                    </div>
                </div>
            );
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Import Rezultate Examen din CSV">
            {renderContent()}
        </Modal>
    );
};