/**
 * Test colocat pentru utils/accesExtern.ts (fără framework, ca utils/parola.test.ts).
 * Rulare: `node --import tsx utils/accesExtern.test.ts`
 */
import { extrageCompetitieId, clasificaEroareAuth, construiesteContexte, separaContexteDupaMfa,construiestePermisiuniExtern, clasificaCompetitiiClub, esteZonaCompetitie, esteListaZona } from './accesExtern';

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

assert(clasificaEroareAuth(null) === 'ok', 'fara eroare -> ok');
assert(clasificaEroareAuth({ status: 429 }) === 'limita', '429 -> limita');
assert(clasificaEroareAuth({ code: 'over_email_send_rate_limit' }) === 'limita', 'cod over_email_send_rate_limit');
assert(clasificaEroareAuth({ code: 'over_request_rate_limit' }) === 'limita', 'cod over_request_rate_limit');
assert(clasificaEroareAuth({ message: 'email rate limit exceeded' }) === 'limita', 'mesaj rate limit');
assert(clasificaEroareAuth({ status: 400, code: 'invalid_credentials' }) === 'credentiale', 'invalid_credentials');
assert(clasificaEroareAuth({ status: 400, code: 'user_banned' }) === 'credentiale', 'user_banned');
assert(clasificaEroareAuth({ code: 'email_not_confirmed' }) === 'credentiale', 'email_not_confirmed');
assert(clasificaEroareAuth({ message: 'Invalid login credentials' }) === 'credentiale', 'mesaj invalid login credentials');
assert(clasificaEroareAuth({ status: 500, message: 'boom' }) === 'alta', '500 -> alta');
assert(clasificaEroareAuth({ status: 0, name: 'AuthRetryableFetchError' }) === 'alta', 'retryable fetch -> alta');

assert(esteZonaCompetitie('/competitie') && esteZonaCompetitie('/competitie/') && esteZonaCompetitie(`/competitie/${U}`) && esteZonaCompetitie('/competitie/abc'), 'esteZonaCompetitie: /competitie, slash, uuid, id invalid');
assert(!esteZonaCompetitie('/competitii') && !esteZonaCompetitie('/'), 'esteZonaCompetitie: /competitii si / nu sunt zona');
assert(esteListaZona('/competitie') && esteListaZona('/competitie/') && !esteListaZona(`/competitie/${U}`), 'esteListaZona: doar fara id');

const A = 'club-a', B = 'club-b';
const ctx = construiesteContexte([
    { id: 'r1', rol_denumire: 'ADMIN_CLUB', club_id: A, club: { nume: 'Alfa' } },
    { id: 'r2', rol_denumire: 'INSTRUCTOR', club_id: B },
    { id: 'r3', rol_denumire: 'SPORTIV', club_id: null },
    { id: 'r4', rol_denumire: 'ADMIN_CLUB', club_id: null },
], null);
assert(ctx.length === 2 && ctx[0].clubId === A && ctx[0].clubNume === 'Alfa' && ctx[1].rol === 'INSTRUCTOR', 'ADMIN_CLUB + INSTRUCTOR, SPORTIV si club NULL ignorate');

const REP = { id: 'r9', rol_denumire: 'REPREZENTANT_COMPETITIE', club_id: null };
const ext = construiesteContexte([REP], { club_id: 'X', cluburi: { nume: 'Xenon' } });
assert(ext.length === 1 && ext[0].rol === 'REPREZENTANT_COMPETITIE' && ext[0].clubId === 'X' && ext[0].clubNume === 'Xenon' && ext[0].roleRowId === 'r9', 'reprezentant: context din contul de club');
assert(construiesteContexte([REP], null).length === 0, 'reprezentant fara cont de club -> []');
const dublu = construiesteContexte([{ id: 'r1', rol_denumire: 'ADMIN_CLUB', club_id: 'X', club: { nume: 'Xenon' } }, REP], { club_id: 'X', cluburi: { nume: 'Xenon' } });
assert(dublu.length === 2 && dublu[0].rol === 'REPREZENTANT_COMPETITIE' && dublu[1].rol === 'ADMIN_CLUB', 'REPREZENTANT primul, ADMIN_CLUB pastrat');
assert(construiesteContexte([], null).length === 0, 'lista goala -> []');

const cx = (id: string, rol: 'ADMIN_CLUB' | 'INSTRUCTOR' | 'REPREZENTANT_COMPETITIE') => ({ roleRowId: id, rol, clubId: 'X', clubNume: 'Xenon' });
const ids = (l: { roleRowId: string }[]) => l.map(x => x.roleRowId).join(',');
const toate = [cx('rep', 'REPREZENTANT_COMPETITIE'), cx('adm', 'ADMIN_CLUB'), cx('ins', 'INSTRUCTOR')];
const s1 = separaContexteDupaMfa(toate, true);
assert(ids(s1.vizibile) === 'rep,adm,ins' && s1.ascunse.length === 0, 'Q2: MFA valid -> toate vizibile, ordinea pastrata');
const s2 = separaContexteDupaMfa(toate, false);
assert(ids(s2.vizibile) === 'rep' && ids(s2.ascunse) === 'adm,ins', 'Q2: fara MFA -> doar reprezentant vizibil, ascunse in ordine');
const s3 = separaContexteDupaMfa([cx('adm', 'ADMIN_CLUB')], false);
assert(s3.vizibile.length === 0 && ids(s3.ascunse) === 'adm', 'Q2: doar ADMIN_CLUB fara MFA -> vizibile gol');
const s4 = separaContexteDupaMfa([cx('rep', 'REPREZENTANT_COMPETITIE')], false);
assert(ids(s4.vizibile) === 'rep' && s4.ascunse.length === 0, 'Q2: doar reprezentant fara MFA -> vizibil');
const s5 = separaContexteDupaMfa([], false);
assert(s5.vizibile.length === 0 && s5.ascunse.length === 0, 'Q2: lista goala -> ambele goale');

const AZI = '2026-11-11';
const c = (id: string, status: string, di: string, ds: string) => ({ id, status, data_inceput: di, data_sfarsit: ds });
const part = new Set(['f1', 'f2', 'd2']);
const cl = clasificaCompetitiiClub([
    c('dr', 'draft', '2026-12-01', '2026-12-02'),
    c('a2', 'inscrieri_deschise', '2026-12-10', '2026-12-11'),
    c('a1', 'inscrieri_deschise', '2026-11-20', '2026-11-21'),
    c('az', 'inscrieri_inchise', '2026-11-10', AZI),
    c('f1', 'finalizata', '2026-03-01', '2026-03-02'),
    c('f2', 'finalizata', '2026-05-01', '2026-05-02'),
    c('f3', 'finalizata', '2026-04-01', '2026-04-02'),
    c('d2', 'inscrieri_deschise', '2026-09-01', '2026-09-02'),
    c('d3', 'inscrieri_deschise', '2026-09-05', '2026-09-06'),
], part, AZI);
assert(!cl.active.some(x => x.id === 'dr') && !cl.istoric.some(x => x.id === 'dr'), 'draft exclusa');
assert(JSON.stringify(cl.active.map(x => x.id)) === '["az","a1","a2"]', 'active: inclusiv data_sfarsit = azi, sortate crescator dupa data_inceput');
assert(JSON.stringify(cl.istoric.map(x => x.id)) === '["d2","f2","f1"]', 'istoric: doar cu participare (finalizata sau data_sfarsit < azi), descrescator');
assert(!cl.istoric.some(x => x.id === 'f3' || x.id === 'd3'), 'terminata fara participare exclusa');

const p = construiestePermisiuniExtern('club-x');
const { isAdminClub, visibleClubIds, hasClubFilter, ...rest } = p;
assert(isAdminClub === true && hasClubFilter === true && JSON.stringify(visibleClubIds) === '["club-x"]', 'permisiuni extern: admin club, club limitat');
assert(Object.values(rest).every(v => v === false), 'permisiuni extern: restul false');
