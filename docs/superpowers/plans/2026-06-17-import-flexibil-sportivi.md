# Import Flexibil Sportivi — Plan de Implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adaugă un pas de configurare în wizard-ul de import care permite selectarea modului (adaugă noi / actualizează existenți) și a câmpurilor de importat, plus o revizuire câmp-cu-câmp pentru sportivii existenți.

**Architecture:** Se extinde wizard-ul existent din 3 pași (upload→revizuire→raport) la 4 pași (upload→configurare→revizuire→raport). Pasul 0 citește doar header-ele din fișier (rapid), pasul 0.5 (nou) permite configurarea, pasul 1 face analiza completă cu setările alese și afișează comparație câmp-cu-câmp pentru sportivii existenți.

**Tech Stack:** React 18 + TypeScript, XLSX (deja instalat), Tailwind CSS, Supabase

---

## Hartă fișiere

| Fișier | Modificare |
|--------|-----------|
| `components/Sportivi/ImportSportiviPage/types.ts` | Adaugă `ImportConfig`, `FieldComparison`, `'OMIS'` la `RowStatus`, extinde `UnifiedRow`, schimbă `ImportStep` la `0 \| 0.5 \| 1 \| 2` |
| `components/Sportivi/ImportSportiviPage/Pas05Configurare.tsx` | **NOU** — ecran de configurare mod + coloane |
| `components/Sportivi/ImportSportiviPage/index.tsx` | Split analiză în 2 faze, adaugă state nou, wiring Pas05 |
| `components/Sportivi/ImportSportiviPage/Pas1Revizuire.tsx` | Filtre, select global, tabel comparativ per câmp |
| `components/Sportivi/ImportSportiviPage/utils.tsx` | Adaugă badge OMIS, constantele KNOWN_COLS |

---

## Task 1: Actualizare types.ts

**Fișiere:**
- Modify: `components/Sportivi/ImportSportiviPage/types.ts`

- [ ] **Pas 1: Înlocuiește tot conținutul fișierului**

```typescript
export type ImportStep = 0 | 0.5 | 1 | 2;

export interface ImportResult {
    adaugati: { id: string; nume: string; prenume: string; data_nasterii: string | null }[];
    actualizati: { nume: string; prenume: string; data_nasterii: string | null }[];
    omisi: { rand: number; nume: string; prenume: string; motiv: string }[];
}

export type RowStatus = 'NOU' | 'ACTUALIZARE_AUTO' | 'POSIBIL_DUPLICAT' | 'EROARE' | 'OMIS';

export interface FieldComparison {
    fieldKey: string;         // cheia din DB, ex: 'cnp'
    label: string;            // afișat în UI, ex: 'CNP'
    dbValue: string | null;
    fileValue: string | null;
    status: 'identical' | 'db_empty' | 'conflict';
    selected: boolean;
}

export interface ImportConfig {
    addNew: boolean;
    updateExisting: boolean;
    selectedColumns: string[];   // coloane bifate de user (chei normalizate)
    allColumns: string[];        // toate coloanele detectate din fișier
}

export interface UnifiedRow {
    originalIndex: number;
    nume: string;
    prenume: string;
    dataNasteriiCSV: string;
    status: RowStatus;
    motiv: string;
    sportivData?: any;
    existingSportiv?: any;
    looseIndex?: number;
    strictIndex?: number;
    fieldComparisons?: FieldComparison[];   // doar pentru ACTUALIZARE_AUTO și POSIBIL_DUPLICAT
}
```

- [ ] **Pas 2: Commit**

```bash
git add components/Sportivi/ImportSportiviPage/types.ts
git commit -m "feat(import): extinde types cu ImportConfig, FieldComparison, OMIS status"
```

---

## Task 2: Actualizare utils.tsx — badge OMIS + constante câmpuri

**Fișiere:**
- Modify: `components/Sportivi/ImportSportiviPage/utils.tsx`

- [ ] **Pas 1: Adaugă `KNOWN_COLS` și `LOCKED_COLS` după importuri**

Adaugă imediat după `import React from 'react';`:

```typescript
// Câmpuri cunoscute de sistem: cheie normalizată → label UI
export const KNOWN_COLS: Record<string, string> = {
    'CNP': 'CNP',
    'DATA NASTERII': 'Data nașterii',
    'GEN': 'Gen',
    'ADRESA': 'Adresă',
    'LOCUL NASTERII': 'Localitate naștere',
    'NR. PASAPORT SPORTIV': 'Nr. legitimație',
    'CETATENIA': 'Cetățenie',
    'TELEFON': 'Telefon',
};

// Cheie normalizată → câmp DB corespondent
export const COL_TO_DB: Record<string, string> = {
    'CNP': 'cnp',
    'DATA NASTERII': 'data_nasterii',
    'GEN': 'gen',
    'ADRESA': 'adresa',
    'LOCUL NASTERII': 'locul_nasterii',
    'NR. PASAPORT SPORTIV': 'nr_legitimatie',
    'CETATENIA': 'cetatenia',
    'TELEFON': 'telefon',
};

// Coloane mereu active (necesare pentru identificare)
export const LOCKED_COLS = ['NUME SPORTIV', 'PRENUME SPORTIV'];
```

- [ ] **Pas 2: Adaugă `'OMIS'` în `getStatusBadge`**

În funcția `getStatusBadge`, după cazul `'EROARE'` adaugă:

```typescript
        case 'OMIS':
            return <span className="bg-slate-500/20 text-slate-400 border border-slate-500/50 px-2 py-0.5 rounded text-xs whitespace-nowrap">OMIS</span>;
```

- [ ] **Pas 3: Commit**

```bash
git add components/Sportivi/ImportSportiviPage/utils.tsx
git commit -m "feat(import): adauga KNOWN_COLS, COL_TO_DB, LOCKED_COLS, badge OMIS"
```

---

## Task 3: Creare Pas05Configurare.tsx

**Fișiere:**
- Create: `components/Sportivi/ImportSportiviPage/Pas05Configurare.tsx`

- [ ] **Pas 1: Creează fișierul complet**

```typescript
import React, { useState } from 'react';
import { Card, Button } from '../../ui';
import { ImportConfig } from './types';
import { KNOWN_COLS, LOCKED_COLS } from './utils';

interface Props {
    allColumns: string[];
    onConfirm: (config: ImportConfig) => void;
    onBack: () => void;
}

export const Pas05Configurare: React.FC<Props> = ({ allColumns, onConfirm, onBack }) => {
    const [addNew, setAddNew] = useState(true);
    const [updateExisting, setUpdateExisting] = useState(false);

    // Coloane opționale (fără cele blocate) care sunt cunoscute de sistem
    const optionalKnown = allColumns.filter(
        col => !LOCKED_COLS.includes(col) && KNOWN_COLS[col]
    );
    const ignoredCols = allColumns.filter(
        col => !LOCKED_COLS.includes(col) && !KNOWN_COLS[col]
    );

    const [selected, setSelected] = useState<Set<string>>(
        new Set(optionalKnown.filter(c => ['CNP', 'DATA NASTERII', 'GEN'].includes(c)))
    );

    const toggle = (col: string) => {
        const next = new Set(selected);
        if (next.has(col)) next.delete(col); else next.add(col);
        setSelected(next);
    };

    const showWarning = updateExisting && selected.size === 0;

    const handleConfirm = () => {
        if (!addNew && !updateExisting) return;
        onConfirm({
            addNew,
            updateExisting,
            selectedColumns: [...LOCKED_COLS, ...Array.from(selected)],
            allColumns,
        });
    };

    return (
        <Card className="p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-1 text-zinc-100">Configurează importul</h2>
            <p className="text-sm text-slate-400 mb-5">Alege ce vrei să faci cu datele din fișier</p>

            {/* MOD IMPORT */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Ce vrei să faci?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                        { id: 'add', label: 'Adaugă sportivi noi', desc: 'Creează sportivii care nu există încă', val: addNew, set: () => setAddNew(v => !v) },
                        { id: 'upd', label: 'Actualizează existenți', desc: 'Completează / modifică date deja salvate', val: updateExisting, set: () => setUpdateExisting(v => !v) },
                    ].map(({ id, label, desc, val, set }) => (
                        <button
                            key={id}
                            onClick={set}
                            className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors ${val ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-900 hover:border-slate-600'}`}
                        >
                            <span className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 ${val ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-600'}`}>
                                {val ? '✓' : ''}
                            </span>
                            <div>
                                <div className="text-sm font-semibold text-slate-200">{label}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
                {!addNew && !updateExisting && (
                    <p className="text-xs text-red-400 mt-2">Selectează cel puțin un mod de import.</p>
                )}
            </div>

            {/* CÂMPURI */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Ce informații să fie importate?</p>
                    <div className="flex gap-3">
                        <button className="text-xs text-blue-400 font-semibold" onClick={() => setSelected(new Set(optionalKnown))}>Toate</button>
                        <button className="text-xs text-blue-400 font-semibold" onClick={() => setSelected(new Set())}>Niciunul</button>
                    </div>
                </div>

                {/* Blocate */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {LOCKED_COLS.map(col => (
                        <span key={col} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-900/40 border border-blue-800 text-blue-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                            {col === 'NUME SPORTIV' ? 'Nume' : 'Prenume'}
                            <span className="text-[10px] text-blue-500">mereu</span>
                        </span>
                    ))}
                </div>

                {/* Opționale cunoscute */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {optionalKnown.map(col => {
                        const on = selected.has(col);
                        return (
                            <button
                                key={col}
                                onClick={() => toggle(col)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${on ? 'bg-blue-900/40 border-blue-700 text-blue-300' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${on ? 'bg-blue-400' : 'bg-slate-600'}`} />
                                {KNOWN_COLS[col]}
                            </button>
                        );
                    })}
                </div>

                {/* Ignorate */}
                {ignoredCols.length > 0 && (
                    <>
                        <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1.5">Ignorate — sistemul nu le recunoaște</p>
                        <div className="flex flex-wrap gap-1.5">
                            {ignoredCols.map(col => (
                                <span key={col} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs italic bg-slate-900 border border-slate-800 text-slate-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700 flex-shrink-0" />
                                    {col}
                                </span>
                            ))}
                        </div>
                    </>
                )}

                {showWarning && (
                    <p className="text-xs text-amber-400 mt-3">
                        ⚠ Ai ales „Actualizează existenți" dar nu ai selectat niciun câmp.
                    </p>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-700">
                <Button onClick={handleConfirm} disabled={!addNew && !updateExisting} className="w-full sm:flex-1">
                    Analizează →
                </Button>
                <Button variant="secondary" onClick={onBack} className="w-full sm:w-auto">Înapoi</Button>
            </div>
        </Card>
    );
};
```

- [ ] **Pas 2: Commit**

```bash
git add components/Sportivi/ImportSportiviPage/Pas05Configurare.tsx
git commit -m "feat(import): adauga Pas05Configurare - selectie mod si campuri"
```

---

## Task 4: Modificare index.tsx — split analiză, wiring Pas05

**Fișiere:**
- Modify: `components/Sportivi/ImportSportiviPage/index.tsx`

- [ ] **Pas 1: Adaugă importuri noi la începutul fișierului**

După importul existent `import { Pas0Upload } from './Pas0Upload';` adaugă:

```typescript
import { Pas05Configurare } from './Pas05Configurare';
import { ImportConfig, FieldComparison } from './types';
import { COL_TO_DB, KNOWN_COLS } from './utils';
```

- [ ] **Pas 2: Adaugă state nou în componenta `ImportSportiviPage`**

Imediat după `const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());` adaugă:

```typescript
const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
const [importConfig, setImportConfig] = useState<ImportConfig | null>(null);
// fieldSelections: Map<originalIndex, Map<fieldKey, boolean>>
const [fieldSelections, setFieldSelections] = useState<Map<number, Record<string, boolean>>>(new Map());
```

- [ ] **Pas 3: Actualizează `fetchSportivi` din useEffect să citească mai multe câmpuri**

Înlocuiește linia:
```typescript
const { data, error } = await supabase.from('sportivi').select('id, nume, prenume, data_nasterii, cnp, email, telefon');
```
cu:
```typescript
const { data, error } = await supabase.from('sportivi').select('id, nume, prenume, data_nasterii, cnp, email, telefon, gen, adresa, locul_nasterii, nr_legitimatie, cetatenia');
```

- [ ] **Pas 4: Adaugă funcția `readFileHeaders` înainte de `parseFileData`**

```typescript
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
```

- [ ] **Pas 5: Înlocuiește `handleAnalyze` cu 2 funcții**

Înlocuiește întreaga funcție `handleAnalyze` cu:

```typescript
// FAZA 1: Citește doar header-ele → merge la pas 0.5
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

// FAZA 2: Analiză completă cu config → merge la pas 1
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
            const telefon = config.selectedColumns.includes('TELEFON') ? (row['TELEFON']?.trim() || null) : null;

            const sportivData: any = {
                nume: numeCSV,
                prenume: prenumeCSV,
                email: emailCSV || generateEmail(prenumeCSV, numeCSV),
                data_nasterii: dataNasteriiCSV || null,
                status: 'Activ',
                data_inscrierii: new Date().toISOString().split('T')[0],
                club_id: effectiveClubId,
            };

            // Adaugă doar câmpurile selectate de user
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

            // Logică deduplicare (identică cu cea anterioară)
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
                // Mod: doar noi → marchează ca OMIS
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
                        // Mod: doar actualizare → sportivii noi se omit
                        uniques.push({ ...sportivData, originalIndex: index, rawDate: rawDate || '', _omis: true, motiv: 'Sportiv nou (mod: actualizează existenți)' });
                    } else {
                        uniques.push({ ...sportivData, originalIndex: index, rawDate: rawDate || '' });
                    }
                }
            }
        });

        // Construiește fieldComparisons pentru fiecare duplicat
        const initialSelections = new Map<number, Record<string, boolean>>();
        duplicates.forEach(d => {
            const selections: Record<string, boolean> = {};
            config.selectedColumns.forEach(col => {
                const dbKey = COL_TO_DB[col];
                if (!dbKey) return;
                const dbVal = d.existingSportiv[dbKey] ?? null;
                const fileVal = d.sportivData[dbKey] ?? null;
                const isDifferent = dbVal !== fileVal && fileVal !== null && fileVal !== '';
                const isEmpty = !dbVal && (fileVal !== null && fileVal !== '');
                selections[dbKey] = isEmpty; // auto-select dacă DB e gol
            });
            initialSelections.set(d.originalIndex, selections);

            // Adaugă fieldComparisons pe obiectul duplicat
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
                    };
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
```

- [ ] **Pas 6: Înlocuiește referința `handleAnalyze` → `handleReadHeaders` în Pas0Upload**

Găsește în JSX (spre sfârșitul fișierului) `onAnalyze={handleAnalyze}` și înlocuiește cu `onAnalyze={handleReadHeaders}`.

- [ ] **Pas 7: Adaugă randarea Pas05Configurare între step 0 și step 1**

Înainte de `if (step === 1) {` adaugă:

```typescript
if (step === 0.5) {
    return (
        <div className="space-y-4">
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
```

- [ ] **Pas 8: Adaugă `fieldSelections` și callback în props Pas1Revizuire**

Găsește `<Pas1Revizuire` în JSX și adaugă props noi:

```typescript
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
```

- [ ] **Pas 9: Actualizează `handleExecuteImport` să folosească `fieldSelections`**

Găsește `const buildUpdatePayload = (sportivData: any, existingSportiv: any) => {` și înlocuiește funcția cu:

```typescript
const buildUpdatePayload = (sportivData: any, existingSportiv: any, originalIndex: number) => {
    if (overwriteMode) return { ...sportivData };
    const selections = fieldSelections.get(originalIndex) || {};
    const safe: any = { id: existingSportiv.id };
    // Aplică doar câmpurile bifate de user
    Object.keys(selections).forEach(key => {
        if (selections[key] && sportivData[key] !== undefined) {
            safe[key] = sportivData[key];
        }
    });
    // Fallback vechi dacă nu există selecții (compatibilitate)
    if (Object.keys(selections).length === 0) {
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
```

Actualizează cele 2 locuri unde e apelată `buildUpdatePayload` (autoUpdates și selectedLoose) să paseze și `originalIndex`:

```typescript
const autoUpdates = strictDuplicates
    .filter((_, i) => !excludedStrictIndices.has(i))
    .map(d => buildUpdatePayload(d.sportivData, d.existingSportiv, d.originalIndex));

const selectedLoose = looseDuplicates
    .filter((_, i) => selectedIndices.has(i))
    .map(d => buildUpdatePayload(d.sportivData, d.existingSportiv, d.originalIndex));
```

- [ ] **Pas 10: Commit**

```bash
git add components/Sportivi/ImportSportiviPage/index.tsx
git commit -m "feat(import): split analiza in 2 faze, wiring Pas05, fieldSelections"
```

---

## Task 5: Modificare Pas1Revizuire.tsx — filtre, select global, comparație câmpuri

**Fișiere:**
- Modify: `components/Sportivi/ImportSportiviPage/Pas1Revizuire.tsx`

- [ ] **Pas 1: Adaugă tipuri noi în Props**

Înlocuiește interfața `Props` existentă cu:

```typescript
interface Props {
    unifiedRows: UnifiedRow[];
    selectedIndices: Set<number>;
    excludedStrictIndices: Set<number>;
    expandedRows: Set<number>;
    fieldSelections: Map<number, Record<string, boolean>>;
    overwriteMode: boolean;
    importing: boolean;
    showConfirm: boolean;
    seVaImporta: number;
    validNouCount: number;
    activeAutoUpdates: number;
    selectedLooseCount: number;
    countNou: number;
    countActualizare: number;
    countDuplicat: number;
    countEroare: number;
    onToggleSelection: (index: number) => void;
    onToggleExcludeStrict: (index: number) => void;
    onToggleExpandRow: (index: number) => void;
    onToggleOverwrite: () => void;
    onToggleFieldSelection: (originalIndex: number, fieldKey: string, value: boolean) => void;
    onGlobalSelectAll: () => void;
    onGlobalDeselectAll: () => void;
    onExecuteImport: () => void;
    onBack: () => void;
    onCancelConfirm: () => void;
}
```

- [ ] **Pas 2: Adaugă state local pentru filtru**

`Pas1Revizuire` este un functional component. Transformă-l din arrow function expresie în arrow function cu bloc ca să poată folosi `useState`. Schimbă:

```typescript
export const Pas1Revizuire: React.FC<Props> = ({
    // ...props...
}) => (
    <Card ...>
```

în:

```typescript
export const Pas1Revizuire: React.FC<Props> = ({
    unifiedRows, selectedIndices, excludedStrictIndices, expandedRows,
    fieldSelections, overwriteMode, importing, showConfirm, seVaImporta,
    validNouCount, activeAutoUpdates, selectedLooseCount,
    countNou, countActualizare, countDuplicat, countEroare,
    onToggleSelection, onToggleExcludeStrict, onToggleExpandRow,
    onToggleOverwrite, onToggleFieldSelection, onGlobalSelectAll,
    onGlobalDeselectAll, onExecuteImport, onBack, onCancelConfirm,
}) => {
    const [activeFilter, setActiveFilter] = React.useState<'all' | 'NOU' | 'ACTUALIZARE_AUTO' | 'POSIBIL_DUPLICAT' | 'EROARE' | 'OMIS'>('all');

    const visibleRows = activeFilter === 'all'
        ? unifiedRows
        : unifiedRows.filter(r => r.status === activeFilter);

    const hasExisting = unifiedRows.some(r => r.status === 'ACTUALIZARE_AUTO' || r.status === 'POSIBIL_DUPLICAT');

    return (
        <Card className="p-4 md:p-6">
```

Și adaugă `};` la sfârșitul componentei (în loc de `)`).

- [ ] **Pas 3: Adaugă bara de filtre după titlu**

Imediat după `<h2 className="text-xl...">Revizuire Import</h2>` adaugă:

```typescript
{/* Filtre */}
<div className="flex flex-wrap gap-1.5 mb-3">
    {[
        { key: 'all', label: `Toate (${unifiedRows.length})`, cls: 'bg-slate-700 text-slate-200 border-slate-600' },
        countNou > 0 && { key: 'NOU', label: `Noi (${countNou})`, cls: 'bg-green-900/40 text-green-400 border-green-800' },
        (countActualizare + countDuplicat) > 0 && { key: 'ACTUALIZARE_AUTO', label: `Existenți (${countActualizare + countDuplicat})`, cls: 'bg-yellow-900/40 text-yellow-400 border-yellow-800' },
        countEroare > 0 && { key: 'EROARE', label: `Erori (${countEroare})`, cls: 'bg-red-900/40 text-red-400 border-red-800' },
    ].filter(Boolean).map((f: any) => (
        <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${activeFilter === f.key ? f.cls : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600'}`}
        >
            {f.label}
        </button>
    ))}
</div>
```

- [ ] **Pas 4: Adaugă bara globală select/deselect (doar când există sportivi existenți)**

Imediat după bara de filtre:

```typescript
{hasExisting && (
    <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700/40 rounded-lg px-3 py-2 mb-3 gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Câmpuri sportivi existenți</span>
        <div className="flex gap-2">
            <button onClick={onGlobalSelectAll} className="text-xs font-semibold text-blue-400 hover:text-blue-300">☑ Selectează toate</button>
            <button onClick={onGlobalDeselectAll} className="text-xs font-semibold text-slate-400 hover:text-slate-300">☐ Deselectează toate</button>
        </div>
    </div>
)}
```

- [ ] **Pas 5: Adaugă tabelul comparativ pentru rândurile cu sportivi existenți**

Găsește în JSX locul unde se randează rândurile din tabel (secțiunea cu `{unifiedRows.map(...)}`) și înlocuiește cu `{visibleRows.map(...)}`. Adaugă logica de expandare a tabelului comparativ pentru rândurile cu status `ACTUALIZARE_AUTO` sau `POSIBIL_DUPLICAT`:

În codul de randare per rând, după afișarea datelor de bază (nume, prenume, status), adaugă:

```typescript
{/* Tabel comparativ câmp-cu-câmp — doar pentru sportivi existenți, pe desktop */}
{(row.status === 'ACTUALIZARE_AUTO' || row.status === 'POSIBIL_DUPLICAT') &&
 expandedRows.has(row.originalIndex) &&
 row.fieldComparisons && row.fieldComparisons.length > 0 && (
    <tr className="hidden md:table-row">
        <td colSpan={7} className="px-0 pb-2">
            <div className="mx-3 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-slate-800/80">
                            <th className="px-3 py-1.5 text-left text-slate-500 font-semibold uppercase tracking-wide">Câmp</th>
                            <th className="px-3 py-1.5 text-left text-slate-500 font-semibold uppercase tracking-wide">În baza de date</th>
                            <th className="px-3 py-1.5 text-left text-slate-500 font-semibold uppercase tracking-wide">În fișier</th>
                            <th className="px-3 py-1.5 text-center text-slate-500 font-semibold uppercase tracking-wide w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {row.fieldComparisons.map(fc => {
                            const sel = (fieldSelections.get(row.originalIndex) || {})[fc.fieldKey] ?? fc.selected;
                            return (
                                <tr key={fc.fieldKey} className="hover:bg-slate-800/40">
                                    <td className="px-3 py-1.5 text-slate-400 font-medium whitespace-nowrap">{fc.label}</td>
                                    <td className="px-3 py-1.5 text-slate-500">{fc.dbValue || <span className="italic text-slate-700">— gol</span>}</td>
                                    <td className={`px-3 py-1.5 ${fc.status === 'conflict' ? 'text-amber-400' : fc.status === 'identical' ? 'text-slate-600' : 'text-slate-200'}`}>
                                        {fc.fileValue || '—'}
                                    </td>
                                    <td className="px-3 py-1.5 text-center">
                                        {fc.status === 'identical' ? (
                                            <span className="text-slate-700">—</span>
                                        ) : (
                                            <button
                                                onClick={() => onToggleFieldSelection(row.originalIndex, fc.fieldKey, !sel)}
                                                className={`w-4 h-4 rounded border-2 flex items-center justify-center mx-auto text-[10px] font-bold transition-colors ${sel ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-600 bg-slate-900'}`}
                                            >
                                                {sel ? '✓' : ''}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {row.fieldComparisons.some(fc => fc.status === 'conflict') && (
                    <div className="px-3 py-1.5 bg-amber-900/20 border-t border-amber-900/40">
                        <span className="text-xs text-amber-400">⚠ Câmpuri cu valori diferite sunt debifate implicit. Bifează dacă vrei să suprascrii.</span>
                    </div>
                )}
                <div className="flex justify-end gap-3 px-3 py-1.5 bg-slate-800/40 border-t border-slate-700">
                    <button onClick={() => { row.fieldComparisons?.forEach(fc => { if (fc.status !== 'identical') onToggleFieldSelection(row.originalIndex, fc.fieldKey, true); }); }} className="text-xs text-blue-400 font-semibold">Toate</button>
                    <button onClick={() => { row.fieldComparisons?.forEach(fc => { onToggleFieldSelection(row.originalIndex, fc.fieldKey, false); }); }} className="text-xs text-slate-400 font-semibold">Niciunul</button>
                </div>
            </div>
        </td>
    </tr>
)}
```

- [ ] **Pas 6: Commit**

```bash
git add components/Sportivi/ImportSportiviPage/Pas1Revizuire.tsx
git commit -m "feat(import): filtre status, select global campuri, tabel comparativ per rand"
```

---

## Task 6: Test manual end-to-end

- [ ] **Pas 1: Pornește aplicația**

```bash
npm run dev
```

- [ ] **Pas 2: Testează fișierul FRAM (multi-sheet)**
  1. Mergi la Import Sportivi
  2. Selectează `TABEL-SPORTIVI-ANTRENORI-INSTRUCTORI-ARBITRI-VIZE-2026-Phi Hau(2).xlsx`
  3. Click "Analizează" → trebuie să apară Pas 0.5 cu coloanele detectate din sheet-ul SPORTIVI
  4. Bifează "Actualizează existenți", selectează câmpuri, click "Analizează"
  5. Verifică că Pas 1 arată sportivii cu badge-urile corecte
  6. Extinde un sportiv existent → trebuie să apară tabelul comparativ
  7. Bifează/debifează câmpuri, click "Importă"

- [ ] **Pas 3: Testează fișierul CSV template vechi**
  1. Descarcă template CSV din Pas 0
  2. Completează 2-3 rânduri
  3. Încarcă → Pas 0.5 trebuie să apară cu coloanele CSV
  4. Fluxul normal trebuie să funcționeze identic cu înainte

- [ ] **Pas 4: Commit final dacă totul funcționează**

```bash
git add -A
git commit -m "feat(import): import flexibil complet - configurare mod+campuri, comparatie DB vs fisier"
```
