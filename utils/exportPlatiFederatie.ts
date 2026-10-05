/**
 * Faza 33 — export CSV / Excel al sportivilor acoperiti de platile catre federatie.
 * Constructia randurilor este pura (testata cu `npx tsx utils/exportPlatiFederatie.test.ts`).
 */

import * as XLSX from 'xlsx';
import type { DecontFederatie, SportivAcoperitPlata, TipTaxaFederala } from '../types';
import { formatPerioadaTaxa } from './anFiscal';
import { exportToCsv } from './csv';

export interface RandExportPlataFederatie {
    Club: string;
    Data_plata: string;
    Taxa: string;
    Perioada: string;
    Metoda: string;
    Nume: string;
    Prenume: string;
    Data_nasterii: string;
    Suma: number;
}

export interface RandScutitExport {
    Club: string;
    Taxa: string;
    Perioada: string;
    Nume: string;
    Prenume: string;
    Motiv: string;
}

/** '2026-10-05' sau '2026-10-05T10:00:00Z' -> '05.10.2026' (determinist, fara fus orar). */
export function formateazaDataRo(valoare: string | null | undefined): string {
    if (!valoare) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valoare);
    if (!m) return valoare;
    return `${m[3]}.${m[2]}.${m[1]}`;
}

export function construiesteRanduriExport(p: {
    deconturi: DecontFederatie[];
    acoperiti: SportivAcoperitPlata[];
    clubs: { id: string; nume: string }[];
}): RandExportPlataFederatie[] {
    const deconturiById = new Map<string, DecontFederatie>((p.deconturi || []).map(d => [d.id, d]));
    const clubById = new Map<string, string>((p.clubs || []).map(c => [c.id, c.nume]));

    const randuri = (p.acoperiti || []).map(a => {
        const decont = deconturiById.get(a.decont_id);
        const clubNume = decont
            ? (clubById.get(decont.club_id) ?? `Club ${String(decont.club_id).slice(0, 8)}`)
            : `Club ${String(a.decont_id).slice(0, 8)}`;
        const tip: TipTaxaFederala = a.tip;
        return {
            Club: clubNume,
            Data_plata: formateazaDataRo(decont?.data_decont ?? decont?.data_generare ?? null),
            Taxa: tip,
            Perioada: formatPerioadaTaxa(tip, a.an),
            Metoda: decont?.metoda_plata ?? '',
            Nume: a.nume ?? '',
            Prenume: a.prenume ?? '',
            Data_nasterii: formateazaDataRo(a.data_nasterii),
            Suma: a.suma ?? 0,
        } as RandExportPlataFederatie;
    });

    return randuri.sort(
        (x, y) =>
            x.Club.localeCompare(y.Club, 'ro') ||
            x.Data_plata.split('.').reverse().join('').localeCompare(y.Data_plata.split('.').reverse().join('')) ||
            x.Nume.localeCompare(y.Nume, 'ro') ||
            x.Prenume.localeCompare(y.Prenume, 'ro')
    );
}

export function exportPlatiFederatieCSV(randuri: RandExportPlataFederatie[], numeFisier: string): void {
    exportToCsv(numeFisier.endsWith('.csv') ? numeFisier : `${numeFisier}.csv`, randuri);
}

export function exportPlatiFederatieXLSX(
    randuri: RandExportPlataFederatie[],
    scutiti: RandScutitExport[],
    numeFisier: string
): void {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(randuri), 'Plati federatie');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(scutiti), 'Scutiti');
    XLSX.writeFile(wb, numeFisier.endsWith('.xlsx') ? numeFisier : `${numeFisier}.xlsx`);
}
