/**
 * Test colocat pentru utils/perioadaGratie.ts
 *
 * NOTĂ: Proiectul nu are vitest/jest configurat (doar Playwright E2E).
 * Testul este scris ca funcții exportabile cu asserții simple.
 * Rulare: `npx tsx utils/perioadaGratie.test.ts`
 * Documentat în SUMMARY.md ca deviație de la TDD standard (pattern existent, vezi utils/luniLipsa.test.ts).
 */

import { decideGratieReinnoire, primaZiLunaCurenta } from './perioadaGratie';

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

    // ─────────────────────────────────────────────
    // TEST 1: fara istoric de facturare → 'pastreaza'
    // ─────────────────────────────────────────────
    run('T1: ultimaLunaFacturata null → pastreaza', () => {
        const result = decideGratieReinnoire(null, new Date(2026, 8, 18), 30);
        assert(result === 'pastreaza', `asteptat 'pastreaza', primit '${result}'`);
    });

    // ─────────────────────────────────────────────
    // TEST 2: gap 18 zile, prag 30 → 'pastreaza'
    // ultima luna acoperita = august 2026 (pana la 2026-08-31), azi 2026-09-18 → gap 18 zile
    // ─────────────────────────────────────────────
    run('T2: gap 18 zile <= prag 30 → pastreaza', () => {
        const result = decideGratieReinnoire({ luna: 8, an: 2026 }, new Date(2026, 8, 18), 30);
        assert(result === 'pastreaza', `asteptat 'pastreaza', primit '${result}'`);
    });

    // ─────────────────────────────────────────────
    // TEST 3: gap 110 zile, prag 30 → 'reseteaza'
    // ultima luna acoperita = mai 2026 (pana la 2026-05-31), azi 2026-09-18 → gap 110 zile
    // ─────────────────────────────────────────────
    run('T3: gap 110 zile > prag 30 → reseteaza', () => {
        const result = decideGratieReinnoire({ luna: 5, an: 2026 }, new Date(2026, 8, 18), 30);
        assert(result === 'reseteaza', `asteptat 'reseteaza', primit '${result}'`);
    });

    // ─────────────────────────────────────────────
    // TEST 4: gap negativ (luna acoperita e in viitor fata de azi) → 'pastreaza'
    // ultima luna acoperita = septembrie 2026 (pana la 2026-09-30), azi 2026-09-18 → gap negativ
    // ─────────────────────────────────────────────
    run('T4: gap negativ → pastreaza', () => {
        const result = decideGratieReinnoire({ luna: 9, an: 2026 }, new Date(2026, 8, 18), 30);
        assert(result === 'pastreaza', `asteptat 'pastreaza', primit '${result}'`);
    });

    // ─────────────────────────────────────────────
    // TEST 5: primaZiLunaCurenta returneaza 'YYYY-MM-DD' corect, fara conversie UTC
    // ─────────────────────────────────────────────
    run("T5: primaZiLunaCurenta(2026-09-18) === '2026-09-01'", () => {
        const result = primaZiLunaCurenta(new Date(2026, 8, 18));
        assert(result === '2026-09-01', `asteptat '2026-09-01', primit '${result}'`);
    });

    // ─────────────────────────────────────────────
    // TEST 6: prag negativ/NaN e tratat ca 30 (valoarea implicita)
    // ─────────────────────────────────────────────
    run('T6: prag negativ tratat ca 30', () => {
        const result = decideGratieReinnoire({ luna: 8, an: 2026 }, new Date(2026, 8, 18), -5);
        assert(result === 'pastreaza', `asteptat 'pastreaza' (prag efectiv 30, gap 18), primit '${result}'`);
    });

    return { passed, failed, errors };
}

// ─────────────────────────────────────────────
// Auto-run dacă acest fișier e executat direct
// ─────────────────────────────────────────────
if (process.argv[1]?.endsWith('perioadaGratie.test.ts') || process.argv[1]?.endsWith('perioadaGratie.test.js')) {
    const { passed, failed, errors } = runTests();
    console.log(`\nRezultat: ${passed} PASS, ${failed} FAIL`);
    if (errors.length > 0) {
        console.error('Erori:', errors);
        process.exit(1);
    }
}
