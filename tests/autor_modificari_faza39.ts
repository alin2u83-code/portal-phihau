// tests/autor_modificari_faza39.ts
//
// Faza 39 — Plan 11 (etapa 2). Baterie live pentru autorul modificarilor: sesiune de actor (D-06/D-07/D-19), audit extins pe
// tabelele wizardului (D-20), vizibilitatea jurnalului pe roluri, regresie pe auditul existent.
// Cere 20261111c (cont_club_curent) si 20261111d (autor_modificari) aplicate live.
//
// Rulare: npx tsx tests/autor_modificari_faza39.ts
//
// Siguranta date: prefix ZZ_TEST_FAZA39_ / zztest_faza39_; sportiv cu viza FRQKD curenta (ca in cont_club_faza39.ts, nu se
// declanseaza taxa anuala); aborteaza (exit 2) daca CLUB_A/CLUB_B au deja cont de competitie; cleanup in finally.
// audit_log nu are DELETE: randurile de audit generate de test raman; se numara la final (doar numaratori).
// GDPR: output doar ID-uri/tabele/numaratori; parolele de test sunt aleatoare si nu se afiseaza.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomBytes, randomUUID } from 'node:crypto';
import 'dotenv/config';
import { creeazaContClub } from '../api/_contCompetitieClub';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) {
  console.error('Lipsesc VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const CLUB_A = '83e7f771-46cf-4c4e-b70f-356d7b0bff06';
const CLUB_B = 'cbb0b228-b3e0-4735-9658-70999eb256c6';
const PREFIX = 'ZZ_TEST_FAZA39_';
const EMAIL_PREFIX = 'zztest_faza39_';
const RUN_ID = Date.now();
const NUME_LIBER = 'ZZ Persoana';

const admin = createClient(url, serviceKey);

type Check = { name: string; passed: boolean; detail?: string };
const results: Check[] = [];
const record = (name: string, passed: boolean, detail?: string) => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
};

const errOrRows = (r: { data: any; error: any }) => r.error?.message ?? `rows=${Array.isArray(r.data) ? r.data.length : r.data ? 1 : 0}`;
const ok = (r: { data: any; error: any }) => !r.error && !!r.data && (!Array.isArray(r.data) || r.data.length > 0);
const firstId = (r: { data: any }) => (Array.isArray(r.data) ? r.data[0]?.id : r.data?.id) as string | undefined;
const randomPass = () => `Zz!${randomBytes(12).toString('hex')}aA`;

async function clientFor(email: string, parola: string, contextId: string): Promise<SupabaseClient> {
  const c = createClient(url!, anonKey!, { global: { headers: { 'active-role-context-id': contextId } } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: parola });
  if (error || !data.session) throw new Error(`login ${email}: ${error?.message}`);
  return c;
}

async function listaUtilizatoriTest(): Promise<{ id: string; email: string }[]> {
  const out: { id: string; email: string }[] = [];
  for (let page = 1; page < 50; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    out.push(...users.filter((u) => (u.email ?? '').startsWith(EMAIL_PREFIX)).map((u) => ({ id: u.id, email: u.email! })));
    if (users.length < 1000) break;
  }
  return out;
}

// Pre-conditii: abort fara modificari (exit 2)
async function preconditii() {
  // 20261111c: cont_club_curent exista (service role -> null, fara eroare). Lipsa => PGRST202.
  const c = await admin.rpc('cont_club_curent');
  if (c.error) {
    console.error(`OPRIT (exit 2): cont_club_curent() lipseste (20261111c neaplicata?): ${c.error.message}`);
    process.exit(2);
  }
  const d = await admin.from('sesiuni_actor_competitie').select('user_id', { count: 'exact', head: true });
  if (d.error) {
    console.error(`OPRIT (exit 2): sesiuni_actor_competitie nu poate fi citita (20261111d neaplicata?): ${d.error.message}`);
    process.exit(2);
  }
  const { data, error } = await admin.from('conturi_competitie_club').select('club_id').in('club_id', [CLUB_A, CLUB_B]);
  if (error || (data && data.length > 0)) {
    console.error(`OPRIT (exit 2): conturi_competitie_club ilizibila sau cluburile de test au deja cont (pilot real). Nu modific nimic.`);
    process.exit(2);
  }
}

async function main() {
  await preconditii();

  const competitii: string[] = [];
  const userIds: string[] = [];
  const roluriTestIds: string[] = [];
  let spA = '';
  const startTs = new Date().toISOString();

  try {
    // ── sportiv cu viza FRQKD curenta in club A ──
    const { data: anF } = await admin.rpc('an_fiscal_federatie', { p_data: new Date().toISOString().slice(0, 10) });
    const an = typeof anF === 'number' ? anF : new Date().getFullYear();
    const { data: pk } = await admin.from('vize_sportivi').select('sportiv_id, sportivi!inner(club_id)')
      .eq('an', an).eq('tip', 'FRQKD').eq('sportivi.club_id', CLUB_A).limit(1);
    if (!pk?.[0]?.sportiv_id) throw new Error(`OPRIT: lipseste sportiv cu viza FRQKD an=${an} in club A`);
    spA = pk[0].sportiv_id as string;

    // ── competitie + categorie ──
    const { data: comp, error: compErr } = await admin.from('competitii').insert({
      denumire: `${PREFIX}ACTOR_${RUN_ID}`, tip: 'tehnica', data_inceput: '2027-06-01', data_sfarsit: '2027-06-02',
      locatie: 'Test', status: 'inscrieri_deschise', deadline_inscrieri: null,
    }).select('id').single();
    if (compErr || !comp) throw new Error(`competitie: ${compErr?.message}`);
    const ACT = comp.id as string;
    competitii.push(ACT);
    const { data: cat, error: catErr } = await admin.from('categorii_competitie').insert({
      competitie_id: ACT, denumire: `${PREFIX}cat_${RUN_ID}`, varsta_min: 8, gen: 'Mixt',
    }).select('id').single();
    if (catErr || !cat) throw new Error(`categorie: ${catErr?.message}`);
    const catId = cat.id as string;

    // ── conturi de club prin functia reala ──
    const callerId = randomUUID();
    const emailA = `${EMAIL_PREFIX}a_${RUN_ID}@example.com`;
    const emailB = `${EMAIL_PREFIX}b_${RUN_ID}@example.com`;
    const rA = await creeazaContClub(admin, { club_id: CLUB_A, email: emailA, callerId });
    if (rA.userId) userIds.push(rA.userId);
    const rB = await creeazaContClub(admin, { club_id: CLUB_B, email: emailB, callerId });
    if (rB.userId) userIds.push(rB.userId);
    record('creeazaContClub(A) si (B) -> ok', rA.ok && rB.ok && !!rA.userId && !!rB.userId, `A=${rA.status} B=${rB.status}`);
    if (!rA.ok || !rB.ok) throw new Error('OPRIT: conturile de club nu s-au creat');
    const uidA = rA.userId!;
    const uidB = rB.userId!;
    const parolaA = randomPass();
    const parolaB = randomPass();
    for (const [uid, p] of [[uidA, parolaA], [uidB, parolaB]] as const) {
      const { error } = await admin.auth.admin.updateUserById(uid, { password: p });
      if (error) throw new Error(`parola de test: ${error.message}`);
    }
    const rolReprez = async (uid: string) => {
      const { data } = await admin.from('utilizator_roluri_multicont').select('id').eq('user_id', uid).eq('rol_denumire', 'REPREZENTANT_COMPETITIE').maybeSingle();
      if (!data) throw new Error('rand REPREZENTANT lipsa');
      return data.id as string;
    };
    const CA = await clientFor(emailA, parolaA, await rolReprez(uidA));
    const anon = createClient(url!, anonKey!);

    // ── utilizatori temporari de staff (ADMIN_CLUB/INSTRUCTOR) ──
    const rolIdByName = async (nume: string) => {
      const { data } = await admin.from('roluri').select('id').eq('nume', nume).maybeSingle();
      if (!data) throw new Error(`rol ${nume} lipsa din roluri`);
      return data.id as string;
    };
    const mkStaff = async (tag: string, rol: 'ADMIN_CLUB' | 'INSTRUCTOR', club: string, numeCache: string) => {
      const email = `${EMAIL_PREFIX}${tag}_${RUN_ID}@example.com`;
      const parola = randomPass();
      const { data, error } = await admin.auth.admin.createUser({ email, password: parola, email_confirm: true });
      if (error || !data.user) throw new Error(`createUser ${tag}: ${error?.message}`);
      userIds.push(data.user.id);
      const { data: rr, error: rErr } = await admin.from('utilizator_roluri_multicont').insert({
        user_id: data.user.id, rol_id: await rolIdByName(rol), rol_denumire: rol, club_id: club, is_primary: true, nume_utilizator_cache: numeCache,
      }).select('id').single();
      if (rErr || !rr) throw new Error(`rol ${tag}: ${rErr?.message}`);
      roluriTestIds.push(rr.id);
      return { uid: data.user.id as string, rolId: rr.id as string, email, parola };
    };
    const admA = await mkStaff('admA', 'ADMIN_CLUB', CLUB_A, 'ZZ Admin A');
    const instrA = await mkStaff('instrA', 'INSTRUCTOR', CLUB_A, 'ZZ Instructor');
    const admB = await mkStaff('admB', 'ADMIN_CLUB', CLUB_B, 'ZZ Admin B');
    const CAdmA = await clientFor(admA.email, admA.parola, admA.rolId);
    const CInstrA = await clientFor(instrA.email, instrA.parola, instrA.rolId);
    const CAdmB = await clientFor(admB.email, admB.parola, admB.rolId);

    // ── 8a. regresie audit existent: insert-ul rolului (trigger audit pe utilizator_roluri_multicont) pastreaza formatul vechi ──
    const { data: rolAud } = await admin.from('audit_log').select('operatie, club_id, date_noi')
      .eq('tabel', 'utilizator_roluri_multicont').eq('rand_id', admA.rolId);
    const rolRow = rolAud?.find((x: any) => x.operatie === 'INSERT');
    record('R8 trigger-ul vechi (roluri) scrie in acelasi format: INSERT cu randul complet si club_id',
      !!rolRow && (rolRow as any).date_noi?.rol_denumire === 'ADMIN_CLUB' && (rolRow as any).club_id === CLUB_A,
      `randuri=${rolAud?.length ?? 0}`);

    // ── 1. instructori_club_cont ──
    const li = await CA.rpc('instructori_club_cont');
    const listaIds: string[] = ((li.data as any[]) ?? []).map((x) => x.user_id);
    record('L1 instructori_club_cont(A) contine instructorul si adminul temporar ai lui A',
      !li.error && listaIds.includes(instrA.uid) && listaIds.includes(admA.uid), li.error?.message ?? `n=${listaIds.length}`);
    record('L1 instructori_club_cont(A) NU contine adminul lui B', !listaIds.includes(admB.uid));
    const { data: roluriLista } = await admin.from('utilizator_roluri_multicont').select('user_id, club_id')
      .in('user_id', listaIds.length ? listaIds : [randomUUID()]).in('rol_denumire', ['INSTRUCTOR', 'ADMIN_CLUB']);
    const toateInA = listaIds.every((id) => (roluriLista ?? []).some((y: any) => y.user_id === id && y.club_id === CLUB_A));
    record('L1 toate persoanele din lista au rol de staff in club A', toateInA, `n=${listaIds.length}`);

    // ── 2. deschide_sesiune_actor ──
    let r: any = await CA.rpc('deschide_sesiune_actor', { p_competitie: ACT, p_actor_user_id: instrA.uid, p_actor_nume: null });
    record('S2 deschide_sesiune_actor cu instructor din club -> ok, actor_din_lista=true',
      !r.error && r.data?.actor_din_lista === true && r.data?.actor_user_id === instrA.uid, r.error?.message ?? 'ok');
    r = await CA.rpc('deschide_sesiune_actor', { p_competitie: ACT, p_actor_user_id: admB.uid, p_actor_nume: null });
    record('S2 deschide_sesiune_actor cu utilizatorul altui club -> eroare 22023', !!r.error && r.error.code === '22023', r.error?.code ?? 'fara eroare');
    r = await CA.rpc('deschide_sesiune_actor', { p_competitie: ACT, p_actor_user_id: null, p_actor_nume: 'Z' });
    record('S2 deschide_sesiune_actor cu nume de 1 caracter -> eroare', !!r.error, r.error?.code ?? 'fara eroare');
    r = await CAdmA.rpc('deschide_sesiune_actor', { p_competitie: ACT, p_actor_user_id: null, p_actor_nume: NUME_LIBER });
    record('S2 deschide_sesiune_actor apelat de admin (nu cont de club) -> eroare 42501', !!r.error && r.error.code === '42501', r.error?.code ?? 'fara eroare');
    r = await anon.rpc('deschide_sesiune_actor', { p_competitie: ACT, p_actor_user_id: null, p_actor_nume: NUME_LIBER });
    record('S2 deschide_sesiune_actor anon -> eroare de permisiune', !!r.error, r.error?.code ?? 'fara eroare');
    r = await CA.rpc('deschide_sesiune_actor', { p_competitie: ACT, p_actor_user_id: null, p_actor_nume: NUME_LIBER });
    record('S2 deschide_sesiune_actor cu nume liber -> ok, actor_din_lista=false',
      !r.error && r.data?.actor_din_lista === false && r.data?.actor_user_id === null && r.data?.actor_nume === NUME_LIBER, r.error?.message ?? 'ok');

    // ── 3. D-07: o singura sesiune per cont ──
    await CA.rpc('deschide_sesiune_actor', { p_competitie: ACT, p_actor_user_id: null, p_actor_nume: `${NUME_LIBER} Doi` });
    await CA.rpc('deschide_sesiune_actor', { p_competitie: ACT, p_actor_user_id: null, p_actor_nume: NUME_LIBER });
    const { data: sesiuni } = await admin.from('sesiuni_actor_competitie').select('actor_nume').eq('user_id', uidA);
    record('D07 doua deschideri succesive -> un singur rand de sesiune, cu ultimul nume', sesiuni?.length === 1 && sesiuni[0].actor_nume === NUME_LIBER, `randuri=${sesiuni?.length ?? -1}`);
    const cur = await CA.rpc('sesiune_actor_curenta');
    record('D07 sesiune_actor_curenta() intoarce sesiunea deschisa', !cur.error && cur.data?.actor_nume === NUME_LIBER, cur.error?.message ?? 'ok');

    // ── 4. audit pe tabelele wizardului, cu actorul din sesiune ──
    const rIns = await CA.from('inscrieri_competitie').insert({ competitie_id: ACT, categorie_id: catId, club_id: CLUB_A, sportiv_id: spA, status: 'inscris' }).select('id');
    record('A4 contul A insereaza inscriere (club A)', ok(rIns), errOrRows(rIns));
    const rEch = await CA.from('echipe_competitie').insert({ competitie_id: ACT, categorie_id: catId, club_id: CLUB_A, denumire_echipa: `${PREFIX}ech_${RUN_ID}`, status: 'inscrisa' }).select('id');
    record('A4 contul A insereaza echipa (club A)', ok(rEch), errOrRows(rEch));
    const insId = firstId(rIns);
    const echId = firstId(rEch);
    let membruId: string | undefined;
    if (echId) {
      const rMem = await CA.from('echipa_sportivi').insert({ echipa_id: echId, sportiv_id: spA, rol: 'titular' }).select('id');
      record('A4 contul A insereaza membru in echipa (echipa_sportivi)', ok(rMem), errOrRows(rMem));
      membruId = firstId(rMem);
      if (membruId) {
        const rUpd = await CA.from('echipa_sportivi').update({ rol: 'rezerva' }).eq('id', membruId).select('id');
        record('A4 contul A schimba rolul membrului (UPDATE)', ok(rUpd), errOrRows(rUpd));
      }
    }
    const idsAud = [insId, echId, membruId].filter(Boolean) as string[];
    const { data: aud } = await admin.from('audit_log')
      .select('tabel, operatie, rand_id, club_id, competitie_id, actor_nume, actor_din_lista, date_vechi, date_noi')
      .in('rand_id', idsAud.length ? idsAud : [randomUUID()]);
    const gaseste = (tabel: string, op: string, rand?: string) => (aud ?? []).find((x: any) => x.tabel === tabel && x.operatie === op && x.rand_id === rand) as any;
    for (const [tabel, rand] of [['inscrieri_competitie', insId], ['echipe_competitie', echId], ['echipa_sportivi', membruId]] as const) {
      const a = gaseste(tabel, 'INSERT', rand);
      record(`A4 audit INSERT ${tabel}: actor, competitie, club corecte`,
        !!a && a.actor_nume === NUME_LIBER && a.competitie_id === ACT && a.club_id === CLUB_A && a.actor_din_lista === false,
        a ? `actor_nume=${a.actor_nume === NUME_LIBER ? 'ok' : 'gresit'} comp=${a.competitie_id === ACT} club=${a.club_id === CLUB_A}` : 'lipsa');
    }
    const aU = gaseste('echipa_sportivi', 'UPDATE', membruId);
    const kN = aU ? Object.keys(aU.date_noi ?? {}) : [];
    const kV = aU ? Object.keys(aU.date_vechi ?? {}) : [];
    record('A4 audit UPDATE echipa_sportivi: doar cheia schimbata (rol)',
      !!aU && kN.length === 1 && kN[0] === 'rol' && kV.length === 1 && kV[0] === 'rol' && aU.date_vechi.rol === 'titular' && aU.date_noi.rol === 'rezerva',
      aU ? `chei_noi=${kN.join(',')}` : 'lipsa');

    // ── 5. payload spoof: actorul din audit ramane cel din sesiune ──
    const sp = await CA.from('echipe_competitie').insert({ competitie_id: ACT, categorie_id: catId, club_id: CLUB_A, denumire_echipa: `${PREFIX}spoof_${RUN_ID}`, status: 'inscrisa', actor_nume: 'ZZ Spoof' } as any).select('id');
    if (!ok(sp)) {
      record('INFO P5 payload cu actor_nume refuzat de PostgREST/RLS (coloana nu exista pe echipe_competitie)', true, sp.error?.code ?? 'fara eroare');
    } else {
      const { data: a } = await admin.from('audit_log').select('actor_nume').eq('tabel', 'echipe_competitie').eq('rand_id', firstId(sp)!).eq('operatie', 'INSERT');
      record('P5 payload cu actor_nume acceptat: actorul din audit ramane cel din sesiune', a?.[0]?.actor_nume === NUME_LIBER, `actor=${a?.[0]?.actor_nume === NUME_LIBER ? 'sesiune' : 'payload?'}`);
    }

    // ── 6. D-19: expirare dupa 4 ore de inactivitate ──
    const acum5h = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
    const { error: expErr } = await admin.from('sesiuni_actor_competitie').update({ ultima_activitate: acum5h }).eq('user_id', uidA); // ultima_activitate = now() - 5 hours
    record('D19 setare ultima_activitate = acum 5 ore (service role)', !expErr, expErr?.message);
    const curExp = await CA.rpc('sesiune_actor_curenta');
    record('D19 sesiune_actor_curenta() -> null dupa expirare', !curExp.error && curExp.data === null, curExp.error?.message ?? String(curExp.data));
    const rExp = await CA.from('echipe_competitie').insert({ competitie_id: ACT, categorie_id: catId, club_id: CLUB_A, denumire_echipa: `${PREFIX}expirat_${RUN_ID}`, status: 'inscrisa' }).select('id');
    record('D19 scrierea contului de club dupa expirare e REFUZATA (20261111d3: autor obligatoriu)', !!rExp.error && !ok(rExp), rExp.error?.message ?? 'scriere acceptata fara autor!');
    const { data: audExp } = await admin.from('echipe_competitie').select('id').eq('competitie_id', ACT).eq('denumire_echipa', `${PREFIX}expirat_${RUN_ID}`);
    record('D19 nicio echipa creata dupa expirare', (audExp?.length ?? 0) === 0, `randuri=${audExp?.length ?? -1}`);

    // ── 7. D-20: vizibilitatea jurnalului ──
    // sesiune noua cu instructorul ca actor, ca sa existe un rand cu actor_user_id = instructor
    await CA.rpc('deschide_sesiune_actor', { p_competitie: ACT, p_actor_user_id: instrA.uid, p_actor_nume: null });
    const rInstr = await CA.from('echipe_competitie').insert({ competitie_id: ACT, categorie_id: catId, club_id: CLUB_A, denumire_echipa: `${PREFIX}instr_${RUN_ID}`, status: 'inscrisa' }).select('id');
    const echInstrId = firstId(rInstr);
    record('J7 contul A scrie cu instructorul ca actor', ok(rInstr), errOrRows(rInstr));
    const jurnal = (c: SupabaseClient) => c.from('audit_log').select('id, rand_id, club_id, actor_user_id').eq('competitie_id', ACT).not('actor_nume', 'is', null);
    const jA = await jurnal(CAdmA);
    record('J7 admin A vede jurnalul clubului A (inclusiv randul instructorului)',
      !jA.error && (jA.data?.length ?? 0) >= 2 && jA.data!.every((x: any) => x.club_id === CLUB_A) && !!jA.data!.find((x: any) => x.rand_id === echInstrId),
      jA.error?.message ?? `n=${jA.data?.length ?? 0}`);
    const jB = await jurnal(CAdmB);
    record('J7 admin B NU vede randurile lui A', !jB.error && (jB.data?.length ?? 0) === 0, jB.error?.message ?? `n=${jB.data?.length ?? 0}`);
    const jI = await jurnal(CInstrA);
    record('J7 instructorul A vede doar randurile unde e actor',
      !jI.error && (jI.data?.length ?? 0) >= 1 && jI.data!.every((x: any) => x.actor_user_id === instrA.uid) && !!jI.data!.find((x: any) => x.rand_id === echInstrId) && !jI.data!.find((x: any) => x.rand_id === insId),
      jI.error?.message ?? `n=${jI.data?.length ?? 0}`);
    const jC = await CA.from('audit_log').select('id').eq('competitie_id', ACT);
    record('J7 contul de club A NU citeste audit_log (eroare sau 0 randuri)', !!jC.error || (jC.data?.length ?? 0) === 0, errOrRows(jC));
    // contul extern nu poate falsifica jurnalul (20261111d2): INSERT direct in audit_log trebuie refuzat
    const uidContA = (await CA.auth.getUser()).data.user?.id;
    const fals = await CA.from('audit_log').insert({ user_id: uidContA, tabel: 'zz_test', operatie: 'INSERT', actor_nume: 'ZZ Fals', club_id: null });
    record('J7 contul de club A NU poate insera direct in audit_log', !!fals.error, fals.error?.message ?? 'INSERT acceptat!');

    // ── 8b. regresie: catalogul (triggere audit_sportivi/plati/facturi, pg_get_functiondef) nu e accesibil prin PostgREST ──
    // Se verifica de orchestrator prin MCP in 39-11 Task 3; aici ramane verificarea comportamentala R8 de mai sus.
  } catch (e) {
    record('executie fara exceptii', false, e instanceof Error ? e.message : String(e));
  } finally {
    let auditGenerate = -1;
    try {
      const reziduali = await listaUtilizatoriTest();
      const toti = Array.from(new Set([...userIds, ...reziduali.map((u) => u.id)]));
      if (competitii.length) {
        const { data: ech } = await admin.from('echipe_competitie').select('id').in('competitie_id', competitii);
        const echIds = (ech ?? []).map((x: any) => x.id);
        if (echIds.length) await admin.from('echipa_sportivi').delete().in('echipa_id', echIds);
        await admin.from('inscrieri_competitie').delete().in('competitie_id', competitii);
        await admin.from('echipe_competitie').delete().in('competitie_id', competitii);
        await admin.from('categorii_competitie').delete().in('competitie_id', competitii);
        await admin.from('competitii').delete().in('id', competitii);
      }
      for (const id of toti) {
        await admin.from('sesiuni_actor_competitie').delete().eq('user_id', id);
        await admin.from('conturi_competitie_club').delete().eq('user_id', id);
        await admin.from('utilizator_roluri_multicont').delete().eq('user_id', id);
        await admin.from('mfa_dispozitive_incredere').delete().eq('user_id', id);
        await admin.from('mfa_email_verificari').delete().eq('user_id', id);
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) record('cleanup: stergere utilizator de test', false, `${id}: ${error.message}`);
      }
      // audit_log nu are DELETE: doar numaram randurile generate de test (competitie ZZ + rolurile temporare)
      let n = 0;
      if (competitii.length) n += (await admin.from('audit_log').select('id', { count: 'exact', head: true }).in('competitie_id', competitii)).count ?? 0;
      if (roluriTestIds.length) n += (await admin.from('audit_log').select('id', { count: 'exact', head: true }).in('rand_id', roluriTestIds)).count ?? 0;
      auditGenerate = n;
    } catch (e) {
      record('cleanup fara exceptii', false, e instanceof Error ? e.message : String(e));
    }

    const cn = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? -1;
    const rc = await cn(admin.from('competitii').select('id', { count: 'exact', head: true }).like('denumire', `${PREFIX}%`));
    const re = await cn(admin.from('echipe_competitie').select('id', { count: 'exact', head: true }).like('denumire_echipa', `${PREFIX}%`));
    const rk = await cn(admin.from('categorii_competitie').select('id', { count: 'exact', head: true }).like('denumire', `${PREFIX}%`));
    const rcont = await cn(admin.from('conturi_competitie_club').select('club_id', { count: 'exact', head: true }).in('club_id', [CLUB_A, CLUB_B]));
    const rses = await cn(admin.from('sesiuni_actor_competitie').select('user_id', { count: 'exact', head: true }).in('club_id', [CLUB_A, CLUB_B]).gte('deschisa_la', startTs));
    const rrol = roluriTestIds.length
      ? await cn(admin.from('utilizator_roluri_multicont').select('id', { count: 'exact', head: true }).in('id', roluriTestIds))
      : 0;
    const ru = (await listaUtilizatoriTest()).length;
    let platiNoi = 0;
    let vizeNoi = 0;
    if (spA) {
      platiNoi = await cn(admin.from('plati').select('id', { count: 'exact', head: true }).eq('sportiv_id', spA).gte('created_at', startTs));
      vizeNoi = await cn(admin.from('vize_sportivi').select('id', { count: 'exact', head: true }).eq('sportiv_id', spA).gte('created_at', startTs));
    }
    record('reziduuri: competitii/echipe/categorii/conturi/sesiuni/roluri temporare/utilizatori test=0, plati noi=0, vize noi=0',
      rc === 0 && re === 0 && rk === 0 && rcont === 0 && rses === 0 && rrol === 0 && ru === 0 && platiNoi === 0 && vizeNoi === 0,
      `competitii=${rc} echipe=${re} categorii=${rk} conturi=${rcont} sesiuni=${rses} roluri=${rrol} utilizatori=${ru} plati=${platiNoi} vize=${vizeNoi}`);
    console.log(`INFO randuri audit_log generate de test (raman, fara DELETE): ${auditGenerate}`);
  }

  const fail = results.filter((x) => !x.passed);
  console.log(`\n${results.length - fail.length}/${results.length} verificari trecute`);
  if (fail.length) {
    console.error('ESUATE:\n' + fail.map((x) => ` - ${x.name}${x.detail ? ` (${x.detail})` : ''}`).join('\n'));
    process.exit(1);
  }
}

main();
