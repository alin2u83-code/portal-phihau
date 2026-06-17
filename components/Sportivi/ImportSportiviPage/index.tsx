import React, { useState, useEffect } from 'react';
import { parseCSVWithEncoding, generateEmail, isSimilar } from '../../../utils/csv';
import { normalizeDate } from '../../../utils/date';
import { supabase } from '../../../supabaseClient';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { ImportStep, ImportResult, UnifiedRow } from './types';
import { formatDateForDisplay } from './utils';
import { Pas0Upload } from './Pas0Upload';
import { Pas05Configurare } from './Pas05Configurare';
import { WizardSteps } from './WizardSteps';
import { Pas1Revizuire } from './Pas1Revizuire';
import { ImportConfig, FieldComparison } from './types';
import { COL_TO_DB, KNOWN_COLS } from './utils';
import { Pas2Raport } from './Pas2Raport';
import { useData } from '../../../contexts/DataContext';
import { usePermissions } from '../../../hooks/usePermissions';

export const ImportSportiviPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { clubs, activeRoleContext } = useData();
    const permissions = usePermissions(activeRoleContext);

    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [existingSportivi, setExistingSportivi] = useState<any[]>([]);
    const [step, setStep] = useState<ImportStep>(0);
    const [toImportList, setToImportList] = useState<any[]>([]);
    const [potentialDuplicates, setPotentialDuplicates] = useState<any[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [excludedStrictIndices, setExcludedStrictIndices] = useState<Set<number>>(new Set());
    const [currentClubId, setCurrentClubId] = useState<string | null>(null);
    const [selectedClubIdOverride, setSelectedClubIdOverride] = useState<string>('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [overwriteMode, setOverwriteMode] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
    const [importConfig, setImportConfig] = useState<ImportConfig | null>(null);
    const [fieldSelections, setFieldSelections] = useState<Map<number, Record<string, boolean>>>(new Map());

    useEffect(() => {
        console.log("ImportSportiviPage montat. Versiune: 2.1.0");
        // Preferă club-ul din contextul activ; fallback pe rolul primar
        if (activeRoleContext?.club_id) {
            console.log("Club ID din context activ:", activeRoleContext.club_id);
            setCurrentClubId(activeRoleContext.club_id);
            return;
        }
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
                    if (data?.club_id) {
                        console.log("Club ID din rol primar:", data.club_id);
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
                const { data, error } = await supabase.from('sportivi').select('id, nume, prenume, data_nasterii, cnp, email, telefon, gen, adresa, locul_nasterii, cetatenia');
                if (error) toast.error(`Eroare la încărcarea sportivilor: ${error.message}`);
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

    const COL_ALIASES_LOCAL: Record<string, string> = {
        'SEX': 'GEN',
        'DATA NAȘTERII': 'DATA NASTERII',
        'LOCUL NAȘTERII': 'LOCUL NASTERII',
        'CETĂȚENIA': 'CETATENIA',
        'CETĂŢENIA': 'CETATENIA',
        'NR. PAȘAPORT SPORTIV/NU ARE': 'NR. PASAPORT SPORTIV',
        'NR. PASAPORT SPORTIV/NU ARE': 'NR. PASAPORT SPORTIV',
        'NR LEGITIMATIE': 'NR. PASAPORT SPORTIV',
    };

    const readFileHeaders = (file: File): Promise<string[]> => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'xlsx' || ext === 'xls') {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const wb = XLSX.read(ev.target?.result, { type: 'array', cellDates: false });
                        const sheetName = wb.SheetNames.find(n => n.trim().toUpperCase() === 'SPORTIVI') || wb.SheetNames[0];
                        const ws = wb.Sheets[sheetName];
                        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as string[][];
                        const headerIdx = rawRows.findIndex(row =>
                            row.some(cell => String(cell || '').trim() === 'NUME SPORTIV')
                        );
                        const headerRow = headerIdx >= 0 ? rawRows[headerIdx] : (rawRows[0] || []);
                        const cols = headerRow.map(h => {
                            const key = String(h || '').trim();
                            if (key.startsWith('ADRESA')) return 'ADRESA';
                            return COL_ALIASES_LOCAL[key] || key;
                        }).filter(h => h && h !== 'Nr.crt');
                        resolve(cols);
                    } catch (err: any) { reject(err); }
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });
        }
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const text = ev.target?.result as string;
                const firstLine = text.split('\n')[0];
                resolve(firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, '')).filter(h => h));
            };
            reader.onerror = reject;
            reader.readAsText(file, 'UTF-8');
        });
    };

    const parseFileData = (file: File): Promise<any[]> => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'xlsx' || ext === 'xls') {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const wb = XLSX.read(ev.target?.result, { type: 'array', cellDates: false });

                        // Preferă sheet-ul "SPORTIVI"; fallback pe primul sheet
                        const sheetName = wb.SheetNames.find(n => n.trim().toUpperCase() === 'SPORTIVI') || wb.SheetNames[0];
                        const ws = wb.Sheets[sheetName];

                        // Citim ca array 2D pentru a detecta rândul cu header-ul
                        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as string[][];

                        // Găsim rândul care conține "NUME SPORTIV"
                        const headerIdx = rawRows.findIndex(row =>
                            row.some(cell => String(cell || '').trim() === 'NUME SPORTIV')
                        );

                        if (headerIdx === -1) {
                            // Nu s-a găsit header special — parse normal (ex: fișier template propriu)
                            const data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false }) as any[];
                            resolve(data);
                            return;
                        }

                        // Map coloane FRAM → chei interne
                        const COL_ALIASES: Record<string, string> = {
                            'SEX': 'GEN',
                            'DATA NAȘTERII': 'DATA NASTERII',
                            'DATA NASTERII': 'DATA NASTERII',
                            'LOCUL NAȘTERII': 'LOCUL NASTERII',
                            'CETĂȚENIA': 'CETATENIA',
                            'CETĂŢENIA': 'CETATENIA',
                            'NR. PAȘAPORT SPORTIV/NU ARE': 'NR. PASAPORT SPORTIV',
                            'NR. PASAPORT SPORTIV/NU ARE': 'NR. PASAPORT SPORTIV',
                            'NR LEGITIMATIE': 'NR. PASAPORT SPORTIV',
                        };

                        // Normalizăm headerele (trim + alias)
                        const headers = rawRows[headerIdx].map(h => {
                            const key = String(h || '').trim();
                            // Adresa cu text lung → ADRESA
                            if (key.startsWith('ADRESA')) return 'ADRESA';
                            return COL_ALIASES[key] || key;
                        });

                        // Construim obiectele, sărim rândul "exemplu" și rândurile goale
                        const result: any[] = [];
                        for (let i = headerIdx + 1; i < rawRows.length; i++) {
                            const row = rawRows[i];
                            const firstCell = String(row[0] || '').trim().toLowerCase();
                            if (firstCell === 'exemplu') continue;
                            if (row.every(cell => !String(cell || '').trim())) continue;

                            const obj: Record<string, any> = {};
                            headers.forEach((h, idx) => { if (h) obj[h] = row[idx] ?? ''; });
                            result.push(obj);
                        }

                        resolve(result);
                    } catch (err: any) { reject(err); }
                };
                reader.onerror = (err) => reject(err);
                reader.readAsArrayBuffer(file);
            });
        }
        return new Promise((resolve, reject) => {
            parseCSVWithEncoding(file, { header: true, skipEmptyLines: true },
                (results) => resolve(results.data as any[]),
                (err) => reject(err)
            );
        });
    };

    const effectiveClubId = permissions.isFederationAdmin
        ? (selectedClubIdOverride || currentClubId)
        : currentClubId;

    const handleReadHeaders = async () => {
        if (!file) { toast.error("Selectează un fișier mai întâi."); return; }
        if (permissions.isFederationAdmin && !effectiveClubId) {
            toast.error("Selectează clubul destinație înainte de a analiza fișierul.");
            return;
        }
        setImporting(true);
        try {
            const cols = await readFileHeaders(file);
            if (cols.length === 0) { toast.error("Fișierul nu are coloane detectabile."); return; }
            setDetectedColumns(cols);
            setStep(0.5);
        } catch (err: any) {
            toast.error("Eroare la citirea fișierului.");
            console.error(err);
        } finally {
            setImporting(false);
        }
    };

    const handleAnalyzeWithConfig = async (config: ImportConfig) => {
        if (!file) return;
        setImportConfig(config);
        setImporting(true);

        try {
            const rows = await parseFileData(file);
            if (rows.length === 0) { toast.error("Fișierul este gol sau nu are formatul corect."); setImporting(false); return; }

            const duplicates: any[] = [];
            const uniques: any[] = [];

            rows.forEach((row: any, index: number) => {
                const numeCSV = row['NUME SPORTIV']?.trim();
                const prenumeCSV = row['PRENUME SPORTIV']?.trim();
                if (!numeCSV || !prenumeCSV) return;

                const rawDate = row['DATA NASTERII']?.trim();
                const dataNasteriiCSV = normalizeDate(rawDate);
                const emailCSV = row['EMAIL']?.trim() || row['Email']?.trim() || row['email']?.trim();
                const cnpCSV = config.selectedColumns.includes('CNP') ? (row['CNP']?.trim() || null) : null;
                const telefon = config.selectedColumns.includes('TELEFON') ? (row['TELEFON']?.trim() || row['Telefon']?.trim() || row['telefon']?.trim() || null) : null;

                const sportivData: any = {
                    nume: numeCSV,
                    prenume: prenumeCSV,
                    email: emailCSV || generateEmail(prenumeCSV, numeCSV),
                    data_nasterii: dataNasteriiCSV || null,
                    status: 'Activ',
                    data_inscrierii: new Date().toISOString().split('T')[0],
                    club_id: effectiveClubId,
                };

                if (config.selectedColumns.includes('CNP') && cnpCSV) sportivData.cnp = cnpCSV;
                if (config.selectedColumns.includes('GEN')) {
                    const rawGen = row['GEN']?.trim()?.toLowerCase();
                    const gen = rawGen === 'masculin' || rawGen === 'm' ? 'Masculin'
                               : rawGen === 'feminin' || rawGen === 'f' ? 'Feminin' : undefined;
                    if (gen) sportivData.gen = gen;
                }
                if (config.selectedColumns.includes('ADRESA') && row['ADRESA']?.trim()) sportivData.adresa = row['ADRESA'].trim();
                if (config.selectedColumns.includes('LOCUL NASTERII') && row['LOCUL NASTERII']?.trim()) sportivData.locul_nasterii = row['LOCUL NASTERII'].trim();
                if (config.selectedColumns.includes('CETATENIA') && row['CETATENIA']?.trim()) sportivData.cetatenia = row['CETATENIA'].trim();
                if (config.selectedColumns.includes('NR. PASAPORT SPORTIV')) {
                    const nr = (row['NR. PASAPORT SPORTIV'] || row[' NR. PASAPORT SPORTIV '])?.trim();
                    if (nr) sportivData.nr_legitimatie = nr;
                }
                if (telefon) sportivData.telefon = telefon;

                Object.keys(sportivData).forEach(k => {
                    if (sportivData[k] === null || sportivData[k] === undefined || sportivData[k] === '') delete sportivData[k];
                });

                const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
                const normTel = (t?: string | null) => { if (!t) return null; const d = t.replace(/\D/g, ''); return d.length >= 10 ? (d.startsWith('40') && d.length === 11 ? '0' + d.slice(2) : d) : null; };
                const tokensPren = (p: string) => norm(p).split(' ').filter(x => x.length >= 3);
                const numeN = norm(numeCSV);
                const prenN = norm(prenumeCSV);
                const telN = normTel(telefon);
                const tokPren = tokensPren(prenumeCSV);

                let matchStrict: any = null;
                let matchLoose: any = null;
                let motivDuplicat = '';

                for (const s of existingSportivi) {
                    const sNumeN = norm(s.nume);
                    const sPrenN = norm(s.prenume);
                    const sTelN = normTel(s.telefon);
                    const sTokPren = tokensPren(s.prenume);

                    if (cnpCSV && s.cnp && cnpCSV === s.cnp.trim()) { matchStrict = s; motivDuplicat = 'CNP identic'; break; }
                    if (isSimilar(s.nume, numeCSV) && isSimilar(s.prenume, prenumeCSV) && dataNasteriiCSV && s.data_nasterii === dataNasteriiCSV) { matchStrict = s; motivDuplicat = 'Nume identic + dată naștere identică'; break; }
                    if (emailCSV && s.email && emailCSV.toLowerCase() === s.email.toLowerCase()) { if (!matchLoose) { matchLoose = s; motivDuplicat = 'Email identic'; } continue; }
                    if (telN && sTelN && telN === sTelN) { if (!matchLoose) { matchLoose = s; motivDuplicat = 'Telefon identic'; } continue; }
                    if (isSimilar(s.nume, numeCSV) && isSimilar(s.prenume, prenumeCSV)) { if (!matchLoose) { matchLoose = s; motivDuplicat = 'Nume similar'; } continue; }
                    if (sNumeN === numeN || Math.abs(sNumeN.length - numeN.length) <= 1) {
                        const overlapTok = tokPren.some(t => sTokPren.includes(t)) || sTokPren.some(t => tokPren.includes(t));
                        if (overlapTok && dataNasteriiCSV && s.data_nasterii === dataNasteriiCSV) { if (!matchLoose) { matchLoose = s; motivDuplicat = 'Prenume parțial + dată identică'; } continue; }
                    }
                    if ((prenN === sNumeN || numeN === sPrenN) && dataNasteriiCSV && s.data_nasterii === dataNasteriiCSV) { if (!matchLoose) { matchLoose = s; motivDuplicat = 'Posibil prenume/nume confundat'; } continue; }
                }

                const existingSportiv = matchStrict || matchLoose;

                if (existingSportiv && !config.updateExisting) {
                    uniques.push({ ...sportivData, originalIndex: index, rawDate: rawDate || '', _omis: true, motiv: 'Sportiv existent (mod: adaugă noi)' });
                } else if (matchStrict) {
                    duplicates.push({ type: 'strict', csvRow: row, existingSportiv: matchStrict, sportivData, originalIndex: index, rawDate: rawDate || '', motiv: motivDuplicat });
                } else if (matchLoose) {
                    duplicates.push({ type: 'loose', csvRow: row, existingSportiv: matchLoose, sportivData, originalIndex: index, rawDate: rawDate || '', motiv: motivDuplicat });
                } else {
                    if (!dataNasteriiCSV) {
                        const errorMsg = rawDate ? `Data nasterii invalida: ${rawDate}` : 'Lipseste data nasterii';
                        uniques.push({ ...sportivData, originalIndex: index, error: errorMsg, rawDate: rawDate || '' });
                    } else {
                        if (!config.addNew) {
                            uniques.push({ ...sportivData, originalIndex: index, rawDate: rawDate || '', _omis: true, motiv: 'Sportiv nou (mod: actualizează existenți)' });
                        } else {
                            uniques.push({ ...sportivData, originalIndex: index, rawDate: rawDate || '' });
                        }
                    }
                }
            });

            const initialSelections = new Map<number, Record<string, boolean>>();
            duplicates.forEach(d => {
                const selections: Record<string, boolean> = {};
                config.selectedColumns.forEach(col => {
                    const dbKey = COL_TO_DB[col];
                    if (!dbKey) return;
                    const dbVal = d.existingSportiv[dbKey] ?? null;
                    const fileVal = d.sportivData[dbKey] ?? null;
                    const isEmpty = !dbVal && (fileVal !== null && fileVal !== '');
                    selections[dbKey] = isEmpty;
                });
                initialSelections.set(d.originalIndex, selections);

                d.fieldComparisons = config.selectedColumns
                    .map(col => {
                        const dbKey = COL_TO_DB[col];
                        if (!dbKey) return null;
                        const dbVal = String(d.existingSportiv[dbKey] ?? '').trim() || null;
                        const fileVal = String(d.sportivData[dbKey] ?? '').trim() || null;
                        const status = !dbVal && !fileVal ? null
                            : dbVal === fileVal ? 'identical'
                            : !dbVal ? 'db_empty'
                            : 'conflict';
                        if (!status) return null;
                        return {
                            fieldKey: dbKey,
                            label: KNOWN_COLS[col] || col,
                            dbValue: dbVal,
                            fileValue: fileVal,
                            status,
                            selected: status === 'db_empty',
                        } as FieldComparison;
                    })
                    .filter(Boolean);
            });

            setFieldSelections(initialSelections);
            setToImportList(uniques);
            setPotentialDuplicates(duplicates);
            setSelectedIndices(new Set());
            setExcludedStrictIndices(new Set());
            setExpandedRows(new Set());
            setStep(1);
        } catch (err: any) {
            console.error("Eroare la procesarea fisierului:", err);
            toast.error("Eroare la procesarea fișierului.");
        } finally {
            setImporting(false);
        }
    };

    const handleExecuteImport = async () => {
        const strictDuplicates = potentialDuplicates.filter(d => d.type === 'strict');
        const looseDuplicates = potentialDuplicates.filter(d => d.type === 'loose');

        const buildUpdatePayload = (sportivData: any, existingSportiv: any, originalIndex: number) => {
            if (overwriteMode) return { ...sportivData };
            const selections = fieldSelections.get(originalIndex) || {};
            const safe: any = { id: existingSportiv.id };
            if (Object.keys(selections).length > 0) {
                Object.keys(selections).forEach(key => {
                    if (selections[key] && sportivData[key] !== undefined) {
                        safe[key] = sportivData[key];
                    }
                });
            } else {
                for (const key of Object.keys(sportivData)) {
                    if (key === 'id') continue;
                    const existingVal = existingSportiv[key];
                    if (existingVal === null || existingVal === undefined || existingVal === '') {
                        safe[key] = sportivData[key];
                    }
                }
            }
            return safe;
        };

        const autoUpdates = strictDuplicates
            .filter((_, i) => !excludedStrictIndices.has(i))
            .map(d => buildUpdatePayload(d.sportivData, d.existingSportiv, d.originalIndex));

        const selectedLoose = looseDuplicates
            .filter((_, i) => selectedIndices.has(i))
            .map(d => buildUpdatePayload(d.sportivData, d.existingSportiv, d.originalIndex));

        const validUniques = toImportList
            .filter(s => !s.error && !s._omis)
            .map(({ originalIndex, error, rawDate, _omis, motiv: _motiv, ...rest }) => rest);

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
                .select('id, nume, prenume, grad_actual_id, data_inscrierii');

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

                const insertedByName = new Map(
                    (insertedData || []).map(s => [`${s.nume}|${s.prenume}`, s.id])
                );
                const result: ImportResult = {
                    adaugati: toImportList
                        .filter(s => !s.error)
                        .map(s => ({
                            id: insertedByName.get(`${s.nume}|${s.prenume}`) || '',
                            nume: s.nume, prenume: s.prenume, data_nasterii: s.data_nasterii || null
                        })),
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

    const buildUnifiedRows = (): UnifiedRow[] => {
        const rows: UnifiedRow[] = [];
        const strictDuplicates = potentialDuplicates.filter(d => d.type === 'strict');
        const looseDuplicates = potentialDuplicates.filter(d => d.type === 'loose');

        toImportList.forEach(s => {
            rows.push({
                originalIndex: s.originalIndex,
                nume: s.nume, prenume: s.prenume,
                dataNasteriiCSV: s.rawDate || s.data_nasterii || '—',
                status: s.error ? 'EROARE' : s._omis ? 'OMIS' : 'NOU',
                motiv: s.error || s.motiv || '',
                sportivData: s,
            });
        });

        strictDuplicates.forEach((d, i) => {
            rows.push({
                originalIndex: d.originalIndex,
                nume: d.sportivData.nume, prenume: d.sportivData.prenume,
                dataNasteriiCSV: d.rawDate || d.sportivData.data_nasterii || '—',
                status: 'ACTUALIZARE_AUTO',
                motiv: d.motiv || 'Potrivire exactă',
                sportivData: d.sportivData,
                existingSportiv: d.existingSportiv,
                strictIndex: i,
                fieldComparisons: d.fieldComparisons,
            });
        });

        looseDuplicates.forEach((d, i) => {
            let motiv = d.motiv || '';
            if (!motiv) {
                const dataNasteriiNorm = normalizeDate(d.rawDate || '');
                if (dataNasteriiNorm !== d.existingSportiv.data_nasterii) {
                    const csvDateDisplay = d.rawDate || '—';
                    const dbDateDisplay = formatDateForDisplay(d.existingSportiv.data_nasterii);
                    motiv = `Diferă data nașterii: CSV=${csvDateDisplay} / DB=${dbDateDisplay}`;
                } else {
                    motiv = `Nume similar: ${d.sportivData.nume} ${d.sportivData.prenume} / ${d.existingSportiv.nume} ${d.existingSportiv.prenume}`;
                }
            }
            rows.push({
                originalIndex: d.originalIndex,
                nume: d.sportivData.nume, prenume: d.sportivData.prenume,
                dataNasteriiCSV: d.rawDate || d.sportivData.data_nasterii || '—',
                status: 'POSIBIL_DUPLICAT',
                motiv,
                sportivData: d.sportivData,
                existingSportiv: d.existingSportiv,
                looseIndex: i,
                fieldComparisons: d.fieldComparisons,
            });
        });

        rows.sort((a, b) => a.originalIndex - b.originalIndex);
        return rows;
    };

    if (step === 2 && importResult) {
        return (
            <div className="space-y-0">
                <WizardSteps current={2} />
                <Pas2Raport importResult={importResult} onBack={onBack} />
            </div>
        );
    }

    if (step === 0.5) {
        return (
            <div className="space-y-4">
                <WizardSteps current={0.5} />
                {permissions.isFederationAdmin && (
                    <div className="bg-slate-800/60 border border-blue-500/30 rounded-xl p-4">
                        <label className="block text-sm font-medium text-blue-300 mb-2">
                            Club destinație import <span className="text-red-400 ml-1">*</span>
                        </label>
                        <select
                            value={selectedClubIdOverride}
                            onChange={e => setSelectedClubIdOverride(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">— Selectează clubul —</option>
                            {clubs.slice().sort((a, b) => a.nume.localeCompare(b.nume, 'ro')).map(c => (
                                <option key={c.id} value={c.id}>{c.nume}</option>
                            ))}
                        </select>
                    </div>
                )}
                <Pas05Configurare
                    allColumns={detectedColumns}
                    onConfirm={handleAnalyzeWithConfig}
                    onBack={() => setStep(0)}
                />
            </div>
        );
    }

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
            <div className="space-y-0">
            <WizardSteps current={1} />
            <Pas1Revizuire
                unifiedRows={unifiedRows}
                selectedIndices={selectedIndices}
                excludedStrictIndices={excludedStrictIndices}
                expandedRows={expandedRows}
                overwriteMode={overwriteMode}
                importing={importing}
                showConfirm={showConfirm}
                seVaImporta={seVaImporta}
                validNouCount={validNouCount}
                activeAutoUpdates={activeAutoUpdates}
                selectedLooseCount={selectedLooseCount}
                countNou={countNou}
                countActualizare={countActualizare}
                countDuplicat={countDuplicat}
                countEroare={countEroare}
                onToggleSelection={toggleSelection}
                onToggleExcludeStrict={toggleExcludeStrict}
                onToggleExpandRow={toggleExpandRow}
                fieldSelections={fieldSelections}
                onToggleFieldSelection={(originalIndex, fieldKey, value) => {
                    setFieldSelections(prev => {
                        const next = new Map(prev);
                        const row = { ...(next.get(originalIndex) || {}) };
                        row[fieldKey] = value;
                        next.set(originalIndex, row);
                        return next;
                    });
                }}
                onGlobalSelectAll={() => {
                    setFieldSelections(prev => {
                        const next = new Map(prev);
                        next.forEach((fields, idx) => {
                            const updated: Record<string, boolean> = {};
                            Object.keys(fields).forEach(k => { updated[k] = true; });
                            next.set(idx, updated);
                        });
                        return next;
                    });
                }}
                onGlobalDeselectAll={() => {
                    setFieldSelections(prev => {
                        const next = new Map(prev);
                        next.forEach((fields, idx) => {
                            const updated: Record<string, boolean> = {};
                            Object.keys(fields).forEach(k => { updated[k] = false; });
                            next.set(idx, updated);
                        });
                        return next;
                    });
                }}
                onToggleOverwrite={() => setOverwriteMode(v => !v)}
                onExecuteImport={handleExecuteImport}
                onBack={() => setStep(0.5)}
                onCancelConfirm={() => setShowConfirm(false)}
            />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <WizardSteps current={0} />
            {permissions.isFederationAdmin && (
                <div className="bg-slate-800/60 border border-blue-500/30 rounded-xl p-4">
                    <label className="block text-sm font-medium text-blue-300 mb-2">
                        Club destinație import
                        <span className="text-red-400 ml-1">*</span>
                    </label>
                    <select
                        value={selectedClubIdOverride}
                        onChange={e => setSelectedClubIdOverride(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">— Selectează clubul —</option>
                        {clubs
                            .slice()
                            .sort((a, b) => a.nume.localeCompare(b.nume, 'ro'))
                            .map(c => (
                                <option key={c.id} value={c.id}>{c.nume}</option>
                            ))
                        }
                    </select>
                    {!selectedClubIdOverride && (
                        <p className="text-xs text-amber-400 mt-1">
                            Trebuie să selectezi clubul înainte de a importa.
                        </p>
                    )}
                </div>
            )}
            <Pas0Upload
                file={file}
                importing={importing}
                onFileChange={e => { if (e.target.files) setFile(e.target.files[0]); }}
                onAnalyze={handleReadHeaders}
                onBack={onBack}
            />
        </div>
    );
};
