import React, { useState, useEffect } from 'react';
import { Card, Button } from './ui';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export const ImportSportiviPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [existingSportivi, setExistingSportivi] = useState<any[]>([]);
    const [step, setStep] = useState<0 | 1>(0); // 0: Upload, 1: Review
    const [toImportList, setToImportList] = useState<any[]>([]);
    const [potentialDuplicates, setPotentialDuplicates] = useState<any[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

    const [currentClubId, setCurrentClubId] = useState<string | null>(null);

    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        console.log("ImportSportiviPage montat. Versiune: 1.0.2");
        const fetchContext = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data, error } = await supabase
                        .from('utilizator_roluri_multicont')
                        .select('club_id')
                        .eq('user_id', user.id)
                        .eq('is_primary', true)
                        .single();
                    if (error) console.error("Eroare la preluarea contextului clubului:", error);
                    if (data) {
                        console.log("Club ID setat:", data.club_id);
                        setCurrentClubId(data.club_id);
                    }
                }
            } catch (err) {
                console.error("Excepție la preluarea contextului:", err);
            }
        };
        fetchContext();

        const fetchSportivi = async () => {
            try {
                const { data, error } = await supabase.from('sportivi').select('id, nume, prenume, data_nasterii');
                if (error) console.error("Eroare la preluarea sportivilor existenți:", error);
                if (data) {
                    console.log("Sportivi existenți încărcați:", data.length);
                    setExistingSportivi(data);
                }
            } catch (err) {
                console.error("Excepție la preluarea sportivilor:", err);
            }
        };
        fetchSportivi();
    }, []);

    const downloadTemplate = () => {
        const csvContent = "Nr.crt,NUME SPORTIV,PRENUME SPORTIV,CATEGORIE SPORTIV ,SEX,CNP,DATA NASTERII,JUDETUL,LOCUL NASTERII,ADRESA, NR. PASAPORT SPORTIV ,CETATENIA,JUDET UNDE ESTE INREGISTRAT CLUBUL,DENUMIRE CLUB,DEPARTAMENT,MAESTRU EMERIT AL SPORTULUI /MAESTRU AL SPORTULUI DA/NU\n";
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_sportivi.csv';
        a.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setFile(e.target.files[0]);
    };

    const generateEmail = (prenume: string, nume: string): string => {
        const sanitize = (s: string) =>
            s.toLowerCase()
             .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
             .replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
        return `${sanitize(prenume)}.${sanitize(nume)}@frqkd.ro`;
    };

    const levenshteinDistance = (a: string, b: string): number => {
        const tmp = [];
        for (let i = 0; i <= a.length; i++) tmp[i] = [i];
        for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                tmp[i][j] = Math.min(
                    tmp[i - 1][j] + 1,
                    tmp[i][j - 1] + 1,
                    tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
                );
            }
        }
        return tmp[a.length][b.length];
    };

    const isSimilar = (a: string, b: string): boolean => {
        const dist = levenshteinDistance(a.toLowerCase().trim(), b.toLowerCase().trim());
        const maxLength = Math.max(a.length, b.length);
        if (maxLength === 0) return true;
        // Allow at most 1 typo for short names, 2 for longer ones
        const threshold = maxLength < 5 ? 1 : 2;
        return dist <= threshold;
    };

    const normalizeDate = (dateStr: string): string | null => {
        if (!dateStr) return null;
        const trimmed = dateStr.trim();
        if (!trimmed) return null;

        // Try YYYY-MM-DD (already ISO)
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            const date = new Date(trimmed);
            return isNaN(date.getTime()) ? null : trimmed;
        }

        // Handle DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY
        const match = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
        if (match) {
            const [_, d, m, y] = match;
            const day = d.padStart(2, '0');
            const month = m.padStart(2, '0');
            const year = y;
            const isoDate = `${year}-${month}-${day}`;
            
            // Validate if it's a real date (e.g. not 31.02.2024)
            const date = new Date(isoDate);
            if (!isNaN(date.getTime())) {
                // Check if components match to avoid Date auto-correction (e.g. Feb 30 -> Mar 1)
                const checkY = date.getFullYear();
                const checkM = date.getMonth() + 1;
                const checkD = date.getDate();
                if (checkY === parseInt(year) && checkM === parseInt(month) && checkD === parseInt(day)) {
                    return isoDate;
                }
            }
        }

        return null; // Invalid format or invalid date
    };

    const handleAnalyze = async () => {
        if (!file) {
            toast.error("Te rugăm să selectezi un fișier CSV mai întâi.");
            return;
        }
        console.log("Începere analiză fișier:", file.name);
        setImporting(true);
        
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                console.log("Parsare CSV finalizată. Rânduri găsite:", results.data.length);
                
                try {
                    const duplicates: any[] = [];
                    const uniques: any[] = [];

                    if (results.data.length === 0) {
                        toast.error("Fișierul CSV este gol sau nu are formatul corect.");
                        setImporting(false);
                        return;
                    }

                    results.data.forEach((row: any, index: number) => {
                        const numeCSV = row['NUME SPORTIV']?.trim();
                        const prenumeCSV = row['PRENUME SPORTIV']?.trim();
                        
                        if (!numeCSV || !prenumeCSV) {
                            console.warn(`Rândul ${index + 1} lipsește numele sau prenumele. Se omite.`);
                            return;
                        }

                        const rawDate = row['DATA NASTERII']?.trim();
                        const dataNasteriiCSV = normalizeDate(rawDate);

                        const match1 = existingSportivi.find(s => 
                            isSimilar(s.nume, numeCSV) &&
                            isSimilar(s.prenume, prenumeCSV) &&
                            s.data_nasterii === dataNasteriiCSV
                        );

                        const match2 = existingSportivi.find(s => 
                            isSimilar(s.nume, numeCSV) &&
                            isSimilar(s.prenume, prenumeCSV)
                        );

                        const emailCSV = row['EMAIL']?.trim() || row['Email']?.trim() || row['email']?.trim();
                        const sportivData: any = {
                            nume: numeCSV,
                            prenume: prenumeCSV,
                            cnp: row['CNP']?.trim() || null,
                            email: emailCSV || generateEmail(prenumeCSV, numeCSV),
                            data_nasterii: dataNasteriiCSV || null,
                            adresa: row['ADRESA']?.trim() || null,
                            locul_nasterii: row['LOCUL NASTERII']?.trim() || null,
                            cetatenia: row['CETATENIA']?.trim() || null,
                            departament: row['DEPARTAMENT']?.trim() || null,
                            nr_legitimatie: row[' NR. PASAPORT SPORTIV ']?.trim() || null,
                            status: 'Activ',
                            data_inscrierii: new Date().toISOString().split('T')[0],
                            club_id: currentClubId,
                        };

                        // Remove null/empty fields to avoid overwriting existing data with null
                        Object.keys(sportivData).forEach(key => {
                            if (sportivData[key] === null || sportivData[key] === undefined || sportivData[key] === '') {
                                delete sportivData[key];
                            }
                        });

                        if (match1) {
                            // Strict match (same name + birthdate) → auto-update missing fields, no user confirmation needed
                            duplicates.push({ type: 'strict', csvRow: row, existingSportiv: match1, sportivData, originalIndex: index });
                        } else if (match2) {
                            duplicates.push({ type: 'loose', csvRow: row, existingSportiv: match2, sportivData, originalIndex: index });
                        } else {
                            // For new sportivi, data_nasterii is mandatory in DB
                            if (!dataNasteriiCSV) {
                                const errorMsg = rawDate ? `Data nașterii invalidă: ${rawDate}` : 'Lipsește data nașterii';
                                console.error(`Rândul ${index + 1} (${numeCSV} ${prenumeCSV}): ${errorMsg}`);
                                uniques.push({ ...sportivData, originalIndex: index, error: errorMsg });
                            } else {
                                uniques.push({ ...sportivData, originalIndex: index });
                            }
                        }
                    });

                    console.log(`Analiză finalizată: ${uniques.length} unici, ${duplicates.length} duplicate.`);
                    
                    setToImportList(uniques);
                    setPotentialDuplicates(duplicates);
                    setStep(1);
                } catch (err: any) {
                    console.error("Eroare în timpul procesării datelor CSV:", err);
                    toast.error("A apărut o eroare la procesarea datelor. Verifică consola pentru detalii.");
                } finally {
                    setImporting(false);
                }
            },
            error: (error) => {
                console.error("Eroare PapaParse:", error);
                toast.error("Eroare la citirea fișierului CSV: " + error.message);
                setImporting(false);
            }
        });
    };

    const handleExecuteImport = async () => {
        // Strict duplicates (same name + birthdate) are always auto-updated
        const autoUpdates = potentialDuplicates
            .filter(d => d.type === 'strict')
            .map(d => ({ ...d.sportivData, id: d.existingSportiv.id }));

        // Loose duplicates require manual checkbox selection
        const looseDuplicates = potentialDuplicates.filter(d => d.type === 'loose');
        const selectedLoose = looseDuplicates
            .filter((_, i) => selectedIndices.has(i))
            .map(d => ({ ...d.sportivData, id: d.existingSportiv.id }));

        const validUniques = toImportList
            .filter(s => !s.error)
            .map(({originalIndex, error, ...rest}) => rest);

        const invalidUniques = toImportList.filter(s => s.error);

        const finalToImport = [...validUniques, ...autoUpdates, ...selectedLoose];

        if (finalToImport.length === 0) {
            if (invalidUniques.length > 0) {
                toast.error(`Nu s-au putut importa ${invalidUniques.length} sportivi noi deoarece au date de naștere invalide sau lipsă.`);
            } else {
                toast.error("Nu ai selectat niciun sportiv valid pentru import.");
            }
            return;
        }

        if (!showConfirm) {
            setShowConfirm(true);
            return;
        }

        setImporting(true);
        const processingToastId = toast.loading(`Se procesează ${finalToImport.length} sportivi...`);
        console.log(`Executare import (upsert) pentru ${finalToImport.length} sportivi...`);
        
        try {
            // Using upsert with 'onConflict' on 'id' if present. 
            // For new records (no id), it will insert.
            // For duplicates (with id), it will update only the provided fields.
            const { data: insertedData, error } = await supabase
                .from('sportivi')
                .upsert(finalToImport, { onConflict: 'id' })
                .select('id, grad_actual_id, data_inscrierii');
            
            if (error) {
                console.error("Eroare Supabase la upsert:", error);
                toast.error(`Eroare la import: ${error.message}`, { id: processingToastId });
            } else {
                // Sincronizăm istoricul de grade pentru toți sportivii importați/actualizați
                if (insertedData && insertedData.length > 0) {
                    const historyEntries = insertedData.map(s => ({
                        sportiv_id: s.id,
                        grad_id: s.grad_actual_id,
                        data_obtinere: s.data_inscrierii || new Date().toISOString().split('T')[0],
                        observatii: 'Import CSV'
                    }));

                    await supabase.from('istoric_grade').upsert(historyEntries, { onConflict: 'sportiv_id,grad_id' });
                }

                console.log("Import finalizat cu succes.");
                const newCount = validUniques.length;
                const updatedCount = autoUpdates.length + selectedLoose.length;
                let successMsg = `Import finalizat: ${newCount} sportivi noi adăugați, ${updatedCount} actualizați.`;
                if (invalidUniques.length > 0) {
                    successMsg += ` (${invalidUniques.length} omiși — dată naștere lipsă)`;
                }
                toast.success(successMsg, { id: processingToastId });
                
                const { data } = await supabase.from('sportivi').select('id, nume, prenume, data_nasterii');
                if (data) setExistingSportivi(data);
                setTimeout(() => onBack(), 2000);
            }
        } catch (err) {
            console.error("Excepție la executarea importului:", err);
            toast.error("A apărut o eroare neașteptată la import.", { id: processingToastId });
        } finally {
            setImporting(false);
            setShowConfirm(false);
        }
    };

    const toggleSelection = (index: number) => {
        const newSet = new Set(selectedIndices);
        if (newSet.has(index)) newSet.delete(index);
        else newSet.add(index);
        setSelectedIndices(newSet);
    };

    if (step === 1) {
        return (
            <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6">Revizuire Import</h2>
                
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2 text-green-400">Sportivi noi ({toImportList.length})</h3>
                    <p className="text-sm text-gray-400 mb-2">Acești sportivi nu au fost găsiți în baza de date.</p>
                    <div className="max-h-40 overflow-y-auto border border-white/10 rounded p-2 bg-black/20">
                        {toImportList.map((s, i) => (
                            <div key={i} className={`text-sm py-1 border-b border-white/5 last:border-0 flex justify-between items-center ${s.error ? 'text-red-400' : ''}`}>
                                <span>{s.nume} {s.prenume} ({s.data_nasterii || 'Dată lipsă'})</span>
                                {s.error && <span className="text-[10px] bg-red-500/20 px-2 py-0.5 rounded border border-red-500/50">{s.error}</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Strict duplicates: auto-updated, no checkbox needed */}
                {potentialDuplicates.filter(d => d.type === 'strict').length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2 text-blue-400">
                            Sportivi existenți — actualizare automată ({potentialDuplicates.filter(d => d.type === 'strict').length})
                        </h3>
                        <p className="text-sm text-gray-400 mb-2">Acești sportivi există deja (potrivire exactă). Datele lipsă vor fi completate automat.</p>
                        <div className="max-h-40 overflow-y-auto border border-white/10 rounded p-2 bg-black/20">
                            {potentialDuplicates.filter(d => d.type === 'strict').map((d, i) => (
                                <div key={i} className="text-sm py-1 border-b border-white/5 last:border-0 text-blue-300">
                                    {d.existingSportiv.nume} {d.existingSportiv.prenume} ({d.existingSportiv.data_nasterii}) — date lipsă completate din CSV
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Loose duplicates: require manual confirmation */}
                {potentialDuplicates.filter(d => d.type === 'loose').length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2 text-yellow-400">
                            Potențiale Duplicate — confirmare necesară ({potentialDuplicates.filter(d => d.type === 'loose').length})
                        </h3>
                        <p className="text-sm text-gray-400 mb-2">Bifează sportivii pe care dorești să îi actualizezi (seamănă cu înregistrări existente, dar data nașterii diferă).</p>
                        <div className="max-h-60 overflow-y-auto border border-white/10 rounded p-2 bg-black/20">
                            {potentialDuplicates.filter(d => d.type === 'loose').map((d, i) => (
                                <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                                    <input
                                        type="checkbox"
                                        checked={selectedIndices.has(i)}
                                        onChange={() => toggleSelection(i)}
                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div className="text-sm">
                                        <div className="font-medium text-white">
                                            Din CSV: {d.csvRow['NUME SPORTIV']} {d.csvRow['PRENUME SPORTIV']} ({d.csvRow['DATA NASTERII']})
                                        </div>
                                        <div className="text-gray-400 italic">
                                            Seamănă mult cu: {d.existingSportiv.nume} {d.existingSportiv.prenume} ({d.existingSportiv.data_nasterii})
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-4">
                    {showConfirm ? (
                        <div className="bg-violet-900/20 border border-violet-500/50 p-4 rounded-lg mb-4">
                            <p className="text-white mb-4">
                                Ești pe cale să adaugi {toImportList.filter(s => !s.error).length} sportivi noi și să actualizezi {potentialDuplicates.filter(d => d.type === 'strict').length + selectedIndices.size} existenți. Ești sigur?
                            </p>
                            <div className="flex gap-3">
                                <Button onClick={handleExecuteImport} isLoading={importing}>
                                    Da, Importă acum
                                </Button>
                                <Button variant="secondary" onClick={() => setShowConfirm(false)}>
                                    Anulează
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-4">
                            <Button onClick={handleExecuteImport} isLoading={importing}>
                                Finalizează Import ({toImportList.filter(s => !s.error).length} noi + {potentialDuplicates.filter(d => d.type === 'strict').length + selectedIndices.size} actualizări)
                            </Button>
                            <Button variant="secondary" onClick={() => setStep(0)}>
                                Înapoi la încărcare
                            </Button>
                        </div>
                    )}
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Import Sportivi</h2>
            <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                    <h3 className="text-blue-400 font-semibold mb-2 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Instrucțiuni Import
                    </h3>
                    <ul className="text-sm text-slate-300 space-y-2 list-disc ml-5">
                        <li>Utilizați butonul de mai jos pentru a descărca template-ul corect.</li>
                        <li>
                            <strong className="text-white">Format Dată Naștere:</strong> Sunt acceptate formatele 
                            <code className="mx-1 bg-slate-800 px-1 rounded text-blue-300">DD/MM/YYYY</code>, 
                            <code className="mx-1 bg-slate-800 px-1 rounded text-blue-300">DD.MM.YYYY</code> sau 
                            <code className="mx-1 bg-slate-800 px-1 rounded text-blue-300">YYYY-MM-DD</code>.
                        </li>
                        <li>Asigurați-vă că numele și prenumele sunt completate pentru fiecare rând.</li>
                        <li>Câmpul <code className="mx-1 bg-slate-800 px-1 rounded text-blue-300">DATA NASTERII</code> este obligatoriu pentru înregistrarea sportivilor noi.</li>
                    </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={downloadTemplate} variant="secondary" className="flex-1">
                        Descarcă Template CSV
                    </Button>
                    <div className="flex-1 relative">
                        <input 
                            type="file" 
                            accept=".csv" 
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-400 flex items-center justify-between h-full">
                            <span>{file ? file.name : 'Selectează fișier CSV...'}</span>
                            <Button size="sm" variant="secondary" type="button">Caută</Button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-700">
                    <Button onClick={handleAnalyze} isLoading={importing} className="flex-1" disabled={!file}>
                        {importing ? 'Se analizează...' : 'Analizează Fișier'}
                    </Button>
                    <Button variant="secondary" onClick={onBack}>Înapoi</Button>
                </div>
            </div>
        </Card>
    );
};
