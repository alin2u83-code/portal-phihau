import { eachMonthOfInterval, startOfMonth, parseISO } from 'date-fns';
import type { Plata } from '../types';

/**
 * Calculează lunile fără factură de tip Abonament între dataStart și azi.
 *
 * Funcție pură — fără efecte secundare, fără apeluri Supabase.
 *
 * @param dataStart - string ISO 'YYYY-MM-DD' sau null/undefined (dacă null → returnează [])
 * @param platiSportiv - lista completă de plăți ale sportivului
 * @returns lista lunilor lipsă ca { luna: number (1-12), an: number }[]
 *
 * Convenții:
 * - luna este 1-indexed (1=ianuarie, identic cu câmpul plati.luna din DB)
 * - Plăți cu tip != 'Abonament' sunt ignorate
 * - Plăți cu luna sau an null/undefined sunt ignorate
 * - Interval: [startOfMonth(dataStart), startOfMonth(azi)] — inclusiv ambele capete
 */
export function calculeazaLuniLipsa(
    dataStart: string | null | undefined,
    platiSportiv: Plata[]
): { luna: number; an: number }[] {
    if (!dataStart) return [];

    const dataStartDate = startOfMonth(parseISO(dataStart));
    const azi = new Date();

    // Dacă dataStart e în viitor față de azi, intervalul e invers → eachMonthOfInterval aruncă eroare
    if (dataStartDate > azi) return [];

    const toateLunile = eachMonthOfInterval({ start: dataStartDate, end: azi });

    // Construim setul lunilor acoperite de facturi Abonament (1-indexed, identic cu DB)
    const luniCuFactura = new Set<string>(
        (platiSportiv || [])
            .filter(p => p.tip === 'Abonament' && p.luna != null && p.an != null)
            .map(p => `${p.an}-${p.luna}`)
    );

    return toateLunile
        .filter(lunaDate => {
            const key = `${lunaDate.getFullYear()}-${lunaDate.getMonth() + 1}`;
            return !luniCuFactura.has(key);
        })
        .map(lunaDate => ({
            luna: lunaDate.getMonth() + 1, // 1-indexed
            an: lunaDate.getFullYear(),
        }));
}

/**
 * Formatează luna și anul în limba română.
 *
 * @param luna - număr 1-indexed (1=ianuarie)
 * @param an - numărul anului
 * @returns string localizat, ex: "iunie 2026"
 *
 * Folosește toLocaleString cu ro-RO — același pattern ca în PlatiScadente.tsx line 142.
 */
export function formatLuna(luna: number, an: number): string {
    return new Date(an, luna - 1, 1).toLocaleString('ro-RO', {
        month: 'long',
        year: 'numeric',
    });
}
