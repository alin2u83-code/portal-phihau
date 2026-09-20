import { subMonths } from 'date-fns';
import type { Plata, PoliticaReducere } from '../types';

/**
 * Faza 30 Feature 3: calcul pur al loialitatii automate — numarare de luni
 * consecutive achitate + calcul bonus plafonat.
 *
 * Fara efecte secundare, fara apeluri Supabase — functii pure.
 */

const MAX_LUNI_ITERATE = 60; // 5 ani — limita de siguranta impotriva datelor corupte

/**
 * Numara cate luni consecutive, incepand cu luna PRECEDENTA lui `azi`, au o
 * factura tip='Abonament' cu status='Achitat'.
 *
 * Reguli:
 * - Luna curenta (a lui `azi`) NU conteaza — e cea care tocmai se factureaza.
 * - Se numara doar 'Achitat' — 'Achitat Parțial', 'Neachitat' si 'Anulat' NU
 *   conteaza ca reinnoire (o plata partiala sau anulata nu dovedeste loialitate).
 *   O plata stinsa automat din credit conteaza, pentru ca ajunge tot cu
 *   status='Achitat'.
 * - Se opreste la prima luna lipsa (neacoperita de o factura Achitat).
 *
 * @param platiEntitate - toate platile sportivului/familiei (orice tip/status)
 * @param azi - data curenta
 * @returns numarul de luni consecutive achitate, 0 daca lista e goala sau
 *   luna precedenta nu e achitata
 */
export function numaraReinnoiriConsecutive(platiEntitate: Plata[], azi: Date): number {
    const luniAchitate = new Set<string>(
        (platiEntitate || [])
            .filter(p => p.tip === 'Abonament' && p.status === 'Achitat' && p.luna != null && p.an != null)
            .map(p => `${p.an}-${p.luna}`)
    );

    if (luniAchitate.size === 0) return 0;

    let numar = 0;
    let cursor = subMonths(azi, 1); // luna precedenta lui azi

    for (let i = 0; i < MAX_LUNI_ITERATE; i++) {
        const cheie = `${cursor.getFullYear()}-${cursor.getMonth() + 1}`;
        if (!luniAchitate.has(cheie)) break;
        numar++;
        cursor = subMonths(cursor, 1);
    }

    return numar;
}

/**
 * Alege politica de loialitate cea mai avantajoasa pentru numarul de
 * reinnoiri consecutive dat, si calculeaza suma bonusului, plafonata la
 * pretul de lista.
 *
 * - Filtreaza politicile active (`activ === true`) cu `reinnoiri_necesare`
 *   setat si atins (`reinnoiriConsecutive >= reinnoiri_necesare`).
 * - Daca ramane mai mult de o politica eligibila, castiga cea cu cel mai
 *   mare `reinnoiri_necesare` (pragul cel mai greu atins); la egalitate,
 *   prima din lista.
 * - `tip_bonus === 'zile_gratis'` → bonusul e egal cu pretul de lista
 *   (luna urmatoare gratuita).
 * - `tip_bonus === 'discount'` (sau null) → procentaj din pret, sau
 *   valoare_fixa daca procentaj lipseste.
 * - Rezultatul e plafonat in intervalul [0, pretLista] si rotunjit la 2 zecimale.
 *
 * NU apeleaza Supabase — functie pura, testabila fara DB.
 */
export function calculeazaBonusLoialitate(
    politici: PoliticaReducere[],
    reinnoiriConsecutive: number,
    pretLista: number
): { sumaBonus: number; politica: PoliticaReducere | null; detalii: string | null } {
    const eligibile = (politici || []).filter(
        p => p.activ && p.reinnoiri_necesare != null && reinnoiriConsecutive >= p.reinnoiri_necesare
    );

    if (eligibile.length === 0) {
        return { sumaBonus: 0, politica: null, detalii: null };
    }

    const politica = eligibile.reduce((cea_mai_buna, curenta) =>
        (curenta.reinnoiri_necesare ?? 0) > (cea_mai_buna.reinnoiri_necesare ?? 0) ? curenta : cea_mai_buna
    );

    let sumaBonus: number;
    if (politica.tip_bonus === 'zile_gratis') {
        sumaBonus = pretLista;
    } else {
        sumaBonus = politica.procentaj != null
            ? (pretLista * politica.procentaj) / 100
            : (politica.valoare_fixa ?? 0);
    }

    sumaBonus = Math.min(Math.max(sumaBonus, 0), pretLista);
    sumaBonus = Math.round(sumaBonus * 100) / 100;

    const detalii = `Loialitate: ${politica.nume_reducere} (${reinnoiriConsecutive} luni consecutive)`;

    return { sumaBonus, politica, detalii };
}
