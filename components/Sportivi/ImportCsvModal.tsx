import React, { useState, useEffect } from 'react';
import { Card, Button } from '../ui';
import { X, Upload, FileText, AlertCircle, CheckCircle2, Loader2, ChevronRight } from 'lucide-react';
import { parseCSVWithEncoding } from '../../utils/csv';
import { useError } from '../ErrorProvider';
import { importSportiviMapped, ImportReport } from '../../services/importSportiviService';
import { Grad } from '../../types';
import * as XLSX from 'xlsx';

// Câmpurile aplicației cu label și dacă sunt obligatorii
const APP_FIELDS: { key: string; label: string; required: boolean }[] = [
    { key: 'nume', label: 'Nume', required: true },
    { key: 'prenume', label: 'Prenume', required: true },
    { key: 'email', label: 'Email', required: false },
    { key: 'cnp', label: 'CNP', required: false },
    { key: 'data_nasterii', label: 'Data nașterii', required: false },
    { key: 'telefon', label: 'Telefon', required: false },
    { key: 'adresa', label: 'Adresă', required: false },
    { key: 'gen', label: 'Gen', required: false },
    { key: 'grad_actual_id', label: 'Grad', required: false },
    { key: 'data_inscrierii', label: 'Data înscrierii', required: false },
    { key: 'status', label: 'Status', required: false },
];

// Sinonime pentru mapare automată
const FIELD_SYNONYMS: Record<string, string[]> = {
    nume: ['nume', 'last_name', 'lastname', 'family_name', 'familyname', 'surname'],
    prenume: ['prenume', 'first_name', 'firstname', 'forename', 'given_name'],
    email: ['email', 'e-mail', 'mail', 'email_address'],
    cnp: ['cnp', 'cod_numeric_personal', 'cod numeric personal', 'personal_id', 'id_number'],
    data_nasterii: ['data_nasterii', 'data nasterii', 'birth_date', 'birthdate', 'dob', 'date_of_birth', 'data_de_nastere'],
    telefon: ['telefon', 'phone', 'tel', 'mobile', 'mobil', 'phone_number', 'nr_telefon'],
    adresa: ['adresa', 'address', 'adresă', 'addr'],
    gen: ['gen', 'sex', 'gender', 'sexul'],
    grad_actual_id: ['grad_actual_id', 'grad_actual', 'grad', 'grade', 'belt', 'centura'],
    data_inscrierii: ['data_inscrierii', 'data inscrierii', 'enrollment_date', 'join_date', 'data_inregistrarii'],
    status: ['status', 'stare', 'activ', 'active'],
};

function autoMapFields(csvColumns: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    for (const field of APP_FIELDS) {
        const synonyms = FIELD_SYNONYMS[field.key] || [field.key];
        const match = csvColumns.find(col =>
            synonyms.includes(col.trim().toLowerCase().replace(/\s+/g, '_'))
            || synonyms.includes(col.trim().toLowerCase())
        );
        mapping[field.key] = match || '';
    }
    return mapping;
}

function isMappingComplete(mapping: Record<string, string>): boolean {
    return APP_FIELDS.filter(f => f.required).every(f => !!mapping[f.key]);
}

interface ImportCsvModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: () => void;
    activeClubId: string;
    defaultGrupaId: string;
    grade: Grad[];
}

type Step = 'upload' | 'mapping' | 'preview' | 'result';

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({ isOpen, onClose, onImportComplete, activeClubId, defaultGrupaId, grade }) => {
    const [file, setFile] = useState<File | null>(null);
    const [csvColumns, setCsvColumns] = useState<string[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [autoMapped, setAutoMapped] = useState(false);
    const [step, setStep] = useState<Step>('upload');
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [report, setReport] = useState<ImportReport | null>(null);
    const { showError } = useError();

    // Reset la fiecare deschidere
    useEffect(() => {
        if (isOpen) {
            setFile(null);
            setCsvColumns([]);
            setRawData([]);
            setPreviewData([]);
            setMapping({});
            setAutoMapped(false);
            setStep('upload');
            setStatus('idle');
            setMessage('');
            setReport(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const processData = (data: any[]) => {
        setRawData(data);
        setPreviewData(data.slice(0, 5));
        if (data.length > 0) {
            const cols = Object.keys(data[0]);
            setCsvColumns(cols);
            const autoMap = autoMapFields(cols);
            setMapping(autoMap);
            const complete = isMappingComplete(autoMap);
            setAutoMapped(complete);
            setStep(complete ? 'preview' : 'mapping');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setStatus('idle');
        setMessage('');
        setReport(null);

        const ext = selectedFile.name.split('.').pop()?.toLowerCase();
        if (ext === 'xlsx' || ext === 'xls') {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const wb = XLSX.read(ev.target?.result, { type: 'array' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const data = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
                    processData(data);
                } catch (err: any) {
                    showError('Eroare Excel', err.message);
                }
            };
            reader.readAsArrayBuffer(selectedFile);
        } else {
            parseCSVWithEncoding(
                selectedFile,
                { header: true },
                (results) => processData(results.data as any[])
            );
        }
    };

    const handleMappingChange = (appField: string, csvCol: string) => {
        setMapping(prev => ({ ...prev, [appField]: csvCol }));
    };

    const applyMappingToData = (data: any[]): any[] => {
        return data.map(row => {
            const mapped: Record<string, any> = {};
            for (const [appField, csvCol] of Object.entries(mapping)) {
                if (csvCol) mapped[appField] = row[csvCol] ?? '';
            }
            return mapped;
        });
    };

    const handleGoToPreview = () => {
        const mappedPreview = applyMappingToData(rawData.slice(0, 5));
        setPreviewData(mappedPreview);
        setStep('preview');
    };

    const handleUpload = () => {
        if (!file) return;
        setStatus('uploading');
        const mappedData = applyMappingToData(rawData);
        importSportiviMapped(mappedData, activeClubId, defaultGrupaId, grade)
            .then(rep => {
                setReport(rep);
                setStep('result');
                if (rep.erori > 0) {
                    setStatus('error');
                    setMessage(`Import finalizat cu ${rep.erori} erori.`);
                } else {
                    setStatus('success');
                    setMessage(`Import realizat cu succes! ${rep.succes} sportivi procesați.`);
                    setTimeout(onImportComplete, 1500);
                }
            })
            .catch(err => {
                setStatus('error');
                setStep('result');
                showError('Eroare Import', err.message);
            });
    };

    const requiredMissing = APP_FIELDS.filter(f => f.required && !mapping[f.key]);

    return (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 sm:p-4 backdrop-blur-sm">
            <Card className="w-full sm:max-w-2xl bg-zinc-900 border-zinc-800 p-4 sm:p-6 shadow-2xl rounded-t-2xl sm:rounded-2xl">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                        <Upload className="w-5 h-5 text-amber-500" />
                        Import Sportivi (CSV)
                    </h2>
                    <Button variant="secondary" onClick={onClose} className="!p-2 min-h-[40px] min-w-[40px] touch-manipulation"><X className="w-5 h-5" /></Button>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-1 text-xs mb-5 overflow-x-auto pb-1">
                    {(['upload', 'mapping', 'preview', 'result'] as Step[]).map((s, i) => {
                        const labels: Record<Step, string> = { upload: '1. Fișier', mapping: '2. Mapare', preview: '3. Preview', result: '4. Rezultat' };
                        const active = step === s;
                        const done = ['upload', 'mapping', 'preview', 'result'].indexOf(step) > i;
                        return (
                            <React.Fragment key={s}>
                                <span className={`px-2 py-0.5 rounded whitespace-nowrap ${active ? 'bg-amber-500 text-black font-semibold' : done ? 'text-green-400' : 'text-zinc-500'}`}>
                                    {labels[s]}
                                </span>
                                {i < 3 && <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />}
                            </React.Fragment>
                        );
                    })}
                </div>

                <div className="max-h-[60vh] sm:max-h-[65vh] overflow-y-auto pr-1">

                    {/* STEP: UPLOAD */}
                    {step === 'upload' && (
                        <div className="space-y-4">
                            <div className="p-3 bg-zinc-800/60 border border-zinc-700 rounded-lg text-xs text-zinc-400">
                                Selectează un fișier CSV. Coloanele vor fi mapate automat sau manual în pasul următor.
                            </div>
                            <div className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all min-h-[120px] flex items-center justify-center ${file ? 'border-amber-500 bg-amber-500/5' : 'border-zinc-700 hover:border-zinc-500'}`}>
                                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" id="csv-upload" />
                                <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-3 touch-manipulation w-full">
                                    {file ? <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500" /> : <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-500" />}
                                    <span className="text-zinc-300 font-medium text-sm sm:text-base break-all px-2">{file ? file.name : 'Selectează fișierul CSV'}</span>
                                    <span className="text-xs text-zinc-500">Formate acceptate: .csv, .xlsx, .xls</span>
                                </label>
                            </div>
                            <div className="text-center">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        const headers = ["nume", "prenume", "email", "cnp", "data_nasterii", "telefon", "adresa", "gen", "data_inscrierii", "status", "grad_actual_id"];
                                        const csv = "data:text/csv;charset=utf-8," + headers.join(",");
                                        const link = document.createElement("a");
                                        link.setAttribute("href", encodeURI(csv));
                                        link.setAttribute("download", "sablon_import_sportivi.csv");
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                >
                                    Descarcă șablon CSV
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP: MAPPING */}
                    {step === 'mapping' && (
                        <div className="space-y-4">
                            {autoMapped ? (
                                <div className="flex items-center gap-2 bg-green-900/30 border border-green-700 text-green-400 rounded-lg px-4 py-2 text-sm font-medium">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    Mapare detectată automat — toate câmpurile obligatorii au fost identificate.
                                </div>
                            ) : (
                                <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-700 text-amber-400 rounded-lg px-4 py-2 text-sm">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>Maparea automată nu a detectat toate câmpurile obligatorii. Verifică și completează manual.</span>
                                </div>
                            )}

                            {/* Tabel desktop (sm+) */}
                            <div className="hidden sm:block overflow-x-auto border border-zinc-800 rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-zinc-800">
                                        <tr>
                                            <th className="p-2 text-left text-zinc-300 font-medium w-1/2">Coloana din fișier</th>
                                            <th className="p-2 text-left text-zinc-300 font-medium w-1/2">Câmp aplicație</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {APP_FIELDS.map(field => (
                                            <tr key={field.key} className="border-t border-zinc-800">
                                                <td className="p-2">
                                                    <select
                                                        value={mapping[field.key] || ''}
                                                        onChange={e => handleMappingChange(field.key, e.target.value)}
                                                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                                                    >
                                                        <option value="">— Ignoră —</option>
                                                        {csvColumns.map(col => (
                                                            <option key={col} value={col}>{col}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-2 text-zinc-300 text-xs flex items-center gap-1">
                                                    {field.label}
                                                    {field.required && <span className="text-red-400 text-xs">*</span>}
                                                    {mapping[field.key] && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto" />}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Carduri mobile (< sm) */}
                            <div className="sm:hidden space-y-2 border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800">
                                {APP_FIELDS.map(field => (
                                    <div key={field.key} className="p-3 bg-zinc-900">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                                                {field.label}
                                                {field.required && <span className="text-red-400">*</span>}
                                            </span>
                                            {mapping[field.key] && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                                        </div>
                                        <select
                                            value={mapping[field.key] || ''}
                                            onChange={e => handleMappingChange(field.key, e.target.value)}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500 touch-manipulation"
                                        >
                                            <option value="">— Ignoră —</option>
                                            {csvColumns.map(col => (
                                                <option key={col} value={col}>{col}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            {requiredMissing.length > 0 && (
                                <p className="text-xs text-red-400">
                                    Câmpuri obligatorii nemapate: {requiredMissing.map(f => f.label).join(', ')}
                                </p>
                            )}
                        </div>
                    )}

                    {/* STEP: PREVIEW */}
                    {step === 'preview' && (
                        <div className="space-y-4">
                            {autoMapped && (
                                <div className="flex items-center gap-2 bg-green-900/30 border border-green-700 text-green-400 rounded-lg px-4 py-2 text-sm font-medium">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    Mapare detectată automat — toate câmpurile obligatorii au fost identificate.
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-zinc-400 mb-2">
                                    Primele {previewData.length} rânduri din <span className="text-white font-medium">{rawData.length}</span> total:
                                </p>
                                <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                                    <table className="w-full text-xs text-zinc-300">
                                        <thead className="bg-zinc-800">
                                            <tr>
                                                {APP_FIELDS.filter(f => mapping[f.key]).map(f => (
                                                    <th key={f.key} className="p-2 text-left whitespace-nowrap">{f.label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.map((row, i) => (
                                                <tr key={i} className="border-t border-zinc-800">
                                                    {APP_FIELDS.filter(f => mapping[f.key]).map(f => (
                                                        <td key={f.key} className="p-2 whitespace-nowrap">{row[f.key] ?? ''}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP: RESULT */}
                    {step === 'result' && (
                        <div className="space-y-4">
                            {status === 'uploading' && (
                                <div className="flex items-center justify-center gap-2 text-amber-500 py-8">
                                    <Loader2 className="w-6 h-6 animate-spin" /> Se procesează datele...
                                </div>
                            )}
                            {status === 'success' && (
                                <div className="flex items-center gap-2 text-green-500 bg-green-900/20 p-4 rounded-lg">
                                    <CheckCircle2 className="w-5 h-5" /> {message}
                                </div>
                            )}
                            {status === 'error' && (
                                <div className="text-red-400 bg-red-900/20 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2 font-medium"><AlertCircle className="w-5 h-5" /> {message}</div>
                                    {report && report.succes > 0 && (
                                        <p className="text-sm text-green-400 mb-2">{report.succes} sportivi importați cu succes.</p>
                                    )}
                                    {report && report.detalii_erori.length > 0 && (
                                        <ul className="text-xs list-disc pl-5 max-h-48 overflow-y-auto space-y-1">
                                            {report.detalii_erori.map((err, i) => <li key={i}>{err}</li>)}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer butoane */}
                <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2 border-t border-zinc-800 pt-4">
                    <div>
                        {step !== 'upload' && step !== 'result' && (
                            <Button
                                variant="secondary"
                                onClick={() => setStep(step === 'preview' ? 'mapping' : 'upload')}
                                className="w-full sm:w-auto touch-manipulation"
                            >
                                Înapoi
                            </Button>
                        )}
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row gap-2">
                        <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto touch-manipulation">Închide</Button>
                        {step === 'mapping' && (
                            <Button
                                onClick={handleGoToPreview}
                                disabled={requiredMissing.length > 0}
                                className="w-full sm:w-auto touch-manipulation"
                            >
                                Preview <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        )}
                        {step === 'preview' && (
                            <Button onClick={handleUpload} className="w-full sm:w-auto touch-manipulation">
                                Importă {rawData.length} sportivi
                            </Button>
                        )}
                        {step === 'result' && status === 'success' && (
                            <Button onClick={onImportComplete} className="w-full sm:w-auto touch-manipulation">Finalizează</Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};
