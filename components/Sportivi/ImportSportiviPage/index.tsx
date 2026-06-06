import React, { useState, useEffect } from 'react';
import { parseCSVWithEncoding, generateEmail, isSimilar } from '../../../utils/csv';
import { normalizeDate } from '../../../utils/date';
import { supabase } from '../../../supabaseClient';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { ImportStep, ImportResult, UnifiedRow } from './types';
import { formatDateForDisplay } from './utils';
import { Pas0Upload } from './Pas0Upload';
import { Pas1Revizuire } from './Pas1Revizuire';
import { Pas2Raport } from './Pas2Raport';

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
    const [overwriteMode, setOverwriteMode] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

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

    const parseFileData = (file: File): Promise<any[]> => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'xlsx' || ext === 'xls') {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const wb = XLSX.read(ev.target?.result, { type: 'array', cellDates: true });
                        const ws = wb.Sheets[wb.SheetNames[0]];
                        const data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false }) as any[];
                        resolve(data);
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

    const handleAnalyze = async () => {
        if (!file) {
            toast.error("Te rugam sa selectezi un fisier mai intai.");
            return;
        }
        console.log("Incepere analiza fisier:", file.name);
        setImporting(true);

        try {
            const rows = await parseFileData(file);
            console.log("Parsare finalizata. Randuri gasite:", rows.length);

            const duplicates: any[] = [];
            const uniques: any[] = [];

            if (rows.length === 0) {
                toast.error("Fisierul este gol sau nu are formatul corect.");
                setImporting(false);
                return;
            }

            rows.forEach((row: any, index: number) => {
                const numeCSV = row['NUME SPORTIV']?.trim();
                const prenumeCSV = row['PRENUME SPORTIV']?.trim();

                if (!numeCSV || !prenumeCSV) {
                    console.warn(`Randul ${index + 1} lipseste numele sau prenumele. Se omite.`);
                    return;
                }

                const rawDate = row['DATA NASTERII']?.trim();
                const dataNasteriiCSV = normalizeDate(rawDate);

                const match1 = existingSportivi.find(s =>
                    isSimilar(s.nume, numeCSV) && isSimilar(s.prenume, prenumeCSV) && s.data_nasterii === dataNasteriiCSV
                );
                const match2 = existingSportivi.find(s =>
                    isSimilar(s.nume, numeCSV) && isSimilar(s.prenume, prenumeCSV)
                );

                const emailCSV = row['EMAIL']?.trim() || row['Email']?.trim() || row['email']?.trim();
                const sportivData: any = {
                    nume: numeCSV, prenume: prenumeCSV,
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

                const telefon = row['TELEFON']?.trim() || row['Telefon']?.trim() || row['telefon']?.trim();
                if (telefon) sportivData.telefon = telefon;

                const rawGen = row['GEN']?.trim()?.toLowerCase();
                const gen = rawGen === 'masculin' || rawGen === 'm' ? 'Masculin'
                           : rawGen === 'feminin' || rawGen === 'f' ? 'Feminin'
                           : undefined;
                if (gen) sportivData.gen = gen;

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
            console.error("Eroare la procesarea fisierului:", err);
            toast.error("A aparut o eroare la procesarea fisierului. Verifica consola pentru detalii.");
        } finally {
            setImporting(false);
        }
    };

    const handleExecuteImport = async () => {
        const strictDuplicates = potentialDuplicates.filter(d => d.type === 'strict');
        const looseDuplicates = potentialDuplicates.filter(d => d.type === 'loose');

        const buildUpdatePayload = (sportivData: any, existingSportiv: any) => {
            if (overwriteMode) return { ...sportivData };
            const safe: any = { id: existingSportiv.id };
            for (const key of Object.keys(sportivData)) {
                if (key === 'id') continue;
                const existingVal = existingSportiv[key];
                if (existingVal === null || existingVal === undefined || existingVal === '') {
                    safe[key] = sportivData[key];
                }
            }
            return safe;
        };

        const autoUpdates = strictDuplicates
            .filter((_, i) => !excludedStrictIndices.has(i))
            .map(d => buildUpdatePayload(d.sportivData, d.existingSportiv));

        const selectedLoose = looseDuplicates
            .filter((_, i) => selectedIndices.has(i))
            .map(d => buildUpdatePayload(d.sportivData, d.existingSportiv));

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
                status: s.error ? 'EROARE' : 'NOU',
                motiv: s.error || '',
                sportivData: s,
            });
        });

        strictDuplicates.forEach((d, i) => {
            rows.push({
                originalIndex: d.originalIndex,
                nume: d.sportivData.nume, prenume: d.sportivData.prenume,
                dataNasteriiCSV: d.rawDate || d.sportivData.data_nasterii || '—',
                status: 'ACTUALIZARE_AUTO',
                motiv: 'Potrivire exacta (acelasi nume + data nasterii)',
                sportivData: d.sportivData,
                existingSportiv: d.existingSportiv,
                strictIndex: i,
            });
        });

        looseDuplicates.forEach((d, i) => {
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
                nume: d.sportivData.nume, prenume: d.sportivData.prenume,
                dataNasteriiCSV: d.rawDate || d.sportivData.data_nasterii || '—',
                status: 'POSIBIL_DUPLICAT',
                motiv,
                sportivData: d.sportivData,
                existingSportiv: d.existingSportiv,
                looseIndex: i,
            });
        });

        rows.sort((a, b) => a.originalIndex - b.originalIndex);
        return rows;
    };

    if (step === 2 && importResult) {
        return <Pas2Raport importResult={importResult} onBack={onBack} />;
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
                onToggleOverwrite={() => setOverwriteMode(v => !v)}
                onExecuteImport={handleExecuteImport}
                onBack={() => setStep(0)}
                onCancelConfirm={() => setShowConfirm(false)}
            />
        );
    }

    return (
        <Pas0Upload
            file={file}
            importing={importing}
            onFileChange={e => { if (e.target.files) setFile(e.target.files[0]); }}
            onAnalyze={handleAnalyze}
            onBack={onBack}
        />
    );
};
