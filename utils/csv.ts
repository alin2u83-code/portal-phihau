import Papa from 'papaparse';

/**
 * Parsează un fișier CSV cu detectie automată de encoding.
 * Rezolvă problema diacriticelor românești din fișiere generate de Excel (Windows-1252).
 */
export function parseCSVWithEncoding(
    file: File,
    options: Papa.ParseConfig,
    onComplete: (results: Papa.ParseResult<any>) => void,
    onError?: (error: Papa.ParseError) => void
) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);
        // Detectie BOM UTF-8: EF BB BF → fisier salvat explicit ca UTF-8
        const isUtf8Bom = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
        // Fisierele generate de Excel in Romania sunt de obicei Windows-1252 fara BOM
        const encoding = isUtf8Bom ? 'utf-8' : 'windows-1252';
        const text = new TextDecoder(encoding).decode(buffer);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (Papa.parse as any)(text, { ...options, complete: onComplete, error: onError });
    };
    reader.readAsArrayBuffer(file);
}

// ─── Funcții comune pentru import sportivi ───────────────────────────────────

/** Generează email automat din prenume + nume, eliminând diacritice și spații */
export function generateEmail(prenume: string, nume: string): string {
    const sanitize = (s: string) =>
        s.toLowerCase()
         .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
         .replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    return `${sanitize(prenume)}.${sanitize(nume)}@frqkd.ro`;
}

/** Distanța Levenshtein între două stringuri */
export function levenshteinDistance(a: string, b: string): number {
    const tmp: number[][] = [];
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
}

/**
 * Verifică dacă două stringuri sunt similare (cu toleranță la typo-uri și diacritice).
 * Normalizează diacriticele românești înainte de comparație (Ștefan ≈ Stefan).
 */
export function isSimilar(a: string, b: string): boolean {
    const norm = (s: string) =>
        s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const na = norm(a);
    const nb = norm(b);
    const dist = levenshteinDistance(na, nb);
    const maxLength = Math.max(na.length, nb.length);
    if (maxLength === 0) return true;
    const threshold = maxLength < 5 ? 1 : 2;
    return dist <= threshold;
}

// ─────────────────────────────────────────────────────────────────────────────

export function exportToCsv(filename: string, rows: object[]) {
    if (!rows || rows.length === 0) {
        alert("Nu există date de exportat.");
        return;
    }

    const separator = ',';
    // Extragerea cheilor din toate obiectele pentru a ne asigura că nu pierdem coloane
    // dacă obiectele nu sunt uniforme (opțional, dar recomandat)
    const keys = Object.keys(rows[0]);

    const csvContent =
        keys.join(separator) +
        '\n' +
        rows.map(row => {
            return keys.map(k => {
                let cell = (row as any)[k];
                
                // Tratarea valorilor null sau undefined
                if (cell === null || cell === undefined) {
                    cell = '';
                } 
                // Tratarea obiectelor de tip Date
                else if (cell instanceof Date) {
                    cell = cell.toLocaleString('ro-RO');
                } 
                // Conversia la string și curățarea ghilimelelor pentru formatul CSV
                else {
                    cell = cell.toString().replace(/"/g, '""');
                }

                // Dacă celula conține separatorul, ghilimele sau rând nou, trebuie încadrată în ghilimele
                if (cell.search(/("|,|\n)/g) >= 0) {
                    cell = `"${cell}"`;
                }
                return cell;
            }).join(separator);
        }).join('\n');

    // Adăugarea BOM (\uFEFF) este esențială pentru ca Excel să recunoască diacriticele românești (UTF-8)
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    
    // Crearea link-ului de descărcare
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        
        // Curățare memorie și DOM
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}