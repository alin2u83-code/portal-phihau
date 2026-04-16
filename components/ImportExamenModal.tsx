import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import { Grad, User, Sportiv, SesiuneExamen, Locatie } from '../types';
import { ExclamationTriangleIcon, CheckCircleIcon, DocumentArrowDownIcon, XCircleIcon, UserPlusIcon, ChevronDownIcon, BookOpenIcon, ClipboardCheckIcon } from './icons';
import { useError } from './ErrorProvider';
import { Modal, Button, Input, Select } from './ui';
import { ResponsiveTable, Column } from './ResponsiveTable';

interface ImportExamenModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: () => void;
    currentUser: User;
    locatii: Locatie[];
    setLocatii: React.Dispatch<React.SetStateAction<Locatie[]>>;
    sesiuni: SesiuneExamen[];
    setSesiuni: React.Dispatch<React.SetStateAction<SesiuneExamen[]>>;
}

type CsvFormat = 'own' | 'grila' | 'federatie';

interface CsvRow {
    Nume: string;
    Prenume: string;
    Grad_Nou_Ordine: string;
    Rezultat: 'Admis' | 'Respins' | 'Neprezentat';
    Contributie: string;
    Data_Examen: string;
    Sesiune_Denumire: string;
    Localitate: string;
}

interface GrilaRow {
    Nr?: string;
    NUME: string;
    PRENUME: string;
    Club?: string;
    'Grad sustinut': string;
    Tehnica?: string;
    'Doc/Luyen'?: string;
    'Song/Doi'?: string;
    'Thao/Quyen'?: string;
    'Nota generala'?: string;
    [key: string]: string | undefined;
}

interface FederatieRow {
    Nr?: string;
    NUME: string;
    PRENUME: string;
    'Gradul sustinut': string;
    'Admis/Respins': string;
    Contributia?: string;
    Obs?: string;
    [key: string]: string | undefined;
}

interface BirthdateRow {
    Nume: string;
    Prenume: string;
    Data_Nasterii: string;
}

interface PotentialMatch extends Sportiv {
    similarity: number;
}

interface PreviewRow extends CsvRow {
    originalIndex: number;
    status: 'pending' | 'valid' | 'conflict' | 'create' | 'error' | 'resolved';
    message: string;
    existingSportiv?: Sportiv;
    generatedCode?: string;
    conflicts?: PotentialMatch[];
    resolution?: { action: 'create' } | { action: 'use_existing', sportivId: string };
    sessionInfo: {
        key: string;
        isNew: boolean;
        sesiuneDenumire: string;
        dataExamen: string;
        localitate: string;
        existingSessionId?: string;
    };
    birthdate?: string; // From second file
}

const stringSimilarity = (a: string, b: string): number => {
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    const setA = new Set(normalize(a));
    const setB = new Set(normalize(b));
    if (setA.size === 0 && setB.size === 0) return 1;
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
};

// Normalizează orice format de dată la yyyy-mm-dd
// Acceptă: yyyy-mm-dd, dd/mm/yyyy, d/m/yyyy, dd-mm-yyyy
const parseDateToISO = (raw: string): string => {
    if (!raw) return '';
    const s = raw.trim();
    // Deja ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    // dd/mm/yyyy sau d/m/yyyy sau dd-mm-yyyy
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return s.slice(0, 10);
};

export const ImportExamenModal: React.FC<ImportExamenModalProps> = ({ isOpen, onClose, onImportComplete, currentUser, locatii: initialLocatii, setLocatii, sesiuni: initialSesiuni, setSesiuni }) => {
    const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [grades, setGrades] = useState<Grad[]>([]);
    const [errorLog, setErrorLog] = useState<any | null>(null);
    const { showError, showSuccess } = useError();
    
    const [examFile, setExamFile] = useState<File | null>(null);
    const [birthdateFile, setBirthdateFile] = useState<File | null>(null);
    const [csvFormat, setCsvFormat] = useState<CsvFormat>('own');
    const [sessionOverride, setSessionOverride] = useState({ data: '', sesiune_denumire: '', localitate: '' });
    const [ghidOpen, setGhidOpen] = useState(true);
    const [downloadingRef, setDownloadingRef] = useState(false);
    const [copiedFormula, setCopiedFormula] = useState(false);
    const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);

    useEffect(() => {
        if (isOpen) {
            const fetchGrades = async () => {
                if (supabase) {
                    const { data, error } = await supabase.from('grade').select('*').order('ordine');
                    if (error) showError("Eroare la preluare grade", error.message); else setGrades(data || []);
                }
            };
            fetchGrades();
            setPreviewData([]);
            setErrorLog(null);
            setExamFile(null);
            setBirthdateFile(null);
            setImportProgress(null);
        }
    }, [isOpen, showError]);

    const downloadReferenceFile = async () => {
        if (!supabase) return;
        setDownloadingRef(true);
        const { data, error } = await supabase
            .from('sportivi')
            .select('id, nume, prenume, data_nasterii, grad_actual_id')
            .order('nume');
        setDownloadingRef(false);
        if (error) { showError('Eroare', error.message); return; }
        const rows = (data || []).map(s => {
            const grad = grades.find(g => g.id === s.grad_actual_id);
            return {
                ID: s.id,
                Nume: s.nume,
                Prenume: s.prenume,
                Data_Nasterii: s.data_nasterii ? String(s.data_nasterii).slice(0, 10) : '',
                Grad_Actual: grad?.nume || '',
            };
        });
        const csv = Papa.unparse(rows);
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'referinta_sportivi.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Matches a grade name/level string to a grade ordine number
    const findGradeOrdine = (gradName: string): string => {
        if (!gradName) return '';
        const normalized = gradName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        // Try exact match first
        const exact = grades.find(g => g.nume.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalized);
        if (exact) return String(exact.ordine);
        // Try numeric ordine directly (e.g. "3")
        const asNum = parseInt(gradName.trim(), 10);
        if (!isNaN(asNum) && grades.some(g => g.ordine === asNum)) return String(asNum);
        // Fuzzy: find best similarity
        let best = { score: 0, ordine: '' };
        for (const g of grades) {
            const score = stringSimilarity(normalized, g.nume.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
            if (score > best.score) best = { score, ordine: String(g.ordine) };
        }
        return best.score > 0.5 ? best.ordine : '';
    };

    const NOTA_PROMOVARE = 7;
    const PROBE_GRILA = ['Tehnica', 'Doc/Luyen', 'Song/Doi', 'Thao/Quyen', 'Nota generala'] as const;

    const mapGrilaToCsvRow = (row: GrilaRow): CsvRow => {
        // Verifică fiecare probă: dacă nu e introdusă, se consideră nota de promovare (7)
        // Dacă orice probă introdusă < 7 → Respins
        let rezultat: CsvRow['Rezultat'] = 'Admis';
        for (const proba of PROBE_GRILA) {
            const raw = row[proba];
            if (raw !== undefined && raw.trim() !== '') {
                const nota = parseFloat(raw);
                if (!isNaN(nota) && nota < NOTA_PROMOVARE) {
                    rezultat = 'Respins';
                    break;
                }
            }
            // dacă e goală → 7 implicit → trece
        }
        return {
            Nume: row.NUME || '',
            Prenume: row.PRENUME || '',
            Grad_Nou_Ordine: findGradeOrdine(row['Grad sustinut'] || ''),
            Rezultat: rezultat,
            Contributie: '0',
            Data_Examen: sessionOverride.data,
            Sesiune_Denumire: sessionOverride.sesiune_denumire,
            Localitate: sessionOverride.localitate,
        };
    };

    const mapFederatieToCsvRow = (row: FederatieRow): CsvRow => {
        const admisRaw = (row['Admis/Respins'] || '').trim().toLowerCase();
        const rezultat: CsvRow['Rezultat'] = admisRaw === 'admis' ? 'Admis' : admisRaw === 'respins' ? 'Respins' : 'Neprezentat';
        return {
            Nume: row.NUME || '',
            Prenume: row.PRENUME || '',
            Grad_Nou_Ordine: findGradeOrdine(row['Gradul sustinut'] || ''),
            Rezultat: rezultat,
            Contributie: (row.Contributia || '0').replace(/[^0-9.]/g, ''),
            Data_Examen: sessionOverride.data,
            Sesiune_Denumire: sessionOverride.sesiune_denumire,
            Localitate: sessionOverride.localitate,
        };
    };

    const handleProcessFiles = async () => {
        if (!examFile) return;
        if (grades.length === 0) {
            showError("Grade indisponibile", "Lista de grade nu a putut fi încărcată. Reîncarcă pagina și încearcă din nou.");
            return;
        }
        if (csvFormat !== 'own') {
            if (!sessionOverride.data || !sessionOverride.sesiune_denumire || !sessionOverride.localitate) {
                showError("Date sesiune lipsă", "Pentru acest format trebuie să completezi Data, Denumirea sesiunii și Localitatea.");
                return;
            }
        }

        setIsProcessing(true);
        setPreviewData([]);
        setErrorLog(null);

        let birthdateRecords: { normalizedName: string; originalName: string; birthdate: string }[] = [];

        // 1. Parse Birthdate File first (if exists)
        if (birthdateFile) {
            await new Promise<void>((resolve) => {
                Papa.parse<BirthdateRow>(birthdateFile, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        results.data.forEach(row => {
                            if (row.Nume && row.Prenume && row.Data_Nasterii) {
                                const fullName = `${row.Nume} ${row.Prenume}`;
                                // Replace non-alphanumeric with space to handle "Ana-Maria" -> "Ana Maria"
                                const normalized = fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
                                birthdateRecords.push({
                                    normalizedName: normalized,
                                    originalName: fullName,
                                    birthdate: parseDateToISO(row.Data_Nasterii)
                                });
                            }
                        });
                        resolve();
                    }
                });
            });
        }

        // 2. Parse Exam File
        Papa.parse<any>(examFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                let rows: CsvRow[];
                if (csvFormat === 'grila') {
                    rows = (results.data as GrilaRow[])
                        .filter(r => r.NUME && r.PRENUME)
                        .map(mapGrilaToCsvRow);
                } else if (csvFormat === 'federatie') {
                    rows = (results.data as FederatieRow[])
                        .filter(r => r.NUME && r.PRENUME)
                        .map(mapFederatieToCsvRow);
                } else {
                    rows = results.data as CsvRow[];
                }
                const processed = await validateData(rows, birthdateRecords);
                setPreviewData(processed);
                setIsProcessing(false);
            }
        });
    };

    const validateData = useCallback(async (data: CsvRow[], birthdateRecords: { normalizedName: string; originalName: string; birthdate: string }[]): Promise<PreviewRow[]> => {
        const { data: allSportivi, error } = await supabase.from('sportivi').select('*');
        if (error) { showError("Eroare la validare", error.message); return []; }

        const { data: existingInscrieri } = await supabase.from('inscrieri_examene').select('sportiv_id, sesiune_id');
        const inscrieriSet = new Set((existingInscrieri || []).map(i => `${i.sportiv_id}_${i.sesiune_id}`));

        const validationPromises = data.map(async (row, index): Promise<PreviewRow> => {
            const baseRow: Omit<PreviewRow, 'sessionInfo' | 'status' | 'message'> = { ...row, originalIndex: index };
            
            // --- Improved Birthdate Matching Logic ---
            let birthdate: string | undefined;
            if (row.Nume && row.Prenume) {
                // Replace non-alphanumeric with space to handle "Ana-Maria" -> "Ana Maria"
                const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
                
                const name1 = normalize(`${row.Nume} ${row.Prenume}`);
                const name2 = normalize(`${row.Prenume} ${row.Nume}`); // Reverse order check

                // 1. Exact Match
                let match = birthdateRecords.find(r => r.normalizedName === name1 || r.normalizedName === name2);

                // 2. Fuzzy Match if no exact match
                if (!match) {
                    let bestScore = 0;
                    let bestMatch = null;
                    for (const record of birthdateRecords) {
                        const score1 = stringSimilarity(name1, record.normalizedName);
                        const score2 = stringSimilarity(name2, record.normalizedName); // Check reverse too
                        const maxScore = Math.max(score1, score2);
                        
                        if (maxScore > bestScore) {
                            bestScore = maxScore;
                            bestMatch = record;
                        }
                    }
                    // Threshold for fuzzy match (0.85 seems reasonable for names)
                    if (bestScore > 0.85) {
                        match = bestMatch;
                    }
                }

                if (match) {
                    birthdate = match.birthdate;
                }
            }
            // -----------------------------------------
            
            const normalizedDataExamen = parseDateToISO(row.Data_Examen?.trim() || '');
            const existingSession = (initialSesiuni || []).find(s => s.data === normalizedDataExamen);
            const sessionInfo = {
                key: `${row.Sesiune_Denumire?.trim()}-${normalizedDataExamen}`,
                isNew: !existingSession,
                sesiuneDenumire: row.Sesiune_Denumire?.trim(),
                dataExamen: normalizedDataExamen,
                localitate: row.Localitate?.trim(),
                existingSessionId: existingSession?.id
            };

            if (!row.Nume || !row.Prenume || !row.Grad_Nou_Ordine || !row.Sesiune_Denumire || !row.Data_Examen || !row.Localitate) {
                return { ...baseRow, status: 'error', message: 'Rând incomplet. Toate coloanele sunt obligatorii.', sessionInfo, birthdate };
            }

            if (!grades.some(g => String(g.ordine) === String(row.Grad_Nou_Ordine).trim())) {
                return { ...baseRow, status: 'error', message: `Cod Grad invalid: ${row.Grad_Nou_Ordine}`, sessionInfo, birthdate };
            }

            // Potrivire după Nume + Prenume (+ Data Nașterii dacă e disponibilă)
            const fullNameCsv = `${row.Nume} ${row.Prenume}`;
            const potentialMatches = (allSportivi || [])
                .map(s => ({ ...s, similarity: stringSimilarity(fullNameCsv, `${s.nume} ${s.prenume}`) }))
                .filter(s => s.similarity > 0.7)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 3);
            
            if (potentialMatches.length > 0) {
                const exactBirthdateMatch = birthdate
                    ? potentialMatches.find(s => parseDateToISO(String(s.data_nasterii || '')) === parseDateToISO(birthdate))
                    : null;

                // Auto-resolve: nume similar + data nașterii identică → valid fără intervenție manuală
                if (exactBirthdateMatch && exactBirthdateMatch.similarity >= 0.7) {
                    const sportivId = exactBirthdateMatch.id;
                    const existingSessionId = sessionInfo.existingSessionId;
                    if (existingSessionId && inscrieriSet.has(`${sportivId}_${existingSessionId}`)) {
                        return { ...baseRow, status: 'error', message: 'Deja înscris la această sesiune — sărit (există în baza de date)', existingSportiv: exactBirthdateMatch, sessionInfo, birthdate };
                    }
                    return {
                        ...baseRow,
                        status: 'valid',
                        message: `Auto-potrivit (Nume + Data Nașterii): ${exactBirthdateMatch.nume} ${exactBirthdateMatch.prenume}`,
                        existingSportiv: exactBirthdateMatch,
                        sessionInfo,
                        birthdate,
                    };
                }

                // Potrivire exactă de nume (similarity = 1) fără dată → valid automat
                if (potentialMatches[0].similarity === 1) {
                    const sportivId = potentialMatches[0].id;
                    const existingSessionId = sessionInfo.existingSessionId;
                    if (existingSessionId && inscrieriSet.has(`${sportivId}_${existingSessionId}`)) {
                        return { ...baseRow, status: 'error', message: 'Deja înscris la această sesiune — sărit (există în baza de date)', existingSportiv: potentialMatches[0], sessionInfo, birthdate };
                    }
                    return {
                        ...baseRow,
                        status: 'valid',
                        message: `Găsit (Nume exact): ${potentialMatches[0].nume} ${potentialMatches[0].prenume}`,
                        existingSportiv: potentialMatches[0],
                        sessionInfo,
                        birthdate,
                    };
                }

                // Altfel → conflict manual
                return { ...baseRow, status: 'conflict', message: 'Potriviri similare — alege sportivul corect', conflicts: potentialMatches, sessionInfo, birthdate };
            }

            // Niciun sportiv găsit → va fi creat automat
            return { ...baseRow, status: 'create', message: `Sportiv nou — va fi creat și înregistrat la examen`, generatedCode: undefined, sessionInfo, birthdate };
        });

        return Promise.all(validationPromises);
    }, [grades, showError, initialSesiuni]);

    const BATCH_SIZE = 10; // cereri paralele simultane

    const confirmImport = async () => {
        setIsProcessing(true);
        setErrorLog(null);
        setImportProgress(null);
        let localLocatii = [...initialLocatii];
        let localSesiuni = [...initialSesiuni];
        const createdSessionIds = new Map<string, string>();
        let successCount = 0;
        const errorDetails: { row: number; name: string; error: string }[] = [];

        const rowsToProcess = previewData.filter(
            r => r.status === 'valid' || r.status === 'create' || r.status === 'resolved'
        );
        setImportProgress({ done: 0, total: rowsToProcess.length });

        try {
            // ── Pas 1: Creare sesiuni & locații ──────────────────────────────
            const newSessionsToCreate = new Map<string, PreviewRow['sessionInfo']>();
            rowsToProcess.forEach(row => {
                if (row.sessionInfo.isNew && !newSessionsToCreate.has(row.sessionInfo.key))
                    newSessionsToCreate.set(row.sessionInfo.key, row.sessionInfo);
            });

            for (const [key, sessionInfo] of newSessionsToCreate.entries()) {
                // Locație
                let locatie = localLocatii.find(
                    l => l.nume.toLowerCase() === sessionInfo.localitate.toLowerCase()
                );
                if (!locatie) {
                    const { data: newLoc, error: locError } = await supabase
                        .from('nom_locatii')
                        .insert({ nume: sessionInfo.localitate })
                        .select()
                        .maybeSingle();
                    if (locError) throw new Error(`Nu s-a putut crea locația '${sessionInfo.localitate}': ${locError.message}`);
                    if (!newLoc) throw new Error(`Nu s-a putut crea locația '${sessionInfo.localitate}'.`);
                    locatie = newLoc;
                    localLocatii.push(newLoc);
                }
                // Sesiune — verifică din nou în DB după dată + denumire (fix: nu doar dată)
                const existingCheck = localSesiuni.find(
                    s => s.data === sessionInfo.dataExamen && s.nume === sessionInfo.sesiuneDenumire
                );
                if (existingCheck) {
                    createdSessionIds.set(key, existingCheck.id);
                    continue;
                }
                const { data: newSes, error: sesError } = await supabase
                    .from('sesiuni_examene')
                    .insert({
                        data: sessionInfo.dataExamen,
                        locatie_id: locatie.id,
                        localitate: locatie.nume,
                        club_id: currentUser.club_id || null,
                        comisia: [],
                        status: 'Programat',
                        nume: sessionInfo.sesiuneDenumire,
                    })
                    .select()
                    .maybeSingle();
                if (sesError) throw new Error(`Nu s-a putut crea sesiunea '${sessionInfo.sesiuneDenumire}': ${sesError.message}`);
                if (!newSes) throw new Error(`Nu s-a putut crea sesiunea '${sessionInfo.sesiuneDenumire}'.`);
                createdSessionIds.set(key, newSes.id);
                localSesiuni.push(newSes);
            }
            setLocatii(localLocatii);
            setSesiuni(localSesiuni);

            // ── Pas 2: Procesare în batch-uri paralele ────────────────────────
            let done = 0;
            for (let i = 0; i < rowsToProcess.length; i += BATCH_SIZE) {
                const batch = rowsToProcess.slice(i, i + BATCH_SIZE);

                await Promise.all(batch.map(async (row) => {
                    const action = row.resolution?.action || (row.status === 'valid' ? 'use_existing' : 'create');
                    const sportivId = action === 'use_existing'
                        ? ((row.resolution as any)?.sportivId || row.existingSportiv?.id)
                        : null;
                    const sessionId = row.sessionInfo.existingSessionId || createdSessionIds.get(row.sessionInfo.key);
                    if (!sessionId) {
                        errorDetails.push({ row: row.originalIndex + 1, name: `${row.Nume} ${row.Prenume}`, error: 'ID sesiune nedeterminat.' });
                        return;
                    }
                    try {
                        const gradOrdine = parseInt(row.Grad_Nou_Ordine);
                        if (isNaN(gradOrdine)) throw new Error(`Grad invalid: "${row.Grad_Nou_Ordine}"`);

                        // 1. Găsește gradul
                        const { data: gradData, error: gradError } = await supabase
                            .from('grade').select('id, ordine').eq('ordine', gradOrdine).single();
                        if (gradError || !gradData) throw new Error(`Grad invalid (ordine=${gradOrdine})`);
                        const gradId = gradData.id;

                        const dataExamen = parseDateToISO(row.Data_Examen);
                        const contributie = parseFloat(row.Contributie) || 0;

                        // 2. Creează sau folosește sportivul existent
                        let finalSportivId = sportivId;
                        if (!finalSportivId) {
                            const { data: newSportiv, error: sportivError } = await supabase
                                .from('sportivi')
                                .insert({
                                    nume: row.Nume,
                                    prenume: row.Prenume,
                                    club_id: currentUser.club_id || null,
                                    grad_actual_id: row.Rezultat === 'Admis' ? gradId : null,
                                    status: 'Activ',
                                    data_inscrierii: new Date().toISOString().split('T')[0],
                                    data_nasterii: row.birthdate || null,
                                })
                                .select('id').single();
                            if (sportivError || !newSportiv) throw new Error(sportivError?.message || 'Nu s-a putut crea sportivul');
                            finalSportivId = newSportiv.id;
                        } else if (row.birthdate) {
                            await supabase.from('sportivi')
                                .update({ data_nasterii: row.birthdate })
                                .eq('id', finalSportivId)
                                .is('data_nasterii', null);
                        }

                        // 3. Înregistrează înscrierea la examen
                        const { data: existingInscriere } = await supabase
                            .from('inscrieri_examene')
                            .select('id')
                            .eq('sportiv_id', finalSportivId)
                            .eq('sesiune_id', sessionId)
                            .maybeSingle();

                        if (existingInscriere) {
                            const { error: updateError } = await supabase
                                .from('inscrieri_examene')
                                .update({ rezultat: row.Rezultat, grad_sustinut_id: gradId })
                                .eq('id', existingInscriere.id);
                            if (updateError) throw updateError;
                        } else {
                            const { error: insertError } = await supabase
                                .from('inscrieri_examene')
                                .insert({
                                    sportiv_id: finalSportivId,
                                    sesiune_id: sessionId,
                                    grad_sustinut_id: gradId,
                                    grad_actual_id: row.Rezultat === 'Admis' ? gradId : null,
                                    club_id: currentUser.club_id || null,
                                    varsta_la_examen: 0,
                                    rezultat: row.Rezultat,
                                    status_inscriere: 'Validat',
                                });
                            if (insertError) throw insertError;
                        }

                        // 4. Dacă Admis: actualizează gradul și istoricul de grade
                        if (row.Rezultat === 'Admis') {
                            const { data: sportivCurent } = await supabase
                                .from('sportivi')
                                .select('grad_actual_id, grade(ordine)')
                                .eq('id', finalSportivId)
                                .single();
                            const currentOrdine = (sportivCurent?.grade as any)?.ordine ?? -1;
                            if (gradOrdine > currentOrdine) {
                                await supabase.from('sportivi')
                                    .update({ grad_actual_id: gradId })
                                    .eq('id', finalSportivId);
                            }
                            await supabase.from('istoric_grade')
                                .upsert({
                                    sportiv_id: finalSportivId,
                                    grad_id: gradId,
                                    data_obtinere: dataExamen,
                                    sesiune_examen_id: sessionId,
                                    club_id: currentUser.club_id || null,
                                }, { onConflict: 'sportiv_id,grad_id' });
                        }

                        successCount++;
                    } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : (err as any)?.message || JSON.stringify(err);
                        errorDetails.push({ row: row.originalIndex + 1, name: `${row.Nume} ${row.Prenume}`, error: msg });
                    }
                }));

                done += batch.length;
                setImportProgress({ done, total: rowsToProcess.length });
            }

        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setErrorLog({ general: msg });
            showError('Eroare Critică de Import', msg);
        } finally {
            setIsProcessing(false);
            setImportProgress(null);
            if (errorDetails.length > 0) {
                setErrorLog({ general: 'Erori la procesarea unor rânduri.', details: errorDetails });
                showError(`Import finalizat cu ${errorDetails.length} erori`, `${successCount} procesate cu succes.`);
            } else {
                showSuccess('Import Finalizat', `${successCount} înregistrări procesate cu succes.`);
                onImportComplete();
                onClose();
            }
        }
    };

    const handleDescarcaRaport = () => {
        if (!previewData.length) return;
        const capete = ['Sportiv', 'Data Nasterii', 'Grad', 'Rezultat', 'Sesiune', 'Status', 'Detalii'];
        const linii = previewData.map(row => {
            const grad = grades.find(g => String(g.ordine) === String(row.Grad_Nou_Ordine));
            const statusLabel =
                row.status === 'valid' || row.status === 'resolved' ? 'Importat'
                : row.status === 'create' ? 'Sportiv Nou'
                : row.status === 'conflict' ? 'Conflict nerezolvat'
                : 'Eroare';
            return [
                `${row.Nume} ${row.Prenume}`,
                row.birthdate || '',
                grad ? grad.nume : row.Grad_Nou_Ordine,
                row.Rezultat || '',
                row.Sesiune_Denumire || '',
                statusLabel,
                row.message,
            ];
        });
        const csv = [capete, ...linii]
            .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\r\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `raport_import_examen_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleResolution = (originalIndex: number, resolution: { action: 'create' } | { action: 'use_existing', sportivId: string }) => {
        setPreviewData(prev => prev.map(row => {
            if (row.originalIndex === originalIndex) {
                const message = resolution.action === 'create'
                    ? `Va fi creat (Cod: ${row.generatedCode})`
                    : `Se va folosi sportivul selectat.`;
                return { ...row, status: 'resolved', resolution, message };
            }
            return row;
        }));
    };

    const columns: Column<PreviewRow>[] = [
        {
            key: 'Nume',
            label: 'Sportiv',
            render: (row) => <span className="font-semibold text-white">{row.Nume} {row.Prenume}</span>
        },
        {
            key: 'birthdate',
            label: 'Data Nașterii',
            render: (row) => <span className="text-xs text-slate-400">{row.birthdate || '-'}</span>
        },
        {
            key: 'Grad_Nou_Ordine',
            label: 'Grad',
            render: (row) => {
                const grad = grades.find(g => String(g.ordine) === String(row.Grad_Nou_Ordine));
                return <span className="text-xs text-slate-300">{grad ? `${grad.nume} (${grad.ordine})` : <span className="text-red-400">Negăsit: {row.Grad_Nou_Ordine}</span>}</span>;
            }
        },
        {
            key: 'Rezultat',
            label: 'Rezultat',
            render: (row) => (
                <span className={`text-xs font-bold ${row.Rezultat === 'Admis' ? 'text-green-400' : row.Rezultat === 'Respins' ? 'text-red-400' : 'text-slate-400'}`}>
                    {row.Rezultat}
                </span>
            )
        },
        {
            key: 'Sesiune_Denumire',
            label: 'Sesiune',
            render: (row) => <span className="text-xs text-slate-400">{row.Sesiune_Denumire}</span>
        },
        {
            key: 'status',
            label: 'Acțiune/Status',
            render: (row) => (
                row.status === 'conflict' ? (
                    <ConflictResolver row={row} onResolve={handleResolution} />
                ) : (
                    <div className="flex items-center gap-2">
                        {row.status === 'valid' || row.status === 'resolved' || row.status === 'create' ? <CheckCircleIcon className="w-5 h-5 text-green-400" /> : <XCircleIcon className="w-5 h-5 text-red-400" />}
                        <span className="text-xs">{row.message}</span>
                    </div>
                )
            )
        }
    ];

    const renderMobileItem = (row: PreviewRow) => {
        const grad = grades.find(g => String(g.ordine) === String(row.Grad_Nou_Ordine));
        return (
        <div className={`mb-4 p-4 rounded-lg border-l-4 bg-slate-800/50 ${row.status === 'valid' || row.status === 'resolved' || row.status === 'create' ? 'border-green-500' : row.status === 'conflict' ? 'border-amber-500' : 'border-red-500'}`}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="font-bold text-white text-lg">{row.Nume} {row.Prenume}</p>
                    <p className="text-sm text-slate-400">Data N.: {row.birthdate || '-'}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${row.Rezultat === 'Admis' ? 'bg-green-900/50 text-green-400' : row.Rezultat === 'Respins' ? 'bg-red-900/50 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                    {row.Rezultat}
                </span>
            </div>
            <p className="text-xs text-slate-300 mb-1">
                Grad: {grad ? <strong>{grad.nume}</strong> : <span className="text-red-400">Negăsit ({row.Grad_Nou_Ordine})</span>}
            </p>
            <p className="text-sm text-slate-400 mb-2">Sesiune: {row.Sesiune_Denumire}</p>
            
            <div className="mt-2">
                <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Status</label>
                {row.status === 'conflict' ? (
                    <ConflictResolver row={row} onResolve={handleResolution} />
                ) : (
                    <div className="flex items-center gap-2">
                        {row.status === 'valid' || row.status === 'resolved' || row.status === 'create' ? <CheckCircleIcon className="w-5 h-5 text-green-400" /> : <XCircleIcon className="w-5 h-5 text-red-400" />}
                        <span className="text-xs text-slate-300">{row.message}</span>
                    </div>
                )}
            </div>
        </div>
        );
    };

    const unresolvedConflicts = previewData.some(r => r.status === 'conflict');
    const importableRowsCount = previewData.filter(r => r.status === 'valid' || r.status === 'create' || r.status === 'resolved').length;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import Bulk Rezultate Examen">
            <div className="space-y-6">

                {/* ── Ghid de import ── */}
                <div className="border border-slate-700 rounded-lg overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setGhidOpen(p => !p)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-700 text-left"
                    >
                        <span className="flex items-center gap-2 font-semibold text-brand-secondary">
                            <BookOpenIcon className="w-5 h-5" /> Ghid de pregătire import
                        </span>
                        <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${ghidOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {ghidOpen && (
                        <div className="p-5 space-y-5 bg-slate-900/50 text-sm">

                            {/* Pași */}
                            <div>
                                <h3 className="font-bold text-white mb-2">Cum pregătești fișierul CSV</h3>
                                <ol className="space-y-1 list-decimal pl-5 text-slate-300">
                                    <li>Descarcă <strong>Lista de referință sportivi</strong> (butonul de mai jos) — conține ID, Nume, Prenume, Data Nașterii și Grad Actual.</li>
                                    <li>Deschide lista în Excel. Salvează foaia ca <code className="bg-slate-800 px-1 rounded">Referinta</code> în același fișier cu grila de examen.</li>
                                    <li>În coloana <strong>ID</strong> din grilă, lipește formula de mai jos — caută automat ID-ul după <em>Nume + Prenume + Data Nașterii</em>.</li>
                                    <li>Coloana <strong>Data Nașterii</strong> trebuie să fie în format <code className="bg-slate-800 px-1 rounded">yyyy-mm-dd</code> (ex: <code className="bg-slate-800 px-1 rounded">2010-05-20</code>). Dacă Excel o afișează altfel, formatează coloana ca <strong>Text</strong> înainte de export CSV.</li>
                                    <li>Gradul trebuie scris <strong>exact ca în tabelul de mai jos</strong> — sau folosește numărul de ordine.</li>
                                    <li>Exportă ca <code className="bg-slate-800 px-1 rounded">.csv</code> și încarcă mai jos.</li>
                                </ol>
                            </div>

                            {/* Referință sportivi */}
                            <div className="flex items-center justify-between bg-slate-800 rounded-lg p-3">
                                <div>
                                    <p className="font-semibold text-white">Lista de referință sportivi</p>
                                    <p className="text-xs text-slate-400">CSV cu: ID, Nume, Prenume, Data_Nasterii, Grad_Actual</p>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={downloadReferenceFile}
                                    isLoading={downloadingRef}
                                    disabled={grades.length === 0}
                                >
                                    <DocumentArrowDownIcon className="w-4 h-4 mr-1" /> Descarcă
                                </Button>
                            </div>

                            {/* Formula Excel */}
                            <div>
                                <h3 className="font-bold text-white mb-1">Formula Excel pentru extragerea ID-ului</h3>
                                <p className="text-xs text-slate-400 mb-2">
                                    Dacă în grila ta <strong>A2=Nume, B2=Prenume, C2=Data_Nasterii</strong>, pune formula în coloana ID:
                                </p>
                                <div className="flex items-start gap-2">
                                    <pre className="flex-1 bg-slate-950 border border-slate-700 rounded p-3 text-xs text-green-400 font-mono whitespace-pre-wrap overflow-x-auto">
{`=IFERROR(
  INDEX(Referinta!$A:$A,
    MATCH(A2&"|"&B2&"|"&TEXT(C2,"YYYY-MM-DD"),
          Referinta!$B:$B&"|"&Referinta!$C:$C&"|"&TEXT(Referinta!$D:$D,"YYYY-MM-DD"),
          0)
  ),
  "NEGĂSIT"
)`}
                                    </pre>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(
                                                `=IFERROR(INDEX(Referinta!$A:$A,MATCH(A2&"|"&B2&"|"&TEXT(C2,"YYYY-MM-DD"),Referinta!$B:$B&"|"&Referinta!$C:$C&"|"&TEXT(Referinta!$D:$D,"YYYY-MM-DD"),0)),"NEGĂSIT")`
                                            );
                                            setCopiedFormula(true);
                                            setTimeout(() => setCopiedFormula(false), 2000);
                                        }}
                                        className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white"
                                        title="Copiază formula"
                                    >
                                        <ClipboardCheckIcon className="w-4 h-4" />
                                        {copiedFormula ? 'Copiat!' : 'Copiază'}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    ⚠️ În Excel 365 apasă <kbd className="bg-slate-700 px-1 rounded">Enter</kbd> direct. În Excel mai vechi (pre-2019) apasă <kbd className="bg-slate-700 px-1 rounded">Ctrl+Shift+Enter</kbd>.
                                </p>
                            </div>

                            {/* Tabel grade */}
                            <div>
                                <h3 className="font-bold text-white mb-2">Grade valide (scrieți exact această denumire în CSV)</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {grades.map(g => (
                                        <div key={g.id} className="flex items-center gap-2 bg-slate-800 rounded px-3 py-1.5">
                                            <span className="text-xs font-mono text-brand-secondary w-4 text-right">{g.ordine}</span>
                                            <span className="text-xs text-white">{g.nume}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Coloana din CSV: <code className="bg-slate-800 px-1 rounded">Grad sustinut</code> (Format Grilă) sau <code className="bg-slate-800 px-1 rounded">Gradul sustinut</code> (Format Federație). Numărul din coloana <strong>Ord.</strong> poate fi folosit direct în loc de denumire.</p>
                            </div>

                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <Select
                        label="Format fișier CSV"
                        value={csvFormat}
                        onChange={e => { setCsvFormat(e.target.value as CsvFormat); setExamFile(null); setPreviewData([]); }}
                    >
                        <option value="own">Format Propriu</option>
                        <option value="grila">Format Grilă Examen</option>
                        <option value="federatie">Format Tabel Federație</option>
                    </Select>

                    {csvFormat !== 'own' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                            <p className="md:col-span-3 text-xs text-slate-400 font-semibold">Detalii sesiune (nu sunt în CSV-ul extern):</p>
                            <Input label="Data Examenului *" type="date" value={sessionOverride.data}
                                onChange={e => setSessionOverride(p => ({ ...p, data: e.target.value }))} />
                            <Input label="Denumire Sesiune *" value={sessionOverride.sesiune_denumire}
                                onChange={e => setSessionOverride(p => ({ ...p, sesiune_denumire: e.target.value }))}
                                placeholder="ex: Examen Iarnă 2026" />
                            <Input label="Localitate *" value={sessionOverride.localitate}
                                onChange={e => setSessionOverride(p => ({ ...p, localitate: e.target.value }))}
                                placeholder="ex: Iași" />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input type="file" accept=".csv" label="Fișier Examen (Obligatoriu)"
                            onChange={(e) => setExamFile(e.target.files?.[0] || null)} />
                        <Input type="file" accept=".csv" label="Fișier Date Naștere (Opțional)"
                            onChange={(e) => setBirthdateFile(e.target.files?.[0] || null)} />
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button 
                        onClick={handleProcessFiles} 
                        disabled={!examFile || isProcessing} 
                        isLoading={isProcessing}
                        variant="primary"
                    >
                        Procesează Fișierele
                    </Button>
                </div>
                
                {previewData.length > 0 && (
                    <div className="space-y-4 animate-fade-in-down">
                        <h2 className="text-xl font-bold">Previzualizare și Confirmare</h2>

                        {/* Debug Stats Panel */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-slate-800 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-white">{previewData.length}</p>
                                <p className="text-xs text-slate-400">Total Rânduri</p>
                            </div>
                            <div className="bg-green-900/30 rounded-lg p-3 text-center border border-green-800">
                                <p className="text-2xl font-bold text-green-400">{previewData.filter(r => r.status === 'valid').length}</p>
                                <p className="text-xs text-slate-400">Găsiți (Exact)</p>
                            </div>
                            <div className="bg-amber-900/30 rounded-lg p-3 text-center border border-amber-800">
                                <p className="text-2xl font-bold text-amber-400">{previewData.filter(r => r.status === 'conflict').length}</p>
                                <p className="text-xs text-slate-400">Conflicte de Rezolvat</p>
                            </div>
                            <div className="bg-blue-900/30 rounded-lg p-3 text-center border border-blue-800">
                                <p className="text-2xl font-bold text-blue-400">{previewData.filter(r => r.status === 'create').length}</p>
                                <p className="text-xs text-slate-400">Sportivi Noi (creați automat)</p>
                            </div>
                            {previewData.filter(r => r.status === 'error').length > 0 && (
                                <div className="bg-red-900/30 rounded-lg p-3 text-center border border-red-800 col-span-2 md:col-span-1">
                                    <p className="text-2xl font-bold text-red-400">{previewData.filter(r => r.status === 'error').length}</p>
                                    <p className="text-xs text-slate-400">Erori CSV</p>
                                </div>
                            )}
                            {previewData.filter(r => r.status === 'resolved').length > 0 && (
                                <div className="bg-purple-900/30 rounded-lg p-3 text-center border border-purple-800 col-span-2 md:col-span-1">
                                    <p className="text-2xl font-bold text-purple-400">{previewData.filter(r => r.status === 'resolved').length}</p>
                                    <p className="text-xs text-slate-400">Conflicte Rezolvate</p>
                                </div>
                            )}
                        </div>

                        <div className="max-h-[45vh] overflow-y-auto border border-slate-700 rounded-lg">
                            <ResponsiveTable
                                columns={columns}
                                data={previewData}
                                renderMobileItem={renderMobileItem}
                            />
                        </div>
                    </div>
                )}
                
                {previewData.length > 0 && (
                    <div className="pt-4 border-t border-slate-700 space-y-3">
                        {importProgress && (
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Se procesează... {importProgress.done} / {importProgress.total}</span>
                                    <span>{Math.round((importProgress.done / importProgress.total) * 100)}%</span>
                                </div>
                                <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-brand-primary h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleDescarcaRaport}
                                disabled={previewData.length === 0}
                                title="Descarcă previzualizarea curentă ca raport CSV"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                                Descarcă raport previzualizare
                            </Button>
                            <Button onClick={confirmImport} variant="primary" size="md" isLoading={isProcessing && !importProgress} disabled={isProcessing || unresolvedConflicts || importableRowsCount === 0}>
                                Importă {importableRowsCount} Înregistrări
                            </Button>
                        </div>
                    </div>
                )}

                {errorLog && (
                    <div className="mt-6 p-4 bg-red-900/30 border border-red-700 rounded-lg animate-fade-in-down">
                        <h3 className="text-lg font-bold text-red-300 flex items-center gap-2">
                            <XCircleIcon className="w-6 h-6"/> Jurnal Erori Import
                        </h3>
                        {errorLog.general && <p className="text-red-200 mt-2">{errorLog.general}</p>}
                        {errorLog.details && (
                            <div className="mt-2 max-h-40 overflow-y-auto bg-black/30 p-2 rounded-md text-xs space-y-1">
                                {errorLog.details.map((e: any, i: number) => (
                                    <div key={i}>
                                        <p className="font-mono text-red-300">Rând {e.row} ({e.name}): <span className="text-red-400">{e.error}</span></p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {errorLog.message && !errorLog.details && (
                             <pre className="mt-2 max-h-40 overflow-y-auto bg-black/30 p-2 rounded-md text-xs font-mono text-red-400">
                                {errorLog.message}
                            </pre>
                        )}
                        <Button 
                            size="sm" 
                            variant="secondary" 
                            className="mt-4" 
                            onClick={() => navigator.clipboard.writeText(JSON.stringify(errorLog, null, 2))}
                        >
                            Copiază Cod Debug
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};


const ConflictResolver: React.FC<{ row: PreviewRow, onResolve: (index: number, resolution: any) => void }> = ({ row, onResolve }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="flex items-center gap-2 relative">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
            <span className="text-xs text-amber-400">{row.message}</span>
            <Button size="sm" variant="warning" className="!text-xs !py-0.5" onClick={() => setIsOpen(!isOpen)}>Rezolvă</Button>
            {isOpen && (
                <div className="absolute z-20 mt-1 w-80 bg-slate-700 border border-slate-600 rounded-md shadow-lg p-2 right-0 top-full">
                    <p className="text-xs font-bold mb-2 text-white">Conflicte Găsite:</p>
                    {row.conflicts?.map(c => (
                        <button key={c.id} onClick={() => { onResolve(row.originalIndex, { action: 'use_existing', sportivId: c.id }); setIsOpen(false); }} className="w-full text-left p-2 hover:bg-slate-600 rounded text-xs mb-1 border border-slate-600">
                            <div className="font-bold text-white">{c.nume} {c.prenume}</div>
                            <div className="text-slate-400">Cod: {c.cod_sportiv || 'N/A'} | Data N.: {c.data_nasterii || 'N/A'}</div>
                            {c.data_nasterii === row.birthdate && <div className="text-amber-400 font-bold mt-1">⚠️ Data nașterii identică!</div>}
                        </button>
                    ))}
                    <button onClick={() => { onResolve(row.originalIndex, { action: 'create' }); setIsOpen(false); }} className="w-full text-left p-2 hover:bg-slate-600 rounded text-xs font-bold text-green-400 mt-2 border border-green-900 bg-green-900/20">
                        <UserPlusIcon className="w-4 h-4 inline mr-1"/> Creează sportiv nou (Ignoră duplicatele)
                    </button>
                </div>
            )}
        </div>
    );
};
