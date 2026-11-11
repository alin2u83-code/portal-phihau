/**
 * Test pentru api/_contCompetitieClub.ts (părțile pure: validare + gardă proprietar).
 * Logica DB (creeazaContClub / schimbaEmailContClub) se testează live în 39-04.
 * Rulare: `node --import tsx api/_contCompetitieClub.test.ts`
 */

import { valideazaCerereContClub, esteProprietarApelant } from './_contCompetitieClub';

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`FAIL: ${message}`);
    console.log(`PASS: ${message}`);
}

const ID = '123e4567-e89b-12d3-a456-426614174000';

// stub minimal pentru lanțul from().select().eq().maybeSingle()
const stub = (result: { data: any; error: any }) =>
    ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => result }) }) }) }) as any;

async function main() {
    const ok = valideazaCerereContClub({ operatie: 'creeaza', club_id: ID, email: ' Club@Ex.ro ' });
    assert(ok.ok === true && ok.value.email === 'club@ex.ro', 'email normalizat (trim + lowercase)');
    assert(valideazaCerereContClub({ operatie: 'schimba_email', club_id: ID, email: 'a@b.ro' }).ok === true, 'schimba_email valid');
    assert(valideazaCerereContClub({ operatie: 'sterge', club_id: ID, email: 'a@b.ro' }).ok === false, 'operatie necunoscuta');
    assert(valideazaCerereContClub({ operatie: 'creeaza', club_id: 'nu-uuid', email: 'a@b.ro' }).ok === false, 'club_id non-UUID');
    assert(valideazaCerereContClub({ operatie: 'creeaza', club_id: ID, email: 'fara-arond' }).ok === false, 'email fara @');
    assert(valideazaCerereContClub({ operatie: 'creeaza', club_id: ID, email: 'a@domeniu' }).ok === false, 'email fara domeniu cu punct');
    assert(valideazaCerereContClub({ operatie: 'creeaza', club_id: ID, email: 'a@' + 'x'.repeat(250) + '.ro' }).ok === false, 'email > 254');
    assert(valideazaCerereContClub(null).ok === false, 'body null');
    assert(valideazaCerereContClub({}).ok === false, 'body gol');

    assert(await esteProprietarApelant(stub({ data: { user_id: 'u' }, error: null }), 'u') === true, 'proprietar -> true');
    assert(await esteProprietarApelant(stub({ data: null, error: null }), 'u') === false, 'non-proprietar -> false');
    assert(await esteProprietarApelant(stub({ data: { user_id: 'u' }, error: { message: 'x' } }), 'u') === false, 'eroare -> false (inchis)');
    console.log('ALL PASSED');
}

main().catch((e: any) => {
    console.error(e.message);
    process.exit(1);
});
