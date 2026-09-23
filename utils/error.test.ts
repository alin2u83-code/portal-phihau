/**
 * Test colocat pentru mapeazaEroareUnicitateSportiv din utils/error.ts
 *
 * NOTĂ: Proiectul nu are vitest/jest configurat (doar Playwright E2E).
 * Testul este scris ca funcție exportabilă cu asserții simple, urmând
 * pattern-ul din api/_permisiuniCont.test.ts.
 * Rulare: `node --import tsx utils/error.test.ts`
 */

import { mapeazaEroareUnicitateSportiv } from './error';

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

    // ─────────────────────────────────────────────
    run('T1: constrângere CNP -> mesaj conține "CNP", nu conține "duplicate key"', () => {
        const err = mapeazaEroareUnicitateSportiv({
            code: '23505',
            message: 'duplicate key value violates unique constraint "sportivi_cnp_key"',
            details: 'Key (cnp)=(1234567890123) already exists.',
        });
        assert(err.message.includes('CNP'), `mesaj conține "CNP", primit "${err.message}"`);
        assert(!err.message.includes('duplicate key'), `mesaj NU conține "duplicate key", primit "${err.message}"`);
    });

    // ─────────────────────────────────────────────
    run('T2: constrângere email -> mesaj conține "email"', () => {
        const err = mapeazaEroareUnicitateSportiv({
            code: '23505',
            message: 'duplicate key value violates unique constraint "sportivi_email_key"',
            details: 'Key (email)=(test@example.com) already exists.',
        });
        assert(err.message.includes('email'), `mesaj conține "email", primit "${err.message}"`);
    });

    // ─────────────────────────────────────────────
    run('T3: unique_sportiv_phi_hau -> mesaj nume+prenume, nu mesaj CNP, valorile din details ignorate', () => {
        const err = mapeazaEroareUnicitateSportiv({
            code: '23505',
            message: 'duplicate key value violates unique constraint "unique_sportiv_phi_hau"',
            details: 'Key (nume, prenume, data_nasterii, club_id)=(Cnpescu, Ion, 2010-01-01, 11111111-1111-1111-1111-111111111111) already exists.',
        });
        assert(err.message.includes('același nume, prenume'), `mesaj conține "același nume, prenume", primit "${err.message}"`);
        assert(!err.message.includes('CNP'), `mesaj NU conține "CNP" (valoarea "Cnpescu" din details nu trebuie să influențeze maparea), primit "${err.message}"`);
    });

    // ─────────────────────────────────────────────
    run('T4: unique_nr_legitimatie -> mesaj conține "legitimație"', () => {
        const err = mapeazaEroareUnicitateSportiv({
            code: '23505',
            message: 'duplicate key value violates unique constraint "unique_nr_legitimatie"',
            details: 'Key (nr_legitimatie)=(123) already exists.',
        });
        assert(err.message.includes('legitimație'), `mesaj conține "legitimație", primit "${err.message}"`);
    });

    // ─────────────────────────────────────────────
    run('T5: username_is_unique -> mesaj "nume de utilizator", nu mesajul nume+prenume', () => {
        const err = mapeazaEroareUnicitateSportiv({
            code: '23505',
            message: 'duplicate key value violates unique constraint "username_is_unique"',
            details: 'Key (username)=(ion.popescu) already exists.',
        });
        assert(err.message.includes('nume de utilizator'), `mesaj conține "nume de utilizator", primit "${err.message}"`);
        assert(!err.message.includes('același nume, prenume'), `mesaj NU conține mesajul nume+prenume, primit "${err.message}"`);
    });

    // ─────────────────────────────────────────────
    run('T6: eroare venită ca text simplu (fără code), constrângere email -> tot mesajul de email', () => {
        const err = mapeazaEroareUnicitateSportiv({
            message: 'duplicate key value violates unique constraint "sportivi_email_key"',
        });
        assert(err.message.includes('email'), `mesaj conține "email", primit "${err.message}"`);
    });

    // ─────────────────────────────────────────────
    run('T7: constrângere necunoscută -> mesaj fallback, fără "duplicate key"', () => {
        const err = mapeazaEroareUnicitateSportiv({
            code: '23505',
            message: 'duplicate key value violates unique constraint "foo_key"',
            details: 'Key (bar)=(x) already exists.',
        });
        assert(!err.message.includes('duplicate key'), `mesaj NU conține "duplicate key", primit "${err.message}"`);
        assert(err.message.includes('Există deja un sportiv cu aceste date'), `mesaj fallback, primit "${err.message}"`);
    });

    // ─────────────────────────────────────────────
    run('T8: eroare non-unicitate returnată neschimbată (===); null/undefined neschimbate, fără throw', () => {
        const nonUnique = { code: '42501', message: 'x' };
        const resultNonUnique = mapeazaEroareUnicitateSportiv(nonUnique);
        assert(resultNonUnique === nonUnique, 'eroare non-unicitate e returnată ca aceeași referință');

        const resultNull = mapeazaEroareUnicitateSportiv(null);
        assert(resultNull === null, 'null e returnat neschimbat');

        const resultUndefined = mapeazaEroareUnicitateSportiv(undefined);
        assert(resultUndefined === undefined, 'undefined e returnat neschimbat');
    });

    // ─────────────────────────────────────────────
    run('T9: eroarea mapată are code 23505 și NU are proprietatea details (fără PII)', () => {
        const err = mapeazaEroareUnicitateSportiv({
            code: '23505',
            message: 'duplicate key value violates unique constraint "sportivi_cnp_key"',
            details: 'Key (cnp)=(1234567890123) already exists.',
        });
        assert(err.code === '23505', `code === '23505', primit "${err.code}"`);
        assert(!('details' in err), 'eroarea mapată nu are proprietatea details');
    });

    return { passed, failed, errors };
}

// ─────────────────────────────────────────────
// Auto-run dacă acest fișier e executat direct
// ─────────────────────────────────────────────
if (process.argv[1]?.endsWith('error.test.ts') || process.argv[1]?.endsWith('error.test.js')) {
    const { passed, failed, errors } = ruleazaTeste();
    console.log(`\nRezultat: ${passed} PASS, ${failed} FAIL`);
    if (errors.length > 0) {
        console.error('Erori:', errors);
        process.exit(1);
    }
}
