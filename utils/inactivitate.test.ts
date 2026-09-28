/**
 * Test colocat pentru utils/inactivitate.ts
 * Rulare: `node --import tsx utils/inactivitate.test.ts`
 */

import { calculeazaUltimaActivitate, stareInactivitate, DURATA_INACTIVITATE_MS, AVERTIZARE_INAINTE_MS } from './inactivitate';

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`FAIL: ${message}`);
    }
    console.log(`PASS: ${message}`);
}

const ACUM = Date.UTC(2026, 8, 28, 12, 0, 0);

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

    run('T1: calculeazaUltimaActivitate(null, null, ACUM) = ACUM', () => {
        assert(calculeazaUltimaActivitate(null, null, ACUM) === ACUM, `primit ${calculeazaUltimaActivitate(null, null, ACUM)}`);
    });

    run('T2: login proaspat peste timestamp vechi', () => {
        const stocat = ACUM - 3 * 60 * 60 * 1000;
        const lastSignIn = new Date(ACUM - 60 * 1000).toISOString();
        const rezultat = calculeazaUltimaActivitate(stocat, lastSignIn, ACUM);
        assert(rezultat === ACUM - 60 * 1000, `primit ${rezultat}, asteptat ${ACUM - 60 * 1000}`);
    });

    run('T3: stocat recent peste login vechi', () => {
        const stocat = ACUM - 5 * 60 * 1000;
        const lastSignIn = new Date(ACUM - 2 * 60 * 60 * 1000).toISOString();
        const rezultat = calculeazaUltimaActivitate(stocat, lastSignIn, ACUM);
        assert(rezultat === ACUM - 5 * 60 * 1000, `primit ${rezultat}`);
    });

    run('T4: timestamp din viitor se plafoneaza la ACUM', () => {
        const rezultat = calculeazaUltimaActivitate(ACUM + 10 * 60 * 1000, null, ACUM);
        assert(rezultat === ACUM, `primit ${rezultat}`);
    });

    run('T5: data invalida + stocat null -> ACUM', () => {
        const rezultat = calculeazaUltimaActivitate(null, 'nu-e-data', ACUM);
        assert(rezultat === ACUM, `primit ${rezultat}`);
    });

    run("T6: stareInactivitate(ACUM-10min, ACUM) = 'activ'", () => {
        assert(stareInactivitate(ACUM - 10 * 60 * 1000, ACUM) === 'activ', `primit ${stareInactivitate(ACUM - 10 * 60 * 1000, ACUM)}`);
    });

    run("T7: stareInactivitate(ACUM-56min, ACUM) = 'avertizare'", () => {
        assert(stareInactivitate(ACUM - 56 * 60 * 1000, ACUM) === 'avertizare', `primit ${stareInactivitate(ACUM - 56 * 60 * 1000, ACUM)}`);
    });

    run("T8: stareInactivitate(ACUM-60min, ACUM) = 'expirat' (limita exacta)", () => {
        assert(stareInactivitate(ACUM - 60 * 60 * 1000, ACUM) === 'expirat', `primit ${stareInactivitate(ACUM - 60 * 60 * 1000, ACUM)}`);
    });

    run("T9: stareInactivitate(ACUM-61min, ACUM) = 'expirat'", () => {
        assert(stareInactivitate(ACUM - 61 * 60 * 1000, ACUM) === 'expirat', `primit ${stareInactivitate(ACUM - 61 * 60 * 1000, ACUM)}`);
    });

    run('T10: constante', () => {
        assert(DURATA_INACTIVITATE_MS === 3600000, `primit ${DURATA_INACTIVITATE_MS}`);
        assert(AVERTIZARE_INAINTE_MS === 300000, `primit ${AVERTIZARE_INAINTE_MS}`);
    });

    return { passed, failed, errors };
}

if (process.argv[1]?.endsWith('inactivitate.test.ts') || process.argv[1]?.endsWith('inactivitate.test.js')) {
    const { passed, failed, errors } = ruleazaTeste();
    console.log(`\nRezultat: ${passed} PASS, ${failed} FAIL`);
    if (errors.length > 0) {
        console.error('Erori:', errors);
        process.exit(1);
    }
}
