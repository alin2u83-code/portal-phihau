import React, { useState } from 'react';
import { Card, Button } from '../ui';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { useError } from '../ErrorProvider';
import { importSportivi, ImportReport } from '../../services/importSportiviService';

interface ImportCsvModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: () => void;
    activeClubId: string;
    defaultGrupaId: string;
}

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({ isOpen, onClose, onImportComplete, activeClubId, defaultGrupaId }) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [report, setReport] = useState<ImportReport | null>(null);
    const { showError } = useError();

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setStatus('idle');
            setMessage('');
            setReport(null);
            
            // Generate preview
            Papa.parse(selectedFile, {
                header: true,
                preview: 5,
                complete: (results) => {
                    setPreviewData(results.data);
                }
            });
        }
    };

    const handleUpload = () => {
        if (!file) return;
        setStatus('uploading');
        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                try {
                    const report = await importSportivi(results.data, activeClubId, defaultGrupaId);
                    setReport(report);
                    
                    if (report.erori > 0) {
                        setStatus('error');
                        setMessage(`Import finalizat cu ${report.erori} erori.`);
                    } else {
                        setStatus('success');
                        setMessage(`Import realizat cu succes! ${report.succes} sportivi procesați.`);
                        setTimeout(onImportComplete, 1500);
                    }
                } catch (err: any) {
                    setStatus('error');
                    showError('Eroare Import', err.message);
                }
            },
            error: (err) => {
                setStatus('error');
                showError('Eroare Parsare CSV', err.message);
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg bg-zinc-900 border-zinc-800 p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Upload className="w-5 h-5 text-amber-500" />
                        Import Sportivi (CSV)
                    </h2>
                    <Button variant="secondary" onClick={onClose} className="!p-2"><X className="w-5 h-5" /></Button>
                </div>

                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${file ? 'border-amber-500 bg-amber-500/5' : 'border-zinc-700 hover:border-zinc-500'}`}>
                    <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" id="csv-upload" />
                    <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-4">
                        {file ? <FileText className="w-12 h-12 text-amber-500" /> : <Upload className="w-12 h-12 text-zinc-500" />}
                        <span className="text-zinc-300 font-medium">{file ? file.name : 'Selectează fișierul CSV'}</span>
                        <span className="text-xs text-zinc-500">Format acceptat: .csv</span>
                    </label>
                </div>

                {previewData.length > 0 && (
                    <div className="mt-4">
                        <h3 className="text-sm font-medium text-zinc-400 mb-2">Previzualizare (primele 5 rânduri):</h3>
                        <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                            <table className="w-full text-xs text-zinc-300">
                                <thead className="bg-zinc-800">
                                    <tr>
                                        {Object.keys(previewData[0]).map(key => <th key={key} className="p-2 text-left">{key}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.map((row, i) => (
                                        <tr key={i} className="border-t border-zinc-800">
                                            {Object.values(row).map((val: any, j) => <td key={j} className="p-2">{val}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {status === 'uploading' && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-amber-500">
                        <Loader2 className="w-5 h-5 animate-spin" /> Se procesează datele...
                    </div>
                )}
                {status === 'success' && <div className="mt-4 flex items-center gap-2 text-green-500 bg-green-900/20 p-3 rounded-lg"><CheckCircle2 /> {message}</div>}
                {status === 'error' && (
                    <div className="mt-4 text-red-500 bg-red-900/20 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2"><AlertCircle /> {message}</div>
                        {report && report.detalii_erori.length > 0 && (
                            <ul className="text-xs list-disc pl-5 mt-2 max-h-40 overflow-y-auto">
                                {report.detalii_erori.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        )}
                    </div>
                )}
                
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Anulează</Button>
                    <Button onClick={handleUpload} disabled={!file || status === 'uploading'}>
                        {status === 'uploading' ? 'Se încarcă...' : 'Importă Date'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};
