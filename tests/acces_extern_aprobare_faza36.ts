// tests/acces_extern_aprobare_faza36.ts
//
// Faza 36 — Plan 12, Task 1. Flux cap-coada pe DB live:
// cerere anonima (RPC) -> aprobare prin handler (token real) -> OTP (generateLink + verifyOtp) -> acces scoped.
// Handler-ul api/aproba-cerere-acces.ts se importa direct si se apeleaza cu req/res simulate.
//
// Siguranta date: doar entitati efemere ZZ_TEST_FAZA36_* / zztest_faza36_*; cleanup in finally; output doar ID-uri/numaratori.
// Rulare: npx tsx tests/acces_extern_aprobare_faza36.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';
import handler from '../api/aproba-cerere-acces';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) {
  console.error('Lipsesc VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const CLUB_A = '83e7f771-46cf-4c4e-b70f-356d7b0bff06';
const CLUB_B = 'cbb0b228-b3e0-4735-9658-70999eb256c6';
const PREFIX = 'ZZ_TEST_FAZA36_';
const RUN_ID = Date.now();
const EMAIL_PREFIX = `zztest_faza36_${RUN_ID}_`;
const admin = createClient(url, serviceKey);

const results: { name: string; passed: boolean }[] = [];
const record = (name: string, passed: boolean, detail?: string) => {
  results.push({ name, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
};

let ipCounter = 0;
async function callHandler(method: string, token: string | null, body: unknown) {
  const req: any = {
    method,
    headers: { 'x-forwarded-for': `10.36.${Math.floor(RUN_ID / 1000) % 250}.${++ipCounter}`, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body,
  };
  let status = 0;
  let json: any;
  const res: any = {
    status(s: number) { status = s; return res; },
    json(j: any) { json = j; return res; },
  };
  await handler(req, res);
  return { status, json };
}

async function loginPwd(email: string, parola: string) {
  const c = createClient(url!, anonKey!);
  const { data, error } = await c.auth.signInWithPassword({ email, password: parola });
  if (error || !data.session) throw new Error(`login: ${error?.message}`);
  return data.session.access_token;
}

// Echivalentul login-ului OTP din UI, fara email real: generateLink -> email_otp -> verifyOtp.
async function loginOtp(email: string, contextId: string): Promise<SupabaseClient> {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const otp = data?.properties?.email_otp;
  if (error || !otp) throw new Error(`generateLink: ${error?.message}`);
  const c = createClient(url!, anonKey!, { global: { headers: { 'active-role-context-id': contextId } } });
  const v = await c.auth.verifyOtp({ email, token: otp, type: 'email' });
  if (v.error || !v.data.session) throw new Error(`verifyOtp: ${v.error?.message}`);
  return c;
}

const count = async (c: SupabaseClient, table: string) => {
  const r = await c.from(table).select('id');
  return { n: r.data?.length ?? 0, err: r.error?.message };
};

async function main() {
  const competitii: string[] = [];
  const userIds: string[] = [];
  const parola = `Zz!${RUN_ID}aA`;

  try {
    const mkComp = async (suffix: string, status: string) => {
      const { data, error } = await admin.from('competitii').insert({
        denumire: `${PREFIX}APR_${suffix}_${RUN_ID}`, tip: 'tehnica', data_inceput: '2027-06-01', data_sfarsit: '2027-06-02',
        locatie: 'Test', status, deadline_inscrieri: null,
      }).select('id').single();
      if (error || !data) throw new Error(`competitie ${suffix}: ${error?.message}`);
      competitii.push(data.id);
      return data.id as string;
    };
    const C1 = await mkComp('C1', 'inscrieri_deschise');
    const C2 = await mkComp('C2', 'inscrieri_deschise');
    const CDRAFT = await mkComp('DRAFT', 'draft');

    const mkPwdUser = async (tag: string) => {
      const email = `${EMAIL_PREFIX}${tag}@example.test`;
      const { data, error } = await admin.auth.admin.createUser({ email, password: parola, email_confirm: true });
      if (error || !data.user) throw new Error(`user ${tag}: ${error?.message}`);
      userIds.push(data.user.id);
      return { email, uid: data.user.id };
    };
    const addRol = async (uid: string, rol: string, club: string | null) => {
      const { data, error } = await admin.from('utilizator_roluri_multicont')
        .insert({ user_id: uid, rol_denumire: rol, club_id: club, is_primary: true }).select('id').single();
      if (error || !data) throw new Error(`rol ${rol}: ${error?.message}`);
      return data.id as string;
    };

    const FED = await mkPwdUser('fed');
    const fedRolId = await addRol(FED.uid, 'SUPER_ADMIN_FEDERATIE', null);
    const ADM = await mkPwdUser('adm');
    const admRolId = await addRol(ADM.uid, 'ADMIN_CLUB', CLUB_B);
    const tokFed = await loginPwd(FED.email, parola);
    const tokAdm = await loginPwd(ADM.email, parola);

    const anon = createClient(url!, anonKey!);
    const cerereRpc = (comp: string, email: string, nume: string, club: string) =>
      anon.rpc('trimite_cerere_acces', { p_competitie: comp, p_email: email, p_nume: nume, p_club: club });
    const cerereRand = async (id: string) => (await admin.from('cereri_acces_competitie')
      .select('id, status, procesat_de, motiv_respingere').eq('id', id).single()).data;
    const idCerere = async (email: string) => (await admin.from('cereri_acces_competitie')
      .select('id').eq('email', email).eq('competitie_id', C1)).data ?? [];

    // ── 2. RPC anonim ──────────────────────────────────────────────────────
    const E1 = `${EMAIL_PREFIX}ext1@example.test`;
    const r1 = await cerereRpc(C1, E1, 'ZZ Test Unu', CLUB_A);
    record('RPC anonim: cerere valida -> ok', !r1.error && r1.data === 'ok', r1.error?.message ?? String(r1.data));
    const r1b = await cerereRpc(C1, E1, 'ZZ Test Unu', CLUB_A);
    const rows1 = await idCerere(E1);
    record('RPC anonim: repetata -> ok (identic), un singur rand', !r1b.error && r1b.data === 'ok' && rows1.length === 1, `rows=${rows1.length}`);
    const rClub = await cerereRpc(C1, `${EMAIL_PREFIX}x@example.test`, 'ZZ Test', crypto.randomUUID());
    record('RPC anonim: club inexistent -> club_invalid', !!rClub.error && /club_invalid/.test(rClub.error.message));
    const rDraft = await cerereRpc(CDRAFT, `${EMAIL_PREFIX}x@example.test`, 'ZZ Test', CLUB_A);
    record('RPC anonim: competitie draft -> competitie_indisponibila', !!rDraft.error && /competitie_indisponibila/.test(rDraft.error.message));
    const rEmail = await cerereRpc(C1, 'nu-este-email', 'ZZ Test', CLUB_A);
    const rNume = await cerereRpc(C1, `${EMAIL_PREFIX}y@example.test`, 'Z', CLUB_A);
    record('RPC anonim: email/nume invalide -> date_invalide', !!rEmail.error && /date_invalide/.test(rEmail.error.message)
      && !!rNume.error && /date_invalide/.test(rNume.error.message));
    // ── 2b. Plafon per club + curatare (follow-up 261105-gax) ────────────────
    const nPend = async (comp: string) => (await admin.from('cereri_acces_competitie')
      .select('id', { count: 'exact', head: true }).eq('competitie_id', comp).eq('status', 'in_asteptare')).count ?? 0;
    const burst = await Promise.all(Array.from({ length: 12 }, (_, i) =>
      cerereRpc(C2, `${EMAIL_PREFIX}burst${i}@example.test`, 'ZZ Burst', CLUB_A)));
    const nOk = burst.filter(x => !x.error && x.data === 'ok').length;
    const nPlin = burst.filter(x => !!x.error && /prea_multe_cereri/.test(x.error.message)).length;
    record('Plafon per club: 12 cereri paralele -> exact 10 ok, 2 prea_multe_cereri', nOk === 10 && nPlin === 2, `ok=${nOk} plin=${nPlin} db=${await nPend(C2)}`);
    record('Plafon per club: randuri in DB = 10 (atomic)', (await nPend(C2)) === 10);
    const altClub = await cerereRpc(C2, `${EMAIL_PREFIX}burstB@example.test`, 'ZZ Burst B', CLUB_B);
    record('Plafon per club: alt club primeste in continuare cereri', !altClub.error && altClub.data === 'ok', altClub.error?.message);
    const dupPlin = await cerereRpc(C2, `${EMAIL_PREFIX}burst0@example.test`, 'ZZ Burst', CLUB_A);
    const nouPlin = await cerereRpc(C2, `${EMAIL_PREFIX}burst99@example.test`, 'ZZ Burst', CLUB_A);
    record('Plafon: duplicat si email nou dau acelasi raspuns cand clubul e plin (nu dezvaluie existenta)',
      /prea_multe_cereri/.test(dupPlin.error?.message ?? '') && /prea_multe_cereri/.test(nouPlin.error?.message ?? ''));

    const clientFed = createClient(url!, anonKey!, { global: { headers: { Authorization: `Bearer ${tokFed}`, 'active-role-context-id': fedRolId } } });
    const clientAdm = createClient(url!, anonKey!, { global: { headers: { Authorization: `Bearer ${tokAdm}`, 'active-role-context-id': admRolId } } });
    const stAnon = await anon.rpc('sterge_cereri_in_asteptare', { p_competitie: C2 });
    record('sterge_cereri_in_asteptare: anon respins', !!stAnon.error && (await nPend(C2)) === 11, stAnon.error?.message);
    const stAdm = await clientAdm.rpc('sterge_cereri_in_asteptare', { p_competitie: C2 });
    record('sterge_cereri_in_asteptare: ADMIN_CLUB respins', !!stAdm.error && (await nPend(C2)) === 11, stAdm.error?.message);
    const stFed = await clientFed.rpc('sterge_cereri_in_asteptare', { p_competitie: C2 });
    record('sterge_cereri_in_asteptare: federatia sterge toate cele in asteptare (11)', !stFed.error && stFed.data === 11 && (await nPend(C2)) === 0, stFed.error?.message ?? String(stFed.data));
    const dupaCuratare = await cerereRpc(C2, `${EMAIL_PREFIX}burst0@example.test`, 'ZZ Burst', CLUB_A);
    record('Dupa curatare clubul poate trimite din nou', !dupaCuratare.error && dupaCuratare.data === 'ok', dupaCuratare.error?.message);

    const selCer = await anon.from('cereri_acces_competitie').select('id');
    const selGr = await anon.from('acces_competitie_extern').select('id');
    record('Anon nu citeste cereri/granturi (zero randuri sau eroare)',
      (selCer.error || (selCer.data?.length ?? 0) === 0) && (selGr.error || (selGr.data?.length ?? 0) === 0),
      `cereri=${selCer.error ? 'err' : selCer.data?.length}, granturi=${selGr.error ? 'err' : selGr.data?.length}`);
    const uid = await anon.rpc('user_id_dupa_email', { p_email: E1 });
    record('Anon nu poate apela user_id_dupa_email', !!uid.error && !uid.data, uid.error?.code);

    const cerere1 = rows1[0].id as string;

    // ── 1. Contract endpoint ───────────────────────────────────────────────
    const h401 = await callHandler('POST', null, { cerere_id: cerere1, actiune: 'aproba' });
    record('Handler: fara token -> 401', h401.status === 401, String(h401.status));
    const h403 = await callHandler('POST', tokAdm, { cerere_id: cerere1, actiune: 'aproba' });
    const dupa403 = await cerereRand(cerere1);
    const userEx = await admin.rpc('user_id_dupa_email', { p_email: E1 });
    record('Handler: ADMIN_CLUB -> 403, nicio scriere', h403.status === 403 && dupa403?.status === 'in_asteptare' && !userEx.data,
      `status=${h403.status}, cerere=${dupa403?.status}`);
    const h400a = await callHandler('POST', tokFed, { cerere_id: 'nu-uuid', actiune: 'aproba' });
    const h400b = await callHandler('POST', tokFed, { cerere_id: cerere1, actiune: 'sterge' });
    record('Handler: body invalid -> 400', h400a.status === 400 && h400b.status === 400, `${h400a.status}/${h400b.status}`);
    const h405 = await callHandler('GET', tokFed, undefined);
    record('Handler: GET -> 405', h405.status === 405, String(h405.status));

    // ── 3. Aprobare ────────────────────────────────────────────────────────
    const ap = await callHandler('POST', tokFed, { cerere_id: cerere1, actiune: 'aproba' });
    record('Aprobare (FED) -> 200, userNou', ap.status === 200 && ap.json?.userNou === true && !!ap.json?.userId, `status=${ap.status}`);
    const extUid = ap.json?.userId as string;
    if (extUid) userIds.push(extUid);
    const authU = await admin.auth.admin.getUserById(extUid);
    record('Aprobare: utilizatorul exista in auth', !!authU.data?.user);
    const rolRows = (await admin.from('utilizator_roluri_multicont').select('id, rol_denumire, club_id, sportiv_id').eq('user_id', extUid)).data ?? [];
    record('Aprobare: un rand REPREZENTANT_COMPETITIE cu club/sportiv NULL',
      rolRows.length === 1 && rolRows[0].rol_denumire === 'REPREZENTANT_COMPETITIE' && rolRows[0].club_id === null && rolRows[0].sportiv_id === null,
      `rows=${rolRows.length}`);
    const grRows = (await admin.from('acces_competitie_extern').select('competitie_id, club_id, activ').eq('user_id', extUid)).data ?? [];
    record('Aprobare: grant (user, C1, club A) activ',
      grRows.length === 1 && grRows[0].competitie_id === C1 && grRows[0].club_id === CLUB_A && grRows[0].activ === true);
    const dupaAp = await cerereRand(cerere1);
    record('Aprobare: cerere aprobata, procesat_de = FED', dupaAp?.status === 'aprobata' && dupaAp?.procesat_de === FED.uid);
    const ap2 = await callHandler('POST', tokFed, { cerere_id: cerere1, actiune: 'aproba' });
    record('A doua aprobare -> 409', ap2.status === 409, String(ap2.status));

    // ── 4. Login OTP si acces ──────────────────────────────────────────────
    const EXT = await loginOtp(E1, rolRows[0].id);
    const comp = await EXT.from('competitii').select('id');
    record('Extern (OTP) vede exact competitia C1', comp.data?.length === 1 && comp.data[0].id === C1, `n=${comp.data?.length}, err=${comp.error?.message ?? '-'}`);
    const gr = await EXT.from('acces_competitie_extern').select('user_id');
    record('Extern: exact 1 grant propriu', gr.data?.length === 1 && gr.data[0].user_id === extUid, `n=${gr.data?.length}`);
    const cer = await count(EXT, 'cereri_acces_competitie');
    record('Extern: zero randuri din cereri_acces_competitie', cer.n === 0, `n=${cer.n}`);

    // ── 7. Revocare ────────────────────────────────────────────────────────
    await admin.from('acces_competitie_extern').update({ activ: false }).eq('user_id', extUid);
    const compOff = await EXT.from('competitii').select('id');
    record('Revocare: 0 competitii vizibile', (compOff.data?.length ?? 0) === 0, `n=${compOff.data?.length}`);
    await admin.from('acces_competitie_extern').update({ activ: true }).eq('user_id', extUid);
    const compOn = await EXT.from('competitii').select('id');
    record('Reactivare: 1 competitie vizibila', compOn.data?.length === 1, `n=${compOn.data?.length}`);

    // ── 5. Respingere ──────────────────────────────────────────────────────
    const E2 = `${EMAIL_PREFIX}resp@example.test`;
    await cerereRpc(C1, E2, 'ZZ Test Respins', CLUB_A);
    const cerere2 = (await idCerere(E2))[0]?.id as string;
    const rj = await callHandler('POST', tokFed, { cerere_id: cerere2, actiune: 'respinge', motiv: 'ZZ motiv test' });
    const rjRow = await cerereRand(cerere2);
    record('Respingere -> 200, status respinsa, motiv salvat', rj.status === 200 && rjRow?.status === 'respinsa' && rjRow?.motiv_respingere === 'ZZ motiv test',
      `status=${rj.status}`);
    const uResp = await admin.rpc('user_id_dupa_email', { p_email: E2 });
    record('Respingere: niciun cont creat', !uResp.error && !uResp.data);

    // ── 6. Cont existent ───────────────────────────────────────────────────
    const rolAdmBefore = (await admin.from('utilizator_roluri_multicont').select('id, is_primary, club_id').eq('id', admRolId).single()).data;
    const clubVizibile = async () => {
      const c = createClient(url!, anonKey!, { global: { headers: { 'active-role-context-id': admRolId } } });
      await c.auth.signInWithPassword({ email: ADM.email, password: parola });
      const r = await c.from('sportivi').select('club_id').limit(1000);
      return new Set((r.data ?? []).map((x: any) => x.club_id as string));
    };
    const clubInainte = await clubVizibile();
    await cerereRpc(C2, ADM.email, 'ZZ Test Adm', CLUB_A);
    const cerere3 = ((await admin.from('cereri_acces_competitie').select('id').eq('email', ADM.email).eq('competitie_id', C2)).data ?? [])[0]?.id as string;
    const ap3 = await callHandler('POST', tokFed, { cerere_id: cerere3, actiune: 'aproba' });
    record('Cont existent: 200, avertisment, userNou=false',
      ap3.status === 200 && ap3.json?.avertisment === 'cont_existent_cu_alte_roluri' && ap3.json?.userNou === false, `status=${ap3.status}`);
    const rolAdm = (await admin.from('utilizator_roluri_multicont').select('id, rol_denumire, is_primary, club_id').eq('user_id', ADM.uid)).data ?? [];
    const admDupa = rolAdm.find(r => r.id === admRolId);
    const repr = rolAdm.filter(r => r.rol_denumire === 'REPREZENTANT_COMPETITIE');
    record('Cont existent: ADMIN_CLUB neschimbat + un rand REPREZENTANT (non-primary)',
      !!admDupa && admDupa.is_primary === rolAdmBefore?.is_primary && admDupa.club_id === rolAdmBefore?.club_id && repr.length === 1 && repr[0].is_primary === false,
      `roluri=${rolAdm.length}`);
    const clubDupa = await clubVizibile();
    // Politicile permisive pe grant (ext_p_*) nu depind de headerul de context: contul mixt vede reuniunea.
    // Comparatie cu starea de dinainte de aprobare (nu cu o presupunere despre vizibilitatea interna, preexistenta).
    const extra = [...clubDupa].filter(c => !clubInainte.has(c));
    const pierdute = [...clubInainte].filter(c => !clubDupa.has(c));
    record('Cont existent: vizibilitatea ADMIN_CLUB@B nu scade; castigul (daca exista) e doar clubul din grant (A)',
      clubInainte.has(CLUB_B) && clubDupa.has(CLUB_B) && pierdute.length === 0 && extra.every(c => c === CLUB_A),
      `cluburi inainte=${clubInainte.size}, dupa=${clubDupa.size}, pierdute=${pierdute.length}, extra=${extra.length}`);
  } catch (e: any) {
    record(`Exceptie neasteptata: ${String(e?.message ?? e).slice(0, 200)}`, false);
  } finally {
    // ── 8. Cleanup + reziduuri ─────────────────────────────────────────────
    await admin.from('cereri_acces_competitie').delete().like('email', `${EMAIL_PREFIX}%`);
    if (userIds.length) {
      await admin.from('acces_competitie_extern').delete().in('user_id', userIds);
      await admin.from('utilizator_roluri_multicont').delete().in('user_id', userIds);
    }
    if (competitii.length) {
      await admin.from('acces_competitie_extern').delete().in('competitie_id', competitii);
      await admin.from('cereri_acces_competitie').delete().in('competitie_id', competitii);
      await admin.from('competitii').delete().in('id', competitii);
    }
    for (const id of userIds) await admin.auth.admin.deleteUser(id);

    const resComp = (await admin.from('competitii').select('id').like('denumire', `${PREFIX}%`)).data?.length ?? -1;
    const resCer = (await admin.from('cereri_acces_competitie').select('id').like('email', 'zztest_faza36%')).data?.length ?? -1;
    const resGr = (await admin.from('acces_competitie_extern').select('id').in('competitie_id', competitii.length ? competitii : ['00000000-0000-0000-0000-000000000000'])).data?.length ?? -1;
    let resUsers = 0;
    for (let page = 1; page <= 10; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      resUsers += (data?.users ?? []).filter(u => (u.email ?? '').startsWith('zztest_faza36')).length;
      if ((data?.users?.length ?? 0) < 1000) break;
    }
    record('Reziduuri 0 (competitii ZZ_TEST_FAZA36_*, cereri, granturi, conturi auth)',
      resComp === 0 && resCer === 0 && resGr === 0 && resUsers === 0, `competitii=${resComp}, cereri=${resCer}, granturi=${resGr}, auth=${resUsers}`);

    const fail = results.filter(r => !r.passed).length;
    console.log(`\n${results.length - fail}/${results.length} PASS, ${fail} FAIL`);
    process.exit(fail ? 1 : 0);
  }
}

main();
