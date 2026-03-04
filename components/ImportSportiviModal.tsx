import React, { useState } from 'react';
import { Modal, Button, Input } from './ui';
import { UploadCloudIcon, FileTextIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from './icons';
import Papa from 'papaparse';
import { useError } from './ErrorProvider';
import { supabase } from '../supabaseClient';
import { useRoleAssignment } from '../hooks/useRoleAssignment';
import { useData } from '../contexts/DataContext';
import { Club, User } from '../types';

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
    const { showError, showSuccess } = useError();
    const { allRoles } = useData();
    const { createAccountAndAssignRole } = useRoleAssignment(currentUser, allRoles);

    const isSuperAdmin = currentUser?.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseCSV(selectedFile);
        }
    };

    const parseCSV = (file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.data && results.data.length > 0) {
                    // Validate headers
                    const headers = results.meta.fields || [];
                    const required = ['nume', 'prenume', 'data nasterii']; // Gen is now optional
                    
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
                    
                    // Optional headers
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
                    setPreviewData(results.data as any[]);
                }
            },
            error: (error) => {
                showError("Eroare la citire CSV", error.message);
            }
        });
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

    const processImport = async () => {
        if (!previewData.length) return;
        
        setImporting(true);
        setProgress({ current: 0, total: previewData.length, success: 0, failed: 0 });
        setLogs([]);
        
        const sportivRole = allRoles.find(r => r.nume === 'SPORTIV');
        if (!sportivRole) {
            showError("Eroare", "Rolul 'SPORTIV' nu a fost găsit în sistem.");
            setImporting(false);
            return;
        }

        for (let i = 0; i < previewData.length; i++) {
            const row = previewData[i];
            setProgress(prev => ({ ...prev, current: i + 1 }));
            
            const nume = row[headerMap['nume']]?.trim();
            const prenume = row[headerMap['prenume']]?.trim();
            const dataNasteriiRaw = row[headerMap['data nasterii']]?.trim();
            const genRaw = headerMap['gen'] ? row[headerMap['gen']]?.trim() : null;
            const clubName = headerMap['club'] ? row[headerMap['club']]?.trim() : null;

            try {
                // 1. Validate Data
                if (!nume || !prenume || !dataNasteriiRaw) {
                    throw new Error("Date incomplete (Nume, Prenume sau Data Nașterii lipsă)");
                }

                const dataNasterii = parseDate(dataNasteriiRaw);
                if (!dataNasterii) {
                    throw new Error(`Format dată invalid: ${dataNasteriiRaw}. Folosiți DD/MM/YYYY.`);
                }

                // 2. Determine Club
                let clubId = currentUser.club_id;
                if (isSuperAdmin) {
                    if (clubName) {
                        const foundClub = clubs.find(c => c.nume.toLowerCase() === clubName.toLowerCase());
                        if (foundClub) {
                            clubId = foundClub.id;
                        } else {
                            throw new Error(`Clubul '${clubName}' nu a fost găsit.`);
                        }
                    } else {
                        throw new Error("Clubul este obligatoriu pentru admini.");
                    }
                }

                if (!clubId) throw new Error("Nu s-a putut determina clubul.");

                // 3. Generate Credentials
                const numeSanitized = sanitize(nume);
                const prenumeSanitized = sanitize(prenume);
                const club = clubs.find(c => c.id === clubId);
                const domain = club ? sanitize(club.nume) + '.ro' : 'phihau.ro';
                
                // Add random suffix to email to avoid collisions during bulk import
                const randomSuffix = Math.floor(Math.random() * 1000);
                const email = `${numeSanitized}.${prenumeSanitized}.${randomSuffix}@${domain}`;
                const password = `${nume}.1234!`; // Default password pattern
                const username = `${numeSanitized}.${prenumeSanitized}.${randomSuffix}`; // Temporary, backend might adjust

                // 4. Prepare Profile Data
                const profileData: Partial<import('../types').Sportiv> = {
                    nume: nume,
                    prenume: prenume,
                    data_nasterii: dataNasterii,
                    gen: (genRaw === 'M' || genRaw === 'Masculin' ? 'Masculin' : (genRaw === 'F' || genRaw === 'Feminin' ? 'Feminin' : null)) as 'Masculin' | 'Feminin' | null,
                    club_id: clubId,
                    status: 'Activ' as 'Activ' | 'Inactiv',
                    data_inscrierii: new Date().toISOString().split('T')[0]
                };

                // 5. Call Create Function
                const result = await createAccountAndAssignRole(
                    email,
                    password,
                    profileData,
                    [sportivRole]
                );

                if (!result.success) {
                    throw new Error(result.error || "Eroare necunoscută la creare.");
                }

                setLogs(prev => [...prev, `✅ ${nume} ${prenume}: Importat cu succes.`]);
                setProgress(prev => ({ ...prev, success: prev.success + 1 }));

            } catch (err: any) {
                console.error(err);
                setLogs(prev => [...prev, `❌ ${nume || 'N/A'} ${prenume || 'N/A'}: ${err.message}`]);
                setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
            }
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

                {!previewData.length ? (
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
                                {previewData.length} sportivi identificați
                            </span>
                            <Button variant="secondary" size="sm" onClick={() => { setFile(null); setPreviewData([]); setLogs([]); }} disabled={importing}>
                                Schimbă Fișierul
                            </Button>
                        </div>

                        {(importing || progress.current > 0) && (
                            <div className="space-y-2 bg-slate-800 p-4 rounded-lg border border-slate-700">
                                <div className="flex justify-between text-xs text-slate-300 mb-1">
                                    <span className="font-bold uppercase tracking-wider">{importing ? 'Se procesează...' : 'Import Finalizat'}</span>
                                    <span className="font-mono font-bold">{Math.round((progress.current / progress.total) * 100)}%</span>
                                </div>
                                <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-700 relative">
                                    <div 
                                        className={`h-full transition-all duration-300 ${importing ? 'bg-brand-primary' : 'bg-green-600'}`}
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    >
                                        {importing && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs mt-1 font-medium">
                                    <span className="text-slate-400">Progres: {progress.current} / {progress.total}</span>
                                    <div className="flex gap-3">
                                        <span className="text-green-400 flex items-center"><CheckCircleIcon className="w-3 h-3 mr-1"/> {progress.success}</span>
                                        <span className="text-red-400 flex items-center"><XCircleIcon className="w-3 h-3 mr-1"/> {progress.failed}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="max-h-60 overflow-y-auto bg-slate-950 rounded border border-slate-800 p-2 text-xs font-mono space-y-1">
                            {logs.length > 0 ? logs.map((log, i) => (
                                <div key={i} className={log.startsWith('✅') ? 'text-green-400' : 'text-red-400'}>
                                    {log}
                                </div>
                            )) : (
                                <div className="text-slate-500 italic">Așteptare import...</div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                            <Button variant="secondary" onClick={onClose} disabled={importing}>
                                {importing ? 'Se procesează...' : 'Închide'}
                            </Button>
                            <Button variant="primary" onClick={processImport} isLoading={importing} disabled={importing || progress.current === progress.total}>
                                Importă {previewData.length} Sportivi
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
