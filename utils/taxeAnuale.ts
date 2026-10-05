/**
 * Faza 33 — logica pura pentru taxele anuale federale FRQKD + FRAM.
 *
 * Functii pure, fara React, fara Supabase, fara Date.now() — deterministe pentru teste.
 * O singura implementare a regulilor (stare, virat-neachitat, eligibilitate plata federatie,
 * mesaje WhatsApp) folosita de toate ecranele: club, federatie, profil sportiv, competitii.
 *
 * Rulare teste: `npx tsx utils/taxeAnuale.test.ts`
 */

import type {
    Plata,
    Sportiv,
    Familie,
    VizaSportiv,
    DecontSportiv,
    TaxaAnualaFederatieConfig,
    TipTaxaFederala,
    StareTaxa,
    SituatieTaxaSportiv,
    NotificareTaxaAnuala,
    ViratNeachitat,
} from '../types';
import { formatPerioadaTaxa } from './anFiscal';
import { formatNume } from './formatareSportiv';
import { normalizeazaTelefonWa, formateazaSumaLei } from './notificariRestantieri';

export const ETICHETE_STARE_TAXA: Record<StareTaxa, { label: string; variant: 'green' | 'red' | 'amber' | 'blue' | 'slate' }> = {
    negenerata: { label: 'Negenerată', variant: 'slate' },
    in_asteptare: { label: 'În așteptare', variant: 'slate' },
    scutit: { label: 'Scutit', variant: 'blue' },
    neachitat: { label: 'Neachitat', variant: 'red' },
    achitat_partial: { label: 'Achitat parțial', variant: 'amber' },
    achitat: { label: 'Achitat', variant: 'green' },
    anulat: { label: 'Anulat', variant: 'slate' },
    alt_club: { label: 'La alt club', variant: 'slate' },
};

// ─── Stare ──────────────────────────────────────────────────────────────────

/**
 * Starea taxei unui sportiv pe (tip, perioada) pornind de la viza si factura asociata.
 * Daca factura lipseste din lista `plati` (ex. rbv_plati_club nu o expune), se foloseste
 * statusul atasat pe viza (embed plata din SELECT_VIZE_CU_PLATA).
 */
export function stareTaxa(
    viza: VizaSportiv | null | undefined,
    plata: Plata | null | undefined,
    clubId?: string | null
): StareTaxa {
    if (!viza) return 'negenerata';
    if (clubId && viza.club_id && viza.club_id !== clubId) return 'alt_club';
    if (viza.scutit) return 'scutit';
    if (!viza.plata_id) return 'in_asteptare';

    const status = plata?.status ?? viza.plata?.status ?? null;
    switch (status) {
        case 'Achitat': return 'achitat';
        case 'Achitat Parțial': return 'achitat_partial';
        case 'Anulat': return 'anulat';
        default: return 'neachitat';
    }
}

function cheieViza(sportivId: string, tip: TipTaxaFederala, an: number): string {
    return `${sportivId}|${tip}|${an}`;
}

function sumaFactura(plata: Plata | null | undefined, viza: VizaSportiv | null | undefined): number | null {
    if (plata && plata.suma != null) return Number(plata.suma);
    if (viza?.plata && viza.plata.suma != null) return Number(viza.plata.suma);
    return null;
}

const rotunjeste2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Situatia taxei pentru fiecare sportiv relevant al clubului pe (tip, an):
 * sportivii activi ai clubului + sportivii (chiar inactivi / din alt club) care au viza
 * pe acest club si aceasta perioada. Sortat dupa nume.
 */
export function construiesteSituatieTaxe(p: {
    sportivi: Sportiv[];
    vize: VizaSportiv[];
    plati: Plata[];
    decontSportivi: DecontSportiv[];
    tip: TipTaxaFederala;
    an: number;
    clubId: string | null;
}): SituatieTaxaSportiv[] {
    const { sportivi, vize, plati, decontSportivi, tip, an, clubId } = p;

    const platiById = new Map<string, Plata>((plati || []).map(x => [x.id, x]));
    const sportivById = new Map<string, Sportiv>((sportivi || []).map(s => [s.id, s]));

    const vizaPeSportiv = new Map<string, VizaSportiv>();
    for (const v of vize || []) {
        if (v.tip !== tip || v.an !== an) continue;
        const k = v.sportiv_id;
        const existenta = vizaPeSportiv.get(k);
        // Prefera viza clubului curent daca sportivul are mai multe (cazuri de transfer)
        if (!existenta || (clubId && v.club_id === clubId && existenta.club_id !== clubId)) {
            vizaPeSportiv.set(k, v);
        }
    }

    const viratPeSportiv = new Map<string, DecontSportiv>();
    for (const d of decontSportivi || []) {
        if (d.tip === tip && d.an === an) viratPeSportiv.set(d.sportiv_id, d);
    }

    const ids = new Set<string>();
    for (const s of sportivi || []) {
        if (s.status === 'Activ' && (!clubId || s.club_id === clubId)) ids.add(s.id);
    }
    for (const [sportivId, v] of vizaPeSportiv) {
        if (!clubId || v.club_id === clubId) ids.add(sportivId);
    }

    const rezultat: SituatieTaxaSportiv[] = [];
    for (const sportivId of ids) {
        const viza = vizaPeSportiv.get(sportivId) ?? null;
        const plata = viza?.plata_id ? (platiById.get(viza.plata_id) ?? null) : null;
        const decont = viratPeSportiv.get(sportivId);
        rezultat.push({
            sportivId,
            sportiv: sportivById.get(sportivId) ?? null,
            viza,
            plata,
            stare: stareTaxa(viza, plata, clubId),
            suma: sumaFactura(plata, viza),
            virat: !!decont,
            decontId: decont?.decont_id ?? null,
        });
    }

    return rezultat.sort((a, b) => {
        if (!a.sportiv && !b.sportiv) return 0;
        if (!a.sportiv) return 1;
        if (!b.sportiv) return -1;
        return formatNume(a.sportiv).localeCompare(formatNume(b.sportiv), 'ro');
    });
}

/**
 * Sportivii virati federatiei dar neachitati (integral) catre club, pe toate perioadele si ambele taxe.
 * Baza bannerului de restantieri: clubul a platit deja federatia, dar sportivul inca datoreaza clubului.
 */
export function gasesteViratiNeachitati(p: {
    sportivi: Sportiv[];
    vize: VizaSportiv[];
    plati: Plata[];
    decontSportivi: DecontSportiv[];
    clubId: string;
}): ViratNeachitat[] {
    const { sportivi, vize, plati, decontSportivi, clubId } = p;
    const platiById = new Map<string, Plata>((plati || []).map(x => [x.id, x]));
    const sportivById = new Map<string, Sportiv>((sportivi || []).map(s => [s.id, s]));
    const vizaPeCheie = new Map<string, VizaSportiv>();
    for (const v of vize || []) {
        if (v.club_id !== clubId) continue;
        vizaPeCheie.set(cheieViza(v.sportiv_id, v.tip, v.an), v);
    }

    const rezultat: ViratNeachitat[] = [];
    for (const d of decontSportivi || []) {
        const viza = vizaPeCheie.get(cheieViza(d.sportiv_id, d.tip, d.an));
        if (!viza) continue;
        const plataId = d.plata_id ?? viza.plata_id;
        if (!plataId) continue;
        const plata = platiById.get(plataId) ?? null;
        const status = plata?.status ?? viza.plata?.status ?? null;
        if (status !== 'Neachitat' && status !== 'Achitat Parțial') continue;
        const sportiv = sportivById.get(d.sportiv_id);
        rezultat.push({
            sportivId: d.sportiv_id,
            numeSportiv: sportiv ? formatNume(sportiv) : '—',
            tip: d.tip,
            an: d.an,
            suma: sumaFactura(plata, viza) ?? (d.suma != null ? Number(d.suma) : 0),
            statusFactura: status,
            plataId,
        });
    }

    return rezultat.sort(
        (a, b) => a.numeSportiv.localeCompare(b.numeSportiv, 'ro') || a.tip.localeCompare(b.tip) || a.an - b.an
    );
}

// ─── Plata catre federatie ──────────────────────────────────────────────────

/** Sportivii care pot fi inclusi intr-o plata catre federatie: facturati (neachitat/partial/achitat) si nevirati. */
export function eligibiliPlataFederatie(situatie: SituatieTaxaSportiv[]): SituatieTaxaSportiv[] {
    return (situatie || []).filter(
        s => !s.virat && (s.stare === 'neachitat' || s.stare === 'achitat_partial' || s.stare === 'achitat')
    );
}

/** Suma facturilor pentru sportivii selectati care sunt eligibili (rotunjita la 2 zecimale). */
export function sumaPlataFederatie(situatie: SituatieTaxaSportiv[], selectate: Iterable<string>): number {
    const set = new Set(selectate);
    const total = eligibiliPlataFederatie(situatie)
        .filter(s => set.has(s.sportivId))
        .reduce((acc, s) => acc + (s.suma ?? 0), 0);
    return rotunjeste2(total);
}

/** Restantierii taxei: facturati dar neachitati integral catre club. */
export function restantieriTaxe(situatie: SituatieTaxaSportiv[]): SituatieTaxaSportiv[] {
    return (situatie || []).filter(s => s.stare === 'neachitat' || s.stare === 'achitat_partial');
}

// ─── Mesaje WhatsApp ────────────────────────────────────────────────────────

function uneste(nume: string[]): string {
    if (nume.length === 0) return '';
    if (nume.length === 1) return nume[0];
    if (nume.length === 2) return `${nume[0]} și ${nume[1]}`;
    return `${nume.slice(0, -1).join(', ')} și ${nume[nume.length - 1]}`;
}

/** Mesaj pentru taxa anuala — info directa, fara link de actiune. */
export function construiesteMesajTaxa(p: {
    numeSportivi: string[];
    tip: TipTaxaFederala;
    an: number;
    suma: number;
    mod: 'generare' | 'restanta';
}): string {
    const { numeSportivi, tip, an, suma, mod } = p;
    const nume = uneste(numeSportivi);
    const perioada = formatPerioadaTaxa(tip, an);
    const sumaTxt = formateazaSumaLei(suma);
    if (mod === 'generare') {
        const eticheta = tip === 'FRAM' ? 'anul' : 'sezonul';
        return `Bună ziua! A fost generată taxa anuală ${tip} pentru ${eticheta} ${perioada} pentru ${nume}: ${sumaTxt} lei. Plata se face la club. Mulțumim!`;
    }
    const verb = numeSportivi.length > 1 ? 'au' : 'are';
    return `Bună ziua! ${nume} ${verb} de achitat taxa anuală ${tip} ${perioada}: ${sumaTxt} lei. Mulțumim!`;
}

/**
 * Notificari grupate pe telefon normalizat. Telefonul se rezolva: sportiv, apoi reprezentantul
 * familiei, apoi alt membru al familiei. Intrarile fara telefon raman separate.
 */
export function genereazaNotificariTaxe(p: {
    intrari: { sportivId: string; plataId: string | null; suma: number; achitatPartial?: boolean }[];
    sportivi: Sportiv[];
    familii: Familie[];
    tip: TipTaxaFederala;
    an: number;
    mod: 'generare' | 'restanta';
}): NotificareTaxaAnuala[] {
    const { intrari, sportivi, familii, tip, an, mod } = p;

    const sportivById = new Map<string, Sportiv>((sportivi || []).map(s => [s.id, s]));
    const familiiById = new Map<string, Familie>((familii || []).map(f => [f.id, f]));
    const membriByFamilie = new Map<string, Sportiv[]>();
    for (const s of sportivi || []) {
        if (!s.familie_id) continue;
        const arr = membriByFamilie.get(s.familie_id) || [];
        arr.push(s);
        membriByFamilie.set(s.familie_id, arr);
    }

    type Grup = {
        cheie: string;
        telefonAfisat: string | null;
        telefonWa: string | null;
        sursaTelefon: NotificareTaxaAnuala['sursaTelefon'];
        numeSportivi: string[];
        sportivIds: string[];
        plataIds: string[];
        suma: number;
        areAchitariPartiale: boolean;
    };
    const grupuri = new Map<string, Grup>();

    for (const intr of intrari || []) {
        const sportiv = sportivById.get(intr.sportivId);

        let telefonWa: string | null = null;
        let telefonAfisat: string | null = null;
        let sursaTelefon: NotificareTaxaAnuala['sursaTelefon'] = null;

        const telPropriu = normalizeazaTelefonWa(sportiv?.telefon);
        if (sportiv && telPropriu) {
            telefonWa = telPropriu;
            telefonAfisat = sportiv.telefon ?? null;
            sursaTelefon = 'sportiv';
        } else if (sportiv?.familie_id) {
            const familie = familiiById.get(sportiv.familie_id);
            const reprezentant = familie?.reprezentant_id ? sportivById.get(familie.reprezentant_id) : undefined;
            const telRep = reprezentant ? normalizeazaTelefonWa(reprezentant.telefon) : null;
            if (reprezentant && telRep) {
                telefonWa = telRep;
                telefonAfisat = reprezentant.telefon ?? null;
                sursaTelefon = 'reprezentant_familie';
            } else {
                const membru = (membriByFamilie.get(sportiv.familie_id) || []).find(
                    m => m.id !== sportiv.id && normalizeazaTelefonWa(m.telefon)
                );
                if (membru) {
                    telefonWa = normalizeazaTelefonWa(membru.telefon);
                    telefonAfisat = membru.telefon ?? null;
                    sursaTelefon = 'membru_familie';
                }
            }
        }

        const nume = sportiv ? formatNume(sportiv) : '—';
        const cheie = telefonWa ?? `fara-telefon:${intr.sportivId}`;
        const existent = grupuri.get(cheie);
        if (existent) {
            if (!existent.numeSportivi.includes(nume)) existent.numeSportivi.push(nume);
            existent.sportivIds.push(intr.sportivId);
            if (intr.plataId) existent.plataIds.push(intr.plataId);
            existent.suma += intr.suma;
            existent.areAchitariPartiale = existent.areAchitariPartiale || !!intr.achitatPartial;
        } else {
            grupuri.set(cheie, {
                cheie,
                telefonAfisat,
                telefonWa,
                sursaTelefon,
                numeSportivi: [nume],
                sportivIds: [intr.sportivId],
                plataIds: intr.plataId ? [intr.plataId] : [],
                suma: intr.suma,
                areAchitariPartiale: !!intr.achitatPartial,
            });
        }
    }

    const notificari: NotificareTaxaAnuala[] = Array.from(grupuri.values()).map(g => {
        const suma = rotunjeste2(g.suma);
        return {
            ...g,
            suma,
            tip,
            an,
            mesaj: construiesteMesajTaxa({ numeSportivi: g.numeSportivi, tip, an, suma, mod }),
        };
    });

    const dupaNume = (a: NotificareTaxaAnuala, b: NotificareTaxaAnuala) =>
        (a.numeSportivi[0] ?? '').localeCompare(b.numeSportivi[0] ?? '', 'ro');
    const cuTel = notificari.filter(n => n.telefonWa).sort(dupaNume);
    const faraTel = notificari.filter(n => !n.telefonWa).sort(dupaNume);
    return [...cuTel, ...faraTel];
}

// ─── Utilitare simple ───────────────────────────────────────────────────────

/** Adevarat daca taxa (tip, an) a sportivului e rezolvata: scutita sau factura Achitat. */
export function areTaxaAchitata(vize: VizaSportiv[], sportivId: string, tip: TipTaxaFederala, an: number): boolean {
    return (vize || []).some(
        v => v.sportiv_id === sportivId && v.tip === tip && v.an === an && (v.scutit || v.plata?.status === 'Achitat')
    );
}

/** Pretul configurat pentru (tip, perioada) sau null daca nu e setat. */
export function pretTaxa(config: TaxaAnualaFederatieConfig[], tip: TipTaxaFederala, an: number): number | null {
    const c = (config || []).find(x => x.tip === tip && x.an_fiscal === an);
    return c ? Number(c.suma) : null;
}

/** Numarul vizelor (tip, an) nefacturate (plata_id null) si nescutite. */
export function numarTaxeInAsteptare(vize: VizaSportiv[], tip: TipTaxaFederala, an: number): number {
    return (vize || []).filter(v => v.tip === tip && v.an === an && !v.plata_id && !v.scutit).length;
}
