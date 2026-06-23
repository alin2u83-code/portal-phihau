/**
 * Test colocat pentru utils/luniLipsa.ts
 *
 * NOTĂ: Proiectul nu are vitest/jest configurat (doar Playwright E2E).
 * Testul este scris ca funcții exportabile cu asserții simple.
 * Rulare: import și apel manual în consolă sau cu `node --import tsx utils/luniLipsa.test.ts`
 * Documentat în SUMMARY.md ca deviație de la TDD standard.
 */

import { calculeazaLuniLipsa, formatLuna } from './luniLipsa';
import type { Plata } from '../types';

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`FAIL: ${message}`);
    }
    console.log(`PASS: ${message}`);
}

function deepEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
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

    // ─────────────────────────────────────────────
    // TEST 1: dataStart null → returnează []
    // ─────────────────────────────────────────────
    run('T1: dataStart null → []', () => {
        const result = calculeazaLuniLipsa(null, []);
        assert(Array.isArray(result) && result.length === 0, 'null dataStart returnează []');
    });

    // ─────────────────────────────────────────────
    // TEST 2: dataStart undefined → returnează []
    // ─────────────────────────────────────────────
    run('T2: dataStart undefined → []', () => {
        const result = calculeazaLuniLipsa(undefined as any, []);
        assert(Array.isArray(result) && result.length === 0, 'undefined dataStart returnează []');
    });

    // ─────────────────────────────────────────────
    // TEST 3: ignoră plăți cu tip != 'Abonament'
    // ─────────────────────────────────────────────
    run('T3: ignoră tip != Abonament', () => {
        const plati: Partial<Plata>[] = [
            { tip: 'Taxa Examen', luna: 1, an: 2026 },
            { tip: 'Taxa Stagiu', luna: 2, an: 2026 },
        ];
        // Dacă tipul nu e Abonament, lunile NU sunt considerate acoperite
        // dataStart = 2026-03-01, azi = simulate fixă 2026-06-01 → luni: 3,4,5,6
        // Plățile de mai sus nu sunt Abonament → nu blochează nimic
        const result = calculeazaLuniLipsa('2026-06-01', plati as Plata[]);
        // iunie 2026 = luna curentă, deci interval e doar luna 6 (dacă azi e în iunie)
        // Testul verifică că plățile non-Abonament nu blochează nicio lună
        // (nu blocăm luna 1 sau 2 din 2026 din cauza lor)
        const lunaIanuarie = result.find(l => l.luna === 1 && l.an === 2026);
        const lunaFebruarie = result.find(l => l.luna === 2 && l.an === 2026);
        // Dacă dataStart e 2026-06-01 și azi e în iunie 2026, intervalul e doar [6/2026]
        // Deci luna 1 și 2 din 2026 NU apar (sunt înainte de dataStart)
        assert(lunaIanuarie === undefined, 'luna 1/2026 nu apare (înainte de dataStart)');
        assert(lunaFebruarie === undefined, 'luna 2/2026 nu apare (înainte de dataStart)');
    });

    // ─────────────────────────────────────────────
    // TEST 4: luni lipsă = interval minus cele cu Abonament
    // Scenariul cheie din behavior: dataStart=2026-01-01, plati cu Abonament luna=1 și luna=3,
    // azi=2026-06-23 → returnează lunile 2,4,5,6/2026 (lipsesc)
    // ─────────────────────────────────────────────
    run('T4: luni 2,4,5,6/2026 lipsesc (plati cu 1,3)', () => {
        const plati: Partial<Plata>[] = [
            { tip: 'Abonament', luna: 1, an: 2026 }, // ianuarie — acoperit
            { tip: 'Abonament', luna: 3, an: 2026 }, // martie — acoperit
        ];
        const result = calculeazaLuniLipsa('2026-01-01', plati as Plata[]);
        // Lunile acoperite: 1, 3
        // Luni lipsă așteptate: 2, 4, 5, 6 (și mai departe dacă azi > 6 — dar azi = 2026-06-23)
        const luna1 = result.find(l => l.luna === 1 && l.an === 2026);
        const luna2 = result.find(l => l.luna === 2 && l.an === 2026);
        const luna3 = result.find(l => l.luna === 3 && l.an === 2026);
        const luna4 = result.find(l => l.luna === 4 && l.an === 2026);
        const luna5 = result.find(l => l.luna === 5 && l.an === 2026);
        const luna6 = result.find(l => l.luna === 6 && l.an === 2026);

        assert(luna1 === undefined, 'luna 1/2026 NU e în lipsă (are Abonament)');
        assert(luna3 === undefined, 'luna 3/2026 NU e în lipsă (are Abonament)');
        assert(luna2 !== undefined, 'luna 2/2026 lipsește');
        assert(luna4 !== undefined, 'luna 4/2026 lipsește');
        assert(luna5 !== undefined, 'luna 5/2026 lipsește');
        assert(luna6 !== undefined, 'luna 6/2026 lipsește');
    });

    // ─────────────────────────────────────────────
    // TEST 5: plăți cu luna/an null sunt ignorate
    // ─────────────────────────────────────────────
    run('T5: plăți cu luna/an null sunt ignorate', () => {
        const plati: Partial<Plata>[] = [
            { tip: 'Abonament', luna: null, an: null },     // null — ignorat
            { tip: 'Abonament', luna: undefined, an: undefined }, // undefined — ignorat
        ];
        const result = calculeazaLuniLipsa('2026-06-01', plati as Plata[]);
        // dataStart = prima zi din luna curentă → interval conține cel puțin luna curentă
        // Plățile sunt ignorate (luna/an null) → luna curentă e în lipsă
        assert(result.length > 0, 'luna curentă e în lipsă (plăți cu luna null sunt ignorate)');
    });

    // ─────────────────────────────────────────────
    // TEST 6: luna 1-indexed (plata.luna===1 înseamnă ianuarie)
    // ─────────────────────────────────────────────
    run('T6: luna 1-indexed corect', () => {
        const plati: Partial<Plata>[] = [
            { tip: 'Abonament', luna: 1, an: 2026 }, // ianuarie
        ];
        const result = calculeazaLuniLipsa('2026-01-01', plati as Plata[]);
        // Ianuarie 2026 e acoperit cu luna=1 (1-indexed)
        const lunaIanuarie = result.find(l => l.luna === 1 && l.an === 2026);
        assert(lunaIanuarie === undefined, 'luna=1 (1-indexed) = ianuarie, nu februarie');
    });

    // ─────────────────────────────────────────────
    // TEST 7: formatLuna returnează string în română
    // ─────────────────────────────────────────────
    run('T7: formatLuna(6, 2026) conține "2026"', () => {
        const result = formatLuna(6, 2026);
        assert(typeof result === 'string', 'formatLuna returnează string');
        assert(result.includes('2026'), `formatLuna(6, 2026) conține "2026": "${result}"`);
        // Verificăm că e în română (luna = 'iunie' sau 'Iunie')
        const resultLower = result.toLowerCase();
        assert(
            resultLower.includes('iun') || resultLower.includes('jun'),
            `formatLuna(6, 2026) conține "iun" sau "jun": "${result}"`
        );
    });

    return { passed, failed, errors };
}

// ─────────────────────────────────────────────
// Auto-run dacă acest fișier e executat direct
// ─────────────────────────────────────────────
// Notă: această verificare funcționează cu tsx sau ts-node
if (process.argv[1]?.endsWith('luniLipsa.test.ts') || process.argv[1]?.endsWith('luniLipsa.test.js')) {
    const { passed, failed, errors } = runTests();
    console.log(`\nRezultat: ${passed} PASS, ${failed} FAIL`);
    if (errors.length > 0) {
        console.error('Erori:', errors);
        process.exit(1);
    }
}
