/**
 * Test pentru api/_aprobaCerereAcces.ts (părțile pure: validare + gardă de rol).
 * Logica DB (proceseazaCerereAcces) se testează pe live în 36-12; ramura de aprobare
 * (creeazaContClub, Faza 39) este acoperită live în 39-04.
 * Rulare: `node --import tsx api/_aprobaCerereAcces.test.ts`
 */

import { valideazaCerereAprobare, esteFederatie } from './_aprobaCerereAcces';

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`FAIL: ${message}`);
    console.log(`PASS: ${message}`);
}

const ID = '123e4567-e89b-12d3-a456-426614174000';

try {
    assert(valideazaCerereAprobare({ cerere_id: ID, actiune: 'aproba' }).ok === true, 'aproba valid');
    assert(valideazaCerereAprobare({ cerere_id: ID, actiune: 'respinge', motiv: 'x'.repeat(300) }).ok === true, 'respinge cu motiv 300');
    assert(valideazaCerereAprobare({ cerere_id: ID, actiune: 'respinge', motiv: 'x'.repeat(301) }).ok === false, 'motiv 301 respins');
    assert(valideazaCerereAprobare({ cerere_id: 'nu-uuid', actiune: 'aproba' }).ok === false, 'cerere_id non-UUID');
    assert(valideazaCerereAprobare({ cerere_id: ID, actiune: 'sterge' }).ok === false, 'actiune necunoscuta');
    assert(valideazaCerereAprobare(null).ok === false, 'body null');
    assert(valideazaCerereAprobare({}).ok === false, 'body gol');
    const r = valideazaCerereAprobare({ cerere_id: ID, actiune: 'aproba', motiv: 'x'.repeat(999) });
    assert(r.ok === true && r.value.motiv === undefined, 'aproba ignora motivul');

    assert(esteFederatie([{ rol_denumire: 'SUPER_ADMIN_FEDERATIE', club_id: null }] as any) === true, 'federatie -> true');
    assert(esteFederatie([{ rol_denumire: 'ADMIN_CLUB', club_id: 'c' }] as any) === false, 'ADMIN_CLUB -> false');
    assert(esteFederatie([{ rol_denumire: 'INSTRUCTOR' }] as any) === false, 'INSTRUCTOR -> false');
    assert(esteFederatie([]) === false, 'gol -> false');
    assert(esteFederatie([{ rol_denumire: 'REPREZENTANT_COMPETITIE' }] as any) === false, 'REPREZENTANT -> false');
    console.log('ALL PASSED');
} catch (e: any) {
    console.error(e.message);
    process.exit(1);
}
