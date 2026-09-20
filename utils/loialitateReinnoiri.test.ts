/**
 * Test colocat pentru utils/loialitateReinnoiri.ts
 *
 * NOTĂ: Proiectul nu are vitest/jest configurat (doar Playwright E2E).
 * Testul este scris ca funcții exportabile cu asserții simple.
 * Rulare: `npx tsx utils/loialitateReinnoiri.test.ts`
 * Documentat în SUMMARY.md ca deviație de la TDD standard (pattern existent, vezi utils/luniLipsa.test.ts).
 */

import { numaraReinnoiriConsecutive, calculeazaBonusLoialitate } from './loialitateReinnoiri';
import type { Plata, PoliticaReducere } from '../types';

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`FAIL: ${message}`);
    }
    console.log(`PASS: ${message}`);
}

/**
 * Rulează toate testele și returnează { passed, failed, errors }
 */
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

    const azi = new Date(2026, 8, 18); // 18 septembrie 2026

    // ─────────────────────────────────────────────
    // TEST 1: 8/2026, 7/2026, 6/2026 achitate → 3 luni consecutive
    // ─────────────────────────────────────────────
    run('T1: 3 luni consecutive achitate (8,7,6/2026) → 3', () => {
        const plati: Partial<Plata>[] = [
            { tip: 'Abonament', status: 'Achitat', luna: 8, an: 2026 },
            { tip: 'Abonament', status: 'Achitat', luna: 7, an: 2026 },
            { tip: 'Abonament', status: 'Achitat', luna: 6, an: 2026 },
        ];
        const result = numaraReinnoiriConsecutive(plati as Plata[], azi);
        assert(result === 3, `asteptat 3, primit ${result}`);
    });

    // ─────────────────────────────────────────────
    // TEST 2: fara luna 7/2026 → se opreste la 1 (8/2026)
    // ─────────────────────────────────────────────
    run('T2: fara luna 7/2026 → se opreste la 1', () => {
        const plati: Partial<Plata>[] = [
            { tip: 'Abonament', status: 'Achitat', luna: 8, an: 2026 },
            { tip: 'Abonament', status: 'Achitat', luna: 6, an: 2026 },
        ];
        const result = numaraReinnoiriConsecutive(plati as Plata[], azi);
        assert(result === 1, `asteptat 1, primit ${result}`);
    });

    // ─────────────────────────────────────────────
    // TEST 3: 'Achitat Parțial' pentru 8/2026 nu conteaza → 0
    // ─────────────────────────────────────────────
    run("T3: 'Achitat Parțial' pentru 8/2026 → 0", () => {
        const plati: Partial<Plata>[] = [
            { tip: 'Abonament', status: 'Achitat Parțial', luna: 8, an: 2026 },
        ];
        const result = numaraReinnoiriConsecutive(plati as Plata[], azi);
        assert(result === 0, `asteptat 0, primit ${result}`);
    });

    // ─────────────────────────────────────────────
    // TEST 4: lista goala → 0
    // ─────────────────────────────────────────────
    run('T4: lista goala → 0', () => {
        const result = numaraReinnoiriConsecutive([], azi);
        assert(result === 0, `asteptat 0, primit ${result}`);
    });

    // ─────────────────────────────────────────────
    // TEST 5: fara politici eligibile → sumaBonus 0, politica null
    // ─────────────────────────────────────────────
    run('T5: calculeazaBonusLoialitate([], 10, 200) → 0, null', () => {
        const result = calculeazaBonusLoialitate([], 10, 200);
        assert(result.sumaBonus === 0, `asteptat sumaBonus 0, primit ${result.sumaBonus}`);
        assert(result.politica === null, `asteptat politica null, primit ${JSON.stringify(result.politica)}`);
    });

    // ─────────────────────────────────────────────
    // TEST 6: politica discount 10%, pret 200 → bonus 20
    // ─────────────────────────────────────────────
    run('T6: politica discount 10% atinsa la 6 reinnoiri, pret 200 → bonus 20', () => {
        const politici: Partial<PoliticaReducere>[] = [
            { activ: true, reinnoiri_necesare: 6, tip_bonus: 'discount', procentaj: 10, valoare_fixa: null, nume_reducere: 'Loialitate 6 luni' },
        ];
        const result = calculeazaBonusLoialitate(politici as PoliticaReducere[], 6, 200);
        assert(result.sumaBonus === 20, `asteptat 20, primit ${result.sumaBonus}`);
    });

    // ─────────────────────────────────────────────
    // TEST 7: politica zile_gratis atinsa la 12 reinnoiri, pret 200 → bonus 200 (plafonat)
    // ─────────────────────────────────────────────
    run('T7: politica zile_gratis atinsa la 12 reinnoiri, pret 200 → bonus 200', () => {
        const politici: Partial<PoliticaReducere>[] = [
            { activ: true, reinnoiri_necesare: 12, tip_bonus: 'zile_gratis', nume_reducere: 'Loialitate 12 luni' },
        ];
        const result = calculeazaBonusLoialitate(politici as PoliticaReducere[], 12, 200);
        assert(result.sumaBonus === 200, `asteptat 200, primit ${result.sumaBonus}`);
    });

    return { passed, failed, errors };
}

// ─────────────────────────────────────────────
// Auto-run dacă acest fișier e executat direct
// ─────────────────────────────────────────────
if (process.argv[1]?.endsWith('loialitateReinnoiri.test.ts') || process.argv[1]?.endsWith('loialitateReinnoiri.test.js')) {
    const { passed, failed, errors } = runTests();
    console.log(`\nRezultat: ${passed} PASS, ${failed} FAIL`);
    if (errors.length > 0) {
        console.error('Erori:', errors);
        process.exit(1);
    }
}
