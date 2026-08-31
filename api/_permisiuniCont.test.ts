/**
 * Test colocat pentru api/_permisiuniCont.ts
 *
 * NOTĂ: Proiectul nu are vitest/jest configurat (doar Playwright E2E).
 * Testul este scris ca funcție exportabilă cu asserții simple, urmând
 * pattern-ul din utils/parola.test.ts.
 * Rulare: `node --import tsx api/_permisiuniCont.test.ts`
 *
 * Acoperă scenariul central de escaladare cross-club (CR-01, 26-REVIEW.md):
 * un apelant ADMIN_CLUB în Club A și SPORTIV în Club B nu poate crea un cont
 * ADMIN_CLUB în Club B.
 */

import { verificaPermisiuneCreareCont, RolApelant } from './_permisiuniCont';

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

    const adminAClubBSportiv: RolApelant[] = [
        { rol_denumire: 'ADMIN_CLUB', club_id: 'club-A' },
        { rol_denumire: 'SPORTIV', club_id: 'club-B' },
    ];

    // ─────────────────────────────────────────────
    run('T1: Escaladare cross-club blocată (CR-01, cazul central)', () => {
        const rezultat = verificaPermisiuneCreareCont({
            callerRoles: adminAClubBSportiv,
            roles: ['ADMIN_CLUB'],
            clubTinta: 'club-B',
        });
        assert(!rezultat.permis, 'ADMIN_CLUB în club-A + SPORTIV în club-B nu poate crea ADMIN_CLUB în club-B (escaladare)');
        if (!rezultat.permis) {
            assert(rezultat.status === 403, `status 403, primit ${rezultat.status}`);
            assert(rezultat.error.includes('în acest club'), `mesaj conține "în acest club", primit "${rezultat.error}"`);
        }
    });

    // ─────────────────────────────────────────────
    run('T2: Același apelant, clubul propriu (club-A) — permis', () => {
        const rezultat = verificaPermisiuneCreareCont({
            callerRoles: adminAClubBSportiv,
            roles: ['ADMIN_CLUB'],
            clubTinta: 'club-A',
        });
        assert(rezultat.permis, 'ADMIN_CLUB în club-A poate crea ADMIN_CLUB în club-A');
    });

    // ─────────────────────────────────────────────
    run('T3: Același apelant, rol permis (SPORTIV) în clubul secundar club-B — permis', () => {
        const rezultat = verificaPermisiuneCreareCont({
            callerRoles: adminAClubBSportiv,
            roles: ['SPORTIV'],
            clubTinta: 'club-B',
        });
        assert(rezultat.permis, 'SPORTIV în club-B poate crea cont SPORTIV în club-B (greutate 1 <= 1)');
    });

    // ─────────────────────────────────────────────
    run('T4: INSTRUCTOR în clubul propriu (club-B) — permis', () => {
        const rezultat = verificaPermisiuneCreareCont({
            callerRoles: [{ rol_denumire: 'INSTRUCTOR', club_id: 'club-B' }],
            roles: ['INSTRUCTOR'],
            clubTinta: 'club-B',
        });
        assert(rezultat.permis, 'INSTRUCTOR în club-B poate crea cont INSTRUCTOR în club-B');
    });

    // ─────────────────────────────────────────────
    run('T5: ADMIN_CLUB creează SPORTIV în clubul propriu (regresie UserManagement) — permis', () => {
        const rezultat = verificaPermisiuneCreareCont({
            callerRoles: [{ rol_denumire: 'ADMIN_CLUB', club_id: 'club-A' }],
            roles: ['SPORTIV'],
            clubTinta: 'club-A',
        });
        assert(rezultat.permis, 'ADMIN_CLUB în club-A poate crea SPORTIV în club-A');
    });

    // ─────────────────────────────────────────────
    run('T6: SUPER_ADMIN_FEDERATIE fără club_id creează în orice club (regresie wizard D-02) — permis', () => {
        const rezultat = verificaPermisiuneCreareCont({
            callerRoles: [{ rol_denumire: 'SUPER_ADMIN_FEDERATIE', club_id: null }],
            roles: ['ADMIN_CLUB'],
            clubTinta: 'club-nou-999',
        });
        assert(rezultat.permis, 'SUPER_ADMIN_FEDERATIE poate crea ADMIN_CLUB în orice club, inclusiv unul nou');
    });

    // ─────────────────────────────────────────────
    run('T7: Escaladare verticală în clubul propriu — blocată', () => {
        const rezultat = verificaPermisiuneCreareCont({
            callerRoles: [{ rol_denumire: 'ADMIN_CLUB', club_id: 'club-A' }],
            roles: ['SUPER_ADMIN_FEDERATIE'],
            clubTinta: 'club-A',
        });
        assert(!rezultat.permis, 'ADMIN_CLUB în club-A nu poate crea SUPER_ADMIN_FEDERATIE în club-A');
        if (!rezultat.permis) {
            assert(rezultat.status === 403, `status 403, primit ${rezultat.status}`);
        }
    });

    // ─────────────────────────────────────────────
    run('T8: Apelant fără drept de creare (SPORTIV) — blocat', () => {
        const rezultat = verificaPermisiuneCreareCont({
            callerRoles: [{ rol_denumire: 'SPORTIV', club_id: 'club-A' }],
            roles: ['SPORTIV'],
            clubTinta: 'club-A',
        });
        assert(!rezultat.permis, 'SPORTIV nu poate crea niciun cont (greutate globală < 2)');
        if (!rezultat.permis) {
            assert(rezultat.status === 403, `status 403, primit ${rezultat.status}`);
            assert(rezultat.error === 'Nu aveți permisiunea de a crea conturi.', `mesaj exact, primit "${rezultat.error}"`);
        }
    });

    // ─────────────────────────────────────────────
    run('T9: Apelant fără niciun rol — blocat', () => {
        const rezultat = verificaPermisiuneCreareCont({
            callerRoles: [],
            roles: ['SPORTIV'],
            clubTinta: 'club-A',
        });
        assert(!rezultat.permis, 'callerRoles gol nu poate crea niciun cont');
        if (!rezultat.permis) {
            assert(rezultat.status === 403, `status 403, primit ${rezultat.status}`);
        }
    });

    // ─────────────────────────────────────────────
    run('T10: Rol necunoscut — blocat cu 400', () => {
        const rezultat = verificaPermisiuneCreareCont({
            callerRoles: [{ rol_denumire: 'ADMIN_CLUB', club_id: 'club-A' }],
            roles: ['ROL_INVENTAT'],
            clubTinta: 'club-A',
        });
        assert(!rezultat.permis, 'rol necunoscut e respins');
        if (!rezultat.permis) {
            assert(rezultat.status === 400, `status 400, primit ${rezultat.status}`);
            assert(rezultat.error.includes('Rol necunoscut'), `mesaj conține "Rol necunoscut", primit "${rezultat.error}"`);
        }
    });

    // ─────────────────────────────────────────────
    run('T11: Listă de roluri goală — blocat cu 400', () => {
        const rezultat = verificaPermisiuneCreareCont({
            callerRoles: [{ rol_denumire: 'ADMIN_CLUB', club_id: 'club-A' }],
            roles: [],
            clubTinta: 'club-A',
        });
        assert(!rezultat.permis, 'listă goală de roluri e respinsă');
        if (!rezultat.permis) {
            assert(rezultat.status === 400, `status 400, primit ${rezultat.status}`);
            assert(rezultat.error === 'Lista de roluri este invalidă.', `mesaj exact, primit "${rezultat.error}"`);
        }
    });

    // ─────────────────────────────────────────────
    run('T12: Listă de roluri invalidă (undefined) — blocat cu 400', () => {
        const rezultat = verificaPermisiuneCreareCont({
            callerRoles: [{ rol_denumire: 'ADMIN_CLUB', club_id: 'club-A' }],
            roles: undefined,
            clubTinta: 'club-A',
        });
        assert(!rezultat.permis, 'roles undefined e respins');
        if (!rezultat.permis) {
            assert(rezultat.status === 400, `status 400, primit ${rezultat.status}`);
            assert(rezultat.error === 'Lista de roluri este invalidă.', `mesaj exact, primit "${rezultat.error}"`);
        }
    });

    // ─────────────────────────────────────────────
    run('T13: Club țintă lipsă pentru apelant non-federație — blocat', () => {
        const rezultat = verificaPermisiuneCreareCont({
            callerRoles: [{ rol_denumire: 'ADMIN_CLUB', club_id: 'club-A' }],
            roles: ['SPORTIV'],
            clubTinta: null,
        });
        assert(!rezultat.permis, 'club țintă null e respins pentru apelant non-federație');
        if (!rezultat.permis) {
            assert(rezultat.status === 403, `status 403, primit ${rezultat.status}`);
            assert(rezultat.error === 'Nu puteți crea conturi în alt club.', `mesaj exact, primit "${rezultat.error}"`);
        }
    });

    // ─────────────────────────────────────────────
    run('T14: Club țintă (club-Z) în care apelantul nu are niciun rol — blocat', () => {
        const rezultat = verificaPermisiuneCreareCont({
            callerRoles: [{ rol_denumire: 'ADMIN_CLUB', club_id: 'club-A' }],
            roles: ['SPORTIV'],
            clubTinta: 'club-Z',
        });
        assert(!rezultat.permis, 'club-Z fără niciun rol al apelantului e respins');
        if (!rezultat.permis) {
            assert(rezultat.status === 403, `status 403, primit ${rezultat.status}`);
            assert(rezultat.error === 'Nu puteți crea conturi în alt club.', `mesaj exact, primit "${rezultat.error}"`);
        }
    });

    return { passed, failed, errors };
}

// ─────────────────────────────────────────────
// Auto-run dacă acest fișier e executat direct
// ─────────────────────────────────────────────
if (process.argv[1]?.endsWith('_permisiuniCont.test.ts') || process.argv[1]?.endsWith('_permisiuniCont.test.js')) {
    const { passed, failed, errors } = ruleazaTeste();
    console.log(`\nRezultat: ${passed} PASS, ${failed} FAIL`);
    if (errors.length > 0) {
        console.error('Erori:', errors);
        process.exit(1);
    }
}
