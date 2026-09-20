import { endOfMonth, differenceInCalendarDays } from 'date-fns';

/**
 * Faza 30 Feature 1: decizie pura de continuitate a facturarii la reinnoire
 * abonament, dupa o pauza a sportivului.
 *
 * Aceste functii NU scriu nimic in DB — decid DOAR daca
 * `sportivi.data_start_facturare` se pastreaza sau se reseteaza. Scrierea
 * efectiva se face in planul 30-05, in `handleGenerateSubscriptions`
 * (components/Plati/PlatiScadente.tsx).
 *
 * Fara efecte secundare, fara apeluri Supabase — functii pure.
 */

/**
 * 'pastreaza' — data_start_facturare ramane neschimbata (sportivul datoreaza
 *   in continuare lunile lipsa de la data veche);
 * 'reseteaza' — data_start_facturare devine prima zi a lunii curente
 *   (lunile vechi sunt iertate).
 */
export type DecizieGratie = 'pastreaza' | 'reseteaza';

/**
 * Decide daca facturarea continua de la ultima luna platita sau reporneste
 * din luna curenta, pe baza pragului de gratie configurat per club.
 *
 * @param ultimaLunaFacturata - ultima luna cu factura tip Abonament achitata
 *   ({luna: 1-12, an}), sau null daca sportivul nu are niciun istoric de
 *   facturare (caz in care nu atingem nimic — 'pastreaza')
 * @param azi - data curenta
 * @param pragZile - pragul de gratie configurat pe club (cluburi.perioada_gratie_zile);
 *   valorile negative sau NaN sunt tratate ca 30 (valoarea implicita a coloanei)
 * @returns 'pastreaza' daca gap-ul de zile de la sfarsitul lunii acoperite pana azi
 *   e <= prag, altfel 'reseteaza'
 */
export function decideGratieReinnoire(
    ultimaLunaFacturata: { luna: number; an: number } | null,
    azi: Date,
    pragZile: number
): DecizieGratie {
    if (ultimaLunaFacturata === null) return 'pastreaza';

    const pragEfectiv = Number.isFinite(pragZile) && pragZile >= 0 ? pragZile : 30;

    const sfarsitAcoperirii = endOfMonth(
        new Date(ultimaLunaFacturata.an, ultimaLunaFacturata.luna - 1, 1)
    );
    const gapZile = differenceInCalendarDays(azi, sfarsitAcoperirii);

    return gapZile <= pragEfectiv ? 'pastreaza' : 'reseteaza';
}

/**
 * Prima zi a lunii lui `azi`, in format ISO 'YYYY-MM-DD'.
 *
 * Construita din componente locale (getFullYear/getMonth), NU prin
 * toISOString() — toISOString() converteste in UTC si poate muta data cu
 * o zi pentru fusul Romaniei.
 */
export function primaZiLunaCurenta(azi: Date): string {
    const an = azi.getFullYear();
    const luna = azi.getMonth() + 1; // 1-indexed
    return `${an}-${String(luna).padStart(2, '0')}-01`;
}
