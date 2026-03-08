import React, { useState } from 'react';
import { Modal, Button, Input } from './ui';
import { UploadCloudIcon, FileTextIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from './icons';
import Papa from 'papaparse';
import { useError } from './ErrorProvider';
import { supabase } from '../supabaseClient';
import { useRoleAssignment } from '../hooks/useRoleAssignment';
import { useData } from '../contexts/DataContext';
import { Club, User } from '../types';
import { ResponsiveTable, Column } from './ResponsiveTable';

interface ImportSportiviModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: () => void;
    currentUser: User;
    clubs: Club[];
}

export const ImportSportiviModal: React.FC<ImportSportiviModalProps> = ({ 
    isOpen, 
    onClose, 
    onImportComplete, 
    currentUser, 
    clubs 
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
    const [logs, setLogs] = useState<string[]>([]);
    const [headerMap, setHeaderMap] = useState<Record<string, string>>({});
    const [isParsing, setIsParsing] = useState(false);
    const { showError, showSuccess } = useError();
    const { allRoles } = useData();
    const { createAccountAndAssignRole } = useRoleAssignment(currentUser, allRoles);

    interface ImportRow {
        id: number;
        nume: string;
        prenume: string;
        data_nasterii: string;
        gen: string;
        club: string;
        selected: boolean;
        isValid: boolean;
        errors: string[];
    }

    const [importRows, setImportRows] = useState<ImportRow[]>([]);
    const [selectAll, setSelectAll] = useState(true);

    const isSuperAdmin = currentUser?.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN');

    const sanitize = (str: string) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');

    const parseDate = (dateStr: string): string | null => {
        if (!dateStr) return null;
        
        // Try DD/MM/YYYY or D/M/YYYY
        const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
        if (dmyMatch) {
            const day = dmyMatch[1].padStart(2, '0');
            const month = dmyMatch[2].padStart(2, '0');
            const year = dmyMatch[3];
            return `${year}-${month}-${day}`;
        }

        // Try YYYY-MM-DD (fallback)
        const ymdMatch = dateStr.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
        if (ymdMatch) {
            const year = ymdMatch[1];
            const month = ymdMatch[2].padStart(2, '0');
            const day = ymdMatch[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        return null;
    };

    const handleAddRow = () => {
        const newId = Math.max(...importRows.map(r => r.id), -1) + 1;
        const newRow: ImportRow = {
            id: newId,
            nume: '',
            prenume: '',
            data_nasterii: '',
            gen: '',
            club: isSuperAdmin ? '' : (clubs.find(c => c.id === currentUser.club_id)?.nume || ''),
            selected: false,
            isValid: false,
            errors: ['Nume lipsă', 'Prenume lipsă', 'Data nașterii lipsă']
        };
        setImportRows(prev => [newRow, ...prev]);
    };

    const downloadTemplate = () => {
        const headers = ['Nume', 'Prenume', 'Data Nasterii', 'Gen', 'Club'];
        const exampleRow = ['Popescu', 'Ion', '20/05/2010', 'M', isSuperAdmin ? 'Nume Club' : ''];
        const csvContent = "data:text/csv;charset=utf-8," + 
            headers.join(",") + "\n" + 
            exampleRow.join(",");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "model_import_sportivi.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const parseCSV = (file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setIsParsing(false);
                if (results.data && results.data.length > 0) {
                    // Validate headers
                    const headers = results.meta.fields || [];
                    const required = ['nume', 'prenume', 'data nasterii'];
                    
                    const newHeaderMap: Record<string, string> = {};
                    const missing: string[] = [];

                    required.forEach(req => {
                        const found = headers.find(h => h.trim().toLowerCase() === req);
                        if (found) {
                            newHeaderMap[req] = found;
                        } else {
                            missing.push(req);
                        }
                    });
                    
                    const foundClub = headers.find(h => h.trim().toLowerCase() === 'club');
                    if (foundClub) newHeaderMap['club'] = foundClub;

                    const foundGen = headers.find(h => h.trim().toLowerCase() === 'gen');
                    if (foundGen) newHeaderMap['gen'] = foundGen;

                    if (missing.length > 0) {
                        showError("Format CSV Invalid", `Lipsesc coloanele obligatorii: ${missing.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')}`);
                        setFile(null);
                        setPreviewData([]);
                        return;
                    }
                    
                    setHeaderMap(newHeaderMap);
                    setPreviewData(results.data as any[]); // Keep raw data for debug if needed

                    // Transform to ImportRow
                    const rows: ImportRow[] = results.data.map((row: any, index: number) => {
                        const nume = row[newHeaderMap['nume']]?.trim() || '';
                        const prenume = row[newHeaderMap['prenume']]?.trim() || '';
                        const data_nasterii = row[newHeaderMap['data nasterii']]?.trim() || '';
                        const gen = newHeaderMap['gen'] ? row[newHeaderMap['gen']]?.trim() || '' : '';
                        const club = newHeaderMap['club'] ? row[newHeaderMap['club']]?.trim() || '' : '';

                        const errors: string[] = [];
                        if (!nume) errors.push('Nume lipsă');
                        if (!prenume) errors.push('Prenume lipsă');
                        if (!data_nasterii) errors.push('Data nașterii lipsă');
                        else if (!parseDate(data_nasterii)) errors.push('Format dată invalid (DD/MM/YYYY)');

                        return {
                            id: index,
                            nume,
                            prenume,
                            data_nasterii,
                            gen,
                            club,
                            selected: errors.length === 0, // Auto-select valid rows
                            isValid: errors.length === 0,
                            errors
                        };
                    });
                    setImportRows(rows);
                } else {
                    console.warn("CSV Parsed but no data found:", results);
                }
            },
            error: (error) => {
                setIsParsing(false);
                console.error("CSV Parsing Error:", error);
                showError("Eroare la citire CSV", error.message);
            }
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setIsParsing(true);
            setProgress({ current: 0, total: 0, success: 0, failed: 0 }); // Reset progress
            setPreviewData([]);
            setImportRows([]);
            setSelectAll(true);
            // Allow UI to update before parsing
            setTimeout(() => parseCSV(selectedFile), 50);
        }
    };

    const handleRowChange = (id: number, field: keyof ImportRow, value: string | boolean) => {
        setImportRows(prev => prev.map(row => {
            if (row.id !== id) return row;

            const updatedRow = { ...row, [field]: value };
            
            // Re-validate if data fields changed
            if (field !== 'selected' && field !== 'isValid' && field !== 'errors' && field !== 'id') {
                const errors: string[] = [];
                if (!updatedRow.nume) errors.push('Nume lipsă');
                if (!updatedRow.prenume) errors.push('Prenume lipsă');
                if (!updatedRow.data_nasterii) errors.push('Data nașterii lipsă');
                else if (!parseDate(updatedRow.data_nasterii as string)) errors.push('Format dată invalid');
                
                updatedRow.errors = errors;
                updatedRow.isValid = errors.length === 0;
                if (!updatedRow.isValid) updatedRow.selected = false; // Deselect if invalid
            }

            return updatedRow as ImportRow;
        }));
    };

    const toggleSelectAll = () => {
        const newValue = !selectAll;
        setSelectAll(newValue);
        setImportRows(prev => prev.map(row => ({
            ...row,
            selected: row.isValid ? newValue : false // Only select valid rows
        })));
    };

    const columns: Column<ImportRow>[] = [
        {
            key: 'select',
            label: '#',
            headerClassName: 'w-8 text-center',
            cellClassName: 'text-center',
            render: (row) => (
                <input 
                    type="checkbox" 
                    checked={row.selected} 
                    onChange={(e) => handleRowChange(row.id, 'selected', e.target.checked)}
                    disabled={!row.isValid}
                    className="rounded border-slate-600 bg-slate-700 text-brand-primary focus:ring-brand-primary disabled:opacity-50"
                />
            )
        },
        {
            key: 'nume',
            label: 'Nume',
            render: (row) => (
                <input 
                    type="text" 
                    value={row.nume} 
                    onChange={(e) => handleRowChange(row.id, 'nume', e.target.value)}
                    className={`w-full bg-transparent border-b border-transparent focus:border-brand-primary focus:outline-none px-1 py-1 ${!row.nume ? 'border-red-500/50 bg-red-500/10' : ''}`}
                    placeholder="Nume"
                />
            )
        },
        {
            key: 'prenume',
            label: 'Prenume',
            render: (row) => (
                <input 
                    type="text" 
                    value={row.prenume} 
                    onChange={(e) => handleRowChange(row.id, 'prenume', e.target.value)}
                    className={`w-full bg-transparent border-b border-transparent focus:border-brand-primary focus:outline-none px-1 py-1 ${!row.prenume ? 'border-red-500/50 bg-red-500/10' : ''}`}
                    placeholder="Prenume"
                />
            )
        },
        {
            key: 'data_nasterii',
            label: 'Data Nașterii',
            render: (row) => (
                <input 
                    type="text" 
                    value={row.data_nasterii} 
                    onChange={(e) => handleRowChange(row.id, 'data_nasterii', e.target.value)}
                    className={`w-full bg-transparent border-b border-transparent focus:border-brand-primary focus:outline-none px-1 py-1 ${!row.data_nasterii || !parseDate(row.data_nasterii) ? 'border-red-500/50 bg-red-500/10' : ''}`}
                    placeholder="DD/MM/YYYY"
                />
            )
        },
        {
            key: 'gen',
            label: 'Gen',
            render: (row) => (
                <select 
                    value={row.gen} 
                    onChange={(e) => handleRowChange(row.id, 'gen', e.target.value)}
                    className="w-full bg-slate-800 border-none focus:ring-1 focus:ring-brand-primary rounded px-1 py-1 text-xs"
                >
                    <option value="">Select</option>
                    <option value="M">Masculin</option>
                    <option value="F">Feminin</option>
                </select>
            )
        },
        {
            key: 'club',
            label: 'Club',
            render: (row) => (
                isSuperAdmin ? (
                    <select 
                        value={row.club} 
                        onChange={(e) => handleRowChange(row.id, 'club', e.target.value)}
                        className={`w-full bg-slate-800 border-none focus:ring-1 focus:ring-brand-primary rounded px-1 py-1 text-xs ${!row.club ? 'border-red-500/50 bg-red-500/10' : ''}`}
                    >
                        <option value="">Selectează Club</option>
                        {clubs.map(c => (
                            <option key={c.id} value={c.nume}>{c.nume}</option>
                        ))}
                    </select>
                ) : (
                    <input 
                        type="text" 
                        value={row.club} 
                        readOnly
                        className="w-full bg-transparent border-none px-1 py-1 text-slate-500 cursor-not-allowed"
                    />
                )
            )
        },
        {
            key: 'valid',
            label: 'Valid',
            headerClassName: 'w-8 text-center',
            cellClassName: 'text-center',
            render: (row) => (
                row.isValid ? (
                    <CheckCircleIcon className="w-4 h-4 text-green-500 mx-auto" />
                ) : (
                    <div className="group relative inline-block">
                        <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mx-auto cursor-help" />
                        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 w-48 bg-slate-900 border border-slate-700 p-2 rounded shadow-xl z-50 hidden group-hover:block pointer-events-none">
                            <ul className="list-disc list-inside text-[10px] text-red-400 text-left">
                                {row.errors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        </div>
                    </div>
                )
            )
        }
    ];

    const renderMobileItem = (row: ImportRow) => (
        <div className={`mb-4 p-4 rounded-lg border-l-4 bg-slate-800/50 ${row.isValid ? 'border-green-500' : 'border-red-500'}`}>
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        checked={row.selected} 
                        onChange={(e) => handleRowChange(row.id, 'selected', e.target.checked)}
                        disabled={!row.isValid}
                        className="rounded border-slate-600 bg-slate-700 text-brand-primary focus:ring-brand-primary disabled:opacity-50"
                    />
                    <span className="font-bold text-white">#{row.id + 1}</span>
                </div>
                {row.isValid ? (
                    <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircleIcon className="w-3 h-3" /> Valid</span>
                ) : (
                    <span className="text-xs text-red-400 flex items-center gap-1"><ExclamationTriangleIcon className="w-3 h-3" /> Invalid</span>
                )}
            </div>

            <div className="grid grid-cols-1 gap-2">
                <Input 
                    label="Nume" 
                    value={row.nume} 
                    onChange={(e) => handleRowChange(row.id, 'nume', e.target.value)} 
                    className={!row.nume ? 'border-red-500/50 bg-red-500/10' : ''}
                />
                <Input 
                    label="Prenume" 
                    value={row.prenume} 
                    onChange={(e) => handleRowChange(row.id, 'prenume', e.target.value)} 
                    className={!row.prenume ? 'border-red-500/50 bg-red-500/10' : ''}
                />
                <Input 
                    label="Data Nașterii" 
                    value={row.data_nasterii} 
                    onChange={(e) => handleRowChange(row.id, 'data_nasterii', e.target.value)} 
                    className={!row.data_nasterii || !parseDate(row.data_nasterii) ? 'border-red-500/50 bg-red-500/10' : ''}
                    placeholder="DD/MM/YYYY"
                />
                
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Gen</label>
                    <select 
                        value={row.gen} 
                        onChange={(e) => handleRowChange(row.id, 'gen', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary"
                    >
                        <option value="">Select</option>
                        <option value="M">Masculin</option>
                        <option value="F">Feminin</option>
                    </select>
                </div>

                {isSuperAdmin && (
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Club</label>
                        <select 
                            value={row.club} 
                            onChange={(e) => handleRowChange(row.id, 'club', e.target.value)}
                            className={`w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary ${!row.club ? 'border-red-500/50 bg-red-500/10' : ''}`}
                        >
                            <option value="">Selectează Club</option>
                            {clubs.map(c => (
                                <option key={c.id} value={c.nume}>{c.nume}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {!row.isValid && (
                <div className="mt-2 p-2 bg-red-900/20 rounded border border-red-900/30">
                    <p className="text-xs font-bold text-red-400 mb-1">Erori:</p>
                    <ul className="list-disc list-inside text-[10px] text-red-300">
                        {row.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </div>
            )}
        </div>
    );

    const processImport = async () => {
        const rowsToImport = importRows.filter(r => r.selected);
        if (!rowsToImport.length) return;
        
        setImporting(true);
        setProgress({ current: 0, total: rowsToImport.length, success: 0, failed: 0 });
        setLogs([]);
        
        const sportivRole = allRoles.find(r => r.nume === 'SPORTIV');
        if (!sportivRole) {
            showError("Eroare", "Rolul 'SPORTIV' nu a fost găsit în sistem.");
            setImporting(false);
            return;
        }

        const BATCH_SIZE = 5;
        
        for (let i = 0; i < rowsToImport.length; i += BATCH_SIZE) {
            const batch = rowsToImport.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (row, batchIndex) => {
                const currentIndex = i + batchIndex;
                
                try {
                    const dataNasterii = parseDate(row.data_nasterii);
                    if (!dataNasterii) throw new Error(`Format dată invalid: ${row.data_nasterii}`);

                    // Determine Club
                    let clubId = currentUser.club_id;
                    if (isSuperAdmin) {
                        if (row.club) {
                            const foundClub = clubs.find(c => c.nume.toLowerCase() === row.club.toLowerCase());
                            if (foundClub) {
                                clubId = foundClub.id;
                            } else {
                                throw new Error(`Clubul '${row.club}' nu a fost găsit.`);
                            }
                        } else {
                            throw new Error("Clubul este obligatoriu pentru admini.");
                        }
                    }

                    if (!clubId) throw new Error("Nu s-a putut determina clubul.");

                    const numeSanitized = sanitize(row.nume);
                    const prenumeSanitized = sanitize(row.prenume);
                    const clubObj = clubs.find(c => c.id === clubId);
                    const domain = clubObj ? sanitize(clubObj.nume) + '.ro' : 'phihau.ro';
                    
                    const randomSuffix = Math.floor(Math.random() * 10000) + row.id;
                    const email = `${numeSanitized}.${prenumeSanitized}.${randomSuffix}@${domain}`;
                    const password = `${row.nume}.1234!`;
                    
                    const profileData: Partial<import('../types').Sportiv> = {
                        nume: row.nume,
                        prenume: row.prenume,
                        data_nasterii: dataNasterii,
                        gen: (row.gen === 'M' || row.gen === 'Masculin' ? 'Masculin' : (row.gen === 'F' || row.gen === 'Feminin' ? 'Feminin' : null)) as 'Masculin' | 'Feminin' | null,
                        club_id: clubId,
                        status: 'Activ' as 'Activ' | 'Inactiv',
                        data_inscrierii: new Date().toISOString().split('T')[0]
                    };

                    const result = await createAccountAndAssignRole(
                        email,
                        password,
                        profileData,
                        [sportivRole]
                    );

                    if (!result.success) {
                        throw new Error(result.error || "Eroare necunoscută la creare.");
                    }

                    setLogs(prev => [...prev, `✅ ${row.nume} ${row.prenume}: Importat cu succes.`]);
                    setProgress(prev => ({ ...prev, success: prev.success + 1, current: prev.current + 1 }));

                } catch (err: any) {
                    console.error(err);
                    setLogs(prev => [...prev, `❌ ${row.nume || 'N/A'} ${row.prenume || 'N/A'}: ${err.message}`]);
                    setProgress(prev => ({ ...prev, failed: prev.failed + 1, current: prev.current + 1 }));
                }
            }));
        }

        setImporting(false);
        if (progress.success > 0) {
            onImportComplete();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import Sportivi din CSV">
            <div className="space-y-6">
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center">
                        <FileTextIcon className="w-4 h-4 mr-2 text-brand-secondary" />
                        Instrucțiuni
                    </h4>
                    <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
                        <li>Fișierul CSV trebuie să conțină coloanele: <strong>Nume, Prenume, Data Nasterii</strong>.</li>
                        <li>Coloanele opționale sunt: <strong>Gen, Club</strong>.</li>
                        <li>Formatul datei trebuie să fie <strong>DD/MM/YYYY</strong> (ex: 20/05/2010).</li>
                        <li>Coloana <strong>Club</strong> este obligatorie doar pentru Administratori.</li>
                        <li>Se vor crea automat conturi de utilizator cu email și parolă generate.</li>
                    </ul>
                    <Button variant="secondary" size="sm" onClick={downloadTemplate} className="mt-3 w-full sm:w-auto">
                        Descarcă Model CSV
                    </Button>
                </div>

                {isParsing ? (
                    <div className="border-2 border-dashed border-slate-600 rounded-lg p-12 text-center flex flex-col items-center justify-center animate-pulse">
                        <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-300 font-medium">Se analizează fișierul CSV...</p>
                        <p className="text-xs text-slate-500 mt-2">Vă rugăm așteptați, procesarea poate dura câteva secunde.</p>
                    </div>
                ) : !previewData.length ? (
                    <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-brand-primary transition-colors">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                            id="csv-upload"
                        />
                        <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                            <UploadCloudIcon className="w-12 h-12 text-slate-500 mb-2" />
                            <span className="text-slate-300 font-medium">Click pentru a încărca fișierul CSV</span>
                            <span className="text-xs text-slate-500 mt-1">Maxim 100 de rânduri recomandat</span>
                        </label>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">
                                {importRows.length} sportivi identificați
                            </span>
                            <Button variant="secondary" size="sm" onClick={() => { setFile(null); setPreviewData([]); setImportRows([]); setLogs([]); setSelectAll(true); }} disabled={importing}>
                                Schimbă Fișierul
                            </Button>
                        </div>

                        {importing && (
                            <div className="space-y-2 bg-slate-800 p-4 rounded-lg border border-slate-700">
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>Progres Import</span>
                                    <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                                </div>
                                <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                                    <div 
                                        className="h-full bg-brand-primary transition-all duration-300 relative overflow-hidden"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                                    </div>
                                </div>
                                <p className="text-xs text-center text-slate-300 mt-2 font-mono">
                                    Procesat: {progress.current} / {progress.total} <span className="text-slate-500 mx-1">|</span> 
                                    <span className="text-green-400">Succes: {progress.success}</span> <span className="text-slate-500 mx-1">|</span>
                                    <span className="text-red-400">Eșuate: {progress.failed}</span>
                                </p>
                                <p className="text-[10px] text-center text-amber-500 mt-1 animate-pulse">
                                    ⚠️ Vă rugăm nu închideți fereastra până la finalizare.
                                </p>
                            </div>
                        )}

                        {!importing && importRows.length > 0 && (
                            <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden flex flex-col max-h-[400px]">
                                <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 font-bold text-xs text-slate-300 uppercase flex justify-between items-center shrink-0">
                                    <span>Previzualizare și Editare ({importRows.filter(r => r.selected).length} selectați)</span>
                                    <div className="flex items-center space-x-2">
                                        <Button variant="secondary" size="sm" onClick={handleAddRow} className="!py-0.5 !px-2 mr-2 !text-[10px]">
                                            + Adaugă Rând
                                        </Button>
                                        <input 
                                            type="checkbox" 
                                            checked={selectAll} 
                                            onChange={toggleSelectAll}
                                            className="rounded border-slate-600 bg-slate-700 text-brand-primary focus:ring-brand-primary"
                                        />
                                        <span className="text-[10px] text-slate-400">Selectează Tot</span>
                                    </div>
                                </div>
                                <div className="overflow-auto custom-scrollbar">
                                    <ResponsiveTable 
                                        columns={columns}
                                        data={importRows}
                                        renderMobileItem={renderMobileItem}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="max-h-60 overflow-y-auto bg-slate-950 rounded border border-slate-800 p-2 text-xs font-mono space-y-1 custom-scrollbar">
                            {logs.length > 0 ? logs.map((log, i) => (
                                <div key={i} className={log.startsWith('✅') ? 'text-green-400 border-b border-green-900/30 pb-1 mb-1' : 'text-red-400 border-b border-red-900/30 pb-1 mb-1'}>
                                    {log}
                                </div>
                            )) : (
                                <div className="text-slate-500 italic text-center py-4">
                                    Jurnalul de import va apărea aici...
                                </div>
                            )}
                        </div>

                        {/* Debug Info Section */}
                        <details className="text-[10px] text-slate-500 cursor-pointer">
                            <summary className="hover:text-slate-300">Informații Debug (Click pentru detalii)</summary>
                            <div className="mt-2 p-2 bg-black rounded border border-slate-800 font-mono whitespace-pre-wrap">
                                <p>Header Map: {JSON.stringify(headerMap, null, 2)}</p>
                                <p>First Row Raw: {JSON.stringify(previewData[0], null, 2)}</p>
                            </div>
                        </details>

                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                            <Button variant="secondary" onClick={onClose} disabled={importing}>
                                {importing ? 'Se procesează...' : 'Închide'}
                            </Button>
                            <Button variant="primary" onClick={processImport} isLoading={importing} disabled={importing || (progress.total > 0 && progress.current === progress.total) || importRows.filter(r => r.selected).length === 0}>
                                Importă {importRows.filter(r => r.selected).length} Sportivi
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
