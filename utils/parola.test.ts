/**
 * Test colocat pentru utils/parola.ts
 *
 * NOTĂ: Proiectul nu are vitest/jest configurat (doar Playwright E2E).
 * Testul este scris ca funcție exportabilă cu asserții simple, urmând
 * pattern-ul din utils/luniLipsa.test.ts.
 * Rulare: `node --import tsx utils/parola.test.ts`
 */

import { genereazaParolaTemporara, LUNGIME_MINIMA_PAROLA } from './parola';

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`FAIL: ${message}`);
    }
    console.log(`PASS: ${message}`);
}

const CARACTERE_AMBIGUE = ['I', 'l', 'O', 'o', '0', '1'];

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

    // ─────────────────────────────────────────────
    // TEST 1: lungime implicită = 16
    // ─────────────────────────────────────────────
    run('T1: genereazaParolaTemporara() are lungime 16', () => {
        const rezultat = genereazaParolaTemporara();
        assert(rezultat.length === 16, `lungime implicită e 16, primit ${rezultat.length}`);
    });

    // ─────────────────────────────────────────────
    // TEST 2: lungime custom = 24
    // ─────────────────────────────────────────────
    run('T2: genereazaParolaTemporara(24) are lungime 24', () => {
        const rezultat = genereazaParolaTemporara(24);
        assert(rezultat.length === 24, `lungime custom e 24, primit ${rezultat.length}`);
    });

    // ─────────────────────────────────────────────
    // TEST 3: sub LUNGIME_MINIMA_PAROLA aruncă Error
    // ─────────────────────────────────────────────
    run('T3: genereazaParolaTemporara(8) aruncă Error (< LUNGIME_MINIMA_PAROLA)', () => {
        let aAruncat = false;
        try {
            genereazaParolaTemporara(8);
        } catch (e) {
            aAruncat = e instanceof Error;
        }
        assert(aAruncat, `lungime 8 < LUNGIME_MINIMA_PAROLA (${LUNGIME_MINIMA_PAROLA}) trebuie să arunce Error`);
    });

    // ─────────────────────────────────────────────
    // TEST 4: 200 de apeluri consecutive produc 200 valori distincte
    // ─────────────────────────────────────────────
    const esantion200: string[] = [];
    for (let i = 0; i < 200; i++) {
        esantion200.push(genereazaParolaTemporara());
    }

    run('T4: 200 de generări sunt toate distincte', () => {
        const unice = new Set(esantion200);
        assert(unice.size === 200, `200 generări distincte, primit ${unice.size} unice`);
    });

    // ─────────────────────────────────────────────
    // TEST 5: fiecare rezultat conține minim o literă mică, o literă mare, o cifră, un simbol
    // ─────────────────────────────────────────────
    run('T5: fiecare parolă conține toate cele 4 clase de caractere', () => {
        for (const parola of esantion200) {
            const areMinuscula = /[a-z]/.test(parola);
            const areMajuscula = /[A-Z]/.test(parola);
            const areCifra = /[0-9]/.test(parola);
            const areSimbol = /[!@#$%^&*\-_=+?]/.test(parola);
            assert(areMinuscula, `parola "${parola}" conține literă mică`);
            assert(areMajuscula, `parola "${parola}" conține literă mare`);
            assert(areCifra, `parola "${parola}" conține cifră`);
            assert(areSimbol, `parola "${parola}" conține simbol`);
        }
    });

    // ─────────────────────────────────────────────
    // TEST 6: niciun rezultat nu conține caractere ambigue
    // ─────────────────────────────────────────────
    run('T6: nicio parolă nu conține caractere ambigue (I, l, O, o, 0, 1)', () => {
        for (const parola of esantion200) {
            for (const caracter of CARACTERE_AMBIGUE) {
                assert(!parola.includes(caracter), `parola "${parola}" nu conține "${caracter}"`);
            }
        }
    });

    // ─────────────────────────────────────────────
    // TEST 7: poziția claselor de caractere nu e fixă (shuffle real, nu concatenare)
    // ─────────────────────────────────────────────
    run('T7: primul caracter nu aparține mereu aceleiași clase (dovadă shuffle)', () => {
        const clasePrimulCaracter = new Set<string>();
        for (const parola of esantion200) {
            const c = parola[0];
            if (/[A-Z]/.test(c)) clasePrimulCaracter.add('majuscula');
            else if (/[a-z]/.test(c)) clasePrimulCaracter.add('minuscula');
            else if (/[0-9]/.test(c)) clasePrimulCaracter.add('cifra');
            else clasePrimulCaracter.add('simbol');
        }
        assert(
            clasePrimulCaracter.size > 1,
            `primul caracter aparține la ${clasePrimulCaracter.size} clase diferite (peste 200 generări) — dovadă shuffle`
        );
    });

    return { passed, failed, errors };
}

// ─────────────────────────────────────────────
// Auto-run dacă acest fișier e executat direct
// ─────────────────────────────────────────────
if (process.argv[1]?.endsWith('parola.test.ts') || process.argv[1]?.endsWith('parola.test.js')) {
    const { passed, failed, errors } = ruleazaTeste();
    console.log(`\nRezultat: ${passed} PASS, ${failed} FAIL`);
    if (errors.length > 0) {
        console.error('Erori:', errors);
        process.exit(1);
    }
}
