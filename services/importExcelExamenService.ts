/**
 * importExcelExamenService.ts
 *
 * Parsare fișiere Excel pentru 2 formate:
 *  - "Ex. Local"   : 1 sheet, Nume complet + Grad + Admis/Respins + Contribuție
 *  - "Examen Grad" : N sheet-uri (câte un sheet per grad), cu note individuale
 */

import * as XLSX from 'xlsx';
import { Sportiv, Grad } from '../types';

// ─── Tipuri ─────────────────────────────────────────────────────────────────

export type FormatExcel = 'ex_local' | 'examen_grad';
export type StatusMatch = 'exact' | 'fuzzy' | 'nou';

export interface MetadataExcel {
    format: FormatExcel;
    data?: string;          // YYYY-MM-DD
    localitate?: string;
    club?: string;
    comisie?: string[];
    totalRanduri: number;
}

export interface RandImport {
    // Date din fișier
    numeRaw: string;        // Exact cum apare în XLS
    nume: string;           // Family name (primul cuvânt)
    prenume: string;        // Given name (restul)
    gradNume: string;       // Ex: "3 Câp Roșu"
    rezultat?: 'Admis' | 'Respins';
    contributie?: number;
    note?: {
        tehnica?: number;
        doc_luyen?: number;
        song_doi?: number;
        thao_quyen?: number;
        nota_generala?: number;
    };

    // Match cu DB
    status: StatusMatch;
    sportivId?: string;
    sportivGasit?: Sportiv;
    matchScore: number;     // 0-1
    gradId?: string;        // UUID din tabelul grade
    alternativeMatches?: Sportiv[]; // pentru fuzzy manual
}

export interface RezultatParsare {
    metadata: MetadataExcel;
    randuri: RandImport[];
    erori: string[];
}

// ─── Utilități ──────────────────────────────────────────────────────────────

/** Conversia numărului de serie Excel → string YYYY-MM-DD */
function excelDateToString(serial: number): string {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date = new Date(utc_value * 1000);
    return date.toISOString().split('T')[0];
}

/** Normalizare string pentru comparare (diacritice → ASCII, lowercase, trim) */
export function normalizeStr(s: string): string {
    return (s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Distanță Levenshtein normalizată → similaritate 0-1 */
function similarity(a: string, b: string): number {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const la = a.length, lb = b.length;
    const dp: number[][] = Array.from({ length: la + 1 }, (_, i) =>
        Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= la; i++)
        for (let j = 1; j <= lb; j++)
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return 1 - dp[la][lb] / Math.max(la, lb);
}

/** Match un nume complet din XLS cu lista de sportivi din DB */
export function matchSportiv(
    numeComplet: string,
    sportivi: Sportiv[]
): { sportiv?: Sportiv; score: number; status: StatusMatch; alternatives: Sportiv[] } {
    const normInput = normalizeStr(numeComplet);
    let bestScore = 0;
    let bestMatch: Sportiv | undefined;
    const candidates: Array<{ sportiv: Sportiv; score: number }> = [];

    for (const s of sportivi) {
        const numeDB1 = normalizeStr(`${s.nume} ${s.prenume}`);
        const numeDB2 = normalizeStr(`${s.prenume} ${s.nume}`);
        const score = Math.max(similarity(normInput, numeDB1), similarity(normInput, numeDB2));
        if (score >= 0.7) candidates.push({ sportiv: s, score });
        if (score > bestScore) { bestScore = score; bestMatch = s; }
    }

    candidates.sort((a, b) => b.score - a.score);
    const top = candidates[0];

    if (!top || top.score < 0.7) return { score: 0, status: 'nou', alternatives: [] };
    if (top.score >= 0.95) return { sportiv: top.sportiv, score: top.score, status: 'exact', alternatives: [] };
    return {
        sportiv: top.sportiv,
        score: top.score,
        status: 'fuzzy',
        alternatives: candidates.slice(1, 4).map(c => c.sportiv),
    };
}

/** Match numele gradului din XLS cu lista de grade din DB */
export function matchGrad(gradNume: string, grade: Grad[]): Grad | undefined {
    const norm = normalizeStr(gradNume);
    // Dacă e un număr simplu (ex: "2"), caută după ordine
    const asNumber = parseInt(gradNume.trim(), 10);
    if (!isNaN(asNumber) && String(asNumber) === gradNume.trim()) {
        const byOrdine = grade.find(g => g.ordine === asNumber);
        if (byOrdine) return byOrdine;
    }
    let best: Grad | undefined;
    let bestScore = 0;
    for (const g of grade) {
        const s = similarity(norm, normalizeStr(g.nume));
        if (s > bestScore) { bestScore = s; best = g; }
    }
    return bestScore >= 0.6 ? best : undefined;
}

// ─── Detectare format ────────────────────────────────────────────────────────

function detectFormat(wb: XLSX.WorkBook): FormatExcel {
    const sheetNames = wb.SheetNames;
    // Ex. Local are 1 sheet cu "T Ex locale" sau similar
    if (sheetNames.length === 1) return 'ex_local';
    // Examen de Grad are sheet-uri numite după grade
    return 'examen_grad';
}

// ─── Parser: Ex. Local ───────────────────────────────────────────────────────

function parseExLocal(
    wb: XLSX.WorkBook,
    sportivi: Sportiv[],
    grade: Grad[]
): RezultatParsare {
    const erori: string[] = [];
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Metadata
    const metadata: MetadataExcel = { format: 'ex_local', totalRanduri: 0 };
    for (let r = 0; r < Math.min(rows.length, 10); r++) {
        const row = rows[r];
        for (let c = 0; c < row.length; c++) {
            const v = String(row[c]).trim();
            if (!v) continue;
            if (v === 'Data:' || v === 'Data') {
                const rawDate = row[c + 1] || row[c + 2];
                if (typeof rawDate === 'number' && rawDate > 30000) {
                    metadata.data = excelDateToString(rawDate);
                } else if (rawDate) {
                    metadata.data = String(rawDate).slice(0, 10);
                }
            }
            if (v === 'Localitatea:' || v === 'Localitatea') {
                metadata.localitate = String(row[c + 1] || row[c + 2] || '').trim();
            }
        }
        // Club la col 6 rândurile 2-4
        if (r >= 2 && r <= 4 && row[6] && String(row[6]).trim()) {
            if (!metadata.club) metadata.club = String(row[6]).trim();
        }
        // Comisie
        if (r >= 5 && r <= 7) {
            const membre = String(row[2] || row[3] || '').trim();
            if (membre && membre.length > 3 && !membre.includes('Comisia')) {
                if (!metadata.comisie) metadata.comisie = [];
                metadata.comisie.push(membre);
            }
        }
    }

    // Găsire rând header (conține "Nr." și "Gradul" sau "Admis")
    let headerRow = -1;
    for (let r = 0; r < rows.length; r++) {
        const joined = rows[r].join(' ').toLowerCase();
        if (joined.includes('nr') && (joined.includes('grad') || joined.includes('admis'))) {
            headerRow = r;
            break;
        }
    }
    if (headerRow === -1) {
        erori.push('Nu s-a putut identifica rândul header. Verificați formatul fișierului.');
        return { metadata, randuri: [], erori };
    }

    // Detectare dinamică coloane din header
    const headerCells = rows[headerRow].map((c: any) => normalizeStr(String(c)));
    const colNume = headerCells.findIndex((c: string) => c.includes('num') || c.includes('prenume') || c.includes('sportiv'));
    const colGrad = headerCells.findIndex((c: string) => c.includes('grad'));
    const colRez  = headerCells.findIndex((c: string) => c.includes('admis') || c.includes('respins') || c.includes('rezultat'));
    const colContrib = headerCells.findIndex((c: string) => c.includes('contrib') || c.includes('taxa'));

    // Fallback la poziții clasice dacă header-ul nu e standard
    const iNume    = colNume    >= 0 ? colNume    : 1;
    const iGrad    = colGrad    >= 0 ? colGrad    : 3;
    const iRez     = colRez     >= 0 ? colRez     : 4;
    const iContrib = colContrib >= 0 ? colContrib : 5;

    // Parsare rânduri date
    const randuri: RandImport[] = [];
    for (let r = headerRow + 1; r < rows.length; r++) {
        const row = rows[r];
        const nr = row[0];
        if (!nr || typeof nr !== 'number') continue;

        const numeRaw = String(row[iNume] || '').trim();
        if (!numeRaw) continue;

        const gradNume = String(row[iGrad] || '').trim();
        let rezultat: 'Admis' | 'Respins' | undefined;
        const rez = String(row[iRez] || '').trim().toLowerCase();
        if (rez === 'admis') rezultat = 'Admis';
        else if (rez === 'respins') rezultat = 'Respins';

        const contributie = typeof row[iContrib] === 'number' ? row[iContrib] : undefined;

        // Split nume: primul cuvânt = Nume, restul = Prenume
        const parts = numeRaw.split(' ');
        const nume = parts[0] || '';
        const prenume = parts.slice(1).join(' ') || '';

        const match = matchSportiv(numeRaw, sportivi);
        const gradObj = matchGrad(gradNume, grade);

        randuri.push({
            numeRaw,
            nume,
            prenume,
            gradNume,
            rezultat,
            contributie,
            status: match.status,
            sportivId: match.sportiv?.id,
            sportivGasit: match.sportiv,
            matchScore: match.score,
            gradId: gradObj?.id,
            alternativeMatches: match.alternatives,
        });
    }

    metadata.totalRanduri = randuri.length;
    return { metadata, randuri, erori };
}

// ─── Parser: Examen de Grad ──────────────────────────────────────────────────

function parseExamenGrad(
    wb: XLSX.WorkBook,
    sportivi: Sportiv[],
    grade: Grad[]
): RezultatParsare {
    const erori: string[] = [];
    const randuri: RandImport[] = [];
    let metadata: MetadataExcel = { format: 'examen_grad', totalRanduri: 0 };
    let metaExtracted = false;

    for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Metadata din primul sheet
        if (!metaExtracted) {
            for (let r = 0; r < Math.min(rows.length, 14); r++) {
                const row = rows[r];
                for (let c = 0; c < row.length; c++) {
                    const v = String(row[c]).trim();
                    if ((v === 'Data :' || v === 'Data:') && row[c + 1]) {
                        const raw = row[c + 1];
                        metadata.data = typeof raw === 'number' && raw > 30000
                            ? excelDateToString(raw)
                            : String(raw).slice(0, 10);
                    }
                    if ((v === 'Localitatea :' || v === 'Localitatea:') && row[c + 1]) {
                        metadata.localitate = String(row[c + 1]).trim();
                    }
                    if ((v === 'Club :' || v === 'Club:') && row[c + 1]) {
                        metadata.club = String(row[c + 1]).trim();
                    }
                }
                // Comisie
                if (r >= 11 && r <= 13) {
                    const membre = String(row[3] || '').trim();
                    if (membre && membre.length > 3 && !membre.includes('Comisia')) {
                        if (!metadata.comisie) metadata.comisie = [];
                        metadata.comisie.push(membre);
                    }
                }
            }
            metaExtracted = true;
        }

        // Găsire header în sheet
        let headerRow = -1;
        for (let r = 0; r < rows.length; r++) {
            const joined = rows[r].join(' ').toLowerCase();
            if (joined.includes('nr') && joined.includes('grad')) {
                headerRow = r;
                break;
            }
        }
        if (headerRow === -1) continue;

        // Grad din sheet name (e.g. "1 CR", "2 CR", "C.V 1 CA")
        const gradDinSheet = matchGrad(sheetName, grade);

        for (let r = headerRow + 2; r < rows.length; r++) {
            const row = rows[r];
            const nr = row[0];
            if (!nr || typeof nr !== 'number') continue;

            // Examen de grad are Nume în col 1, Prenume în col 2
            const numeFamily = String(row[1] || '').trim();
            const numeGiven = String(row[2] || '').trim();
            if (!numeFamily && !numeGiven) continue;

            const numeRaw = `${numeFamily} ${numeGiven}`.trim();
            const gradNume = String(row[5] || sheetName).trim();

            const note = {
                tehnica: typeof row[6] === 'number' ? row[6] : undefined,
                doc_luyen: typeof row[7] === 'number' ? row[7] : undefined,
                song_doi: typeof row[8] === 'number' ? row[8] : undefined,
                thao_quyen: typeof row[9] === 'number' ? row[9] : undefined,
                nota_generala: typeof row[10] === 'number' ? row[10] : undefined,
            };
            const areNote = Object.values(note).some(v => v !== undefined);

            const match = matchSportiv(numeRaw, sportivi);
            const gradObj = gradDinSheet || matchGrad(gradNume, grade);

            randuri.push({
                numeRaw,
                nume: numeFamily,
                prenume: numeGiven,
                gradNume,
                note: areNote ? note : undefined,
                status: match.status,
                sportivId: match.sportiv?.id,
                sportivGasit: match.sportiv,
                matchScore: match.score,
                gradId: gradObj?.id,
                alternativeMatches: match.alternatives,
            });
        }
    }

    metadata.totalRanduri = randuri.length;
    return { metadata, randuri, erori };
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function parseExcelExamen(
    file: ArrayBuffer,
    sportivi: Sportiv[],
    grade: Grad[]
): RezultatParsare {
    const wb = XLSX.read(file, { type: 'array' });
    const format = detectFormat(wb);
    if (format === 'ex_local') return parseExLocal(wb, sportivi, grade);
    return parseExamenGrad(wb, sportivi, grade);
}
