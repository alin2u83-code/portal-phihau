import React, { useState, useEffect } from 'react';
import { Card, Button } from './ui';
import { parseCSVWithEncoding } from '../utils/csv';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

type ImportStep = 0 | 1 | 2;

interface ImportResult {
    adaugati: { nume: string; prenume: string; data_nasterii: string | null }[];
    actualizati: { nume: string; prenume: string; data_nasterii: string | null }[];
    omisi: { rand: number; nume: string; prenume: string; motiv: string }[];
}

type RowStatus = 'NOU' | 'ACTUALIZARE_AUTO' | 'POSIBIL_DUPLICAT' | 'EROARE';

interface UnifiedRow {
    originalIndex: number;
    nume: string;
    prenume: string;
    dataNasteriiCSV: string; // raw string din CSV pentru afisare
    status: RowStatus;
    motiv: string;
    // referinta la date originale pentru logica
    sportivData?: any;
    existingSportiv?: any;
    looseIndex?: number; // index in looseDuplicates array pentru selectedIndices
    strictIndex?: number; // index in strictDuplicates array
}

export const ImportSportiviPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [existingSportivi, setExistingSportivi] = useState<any[]>([]);
    const [step, setStep] = useState<ImportStep>(0);
    const [toImportList, setToImportList] = useState<any[]>([]);
    const [potentialDuplicates, setPotentialDuplicates] = useState<any[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [excludedStrictIndices, setExcludedStrictIndices] = useState<Set<number>>(new Set());

    const [currentClubId, setCurrentClubId] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    // State pentru expandarea randurilor POSIBIL_DUPLICAT
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    // State pentru sectiunile colapsabile din raportul final
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['omisi']));

    useEffect(() => {
        console.log("ImportSportiviPage montat. Versiune: 2.0.0");
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
                console.error("Exceptie la preluarea contextului:", err);
            }
        };
        fetchContext();

        const fetchSportivi = async () => {
            try {
                const { data, error } = await supabase.from('sportivi').select('id, nume, prenume, data_nasterii');
                if (error) console.error("Eroare la preluarea sportivilor existenti:", error);
                if (data) {
                    console.log("Sportivi existenti incarcati:", data.length);
                    setExistingSportivi(data);
                }
            } catch (err) {
                console.error("Exceptie la preluarea sportivilor:", err);
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
        const threshold = maxLength < 5 ? 1 : 2;
        return dist <= threshold;
    };

    const normalizeDate = (dateStr: string): string | null => {
        if (!dateStr) return null;
        const trimmed = dateStr.trim();
        if (!trimmed) return null;

        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            const date = new Date(trimmed);
            return isNaN(date.getTime()) ? null : trimmed;
        }

        const match = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
        if (match) {
            const [_, d, m, y] = match;
            const day = d.padStart(2, '0');
            const month = m.padStart(2, '0');
            const year = y;
            const isoDate = `${year}-${month}-${day}`;

            const date = new Date(isoDate);
            if (!isNaN(date.getTime())) {
                const checkY = date.getFullYear();
                const checkM = date.getMonth() + 1;
                const checkD = date.getDate();
                if (checkY === parseInt(year) && checkM === parseInt(month) && checkD === parseInt(day)) {
                    return isoDate;
                }
            }
        }

        return null;
    };

    // Formatare data ISO -> DD.MM.YYYY pentru afisare
    const formatDateForDisplay = (isoDate: string | null): string => {
        if (!isoDate) return '—';
        const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) return `${match[3]}.${match[2]}.${match[1]}`;
        return isoDate;
    };

    const handleAnalyze = async () => {
        if (!file) {
            toast.error("Te rugam sa selectezi un fisier CSV mai intai.");
            return;
        }
        console.log("Incepere analiza fisier:", file.name);
        setImporting(true);

        parseCSVWithEncoding(
            file,
            { header: true, skipEmptyLines: true },
            async (results) => {
                console.log("Parsare CSV finalizata. Randuri gasite:", results.data.length);

                try {
                    const duplicates: any[] = [];
                    const uniques: any[] = [];

                    if (results.data.length === 0) {
                        toast.error("Fisierul CSV este gol sau nu are formatul corect.");
                        setImporting(false);
                        return;
                    }

                    results.data.forEach((row: any, index: number) => {
                        const numeCSV = row['NUME SPORTIV']?.trim();
                        const prenumeCSV = row['PRENUME SPORTIV']?.trim();

                        if (!numeCSV || !prenumeCSV) {
                            console.warn(`Randul ${index + 1} lipseste numele sau prenumele. Se omite.`);
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

                        Object.keys(sportivData).forEach(key => {
                            if (sportivData[key] === null || sportivData[key] === undefined || sportivData[key] === '') {
                                delete sportivData[key];
                            }
                        });

                        if (match1) {
                            duplicates.push({ type: 'strict', csvRow: row, existingSportiv: match1, sportivData, originalIndex: index, rawDate: rawDate || '' });
                        } else if (match2) {
                            duplicates.push({ type: 'loose', csvRow: row, existingSportiv: match2, sportivData, originalIndex: index, rawDate: rawDate || '' });
                        } else {
                            if (!dataNasteriiCSV) {
                                const errorMsg = rawDate ? `Data nasterii invalida: ${rawDate}` : 'Lipseste data nasterii';
                                console.error(`Randul ${index + 1} (${numeCSV} ${prenumeCSV}): ${errorMsg}`);
                                uniques.push({ ...sportivData, originalIndex: index, error: errorMsg, rawDate: rawDate || '' });
                            } else {
                                uniques.push({ ...sportivData, originalIndex: index, rawDate: rawDate || '' });
                            }
                        }
                    });

                    console.log(`Analiza finalizata: ${uniques.length} unici, ${duplicates.length} duplicate.`);

                    setToImportList(uniques);
                    setPotentialDuplicates(duplicates);
                    setSelectedIndices(new Set());
                    setExcludedStrictIndices(new Set());
                    setExpandedRows(new Set());
                    setStep(1);
                } catch (err: any) {
                    console.error("Eroare in timpul procesarii datelor CSV:", err);
                    toast.error("A aparut o eroare la procesarea datelor. Verifica consola pentru detalii.");
                } finally {
                    setImporting(false);
                }
            },
            (error) => {
                console.error("Eroare PapaParse:", error);
                toast.error("Eroare la citirea fisierului CSV: " + error.message);
                setImporting(false);
            }
        );
    };

    const handleExecuteImport = async () => {
        const strictDuplicates = potentialDuplicates.filter(d => d.type === 'strict');
        const autoUpdates = strictDuplicates
            .filter((_, i) => !excludedStrictIndices.has(i))
            .map(d => ({ ...d.sportivData, id: d.existingSportiv.id }));

        const looseDuplicates = potentialDuplicates.filter(d => d.type === 'loose');
        const selectedLoose = looseDuplicates
            .filter((_, i) => selectedIndices.has(i))
            .map(d => ({ ...d.sportivData, id: d.existingSportiv.id }));

        const validUniques = toImportList
            .filter(s => !s.error)
            .map(({ originalIndex, error, rawDate, ...rest }) => rest);

        const invalidUniques = toImportList.filter(s => s.error);

        const finalToImport = [...validUniques, ...autoUpdates, ...selectedLoose];

        if (finalToImport.length === 0) {
            if (invalidUniques.length > 0) {
                toast.error(`Nu s-au putut importa ${invalidUniques.length} sportivi noi deoarece au date de nastere invalide sau lipsa.`);
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
        const processingToastId = toast.loading(`Se proceseaza ${finalToImport.length} sportivi...`);
        console.log(`Executare import (upsert) pentru ${finalToImport.length} sportivi...`);

        try {
            const { data: insertedData, error } = await supabase
                .from('sportivi')
                .upsert(finalToImport, { onConflict: 'id' })
                .select('id, grad_actual_id, data_inscrierii');

            if (error) {
                console.error("Eroare Supabase la upsert:", error);
                toast.error(`Eroare la import: ${error.message}`, { id: processingToastId });
            } else {
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

                // Construim raportul final
                const result: ImportResult = {
                    adaugati: toImportList
                        .filter(s => !s.error)
                        .map(s => ({ nume: s.nume, prenume: s.prenume, data_nasterii: s.data_nasterii || null })),
                    actualizati: [
                        ...strictDuplicates
                            .filter((_, i) => !excludedStrictIndices.has(i))
                            .map(d => ({ nume: d.existingSportiv.nume, prenume: d.existingSportiv.prenume, data_nasterii: d.existingSportiv.data_nasterii || null })),
                        ...looseDuplicates
                            .filter((_, i) => selectedIndices.has(i))
                            .map(d => ({ nume: d.existingSportiv.nume, prenume: d.existingSportiv.prenume, data_nasterii: d.existingSportiv.data_nasterii || null })),
                    ],
                    omisi: invalidUniques.map(s => ({
                        rand: s.originalIndex + 1,
                        nume: s.nume,
                        prenume: s.prenume,
                        motiv: s.error,
                    })),
                };

                setImportResult(result);
                toast.success(`Import finalizat: ${result.adaugati.length} noi, ${result.actualizati.length} actualizati.`, { id: processingToastId });

                const { data } = await supabase.from('sportivi').select('id, nume, prenume, data_nasterii');
                if (data) setExistingSportivi(data);

                setStep(2);
            }
        } catch (err) {
            console.error("Exceptie la executarea importului:", err);
            toast.error("A aparut o eroare neasteptata la import.", { id: processingToastId });
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

    const toggleExcludeStrict = (index: number) => {
        const newSet = new Set(excludedStrictIndices);
        if (newSet.has(index)) newSet.delete(index);
        else newSet.add(index);
        setExcludedStrictIndices(newSet);
    };

    const toggleExpandRow = (index: number) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(index)) newSet.delete(index);
        else newSet.add(index);
        setExpandedRows(newSet);
    };

    const toggleSection = (section: string) => {
        const newSet = new Set(expandedSections);
        if (newSet.has(section)) newSet.delete(section);
        else newSet.add(section);
        setExpandedSections(newSet);
    };

    // Construieste lista unificata de randuri pentru tabel
    const buildUnifiedRows = (): UnifiedRow[] => {
        const rows: UnifiedRow[] = [];

        const strictDuplicates = potentialDuplicates.filter(d => d.type === 'strict');
        const looseDuplicates = potentialDuplicates.filter(d => d.type === 'loose');

        toImportList.forEach(s => {
            rows.push({
                originalIndex: s.originalIndex,
                nume: s.nume,
                prenume: s.prenume,
                dataNasteriiCSV: s.rawDate || s.data_nasterii || '—',
                status: s.error ? 'EROARE' : 'NOU',
                motiv: s.error || '',
                sportivData: s,
            });
        });

        strictDuplicates.forEach((d, i) => {
            rows.push({
                originalIndex: d.originalIndex,
                nume: d.sportivData.nume,
                prenume: d.sportivData.prenume,
                dataNasteriiCSV: d.rawDate || d.sportivData.data_nasterii || '—',
                status: 'ACTUALIZARE_AUTO',
                motiv: 'Potrivire exacta (acelasi nume + data nasterii)',
                sportivData: d.sportivData,
                existingSportiv: d.existingSportiv,
                strictIndex: i,
            });
        });

        looseDuplicates.forEach((d, i) => {
            // Calculeaza motivul
            let motiv = '';
            const dataNasteriiNorm = normalizeDate(d.rawDate || '');
            if (dataNasteriiNorm !== d.existingSportiv.data_nasterii) {
                const csvDateDisplay = d.rawDate || '—';
                const dbDateDisplay = formatDateForDisplay(d.existingSportiv.data_nasterii);
                motiv = `Difera data nasterii: CSV=${csvDateDisplay} / DB=${dbDateDisplay}`;
            } else {
                motiv = `Nume similar: ${d.sportivData.nume} ${d.sportivData.prenume} / ${d.existingSportiv.nume} ${d.existingSportiv.prenume}`;
            }

            rows.push({
                originalIndex: d.originalIndex,
                nume: d.sportivData.nume,
                prenume: d.sportivData.prenume,
                dataNasteriiCSV: d.rawDate || d.sportivData.data_nasterii || '—',
                status: 'POSIBIL_DUPLICAT',
                motiv,
                sportivData: d.sportivData,
                existingSportiv: d.existingSportiv,
                looseIndex: i,
            });
        });

        // Sorteaza dupa originalIndex
        rows.sort((a, b) => a.originalIndex - b.originalIndex);
        return rows;
    };

    const getStatusBadge = (status: RowStatus) => {
        switch (status) {
            case 'NOU':
                return <span className="bg-green-500/20 text-green-400 border border-green-500/50 px-2 py-0.5 rounded text-xs whitespace-nowrap">NOU</span>;
            case 'ACTUALIZARE_AUTO':
                return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/50 px-2 py-0.5 rounded text-xs whitespace-nowrap">ACTUALIZARE AUTO</span>;
            case 'POSIBIL_DUPLICAT':
                return <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 px-2 py-0.5 rounded text-xs whitespace-nowrap">POSIBIL DUPLICAT</span>;
            case 'EROARE':
                return <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-0.5 rounded text-xs whitespace-nowrap">EROARE</span>;
        }
    };

    const exportRaportCSV = () => {
        if (!importResult) return;
        const BOM = '\uFEFF';
        const header = 'rand_csv,nume,prenume,data_nasterii,status_import,motiv';
        const rows: string[] = [];

        importResult.adaugati.forEach((s, i) => {
            rows.push(`${i + 1},"${s.nume}","${s.prenume}","${s.data_nasterii || ''}","ADAUGAT",""`);
        });
        importResult.actualizati.forEach((s, i) => {
            rows.push(`${i + 1},"${s.nume}","${s.prenume}","${s.data_nasterii || ''}","ACTUALIZAT",""`);
        });
        importResult.omisi.forEach(s => {
            rows.push(`${s.rand},"${s.nume}","${s.prenume}","","OMIS","${s.motiv}"`);
        });

        const csvContent = BOM + header + '\n' + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `raport_import_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // -------------------------
    // STEP 2: Raport final
    // -------------------------
    if (step === 2 && importResult) {
        const now = new Date();
        const dateTimeStr = now.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + now.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

        return (
            <Card className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-zinc-100">Raport Import</h2>
                        <p className="text-sm text-zinc-500 mt-0.5">{dateTimeStr}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button variant="secondary" onClick={exportRaportCSV} className="text-sm">
                            Export raport CSV
                        </Button>
                        <Button onClick={() => onBack()} className="text-sm">
                            Inchide
                        </Button>
                    </div>
                </div>

                {/* Sumar vizual */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-green-400">{importResult.adaugati.length}</div>
                        <div className="text-sm text-green-300 mt-1">Adaugati (noi)</div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-blue-400">{importResult.actualizati.length}</div>
                        <div className="text-sm text-blue-300 mt-1">Actualizati</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-red-400">{importResult.omisi.length}</div>
                        <div className="text-sm text-red-300 mt-1">Omisi (erori)</div>
                    </div>
                </div>

                {/* Sectiuni colapsabile */}
                <div className="space-y-3">
                    {/* Adaugati */}
                    <div className="border border-zinc-800 rounded-lg overflow-hidden">
                        <button
                            className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
                            onClick={() => toggleSection('adaugati')}
                        >
                            <span className="font-medium text-green-400">Adaugati ({importResult.adaugati.length})</span>
                            <span className="text-zinc-400 text-sm">{expandedSections.has('adaugati') ? '▲' : '▶'}</span>
                        </button>
                        {expandedSections.has('adaugati') && (
                            <div className="max-h-60 overflow-y-auto divide-y divide-zinc-800/50">
                                {importResult.adaugati.length === 0 && (
                                    <p className="px-4 py-3 text-sm text-zinc-500">Niciun sportiv adaugat.</p>
                                )}
                                {importResult.adaugati.map((s, i) => (
                                    <div key={i} className="px-4 py-2 text-sm text-zinc-300">
                                        {s.nume} {s.prenume}
                                        {s.data_nasterii && (
                                            <span className="text-zinc-500 ml-2">({formatDateForDisplay(s.data_nasterii)})</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actualizati */}
                    <div className="border border-zinc-800 rounded-lg overflow-hidden">
                        <button
                            className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
                            onClick={() => toggleSection('actualizati')}
                        >
                            <span className="font-medium text-blue-400">Actualizati ({importResult.actualizati.length})</span>
                            <span className="text-zinc-400 text-sm">{expandedSections.has('actualizati') ? '▲' : '▶'}</span>
                        </button>
                        {expandedSections.has('actualizati') && (
                            <div className="max-h-60 overflow-y-auto divide-y divide-zinc-800/50">
                                {importResult.actualizati.length === 0 && (
                                    <p className="px-4 py-3 text-sm text-zinc-500">Niciun sportiv actualizat.</p>
                                )}
                                {importResult.actualizati.map((s, i) => (
                                    <div key={i} className="px-4 py-2 text-sm text-zinc-300">
                                        {s.nume} {s.prenume}
                                        {s.data_nasterii && (
                                            <span className="text-zinc-500 ml-2">({formatDateForDisplay(s.data_nasterii)})</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Omisi */}
                    <div className="border border-zinc-800 rounded-lg overflow-hidden">
                        <button
                            className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
                            onClick={() => toggleSection('omisi')}
                        >
                            <span className="font-medium text-red-400">Omisi ({importResult.omisi.length})</span>
                            <span className="text-zinc-400 text-sm">{expandedSections.has('omisi') ? '▲' : '▶'}</span>
                        </button>
                        {expandedSections.has('omisi') && (
                            <div className="max-h-60 overflow-y-auto divide-y divide-zinc-800/50">
                                {importResult.omisi.length === 0 && (
                                    <p className="px-4 py-3 text-sm text-zinc-500">Niciun sportiv omis.</p>
                                )}
                                {importResult.omisi.map((s, i) => (
                                    <div key={i} className="px-4 py-2 text-sm">
                                        <span className="text-zinc-500 mr-1">Rand #{s.rand}:</span>
                                        <span className="text-zinc-300">{s.nume} {s.prenume}</span>
                                        <span className="text-red-400 ml-2">— {s.motiv}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        );
    }

    // -------------------------
    // STEP 1: Revizuire tabel unificat
    // -------------------------
    if (step === 1) {
        const unifiedRows = buildUnifiedRows();
        const strictDuplicates = potentialDuplicates.filter(d => d.type === 'strict');
        const looseDuplicates = potentialDuplicates.filter(d => d.type === 'loose');

        const countNou = unifiedRows.filter(r => r.status === 'NOU').length;
        const countActualizare = unifiedRows.filter(r => r.status === 'ACTUALIZARE_AUTO').length;
        const countDuplicat = unifiedRows.filter(r => r.status === 'POSIBIL_DUPLICAT').length;
        const countEroare = unifiedRows.filter(r => r.status === 'EROARE').length;

        const activeAutoUpdates = strictDuplicates.filter((_, i) => !excludedStrictIndices.has(i)).length;
        const selectedLooseCount = selectedIndices.size;
        const validNouCount = toImportList.filter(s => !s.error).length;
        const seVaImporta = validNouCount + activeAutoUpdates + selectedLooseCount;

        return (
            <Card className="p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-bold mb-4 text-zinc-100">Revizuire Import</h2>

                {/* Sumar fix */}
                <div className="flex flex-wrap gap-2 mb-3">
                    {countNou > 0 && (
                        <span className="bg-green-500/20 text-green-400 border border-green-500/50 px-3 py-1 rounded text-sm font-medium">
                            NOU: {countNou}
                        </span>
                    )}
                    {countActualizare > 0 && (
                        <span className="bg-blue-500/20 text-blue-400 border border-blue-500/50 px-3 py-1 rounded text-sm font-medium">
                            ACTUALIZARE: {countActualizare}
                        </span>
                    )}
                    {countDuplicat > 0 && (
                        <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 px-3 py-1 rounded text-sm font-medium">
                            POSIBIL DUPLICAT: {countDuplicat}
                        </span>
                    )}
                    {countEroare > 0 && (
                        <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-3 py-1 rounded text-sm font-medium">
                            EROARE: {countEroare}
                        </span>
                    )}
                </div>
                <p className="text-sm text-zinc-400 mb-4">
                    Se va importa: <span className="text-zinc-100 font-semibold">{seVaImporta} sportivi</span>
                </p>

                {/* Tabel desktop + carduri mobil */}
                <div className="mb-6 border border-zinc-800 rounded-lg overflow-hidden">
                    {/* Tabel desktop (md+) */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-zinc-800/70 text-zinc-400 text-xs uppercase tracking-wide">
                                    <th className="px-3 py-2.5 text-left w-10">#</th>
                                    <th className="px-3 py-2.5 text-left">Nume</th>
                                    <th className="px-3 py-2.5 text-left">Prenume</th>
                                    <th className="px-3 py-2.5 text-left">Data nasterii</th>
                                    <th className="px-3 py-2.5 text-left">Status</th>
                                    <th className="px-3 py-2.5 text-left">Motiv</th>
                                    <th className="px-3 py-2.5 text-left w-28">Actiune</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {unifiedRows.map((row, idx) => (
                                    <React.Fragment key={idx}>
                                        <tr className={`hover:bg-zinc-800/30 transition-colors ${row.status === 'EROARE' ? 'opacity-60' : ''}`}>
                                            <td className="px-3 py-2.5 text-zinc-500 tabular-nums">{row.originalIndex + 1}</td>
                                            <td className="px-3 py-2.5 text-zinc-200 font-medium">{row.nume}</td>
                                            <td className="px-3 py-2.5 text-zinc-200">{row.prenume}</td>
                                            <td className="px-3 py-2.5 text-zinc-400 tabular-nums">{row.dataNasteriiCSV || '—'}</td>
                                            <td className="px-3 py-2.5">{getStatusBadge(row.status)}</td>
                                            <td className="px-3 py-2.5 text-zinc-500 text-xs max-w-xs truncate" title={row.motiv}>{row.motiv || '—'}</td>
                                            <td className="px-3 py-2.5">
                                                {row.status === 'POSIBIL_DUPLICAT' && row.looseIndex !== undefined && (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIndices.has(row.looseIndex)}
                                                            onChange={() => toggleSelection(row.looseIndex!)}
                                                            className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
                                                            title="Bifati pentru a actualiza"
                                                        />
                                                        <button
                                                            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors whitespace-nowrap"
                                                            onClick={() => toggleExpandRow(row.originalIndex)}
                                                        >
                                                            {expandedRows.has(row.originalIndex) ? '▲ Ascunde' : '▼ Detalii'}
                                                        </button>
                                                    </div>
                                                )}
                                                {row.status === 'ACTUALIZARE_AUTO' && row.strictIndex !== undefined && (
                                                    <button
                                                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${excludedStrictIndices.has(row.strictIndex) ? 'bg-zinc-700 text-zinc-400 border-zinc-600' : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'}`}
                                                        onClick={() => toggleExcludeStrict(row.strictIndex!)}
                                                    >
                                                        {excludedStrictIndices.has(row.strictIndex) ? 'Inclus' : 'Exclude'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        {/* Sub-rand comparatie pentru POSIBIL_DUPLICAT */}
                                        {row.status === 'POSIBIL_DUPLICAT' && expandedRows.has(row.originalIndex) && row.existingSportiv && (
                                            <tr>
                                                <td colSpan={7} className="px-3 py-3 bg-zinc-900/50">
                                                    <div className="rounded-lg overflow-hidden border border-zinc-700">
                                                        <table className="w-full text-xs">
                                                            <thead>
                                                                <tr className="bg-zinc-800/80 text-zinc-500 uppercase tracking-wide">
                                                                    <th className="px-3 py-1.5 text-left w-16"></th>
                                                                    <th className="px-3 py-1.5 text-left">Nume</th>
                                                                    <th className="px-3 py-1.5 text-left">Prenume</th>
                                                                    <th className="px-3 py-1.5 text-left">Data nasterii</th>
                                                                    <th className="px-3 py-1.5 text-left">CNP</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr className="border-t border-zinc-700">
                                                                    <td className="px-3 py-1.5 text-zinc-500 font-medium">CSV:</td>
                                                                    <td className="px-3 py-1.5 text-zinc-200">{row.sportivData?.nume || '—'}</td>
                                                                    <td className="px-3 py-1.5 text-zinc-200">{row.sportivData?.prenume || '—'}</td>
                                                                    <td className="px-3 py-1.5 text-zinc-200">{row.dataNasteriiCSV || '—'}</td>
                                                                    <td className="px-3 py-1.5 text-zinc-400">{row.sportivData?.cnp || '—'}</td>
                                                                </tr>
                                                                <tr className="border-t border-zinc-700">
                                                                    <td className="px-3 py-1.5 text-zinc-500 font-medium">In DB:</td>
                                                                    <td className={`px-3 py-1.5 ${row.sportivData?.nume?.toLowerCase().trim() !== row.existingSportiv.nume?.toLowerCase().trim() ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300' : 'text-zinc-200'}`}>
                                                                        {row.existingSportiv.nume || '—'}
                                                                    </td>
                                                                    <td className={`px-3 py-1.5 ${row.sportivData?.prenume?.toLowerCase().trim() !== row.existingSportiv.prenume?.toLowerCase().trim() ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300' : 'text-zinc-200'}`}>
                                                                        {row.existingSportiv.prenume || '—'}
                                                                    </td>
                                                                    <td className={`px-3 py-1.5 ${row.sportivData?.data_nasterii !== row.existingSportiv.data_nasterii ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300' : 'text-zinc-200'}`}>
                                                                        {formatDateForDisplay(row.existingSportiv.data_nasterii)}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-zinc-400">{row.existingSportiv.cnp || '—'}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Carduri mobil (< md) */}
                    <div className="md:hidden divide-y divide-zinc-800/50 max-h-[60vh] overflow-y-auto">
                        {unifiedRows.map((row, idx) => (
                            <div key={idx} className={`p-3 ${row.status === 'EROARE' ? 'opacity-60' : ''}`}>
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <div>
                                        <span className="text-zinc-500 text-xs mr-1.5">#{row.originalIndex + 1}</span>
                                        <span className="text-zinc-100 font-medium">{row.nume} {row.prenume}</span>
                                    </div>
                                    {getStatusBadge(row.status)}
                                </div>
                                <div className="text-xs text-zinc-500 mb-1.5">
                                    Data: <span className="text-zinc-400">{row.dataNasteriiCSV || '—'}</span>
                                </div>
                                {row.motiv && (
                                    <div className="text-xs text-zinc-500 mb-2 leading-relaxed">{row.motiv}</div>
                                )}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {row.status === 'POSIBIL_DUPLICAT' && row.looseIndex !== undefined && (
                                        <>
                                            <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIndices.has(row.looseIndex)}
                                                    onChange={() => toggleSelection(row.looseIndex!)}
                                                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500"
                                                />
                                                Actualizeaza
                                            </label>
                                            <button
                                                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                                                onClick={() => toggleExpandRow(row.originalIndex)}
                                            >
                                                {expandedRows.has(row.originalIndex) ? '▲ Ascunde' : '▼ Detalii'}
                                            </button>
                                        </>
                                    )}
                                    {row.status === 'ACTUALIZARE_AUTO' && row.strictIndex !== undefined && (
                                        <button
                                            className={`text-xs px-2 py-0.5 rounded border transition-colors ${excludedStrictIndices.has(row.strictIndex) ? 'bg-zinc-700 text-zinc-400 border-zinc-600' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}
                                            onClick={() => toggleExcludeStrict(row.strictIndex!)}
                                        >
                                            {excludedStrictIndices.has(row.strictIndex) ? 'Inclus' : 'Exclude'}
                                        </button>
                                    )}
                                </div>
                                {/* Comparatie expandata pe mobil */}
                                {row.status === 'POSIBIL_DUPLICAT' && expandedRows.has(row.originalIndex) && row.existingSportiv && (
                                    <div className="mt-2 rounded border border-zinc-700 overflow-hidden text-xs">
                                        <div className="grid grid-cols-[3rem_1fr_1fr_1fr] bg-zinc-800/80 text-zinc-500 uppercase tracking-wide">
                                            <div className="px-2 py-1"></div>
                                            <div className="px-2 py-1">Nume</div>
                                            <div className="px-2 py-1">Prenume</div>
                                            <div className="px-2 py-1">Data</div>
                                        </div>
                                        <div className="grid grid-cols-[3rem_1fr_1fr_1fr] border-t border-zinc-700">
                                            <div className="px-2 py-1.5 text-zinc-500">CSV</div>
                                            <div className="px-2 py-1.5 text-zinc-200">{row.sportivData?.nume || '—'}</div>
                                            <div className="px-2 py-1.5 text-zinc-200">{row.sportivData?.prenume || '—'}</div>
                                            <div className="px-2 py-1.5 text-zinc-200">{row.dataNasteriiCSV || '—'}</div>
                                        </div>
                                        <div className="grid grid-cols-[3rem_1fr_1fr_1fr] border-t border-zinc-700">
                                            <div className="px-2 py-1.5 text-zinc-500">DB</div>
                                            <div className={`px-2 py-1.5 ${row.sportivData?.nume?.toLowerCase().trim() !== row.existingSportiv.nume?.toLowerCase().trim() ? 'bg-yellow-500/10 text-yellow-300' : 'text-zinc-200'}`}>
                                                {row.existingSportiv.nume || '—'}
                                            </div>
                                            <div className={`px-2 py-1.5 ${row.sportivData?.prenume?.toLowerCase().trim() !== row.existingSportiv.prenume?.toLowerCase().trim() ? 'bg-yellow-500/10 text-yellow-300' : 'text-zinc-200'}`}>
                                                {row.existingSportiv.prenume || '—'}
                                            </div>
                                            <div className={`px-2 py-1.5 ${row.sportivData?.data_nasterii !== row.existingSportiv.data_nasterii ? 'bg-yellow-500/10 text-yellow-300' : 'text-zinc-200'}`}>
                                                {formatDateForDisplay(row.existingSportiv.data_nasterii)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actiuni */}
                <div className="flex flex-col gap-4">
                    {showConfirm ? (
                        <div className="bg-violet-900/20 border border-violet-500/50 p-4 rounded-lg">
                            <p className="text-zinc-200 mb-4">
                                Esti pe cale sa adaugi <strong className="text-white">{validNouCount}</strong> sportivi noi si sa actualizezi <strong className="text-white">{activeAutoUpdates + selectedLooseCount}</strong> existenti. Esti sigur?
                            </p>
                            <div className="flex gap-3 flex-wrap">
                                <Button onClick={() => handleExecuteImport()} isLoading={importing}>
                                    Da, Importa acum
                                </Button>
                                <Button variant="secondary" onClick={() => setShowConfirm(false)}>
                                    Anuleaza
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-3 flex-wrap">
                            <Button onClick={() => handleExecuteImport()} isLoading={importing}>
                                Finalizeaza Import ({seVaImporta} sportivi)
                            </Button>
                            <Button variant="secondary" onClick={() => setStep(0)}>
                                Inapoi la incarcare
                            </Button>
                        </div>
                    )}
                </div>
            </Card>
        );
    }

    // -------------------------
    // STEP 0: Upload
    // -------------------------
    return (
        <Card className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-zinc-100">Import Sportivi</h2>
            <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                    <h3 className="text-blue-400 font-semibold mb-2 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Instructiuni Import
                    </h3>
                    <ul className="text-sm text-slate-300 space-y-2 list-disc ml-5">
                        <li>Utilizati butonul de mai jos pentru a descarca template-ul corect.</li>
                        <li>
                            <strong className="text-white">Format Data Nastere:</strong> Sunt acceptate formatele
                            <code className="mx-1 bg-slate-800 px-1 rounded text-blue-300">DD/MM/YYYY</code>,
                            <code className="mx-1 bg-slate-800 px-1 rounded text-blue-300">DD.MM.YYYY</code> sau
                            <code className="mx-1 bg-slate-800 px-1 rounded text-blue-300">YYYY-MM-DD</code>.
                        </li>
                        <li>Asigurati-va ca numele si prenumele sunt completate pentru fiecare rand.</li>
                        <li>Campul <code className="mx-1 bg-slate-800 px-1 rounded text-blue-300">DATA NASTERII</code> este obligatoriu pentru inregistrarea sportivilor noi.</li>
                    </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={() => downloadTemplate()} variant="secondary" className="flex-1">
                        Descarca Template CSV
                    </Button>
                    <div className="flex-1 relative">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-400 flex items-center justify-between h-full">
                            <span>{file ? file.name : 'Selecteaza fisier CSV...'}</span>
                            <Button size="sm" variant="secondary" type="button">Cauta</Button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-700 flex-wrap">
                    <Button onClick={() => handleAnalyze()} isLoading={importing} className="flex-1" disabled={!file}>
                        {importing ? 'Se analizeaza...' : 'Analizeaza Fisier'}
                    </Button>
                    <Button variant="secondary" onClick={() => onBack()}>Inapoi</Button>
                </div>
            </div>
        </Card>
    );
};
