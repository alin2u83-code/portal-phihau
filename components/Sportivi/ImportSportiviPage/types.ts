export type ImportStep = 0 | 1 | 2;

export interface ImportResult {
    adaugati: { nume: string; prenume: string; data_nasterii: string | null }[];
    actualizati: { nume: string; prenume: string; data_nasterii: string | null }[];
    omisi: { rand: number; nume: string; prenume: string; motiv: string }[];
}

export type RowStatus = 'NOU' | 'ACTUALIZARE_AUTO' | 'POSIBIL_DUPLICAT' | 'EROARE';

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
}
