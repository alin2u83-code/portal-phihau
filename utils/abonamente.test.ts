/**
 * Test colocat pentru utils/abonamente.ts
 *
 * NOTĂ: Proiectul nu are vitest/jest configurat (doar Playwright E2E).
 * Pattern identic cu utils/parola.test.ts / utils/luniLipsa.test.ts.
 * Rulare: `node --import tsx utils/abonamente.test.ts`
 */

import { TipAbonament } from '../types';
import { filtreazaTipuriSezon, gasesteTipDupaId, esteTipDinSezonArhivat } from './abonamente';

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`FAIL: ${message}`);
    }
    console.log(`PASS: ${message}`);
}

const T1: TipAbonament = { id: 'T1', denumire: 'Individual', pret: 100, numar_membri: 1, club_id: 'C1', sezon_id: 'S1' };
const T2: TipAbonament = { id: 'T2', denumire: 'Individual', pret: 120, numar_membri: 1, club_id: 'C1', sezon_id: 'S2' };
const T9: TipAbonament = { id: 'T9', denumire: 'Familie 2', pret: 180, numar_membri: 2, club_id: 'C1', sezon_id: 'S1' };
const T0: TipAbonament = { id: 'T0', denumire: 'Individual', pret: 90, numar_membri: 1, club_id: 'C1', sezon_id: null };

const TIPURI: TipAbonament[] = [T1, T2, T9, T0];

export function ruleazaTeste(): { passed: number; failed: number; errors: string[] } {
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

    run('T1: filtreazaTipuriSezon(tipuri, null) returnează toate tipurile, aceeași ordine', () => {
        const rezultat = filtreazaTipuriSezon(TIPURI, null);
        assert(rezultat.length === TIPURI.length, `lungime ${rezultat.length}, așteptat ${TIPURI.length}`);
        assert(rezultat.every((t, i) => t.id === TIPURI[i].id), 'ordinea nu s-a păstrat');
    });

    run('T2: filtreazaTipuriSezon(tipuri, "S2") include S2 și null, exclude S1', () => {
        const rezultat = filtreazaTipuriSezon(TIPURI, 'S2');
        const ids = rezultat.map(t => t.id).sort();
        assert(JSON.stringify(ids) === JSON.stringify(['T0', 'T2']), `ids primite: ${ids.join(',')}`);
    });

    run('T3: filtreazaTipuriSezon([], "S2") returnează []', () => {
        const rezultat = filtreazaTipuriSezon([], 'S2');
        assert(Array.isArray(rezultat) && rezultat.length === 0, 'nu a returnat listă goală');
    });

    run('T4: gasesteTipDupaId găsește tipul chiar din sezon arhivat', () => {
        const rezultat = gasesteTipDupaId(TIPURI, 'T9');
        assert(rezultat?.id === 'T9', `găsit: ${rezultat?.id}`);
    });

    run('T5: gasesteTipDupaId(tipuri, null) returnează undefined', () => {
        const rezultat = gasesteTipDupaId(TIPURI, null);
        assert(rezultat === undefined, `primit: ${JSON.stringify(rezultat)}`);
    });

    run('T6: gasesteTipDupaId(tipuri, undefined) returnează undefined', () => {
        const rezultat = gasesteTipDupaId(TIPURI, undefined);
        assert(rezultat === undefined, `primit: ${JSON.stringify(rezultat)}`);
    });

    run('T7: esteTipDinSezonArhivat true pentru tip S1 vs activ S2', () => {
        assert(esteTipDinSezonArhivat(T1, 'S2') === true, 'ar trebui true');
    });

    run('T8: esteTipDinSezonArhivat false pentru tip S2 vs activ S2', () => {
        assert(esteTipDinSezonArhivat(T2, 'S2') === false, 'ar trebui false');
    });

    run('T9: esteTipDinSezonArhivat false pentru tip fără sezon', () => {
        assert(esteTipDinSezonArhivat(T0, 'S2') === false, 'ar trebui false');
    });

    run('T10: esteTipDinSezonArhivat false când sezonActivId e null', () => {
        assert(esteTipDinSezonArhivat(T1, null) === false, 'ar trebui false');
    });

    run('T11: esteTipDinSezonArhivat false când tip e null', () => {
        assert(esteTipDinSezonArhivat(null, 'S2') === false, 'ar trebui false');
    });

    run('T12: niciuna dintre funcții nu mutează array-ul original', () => {
        const original = [...TIPURI];
        filtreazaTipuriSezon(TIPURI, 'S2');
        gasesteTipDupaId(TIPURI, 'T9');
        assert(TIPURI.length === original.length, 'lungime schimbată');
        assert(TIPURI.every((t, i) => t.id === original[i].id), 'ordinea schimbată');
    });

    return { passed, failed, errors };
}

if (process.argv[1]?.endsWith('abonamente.test.ts') || process.argv[1]?.endsWith('abonamente.test.js')) {
    const { passed, failed, errors } = ruleazaTeste();
    console.log(`\nRezultat: ${passed} PASS, ${failed} FAIL`);
    if (errors.length > 0) {
        console.error('Erori:', errors);
        process.exit(1);
    }
}
