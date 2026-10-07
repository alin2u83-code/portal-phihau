import type { Plata, Tranzactie } from '../types';
import { esteAnulata } from '../utils/paymentStatus';

/**
 * Sursa unică de adevăr pentru SOLD (plăți & încasări).
 *
 * Formula: sold = Σ tranzacții (bani încasați) − Σ facturi NEANULATE (bani datorați).
 *  - sold > 0  → credit (sportivul/familia a plătit în plus)
 *  - sold < 0  → datorie
 *
 * Atribuire: o tranzacție/factură cu `familie_id` aparține familiei, altfel sportivului.
 * NU se folosesc view-urile DB (view_plata_sportiv / view_istoric_plati_detaliat):
 * fallback-ul lor pe `plata_ids` numără suma întreagă a tranzacției pentru fiecare
 * factură din tablou și supraestimează încasările.
 */

export interface SolduriCalculate {
    perSportiv: Map<string, number>;
    perFamilie: Map<string, number>;
}

interface Seed {
    sportivIds?: string[];
    familieIds?: string[];
}

export function calculeazaSolduri(
    plati: Pick<Plata, 'sportiv_id' | 'familie_id' | 'suma' | 'status'>[] | null | undefined,
    tranzactii: Pick<Tranzactie, 'sportiv_id' | 'familie_id' | 'suma'>[] | null | undefined,
    seed: Seed = {}
): SolduriCalculate {
    const perSportiv = new Map<string, number>();
    const perFamilie = new Map<string, number>();

    (seed.sportivIds || []).forEach(id => perSportiv.set(id, 0));
    (seed.familieIds || []).forEach(id => perFamilie.set(id, 0));

    const adauga = (familieId: string | null | undefined, sportivId: string | null | undefined, suma: number) => {
        if (familieId) perFamilie.set(familieId, (perFamilie.get(familieId) || 0) + suma);
        else if (sportivId) perSportiv.set(sportivId, (perSportiv.get(sportivId) || 0) + suma);
    };

    (tranzactii || []).forEach(t => adauga(t.familie_id, t.sportiv_id, Number(t.suma) || 0));
    (plati || []).forEach(p => {
        // O factură anulată nu mai reprezintă o datorie.
        if (esteAnulata(p)) return;
        adauga(p.familie_id, p.sportiv_id, -(Number(p.suma) || 0));
    });

    return { perSportiv, perFamilie };
}

/**
 * Soldul unui sportiv individual sau al unei familii întregi.
 *  - `familieId` + `sportivIds` (membrii): soldul familiei + soldurile individuale ale membrilor
 *    (itemi fără `familie_id`) — exact ce vede un părinte în portofel.
 *  - doar `sportivIds`: soldul individual al sportivilor dați.
 */
export function calculeazaSold(
    plati: Pick<Plata, 'sportiv_id' | 'familie_id' | 'suma' | 'status'>[] | null | undefined,
    tranzactii: Pick<Tranzactie, 'sportiv_id' | 'familie_id' | 'suma'>[] | null | undefined,
    tinta: { sportivIds?: string[]; familieId?: string | null }
): number {
    const { perSportiv, perFamilie } = calculeazaSolduri(plati, tranzactii);
    let total = 0;
    (tinta.sportivIds || []).forEach(id => { total += perSportiv.get(id) || 0; });
    if (tinta.familieId) total += perFamilie.get(tinta.familieId) || 0;
    return total;
}

// ─── Sumar încasări (bani reali, din tabela tranzactii) ──────────────────────

export type MetodaPlata = Tranzactie['metoda_plata'];

export interface FiltreIncasari {
    dela?: string;   // YYYY-MM-DD inclusiv
    panaLa?: string; // YYYY-MM-DD inclusiv
    metoda?: MetodaPlata | '';
    clubId?: string;
}

export interface SumarIncasari {
    total: number;
    nrTranzactii: number;
    perMetoda: Record<string, number>;
    perLuna: { luna: string; total: number; nr: number }[]; // luna = YYYY-MM, crescător
    tranzactii: Tranzactie[]; // filtrate, cele mai noi primele
}

export function filtreazaTranzactii(tranzactii: Tranzactie[] | null | undefined, f: FiltreIncasari): Tranzactie[] {
    return (tranzactii || []).filter(t => {
        const data = (t.data_platii || '').slice(0, 10);
        if (f.dela && data < f.dela) return false;
        if (f.panaLa && data > f.panaLa) return false;
        if (f.metoda && t.metoda_plata !== f.metoda) return false;
        if (f.clubId && t.club_id !== f.clubId) return false;
        return true;
    });
}

export function calculeazaSumarIncasari(tranzactii: Tranzactie[] | null | undefined, f: FiltreIncasari = {}): SumarIncasari {
    const filtrate = filtreazaTranzactii(tranzactii, f)
        .slice()
        .sort((a, b) => (b.data_platii || '').localeCompare(a.data_platii || ''));

    const perMetoda: Record<string, number> = {};
    const luni = new Map<string, { total: number; nr: number }>();
    let total = 0;

    filtrate.forEach(t => {
        const suma = Number(t.suma) || 0;
        total += suma;
        perMetoda[t.metoda_plata] = (perMetoda[t.metoda_plata] || 0) + suma;
        const luna = (t.data_platii || '').slice(0, 7);
        const cur = luni.get(luna) || { total: 0, nr: 0 };
        cur.total += suma;
        cur.nr += 1;
        luni.set(luna, cur);
    });

    const perLuna = Array.from(luni.entries())
        .map(([luna, v]) => ({ luna, ...v }))
        .sort((a, b) => a.luna.localeCompare(b.luna));

    return { total, nrTranzactii: filtrate.length, perMetoda, perLuna, tranzactii: filtrate };
}
