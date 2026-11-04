/**
 * Test colocat pentru utils/accesExtern.ts (fără framework, ca utils/parola.test.ts).
 * Rulare: `node --import tsx utils/accesExtern.test.ts`
 */
import { extrageCompetitieId, clasificaEroareOtp, construiesteContexte, construiestePermisiuniExtern } from './accesExtern';

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`FAIL: ${message}`);
    console.log(`PASS: ${message}`);
}

const U = '3f2b8c1e-1111-4222-8333-444455556666';

assert(extrageCompetitieId(`/competitie/${U}`) === U, 'uuid valid');
assert(extrageCompetitieId(`/competitie/${U.toUpperCase()}`) === U, 'uuid uppercase -> lowercase');
assert(extrageCompetitieId(`/competitie/${U}/`) === U, 'slash final');
assert(extrageCompetitieId('/competitie/abc') === null, 'id scurt');
assert(extrageCompetitieId('/competitie/') === null, 'fara id');
assert(extrageCompetitieId(`/competitie/${U}/altceva`) === null, 'segment suplimentar');
assert(extrageCompetitieId('/') === null, 'radacina');
assert(extrageCompetitieId('/competitie/3f2b8c1e-1111-4222-8333-44445555zzzz') === null, 'litere non-hex');

assert(clasificaEroareOtp(null) === 'ok', 'fara eroare -> ok');
assert(clasificaEroareOtp({ status: 429 }) === 'limita', '429 -> limita');
assert(clasificaEroareOtp({ code: 'over_email_send_rate_limit' }) === 'limita', 'cod rate limit');
assert(clasificaEroareOtp({ message: 'email rate limit exceeded' }) === 'limita', 'mesaj rate limit');
assert(clasificaEroareOtp({ status: 422, code: 'otp_disabled', message: 'Signups not allowed for otp' }) === 'fara_cont', 'DEC-8 -> fara_cont');
assert(clasificaEroareOtp({ message: 'Signups not allowed for otp' }) === 'fara_cont', 'doar mesaj -> fara_cont');
assert(clasificaEroareOtp({ status: 500, message: 'boom' }) === 'alta', 'alta');

const A = 'club-a', B = 'club-b';
const ctx = construiesteContexte([
    { id: 'r1', rol_denumire: 'ADMIN_CLUB', club_id: A, club: { nume: 'Alfa' } },
    { id: 'r2', rol_denumire: 'INSTRUCTOR', club_id: B },
    { id: 'r3', rol_denumire: 'SPORTIV', club_id: null },
    { id: 'r4', rol_denumire: 'ADMIN_CLUB', club_id: null },
], [], 'C1');
assert(ctx.length === 2 && ctx[0].clubId === A && ctx[0].clubNume === 'Alfa' && ctx[1].rol === 'INSTRUCTOR', 'ADMIN_CLUB + INSTRUCTOR, SPORTIV si club NULL ignorate');

const ext = construiesteContexte(
    [{ id: 'r9', rol_denumire: 'REPREZENTANT_COMPETITIE', club_id: null }],
    [
        { competitie_id: 'C1', club_id: 'X', activ: true, cluburi: { nume: 'Xenon' } },
        { competitie_id: 'C2', club_id: 'Y', activ: true },
        { competitie_id: 'C1', club_id: 'Z', activ: false },
    ], 'C1');
assert(ext.length === 1 && ext[0].clubId === 'X' && ext[0].roleRowId === 'r9', 'reprezentant: un singur context pe grantul activ al competitiei');
assert(construiesteContexte([{ id: 'r9', rol_denumire: 'REPREZENTANT_COMPETITIE', club_id: null }], [{ competitie_id: 'C2', club_id: 'Y', activ: true }], 'C1').length === 0, 'reprezentant fara grant pe competitia din link -> []');
assert(construiesteContexte([], [], 'C1').length === 0, 'lista goala -> []');

const p = construiestePermisiuniExtern('club-x');
const { isAdminClub, visibleClubIds, hasClubFilter, ...rest } = p;
assert(isAdminClub === true && hasClubFilter === true && JSON.stringify(visibleClubIds) === '["club-x"]', 'permisiuni extern: admin club, club limitat');
assert(Object.values(rest).every(v => v === false), 'permisiuni extern: restul false');
