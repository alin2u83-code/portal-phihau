/**
 * Test colocat pentru utils/pragEmailuriAuth.ts
 * Rulare: `node --import tsx utils/pragEmailuriAuth.test.ts`
 */

import { calculeazaNivelPrag, calculeazaProcentPrag, nivelMaxim, ETICHETE_TIP_EMAIL_AUTH } from './pragEmailuriAuth';

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`FAIL: ${message}`);
    }
    console.log(`PASS: ${message}`);
}

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

    run('T1: calculeazaNivelPrag(0, 30) = normal', () => assert(calculeazaNivelPrag(0, 30) === 'normal', `primit ${calculeazaNivelPrag(0, 30)}`));
    run('T2: calculeazaNivelPrag(23, 30) = normal', () => assert(calculeazaNivelPrag(23, 30) === 'normal', `primit ${calculeazaNivelPrag(23, 30)}`));
    run('T3: calculeazaNivelPrag(24, 30) = atentie', () => assert(calculeazaNivelPrag(24, 30) === 'atentie', `primit ${calculeazaNivelPrag(24, 30)}`));
    run('T4: calculeazaNivelPrag(29, 30) = atentie', () => assert(calculeazaNivelPrag(29, 30) === 'atentie', `primit ${calculeazaNivelPrag(29, 30)}`));
    run('T5: calculeazaNivelPrag(30, 30) = depasit', () => assert(calculeazaNivelPrag(30, 30) === 'depasit', `primit ${calculeazaNivelPrag(30, 30)}`));
    run('T6: calculeazaNivelPrag(45, 30) = depasit', () => assert(calculeazaNivelPrag(45, 30) === 'depasit', `primit ${calculeazaNivelPrag(45, 30)}`));
    run('T7: calculeazaNivelPrag(5, 0) = normal', () => assert(calculeazaNivelPrag(5, 0) === 'normal', `primit ${calculeazaNivelPrag(5, 0)}`));

    run('T8: calculeazaProcentPrag(15, 30) = 50', () => assert(calculeazaProcentPrag(15, 30) === 50, `primit ${calculeazaProcentPrag(15, 30)}`));
    run('T9: calculeazaProcentPrag(45, 30) = 150', () => assert(calculeazaProcentPrag(45, 30) === 150, `primit ${calculeazaProcentPrag(45, 30)}`));
    run('T10: calculeazaProcentPrag(3, 0) = 0', () => assert(calculeazaProcentPrag(3, 0) === 0, `primit ${calculeazaProcentPrag(3, 0)}`));

    run("T11: nivelMaxim('normal', 'atentie') = atentie", () => assert(nivelMaxim('normal', 'atentie') === 'atentie', `primit ${nivelMaxim('normal', 'atentie')}`));
    run("T12: nivelMaxim('depasit', 'atentie') = depasit", () => assert(nivelMaxim('depasit', 'atentie') === 'depasit', `primit ${nivelMaxim('depasit', 'atentie')}`));
    run("T13: nivelMaxim('normal', 'normal') = normal", () => assert(nivelMaxim('normal', 'normal') === 'normal', `primit ${nivelMaxim('normal', 'normal')}`));

    run('T14: ETICHETE_TIP_EMAIL_AUTH are exact 4 chei', () => assert(Object.keys(ETICHETE_TIP_EMAIL_AUTH).length === 4, `primit ${Object.keys(ETICHETE_TIP_EMAIL_AUTH).length}`));

    return { passed, failed, errors };
}

if (process.argv[1]?.endsWith('pragEmailuriAuth.test.ts') || process.argv[1]?.endsWith('pragEmailuriAuth.test.js')) {
    const { passed, failed, errors } = ruleazaTeste();
    console.log(`\nRezultat: ${passed} PASS, ${failed} FAIL`);
    if (errors.length > 0) {
        console.error('Erori:', errors);
        process.exit(1);
    }
}
