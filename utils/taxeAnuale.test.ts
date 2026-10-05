/**
 * Test colocat pentru utils/taxeAnuale.ts + getPerioadaTaxa/formatPerioadaTaxa din utils/anFiscal.ts
 *
 * Proiectul nu are vitest/jest configurat (doar Playwright E2E).
 * Rulare: `npx tsx utils/taxeAnuale.test.ts`
 * Pattern identic cu utils/notificariRestantieri.test.ts.
 */

import type { Plata, Sportiv, Familie, VizaSportiv, DecontSportiv, TaxaAnualaFederatieConfig } from '../types';
import { getPerioadaTaxa, formatPerioadaTaxa } from './anFiscal';
import {
    stareTaxa,
    construiesteSituatieTaxe,
    gasesteViratiNeachitati,
    eligibiliPlataFederatie,
    sumaPlataFederatie,
    restantieriTaxe,
    construiesteMesajTaxa,
    genereazaNotificariTaxe,
    areTaxaAchitata,
    pretTaxa,
    numarTaxeInAsteptare,
    ETICHETE_STARE_TAXA,
} from './taxeAnuale';

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`FAIL: ${message}`);
    }
    console.log(`PASS: ${message}`);
}

// ─── Fixturi ────────────────────────────────────────────────────────────────

const CLUB = 'club-1';
const ALT_CLUB = 'club-2';

const sp = (id: string, nume: string, extra: Partial<Sportiv> = {}): Sportiv =>
    ({ id, nume, prenume: 'X', status: 'Activ', club_id: CLUB, familie_id: null, telefon: null, ...extra } as unknown as Sportiv);

const pl = (id: string, status: Plata['status'], suma = 170, extra: Partial<Plata> = {}): Plata =>
    ({ id, status, suma, sportiv_id: null, familie_id: null, data: '2026-09-01', descriere: '', tip: 'Taxa Anuala', observatii: '', ...extra } as unknown as Plata);

const vz = (
    sportiv_id: string,
    extra: Partial<VizaSportiv> = {}
): VizaSportiv =>
    ({
        id: `v-${sportiv_id}-${extra.tip ?? 'FRQKD'}-${extra.an ?? 2026}`,
        sportiv_id,
        an: 2026,
        tip: 'FRQKD',
        club_id: CLUB,
        plata_id: null,
        scutit: false,
        data_platii: '2026-09-01',
        status_viza: 'Activ',
        ...extra,
    } as VizaSportiv);

const ds = (sportiv_id: string, extra: Partial<DecontSportiv> = {}): DecontSportiv =>
    ({ id: `d-${sportiv_id}`, decont_id: 'dec-1', sportiv_id, an: 2026, tip: 'FRQKD', plata_id: null, suma: null, ...extra } as DecontSportiv);

export function runTests(): { passed: number; failed: number; errors: string[] } {
    const errors: string[] = [];
    let passed = 0;
    let failed = 0;

    const run = (name: string, fn: () => void) => {
        try {
            fn();
            passed++;
        } catch (e: any) {
            failed++;
            errors.push(`${name}: ${e.message}`);
            console.error(`FAIL: ${name} — ${e.message}`);
        }
    };

    // ─── Perioada taxei ─────────────────────────────────────────────────────
    run('getPerioadaTaxa / formatPerioadaTaxa', () => {
        assert(getPerioadaTaxa('FRQKD', new Date(2026, 8, 1)) === 2026, 'FRQKD 1 sep 2026 = 2026');
        assert(getPerioadaTaxa('FRQKD', new Date(2026, 7, 31)) === 2025, 'FRQKD 31 aug 2026 = 2025');
        assert(getPerioadaTaxa('FRAM', new Date(2026, 7, 31)) === 2026, 'FRAM 31 aug 2026 = 2026');
        assert(formatPerioadaTaxa('FRQKD', 2026) === '2026-2027', 'format FRQKD = 2026-2027');
        assert(formatPerioadaTaxa('FRAM', 2026) === '2026', 'format FRAM = 2026');
    });

    // ─── stareTaxa ──────────────────────────────────────────────────────────
    run('stareTaxa: toate starile', () => {
        assert(stareTaxa(null, null) === 'negenerata', 'fara viza = negenerata');
        assert(stareTaxa(vz('a', { scutit: true }), null, CLUB) === 'scutit', 'scutit');
        assert(stareTaxa(vz('a'), null, CLUB) === 'in_asteptare', 'fara plata_id = in_asteptare');
        assert(stareTaxa(vz('a', { plata_id: 'p1' }), pl('p1', 'Neachitat'), CLUB) === 'neachitat', 'Neachitat');
        assert(stareTaxa(vz('a', { plata_id: 'p1' }), pl('p1', 'Achitat Parțial'), CLUB) === 'achitat_partial', 'Achitat Partial');
        assert(stareTaxa(vz('a', { plata_id: 'p1' }), pl('p1', 'Achitat'), CLUB) === 'achitat', 'Achitat');
        assert(stareTaxa(vz('a', { plata_id: 'p1' }), pl('p1', 'Anulat'), CLUB) === 'anulat', 'Anulat');
        assert(
            stareTaxa(vz('a', { plata_id: 'p1', plata: { status: 'Achitat', suma: 170 } }), null, CLUB) === 'achitat',
            'factura absenta dar viza.plata Achitat = achitat'
        );
        assert(stareTaxa(vz('a', { club_id: ALT_CLUB }), null, CLUB) === 'alt_club', 'alt club');
        assert(stareTaxa(vz('a', { club_id: ALT_CLUB, scutit: true }), null, CLUB) === 'alt_club', 'alt club are prioritate fata de scutit');
    });

    // ─── construiesteSituatieTaxe ───────────────────────────────────────────
    const sportivi = [
        sp('zeta', 'Zeta'),
        sp('alfa', 'Alfa'),
        sp('inactiv-cu-viza', 'Beta', { status: 'Inactiv' }),
        sp('inactiv-fara-viza', 'Gama', { status: 'Inactiv' }),
        sp('alt', 'Delta', { club_id: ALT_CLUB }),
        sp('alt-cu-viza-aici', 'Epsilon', { club_id: ALT_CLUB }),
    ];

    run('construiesteSituatieTaxe: includere, excludere, virat, sortare', () => {
        const vize = [
            vz('alfa', { plata_id: 'p-alfa' }),
            vz('inactiv-cu-viza', { plata_id: 'p-beta' }),
            vz('alt-cu-viza-aici', {}),
            vz('zeta', { tip: 'FRAM' }), // alt tip -> nu conteaza pentru FRQKD
            vz('alfa', { an: 2025, plata_id: 'p-vechi' }), // alta perioada
        ];
        const plati = [pl('p-alfa', 'Neachitat'), pl('p-beta', 'Achitat')];
        const decont = [ds('alfa')];
        const r = construiesteSituatieTaxe({ sportivi, vize, plati, decontSportivi: decont, tip: 'FRQKD', an: 2026, clubId: CLUB });
        const ids = r.map(x => x.sportivId);
        assert(ids.includes('alfa') && ids.includes('zeta'), 'include sportivii activi ai clubului');
        assert(ids.includes('inactiv-cu-viza'), 'include inactiv cu viza pe club/perioada');
        assert(ids.includes('alt-cu-viza-aici'), 'include sportiv din alt club cu viza pe acest club');
        assert(!ids.includes('inactiv-fara-viza'), 'exclude inactiv fara viza');
        assert(!ids.includes('alt'), 'exclude sportiv alt club fara viza');
        assert(ids.join(',') === 'alfa,inactiv-cu-viza,alt-cu-viza-aici,zeta', 'sortat dupa nume (Alfa, Beta, Epsilon, Zeta)');
        const alfa = r.find(x => x.sportivId === 'alfa')!;
        assert(alfa.stare === 'neachitat' && alfa.virat === true && alfa.decontId === 'dec-1' && alfa.suma === 170, 'alfa neachitat, virat, suma 170');
        const zeta = r.find(x => x.sportivId === 'zeta')!;
        assert(zeta.stare === 'negenerata' && zeta.virat === false && zeta.viza === null, 'zeta negenerata (viza FRAM nu conteaza)');
        assert(r.find(x => x.sportivId === 'inactiv-cu-viza')!.stare === 'achitat', 'beta achitat');
    });

    // ─── gasesteViratiNeachitati ────────────────────────────────────────────
    run('gasesteViratiNeachitati', () => {
        const vize = [
            vz('alfa', { plata_id: 'p1' }),                       // Neachitat, virat -> DA
            vz('zeta', { plata_id: 'p2' }),                       // Achitat Partial, virat -> DA
            vz('inactiv-cu-viza', { plata_id: 'p3' }),            // Achitat -> NU
            vz('alt-cu-viza-aici', { plata_id: 'p4', club_id: ALT_CLUB }), // alt club -> NU
            vz('alfa', { tip: 'FRAM', plata_id: 'p5' }),          // FRAM Neachitat, virat -> DA
            vz('alt', { plata_id: 'p6' }),                        // Neachitat dar nevirat -> NU
        ];
        const plati = [
            pl('p1', 'Neachitat'), pl('p2', 'Achitat Parțial', 200), pl('p3', 'Achitat'),
            pl('p4', 'Neachitat'), pl('p5', 'Neachitat', 200), pl('p6', 'Neachitat'),
        ];
        const decont = [
            ds('alfa'), ds('zeta'), ds('inactiv-cu-viza'), ds('alt-cu-viza-aici'),
            ds('alfa', { tip: 'FRAM', id: 'd-alfa-fram' }),
        ];
        const r = gasesteViratiNeachitati({ sportivi, vize, plati, decontSportivi: decont, clubId: CLUB });
        assert(r.length === 3, 'exact 3 sportivi virati neachitati (' + r.length + ')');
        assert(r.some(x => x.sportivId === 'alfa' && x.tip === 'FRQKD'), 'alfa FRQKD');
        assert(r.some(x => x.sportivId === 'alfa' && x.tip === 'FRAM' && x.suma === 200), 'alfa FRAM 200');
        const z = r.find(x => x.sportivId === 'zeta')!;
        assert(z.statusFactura === 'Achitat Parțial' && z.suma === 200 && z.plataId === 'p2', 'zeta partial, p2');
    });

    // ─── eligibili / suma / restantieri ─────────────────────────────────────
    const sit = (id: string, stare: any, suma: number | null, virat = false) => ({
        sportivId: id, sportiv: null, viza: null, plata: null, stare, suma, virat, decontId: null,
    });
    run('eligibiliPlataFederatie + sumaPlataFederatie + restantieriTaxe', () => {
        const toate = [
            sit('a', 'neachitat', 170), sit('b', 'achitat_partial', 170), sit('c', 'achitat', 170),
            sit('d', 'achitat', 170, true), sit('e', 'scutit', null), sit('f', 'in_asteptare', null),
            sit('g', 'alt_club', 170), sit('h', 'anulat', 170), sit('i', 'negenerata', null),
        ];
        const el = eligibiliPlataFederatie(toate);
        assert(el.map(x => x.sportivId).join(',') === 'a,b,c', 'eligibili = neachitat/partial/achitat nevirate');
        assert(sumaPlataFederatie(toate, ['a', 'c', 'e', 'd']) === 340, 'suma doar pentru selectati eligibili');
        assert(sumaPlataFederatie([sit('x', 'neachitat', 0.1), sit('y', 'neachitat', 0.2)], new Set(['x', 'y'])) === 0.3, 'rotunjire 2 zecimale');
        assert(restantieriTaxe(toate).map(x => x.sportivId).join(',') === 'a,b', 'restantieri = neachitat + partial');
    });

    // ─── mesaje ─────────────────────────────────────────────────────────────
    run('construiesteMesajTaxa', () => {
        const g = construiesteMesajTaxa({ numeSportivi: ['Popescu Ion'], tip: 'FRQKD', an: 2026, suma: 170, mod: 'generare' });
        assert(g.includes('A fost generată taxa anuală FRQKD pentru sezonul 2026-2027'), 'generare FRQKD sezon');
        assert(g.includes('170 lei'), 'generare contine suma');
        const f = construiesteMesajTaxa({ numeSportivi: ['Popescu Ion'], tip: 'FRAM', an: 2026, suma: 200, mod: 'generare' });
        assert(f.includes('pentru anul 2026'), 'generare FRAM an');
        const r1 = construiesteMesajTaxa({ numeSportivi: ['Popescu Ion'], tip: 'FRAM', an: 2026, suma: 200, mod: 'restanta' });
        assert(r1.includes('are de achitat'), 'restanta singular');
        const r2 = construiesteMesajTaxa({ numeSportivi: ['A', 'B'], tip: 'FRQKD', an: 2026, suma: 340, mod: 'restanta' });
        assert(r2.includes('A și B au de achitat'), 'restanta plural');
        assert(!g.includes('http') && !f.includes('http') && !r1.includes('http') && !r2.includes('http'), 'fara linkuri');
    });

    run('genereazaNotificariTaxe: grupare pe telefon', () => {
        const familii: Familie[] = [{ id: 'f1', nume: 'Pop', club_id: CLUB, reprezentant_id: 'parinte' } as Familie];
        const sp2 = [
            sp('c1', 'Pop', { prenume: 'Ana', familie_id: 'f1', telefon: null }),
            sp('c2', 'Pop', { prenume: 'Dan', familie_id: 'f1', telefon: null }),
            sp('parinte', 'Pop', { prenume: 'Mama', familie_id: 'f1', telefon: '0722 123 456', status: 'Inactiv' }),
            sp('s1', 'Sol', { prenume: 'Eu', telefon: '0733 111 222' }),
            sp('s2', 'Fara', { prenume: 'Tel', telefon: null }),
            sp('s3', 'Fara2', { prenume: 'Tel', telefon: null }),
            sp('m1', 'Mem', { prenume: 'A', familie_id: 'f2', telefon: null }),
            sp('m2', 'Mem', { prenume: 'B', familie_id: 'f2', telefon: '0744 555 666' }),
        ];
        const fam2: Familie[] = [...familii, { id: 'f2', nume: 'Mem', club_id: CLUB, reprezentant_id: null } as Familie];
        const intrari = [
            { sportivId: 'c1', plataId: 'p1', suma: 170 },
            { sportivId: 'c2', plataId: 'p2', suma: 170, achitatPartial: true },
            { sportivId: 's1', plataId: 'p3', suma: 170 },
            { sportivId: 's2', plataId: 'p4', suma: 170 },
            { sportivId: 's3', plataId: 'p5', suma: 170 },
            { sportivId: 'm1', plataId: 'p6', suma: 170 },
        ];
        const n = genereazaNotificariTaxe({ intrari, sportivi: sp2, familii: fam2, tip: 'FRQKD', an: 2026, mod: 'restanta' });
        const pop = n.find(x => x.telefonWa === '40722123456')!;
        assert(!!pop && pop.numeSportivi.length === 2 && pop.suma === 340, 'copiii se grupeaza pe telefonul reprezentantului, suma 340');
        assert(pop.sursaTelefon === 'reprezentant_familie' && pop.areAchitariPartiale === true && pop.plataIds.length === 2, 'sursa reprezentant, partial, 2 plati');
        assert(n.some(x => x.telefonWa === '40733111222' && x.sportivIds.join() === 's1'), 'sportiv cu telefon propriu');
        const m = n.find(x => x.telefonWa === '40744555666')!;
        assert(!!m && m.sursaTelefon === 'membru_familie', 'telefon de la alt membru al familiei');
        const fara = n.filter(x => x.telefonWa === null);
        assert(fara.length === 2 && fara.every(x => x.cheie.startsWith('fara-telefon:')), 'fara telefon raman separate');
        assert(n.every(x => x.tip === 'FRQKD' && x.an === 2026 && !x.mesaj.includes('http')), 'tip/an setate, fara link in mesaj');
    });

    // ─── areTaxaAchitata / pretTaxa / numarTaxeInAsteptare ──────────────────
    run('areTaxaAchitata', () => {
        const vFram = vz('a', { tip: 'FRAM', an: 2026, scutit: true });
        assert(areTaxaAchitata([vFram], 'a', 'FRAM', 2026) === true, 'scutit = true');
        assert(areTaxaAchitata([vz('a', { tip: 'FRAM', an: 2026, plata_id: 'p', plata: { status: 'Achitat', suma: 200 } })], 'a', 'FRAM', 2026) === true, 'plata Achitat');
        assert(areTaxaAchitata([vz('a', { tip: 'FRQKD', an: 2026, scutit: true })], 'a', 'FRAM', 2026) === false, 'doar FRQKD nu acopera FRAM');
        assert(areTaxaAchitata([vz('a', { tip: 'FRAM', an: 2026, plata_id: 'p', plata: { status: 'Neachitat', suma: 200 } })], 'a', 'FRAM', 2026) === false, 'Neachitat = false');
        assert(areTaxaAchitata([], 'a', 'FRAM', 2026) === false, 'fara viza = false');
    });

    run('pretTaxa', () => {
        const cfg: TaxaAnualaFederatieConfig[] = [
            { id: '1', tip: 'FRQKD', an_fiscal: 2026, suma: 170 },
            { id: '2', tip: 'FRAM', an_fiscal: 2026, suma: 200 },
        ];
        assert(pretTaxa(cfg, 'FRAM', 2026) === 200, 'FRAM 2026 = 200');
        assert(pretTaxa(cfg, 'FRQKD', 2026) === 170, 'FRQKD 2026 = 170');
        assert(pretTaxa(cfg, 'FRAM', 2027) === null, 'nedefinit = null');
        assert(pretTaxa([], 'FRAM', 2026) === null, 'config gol = null');
    });

    run('numarTaxeInAsteptare', () => {
        const vize = [
            vz('a', { tip: 'FRAM', an: 2026 }),
            vz('b', { tip: 'FRAM', an: 2026, scutit: true }),
            vz('c', { tip: 'FRAM', an: 2026, plata_id: 'p' }),
            vz('d', { tip: 'FRQKD', an: 2026 }),
            vz('e', { tip: 'FRAM', an: 2025 }),
            vz('f', { tip: 'FRAM', an: 2026 }),
        ];
        assert(numarTaxeInAsteptare(vize, 'FRAM', 2026) === 2, 'doar FRAM 2026 fara plata_id si nescutite');
    });

    run('ETICHETE_STARE_TAXA', () => {
        const stari = ['negenerata', 'in_asteptare', 'scutit', 'neachitat', 'achitat_partial', 'achitat', 'anulat', 'alt_club'] as const;
        assert(stari.every(s => !!ETICHETE_STARE_TAXA[s]?.label), 'toate starile au eticheta');
        assert(ETICHETE_STARE_TAXA.achitat_partial.label === 'Achitat parțial' && ETICHETE_STARE_TAXA.alt_club.label === 'La alt club', 'etichete romanesti');
    });

    console.log(`\n${passed} teste trecute, ${failed} esuate.`);
    return { passed, failed, errors };
}

const isDirectRun = typeof process !== 'undefined' && process.argv[1] && /taxeAnuale\.test\.(ts|js)$/.test(process.argv[1]);
if (isDirectRun) {
    const result = runTests();
    if (result.failed > 0) {
        console.error('\nEsecuri:');
        result.errors.forEach(e => console.error(' - ' + e));
        process.exit(1);
    }
}
