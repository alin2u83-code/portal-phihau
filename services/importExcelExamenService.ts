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

// ─── Normalizare extinsă pentru matching grade ───────────────────────────────

/**
 * Normalizare agresivă: lowercase, fără diacritice, fără punctuație,
 * fără spații multiple. Folosită intern doar în matchGrad.
 *
 * Diferă de normalizeStr prin că elimină și punctele/virgulele explicit,
 * astfel "c.v" devine "cv", "Cap R." devine "cap r".
 */
function normGradStr(s: string): string {
    return (s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')   // diacritice
        .toLowerCase()
        .replace(/[.\-,]/g, '')             // punctuație frecventă în abrevieri
        .replace(/[^a-z0-9\s]/g, '')        // restul caracterelor speciale
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Generează variante de alias pentru un grad din DB,
 * bazate pe regulile de abreviere folosite în practică.
 *
 * Exemple:
 *   "Cap Roșu"   → ["cap rosu", "cap r", "cr"]
 *   "Cap Galben" → ["cap galben", "cap g", "cg"]
 *   "Centură Violet" → ["centura violet", "cv", "centura v", "c v"]
 *   "3 Cap Roșu" → ["3 cap rosu", "3cr", "3 cr", "3 cap r"]
 */
function buildGradAliases(grad: Grad): string[] {
    const n = normGradStr(grad.nume);
    const aliases = new Set<string>([n]);

    const words = n.split(' ').filter(Boolean);

    // Inițiale complete (ex: "cap rosu" → "cr")
    const initials = words.map(w => w[0]).join('');
    if (initials.length >= 2) aliases.add(initials);

    // Abrevieri cunoscute pentru cuvinte frecvente
    const abbrevMap: Record<string, string[]> = {
        'cap':      ['cap', 'c'],
        'centura':  ['centura', 'cent', 'c'],
        'rosu':     ['rosu', 'r'],
        'galben':   ['galben', 'g', 'gal'],
        'albastru': ['albastru', 'alb', 'a'],
        'alb':      ['alb', 'a'],
        'violet':   ['violet', 'v', 'vio'],
        'negru':    ['negru', 'n', 'neg'],
        'maro':     ['maro', 'm'],
        'portocaliu': ['portocaliu', 'p', 'port'],
        'verde':    ['verde', 'v', 'vd'],
        'roz':      ['roz', 'r'],
    };

    // Aliasuri cu prefix numeric (ex: "3 cap rosu" → "3cr", "3 cr", "3 cap r")
    const numPrefix = words[0] && /^\d+$/.test(words[0]) ? words[0] : null;
    const colorWords = numPrefix ? words.slice(1) : words;

    // "cap r", "cap g", "centura v" etc. (primul cuvânt + inițiala culorii)
    if (colorWords.length >= 2) {
        const firstWord = colorWords[0];
        const colorInitial = colorWords[colorWords.length - 1][0];
        const secondInitial = colorWords[1][0];

        // Ex: "cap r", "cap g"
        aliases.add(`${firstWord} ${colorInitial}`);
        // Ex: "cap ro", "cap al"
        if (colorWords[colorWords.length - 1].length >= 2) {
            aliases.add(`${firstWord} ${colorWords[colorWords.length - 1].slice(0, 2)}`);
        }

        if (numPrefix) {
            // Ex: "3 cap r", "3cr", "3 cr"
            aliases.add(`${numPrefix} ${firstWord} ${colorInitial}`);
            aliases.add(`${numPrefix}${initials.slice(1)}`); // "3cr" → prefix + inițiale fără cifră
            aliases.add(`${numPrefix} ${initials.slice(1)}`);
            // Ex: "3 cap alb" → "3ca", "3 ca"
            aliases.add(`${numPrefix}${firstWord[0]}${secondInitial}`);
            aliases.add(`${numPrefix} ${firstWord[0]}${secondInitial}`);
        }
    }

    // Variante cu cuvinte expandate/abreviate
    const expandedVariants: string[][] = [[]];
    for (const word of colorWords) {
        const abbrevs = abbrevMap[word] || [word];
        const newVariants: string[][] = [];
        for (const existing of expandedVariants) {
            for (const abbrev of abbrevs) {
                newVariants.push([...existing, abbrev]);
            }
        }
        expandedVariants.length = 0;
        expandedVariants.push(...newVariants.slice(0, 20)); // limitat la 20
    }
    for (const variant of expandedVariants) {
        const joined = (numPrefix ? [numPrefix, ...variant] : variant).join(' ');
        aliases.add(joined);
        if (numPrefix) {
            // și fără spațiu după număr: "3cv", "3ca"
            aliases.add(numPrefix + variant.join(''));
        }
    }

    return Array.from(aliases);
}

// ─── Aliasuri manuale pentru cazuri speciale sau abrevieri ambigue ────────────

/**
 * Tabel de aliasuri explicite: cheia normalizată (normGradStr aplicat)
 * mapează la un fragment din numele gradului din DB (normGradStr aplicat).
 * Aceste aliasuri sunt prioritare față de orice logică automată.
 *
 * Adaugă aici orice variantă tipică din fișierele XLS ale clubului.
 */
const ALIASURI_EXPLICITE: Record<string, string> = {
    // Centură Violet (standalone, fără număr)
    'cv':               'centura violet',
    'c v':              'centura violet',
    'centura violet':   'centura violet',
    'centura v':        'centura violet',
    'cent violet':      'centura violet',

    // Cap Roșu
    'cap rosu':         'cap rosu',
    'cap r':            'cap rosu',
    'cr':               'cap rosu',
    'cap ro':           'cap rosu',

    // Cap Galben
    'cap galben':       'cap galben',
    'cap g':            'cap galben',
    'cg':               'cap galben',
    'cap gal':          'cap galben',

    // Cap Albastru
    // ATENȚIE: "cap alb" NU mapează la "cap albastru" — poate fi "Cap Alb" distinct
    // "ca" standalone NU mapează automat — ambiguu între Cap Albastru și C.V. N Cap Alb
    'cap albastru':     'cap albastru',
    'cap a':            'cap albastru',

    // ─── C.V. N Cap Alb (gradele compuse cu prefix C.V.) ────────────────────────
    // Formatul în DB: "C.V. 1 Cap Alb", "C.V. 2 Cap Alb", "C.V. 3 Cap Alb", "C.V. 4 Cap Alb"
    // După normGradStr: "cv 1 cap alb", "cv 2 cap alb", "cv 3 cap alb", "cv 4 cap alb"

    // C.V. 1 Cap Alb
    '1 ca':             'cv 1 cap alb',
    '1ca':              'cv 1 cap alb',
    '1 cap alb':        'cv 1 cap alb',
    'cv1ca':            'cv 1 cap alb',
    'cv 1 ca':          'cv 1 cap alb',
    'cv1 ca':           'cv 1 cap alb',
    'cv1':              'cv 1 cap alb',
    'cv 1':             'cv 1 cap alb',
    'c v 1':            'cv 1 cap alb',
    'c v 1 ca':         'cv 1 cap alb',
    'cv 1 cap alb':     'cv 1 cap alb',
    'c v 1 cap alb':    'cv 1 cap alb',
    'centura violet 1 cap alb': 'cv 1 cap alb',
    'centura violet 1 ca': 'cv 1 cap alb',

    // C.V. 2 Cap Alb
    '2 ca':             'cv 2 cap alb',
    '2ca':              'cv 2 cap alb',
    '2 cap alb':        'cv 2 cap alb',
    'cv2ca':            'cv 2 cap alb',
    'cv 2 ca':          'cv 2 cap alb',
    'cv2 ca':           'cv 2 cap alb',
    'cv2':              'cv 2 cap alb',
    'cv 2':             'cv 2 cap alb',
    'c v 2':            'cv 2 cap alb',
    'c v 2 ca':         'cv 2 cap alb',
    'cv 2 cap alb':     'cv 2 cap alb',
    'c v 2 cap alb':    'cv 2 cap alb',
    'centura violet 2 cap alb': 'cv 2 cap alb',
    'centura violet 2 ca': 'cv 2 cap alb',

    // C.V. 3 Cap Alb
    '3 ca':             'cv 3 cap alb',
    '3ca':              'cv 3 cap alb',
    '3 cap alb':        'cv 3 cap alb',
    'cv3ca':            'cv 3 cap alb',
    'cv 3 ca':          'cv 3 cap alb',
    'cv3 ca':           'cv 3 cap alb',
    'cv3':              'cv 3 cap alb',
    'cv 3':             'cv 3 cap alb',
    'c v 3':            'cv 3 cap alb',
    'c v 3 ca':         'cv 3 cap alb',
    'cv 3 cap alb':     'cv 3 cap alb',
    'c v 3 cap alb':    'cv 3 cap alb',
    'centura violet 3 cap alb': 'cv 3 cap alb',
    'centura violet 3 ca': 'cv 3 cap alb',

    // C.V. 4 Cap Alb
    '4 ca':             'cv 4 cap alb',
    '4ca':              'cv 4 cap alb',
    '4 cap alb':        'cv 4 cap alb',
    'cv4ca':            'cv 4 cap alb',
    'cv 4 ca':          'cv 4 cap alb',
    'cv4 ca':           'cv 4 cap alb',
    'cv4':              'cv 4 cap alb',
    'cv 4':             'cv 4 cap alb',
    'c v 4':            'cv 4 cap alb',
    'c v 4 ca':         'cv 4 cap alb',
    'cv 4 cap alb':     'cv 4 cap alb',
    'c v 4 cap alb':    'cv 4 cap alb',
    'centura violet 4 cap alb': 'cv 4 cap alb',
    'centura violet 4 ca': 'cv 4 cap alb',
};

/** Match numele gradului din XLS cu lista de grade din DB */
export function matchGrad(gradNume: string, grade: Grad[]): Grad | undefined {
    if (!gradNume || !grade.length) return undefined;

    const normInput = normGradStr(gradNume);

    // ── Pasul 1: Număr simplu exact (ex: "2") → ordine ──────────────────────
    const trimmed = gradNume.trim();
    const asNumber = parseInt(trimmed, 10);
    if (!isNaN(asNumber) && String(asNumber) === trimmed) {
        const byOrdine = grade.find(g => g.ordine === asNumber);
        if (byOrdine) {
            console.debug(`[matchGrad] "${gradNume}" → ordine exact → "${byOrdine.nume}"`);
            return byOrdine;
        }
    }

    // ── Pasul 2: Match exact după normalizare ────────────────────────────────
    for (const g of grade) {
        if (normGradStr(g.nume) === normInput) {
            console.debug(`[matchGrad] "${gradNume}" → match normalizat exact → "${g.nume}"`);
            return g;
        }
    }

    // ── Pasul 3: Aliasuri explicite ──────────────────────────────────────────
    const aliasTarget = ALIASURI_EXPLICITE[normInput];
    if (aliasTarget) {
        // Prioritate 1: match exact pe target normalizat
        const exactFound = grade.find(g => normGradStr(g.nume) === aliasTarget);
        if (exactFound) {
            console.debug(`[matchGrad] "${gradNume}" → alias explicit exact "${aliasTarget}" → "${exactFound.nume}"`);
            return exactFound;
        }
        // Prioritate 2: normG al gradului din DB conține targetul ca substring
        // (ex: target "cap rosu" găsit în "3 Cap Rosu")
        // NU folosim aliasTarget.includes(normG) — risc de match fals pozitiv
        // (ex: target "cv 1 cap alb" ar include "cv" și ar returna "Centura Violet")
        const substringFound = grade.find(g => normGradStr(g.nume).includes(aliasTarget));
        if (substringFound) {
            console.debug(`[matchGrad] "${gradNume}" → alias explicit substring "${aliasTarget}" → "${substringFound.nume}"`);
            return substringFound;
        }
    }

    // ── Pasul 4: Aliasuri generate automat din regulile de abreviere ─────────
    for (const g of grade) {
        const aliases = buildGradAliases(g);
        if (aliases.includes(normInput)) {
            console.debug(`[matchGrad] "${gradNume}" → alias auto → "${g.nume}" (aliases: ${aliases.slice(0, 8).join(', ')})`);
            return g;
        }
    }

    // ── Pasul 5: Matching pe prefix cu număr + inițiale culoare ─────────────
    // Ex: "3 cap r", "3 cap rosu", "3cr" → gradul cu ordine 3 și culoare rosu
    const numInText = normInput.match(/^(\d+)\s*(.+)$/);
    if (numInText) {
        const [, numStr, rest] = numInText;
        const n = parseInt(numStr, 10);
        const candidatesByOrdine = grade.filter(g => g.ordine === n);
        if (candidatesByOrdine.length === 1) {
            // Dacă există un singur grad cu această ordine, verifică că restul nu contrazice
            const g = candidatesByOrdine[0];
            const normG = normGradStr(g.nume);
            const scoreCheck = similarity(normInput, normG);
            if (scoreCheck >= 0.35 || normG.startsWith(numStr)) {
                console.debug(`[matchGrad] "${gradNume}" → ordine+rest → "${g.nume}" (score=${scoreCheck.toFixed(2)})`);
                return g;
            }
        }
        if (candidatesByOrdine.length > 1 && rest) {
            // Dacă există mai multe grade cu aceeași ordine, alege cel mai bun după rest
            let bestByOrdine: Grad | undefined;
            let bestOrdineScore = 0;
            for (const g of candidatesByOrdine) {
                const normG = normGradStr(g.nume);
                const restNorm = normG.replace(numStr, '').trim();
                const s = similarity(rest, restNorm);
                if (s > bestOrdineScore) { bestOrdineScore = s; bestByOrdine = g; }
            }
            if (bestByOrdine && bestOrdineScore >= 0.3) {
                console.debug(`[matchGrad] "${gradNume}" → ordine+culoare → "${bestByOrdine.nume}" (score=${bestOrdineScore.toFixed(2)})`);
                return bestByOrdine;
            }
        }
    }

    // ── Pasul 6: Matching pe inițiale cu prefix "cap X" / "centura X" ────────
    // Ex: "cap r" → caută grade care conțin "cap" și al căror al doilea cuvânt
    // normalizat începe cu "r"
    const capsMatch = normInput.match(/^(cap|centura|cent)\s+([a-z])(\w*)$/);
    if (capsMatch) {
        const [, prefix, initial, rest2] = capsMatch;
        const candidates = grade.filter(g => {
            const normG = normGradStr(g.nume);
            const gWords = normG.split(' ');
            return gWords.some(w => w === prefix || w.startsWith(prefix.slice(0, 3)))
                && gWords.some(w => w.startsWith(initial));
        });
        if (candidates.length === 1) {
            console.debug(`[matchGrad] "${gradNume}" → prefix+inițiala → "${candidates[0].nume}"`);
            return candidates[0];
        }
        if (candidates.length > 1 && rest2) {
            // Rafinează după restul literei (ex: "cap al" → "albastru" sau "alb")
            const refined = candidates.filter(g =>
                normGradStr(g.nume).split(' ').some(w => w.startsWith(initial + rest2))
            );
            if (refined.length === 1) {
                console.debug(`[matchGrad] "${gradNume}" → prefix+prefix-culoare → "${refined[0].nume}"`);
                return refined[0];
            }
        }
    }

    // ── Pasul 7: Fallback fuzzy Levenshtein (logica originală, threshold 0.5) ─
    let best: Grad | undefined;
    let bestScore = 0;
    for (const g of grade) {
        const s = similarity(normInput, normGradStr(g.nume));
        if (s > bestScore) { bestScore = s; best = g; }
    }

    if (bestScore >= 0.5 && best) {
        console.debug(`[matchGrad] "${gradNume}" → fuzzy (${bestScore.toFixed(2)}) → "${best.nume}"`);
        return best;
    }

    console.debug(`[matchGrad] "${gradNume}" → fără match (best fuzzy: ${bestScore.toFixed(2)})`);
    return undefined;
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
