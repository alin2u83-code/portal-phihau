// tests/cont_club_faza39.ts
//
// Faza 39 — Plan 04. Baterie live pentru contul unic de competitie per club (REPREZENTANT_COMPETITIE + conturi_competitie_club).
// Acopera: vizibilitate D-12/D-03, izolare citire/scriere, istoric doar citire, escaladare, spoof header, anon,
// schimbare email D-15 (acces retras imediat + ban) si numaratoarea rolurilor D-02.
//
// Rulare (DOAR dupa aplicarea 20261111b + 20261111c, cu OK explicit): npx tsx tests/cont_club_faza39.ts
//
// Alegere de seed (39-AUDIT-LIVE, sectiunea 9): pe inscrieri_competitie exista trg_taxa_anuala_inscrieri_competitie
// (AFTER INSERT -> trg_activeaza_taxa_anuala, poate crea taxa/factura; corpul functiei NU e in repo, deci efectele nu se pot
// curata determinist). Pe echipe_competitie triggerele sunt trg_echipe_denumire_implicita (BEFORE INSERT) si
// trg_extern_protejeaza_echipe (BEFORE UPDATE): nu creeaza plati. De aceea:
//   - participarea clubului la o competitie (D-12) se seed-uieste DOAR prin echipe_competitie;
//   - cazul POZITIV de scriere (contul scrie pentru clubul propriu in competitia activa) se testeaza pe echipe_competitie;
//   - pe inscrieri_competitie se testeaza doar cazurile NEGATIVE (trebuie respinse); la final se verifica detectiv ca nu
//     au aparut plati/vize noi pentru sportivii de test (ca in testul Faza 36).
//
// Siguranta date: doar sportivi cu viza FRQKD curenta; competitii ZZ_TEST_FAZA39_*; utilizatori zztest_faza39_*;
// cleanup in finally. Aborteaza (exit 2) daca CLUB_A/CLUB_B au deja cont de competitie (pilot real).
// GDPR: output doar cu ID-uri, nume de tabele si numaratori; parolele de test sunt aleatoare si nu se afiseaza.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomBytes, randomUUID } from 'node:crypto';
import 'dotenv/config';
import { creeazaContClub, schimbaEmailContClub } from '../api/_contCompetitieClub';

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
// Baza D-02 din 39-AUDIT-LIVE.md sectiunea 7
const BAZA_ADMIN_CLUB = 41;
const BAZA_INSTRUCTOR = 2;

const admin = createClient(url, serviceKey);

type Check = { name: string; passed: boolean; detail?: string };
const results: Check[] = [];
const record = (name: string, passed: boolean, detail?: string) => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
};

const errOrRows = (r: { data: any; error: any }) => r.error?.message ?? `rows=${Array.isArray(r.data) ? r.data.length : r.data ? 1 : 0}`;
const ok = (r: { data: any; error: any }) => !r.error && !!r.data && (!Array.isArray(r.data) || r.data.length > 0);
const randomPass = () => `Zz!${randomBytes(12).toString('hex')}aA`;

async function clientFor(email: string, parola: string, contextId: string): Promise<SupabaseClient> {
  const c = createClient(url!, anonKey!, { global: { headers: { 'active-role-context-id': contextId } } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: parola });
  if (error || !data.session) throw new Error(`login ${email}: ${error?.message}`);
  return c;
}

const idsOf = async (c: SupabaseClient, table: string, col = 'id'): Promise<string[]> => {
  const { data } = await c.from(table).select(col).limit(1000);
  return ((data as any[]) ?? []).map((x) => x[col]);
};

// Pre-conditii: abort fara modificari (exit 2)
async function preconditii() {
  const { data, error } = await admin.from('conturi_competitie_club').select('club_id').in('club_id', [CLUB_A, CLUB_B]);
  if (error) {
    console.error(`OPRIT (exit 2): conturi_competitie_club nu poate fi citita (migrarea 20261111c aplicata?): ${error.message}`);
    process.exit(2);
  }
  if (data && data.length > 0) {
    console.error(`OPRIT (exit 2): ${data.length} din cluburile de test au deja cont de competitie (pilot real). Nu modific nimic.`);
    process.exit(2);
  }
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

async function main() {
  await preconditii();

  const competitii: string[] = [];
  const userIds: string[] = [];
  let spA = '';
  let spB = '';
  const startTs = new Date().toISOString();

  try {
    // ── sportivi cu viza FRQKD curenta (doar pentru cazurile negative pe inscrieri) ──
    const { data: anF } = await admin.rpc('an_fiscal_federatie', { p_data: new Date().toISOString().slice(0, 10) });
    const an = typeof anF === 'number' ? anF : new Date().getFullYear();
    const pick = async (club: string) => {
      const { data } = await admin.from('vize_sportivi').select('sportiv_id, sportivi!inner(club_id)')
        .eq('an', an).eq('tip', 'FRQKD').eq('sportivi.club_id', club).limit(1);
      return data?.[0]?.sportiv_id as string | undefined;
    };
    const a = await pick(CLUB_A);
    const b = await pick(CLUB_B);
    if (!a || !b) throw new Error(`OPRIT: lipseste sportiv cu viza FRQKD an=${an} (A=${a}, B=${b})`);
    spA = a;
    spB = b;

    // ── competitii + categorii ──
    const mkComp = async (suffix: string, status: string, inceput: string, sfarsit: string) => {
      const { data, error } = await admin.from('competitii').insert({
        denumire: `${PREFIX}${suffix}_${RUN_ID}`, tip: 'tehnica', data_inceput: inceput, data_sfarsit: sfarsit,
        locatie: 'Test', status, deadline_inscrieri: null,
      }).select('id').single();
      if (error || !data) throw new Error(`competitie ${suffix}: ${error?.message}`);
      competitii.push(data.id);
      return data.id as string;
    };
    const mkCat = async (comp: string, suffix: string) => {
      const { data, error } = await admin.from('categorii_competitie').insert({
        competitie_id: comp, denumire: `${PREFIX}${suffix}_${RUN_ID}`, varsta_min: 8, gen: 'Mixt',
      }).select('id').single();
      if (error || !data) throw new Error(`categorie ${suffix}: ${error?.message}`);
      return data.id as string;
    };
    const ACTIVA = await mkComp('ACTIVA', 'inscrieri_deschise', '2027-06-01', '2027-06-02');
    const FINAL_PART = await mkComp('FINAL_PART', 'finalizata', '2025-01-10', '2025-01-11');
    const FINAL_FARA = await mkComp('FINAL_FARA', 'finalizata', '2025-01-10', '2025-01-11');
    const DRAFT = await mkComp('DRAFT', 'draft', '2027-07-01', '2027-07-02');
    const catAct = await mkCat(ACTIVA, 'catAct');
    const catFinP = await mkCat(FINAL_PART, 'catFinP');
    await mkCat(FINAL_FARA, 'catFinF');
    await mkCat(DRAFT, 'catDraft');

    const mkEchipa = async (comp: string, cat: string, club: string, tag: string) => {
      const { data, error } = await admin.from('echipe_competitie').insert({
        competitie_id: comp, categorie_id: cat, club_id: club, denumire_echipa: `${PREFIX}${tag}_${RUN_ID}`,
      }).select('id').single();
      if (error || !data) throw new Error(`echipa ${tag}: ${error?.message}`);
      return data.id as string;
    };
    const echAAct = await mkEchipa(ACTIVA, catAct, CLUB_A, 'echAAct');
    const echBAct = await mkEchipa(ACTIVA, catAct, CLUB_B, 'echBAct');
    const echAFin = await mkEchipa(FINAL_PART, catFinP, CLUB_A, 'echAFin');

    // ── conturi de club prin functia reala ──
    const callerId = randomUUID();
    const emailA = `${EMAIL_PREFIX}a_${RUN_ID}@example.com`;
    const emailB = `${EMAIL_PREFIX}b_${RUN_ID}@example.com`;
    const rA = await creeazaContClub(admin, { club_id: CLUB_A, email: emailA, callerId });
    if (rA.userId) userIds.push(rA.userId);
    record('creeazaContClub(A) -> ok', rA.ok && !!rA.userId, `status=${rA.status}`);
    const rB = await creeazaContClub(admin, { club_id: CLUB_B, email: emailB, callerId });
    if (rB.userId) userIds.push(rB.userId);
    record('creeazaContClub(B) -> ok', rB.ok && !!rB.userId, `status=${rB.status}`);
    if (!rA.ok || !rB.ok) throw new Error('OPRIT: conturile de club nu s-au creat');
    const uidA = rA.userId!;
    const uidB = rB.userId!;

    // login in test: parola aleatoare doar pentru test (contul real e doar OTP)
    const parolaA = randomPass();
    const parolaB = randomPass();
    for (const [uid, p] of [[uidA, parolaA], [uidB, parolaB]] as const) {
      const { error } = await admin.auth.admin.updateUserById(uid, { password: p });
      if (error) throw new Error(`parola de test: ${error.message}`);
    }
    const rolId = async (uid: string) => {
      const { data } = await admin.from('utilizator_roluri_multicont').select('id').eq('user_id', uid).eq('rol_denumire', 'REPREZENTANT_COMPETITIE').maybeSingle();
      if (!data) throw new Error('rand REPREZENTANT lipsa');
      return data.id as string;
    };
    const rolA = await rolId(uidA);
    const rolB = await rolId(uidB);
    const CA = await clientFor(emailA, parolaA, rolA);
    const CB = await clientFor(emailB, parolaB, rolB);
    const SPOOF = await clientFor(emailA, parolaA, rolB); // clientul A cu headerul randului REPREZENTANT al lui B

    // ── 1. D-12 / D-03 vizibilitate ──
    const compA = await idsOf(CA, 'competitii');
    record('V1 A vede ACTIVA si FINAL_PART', compA.includes(ACTIVA) && compA.includes(FINAL_PART), `n=${compA.length}`);
    record('V1 A NU vede FINAL_FARA si DRAFT', !compA.includes(FINAL_FARA) && !compA.includes(DRAFT));
    const compB = await idsOf(CB, 'competitii');
    record('V1 B vede ACTIVA dar NU FINAL_PART (nu a participat)', compB.includes(ACTIVA) && !compB.includes(FINAL_PART), `n=${compB.length}`);
    const catVisA = await idsOf(CA, 'categorii_competitie', 'competitie_id');
    record('V1 A: categorii doar din competitii vizibile', !catVisA.includes(FINAL_FARA) && !catVisA.includes(DRAFT), `n=${catVisA.length}`);

    // ── 2. izolare citire ──
    const inscClub = await idsOf(CA, 'inscrieri_competitie', 'club_id');
    record('R2 A: toate inscrierile vizibile sunt ale clubului A', inscClub.every((x) => x === CLUB_A), `n=${inscClub.length}`);
    const spClub = await idsOf(CA, 'sportivi', 'club_id');
    record('R2 A: sportivi doar din club A', spClub.length > 0 && spClub.every((x) => x === CLUB_A), `n=${spClub.length}`);
    const ech = await idsOf(CA, 'echipe_competitie');
    record('R2 A vede echipele proprii (ACTIVA, FINAL_PART), nu pe cea a lui B', ech.includes(echAAct) && ech.includes(echAFin) && !ech.includes(echBAct), `n=${ech.length}`);
    const spBvis = await CA.from('sportivi').select('id').eq('id', spB);
    record('R2 A: sportiv din club B invizibil', (spBvis.data?.length ?? 0) === 0, errOrRows(spBvis));
    for (const t of ['plati', 'grupe', 'facturi']) {
      const r = await CA.from(t).select('*').limit(5);
      record(`R2 A: ${t} default-deny (0 randuri sau eroare)`, !!r.error || (r.data?.length ?? 0) === 0, errOrRows(r));
    }

    // ── 3. izolare scriere ──
    let r: any = await CA.from('echipe_competitie').insert({ competitie_id: ACTIVA, categorie_id: catAct, club_id: CLUB_A, denumire_echipa: `${PREFIX}echA2_${RUN_ID}`, status: 'inscrisa' }).select('id');
    record('W3 A creeaza echipa pentru club A in ACTIVA (pozitiv)', ok(r), errOrRows(r));
    r = await CA.from('echipe_competitie').insert({ competitie_id: ACTIVA, categorie_id: catAct, club_id: CLUB_B, denumire_echipa: `${PREFIX}echX_${RUN_ID}`, status: 'inscrisa' }).select('id');
    const echXn = (await admin.from('echipe_competitie').select('id', { count: 'exact', head: true }).like('denumire_echipa', `${PREFIX}echX_%`)).count ?? 0;
    record('W3 A NU creeaza echipa pentru club B', !ok(r) && echXn === 0, errOrRows(r));
    r = await CA.from('echipe_competitie').insert({ competitie_id: FINAL_PART, categorie_id: catFinP, club_id: CLUB_A, denumire_echipa: `${PREFIX}echF_${RUN_ID}`, status: 'inscrisa' }).select('id');
    const echFn = (await admin.from('echipe_competitie').select('id', { count: 'exact', head: true }).like('denumire_echipa', `${PREFIX}echF_%`)).count ?? 0;
    record('W3 A NU scrie echipa in competitie terminata (istoric doar citire)', !ok(r) && echFn === 0, errOrRows(r));
    r = await CA.from('echipe_competitie').update({ denumire_echipa: 'hack' }).eq('id', echAFin).select('id');
    const echFst = (await admin.from('echipe_competitie').select('denumire_echipa').eq('id', echAFin).single()).data;
    record('W3 A NU modifica echipa din competitie terminata', !ok(r) && echFst?.denumire_echipa === `${PREFIX}echAFin_${RUN_ID}`, errOrRows(r));
    r = await CA.from('echipe_competitie').delete().eq('id', echAFin).select('id');
    record('W3 A NU sterge echipa din competitie terminata', !ok(r) && !!(await admin.from('echipe_competitie').select('id').eq('id', echAFin).maybeSingle()).data, errOrRows(r));
    r = await CA.from('echipe_competitie').update({ denumire_echipa: 'hack' }).eq('id', echBAct).select('id');
    record('W3 A NU modifica echipa clubului B', !ok(r), errOrRows(r));

    // inscrieri: doar cazuri negative (vezi antet)
    const nIns = async (filter: Record<string, any>) => {
      let q = admin.from('inscrieri_competitie').select('id', { count: 'exact', head: true });
      for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
      return (await q).count ?? 0;
    };
    r = await CA.from('inscrieri_competitie').insert({ competitie_id: ACTIVA, categorie_id: catAct, club_id: CLUB_B, sportiv_id: spB, status: 'inscris' }).select('id');
    record('W3 A NU inscrie cu club_id=B in ACTIVA', !ok(r) && (await nIns({ competitie_id: ACTIVA, club_id: CLUB_B })) === 0, errOrRows(r));
    r = await CA.from('inscrieri_competitie').insert({ competitie_id: ACTIVA, categorie_id: catAct, club_id: CLUB_A, sportiv_id: spB, status: 'inscris' }).select('id');
    record('W3 A NU inscrie sportiv din B pe club A', !ok(r) && (await nIns({ competitie_id: ACTIVA, sportiv_id: spB })) === 0, errOrRows(r));
    r = await CA.from('inscrieri_competitie').insert({ competitie_id: FINAL_PART, categorie_id: catFinP, club_id: CLUB_A, sportiv_id: spA, status: 'inscris' }).select('id');
    record('W3 A NU inscrie in competitie terminata', !ok(r) && (await nIns({ competitie_id: FINAL_PART })) === 0, errOrRows(r));

    // ── 4. escaladare ──
    r = await CA.from('conturi_competitie_club').insert({ club_id: CLUB_B, user_id: uidA, email: `${EMAIL_PREFIX}hack_${RUN_ID}@example.com` }).select('club_id');
    record('E4 A NU insereaza in conturi_competitie_club', !ok(r), errOrRows(r));
    r = await CA.from('conturi_competitie_club').update({ email: `${EMAIL_PREFIX}hack_${RUN_ID}@example.com` }).eq('club_id', CLUB_A).select('club_id');
    const cst = (await admin.from('conturi_competitie_club').select('email').eq('club_id', CLUB_A).single()).data;
    record('E4 A NU modifica conturi_competitie_club', !ok(r) && cst?.email === emailA, errOrRows(r));
    r = await CA.from('utilizator_roluri_multicont').insert({ user_id: uidA, rol_denumire: 'ADMIN_CLUB', club_id: CLUB_A, is_primary: false }).select('id');
    const escal = (await admin.from('utilizator_roluri_multicont').select('id').eq('user_id', uidA).eq('rol_denumire', 'ADMIN_CLUB')).data ?? [];
    record('E4 A NU isi atribuie ADMIN_CLUB (utilizator_roluri_multicont)', !ok(r) && escal.length === 0, errOrRows(r));
    r = await CA.from('utilizator_roluri_multicont').update({ rol_denumire: 'ADMIN_CLUB', club_id: CLUB_A }).eq('id', rolA).select('id');
    const rolSt = (await admin.from('utilizator_roluri_multicont').select('rol_denumire, club_id').eq('id', rolA).single()).data;
    record('E4 A NU isi modifica rolul', !ok(r) && rolSt?.rol_denumire === 'REPREZENTANT_COMPETITIE' && rolSt?.club_id === null, errOrRows(r));
    r = await CA.from('proprietari_aplicatie').insert({ user_id: uidA }).select('user_id');
    const prop = (await admin.from('proprietari_aplicatie').select('user_id').eq('user_id', uidA)).data ?? [];
    record('E4 A NU devine proprietar (proprietari_aplicatie)', !ok(r) && prop.length === 0, errOrRows(r));
    const ep = await CA.rpc('este_proprietar');
    record('E4 rpc este_proprietar() = false pentru A', !ep.error && ep.data === false, ep.error?.message ?? String(ep.data));
    const cVis = await CA.from('conturi_competitie_club').select('club_id, user_id');
    record('E4 A vede in conturi_competitie_club doar randul propriu',
      !cVis.error && cVis.data?.length === 1 && cVis.data[0].club_id === CLUB_A && cVis.data[0].user_id === uidA, errOrRows(cVis));

    // ── 5. header spoof ──
    const spS = await idsOf(SPOOF, 'sportivi', 'club_id');
    const spI = await idsOf(SPOOF, 'inscrieri_competitie', 'club_id');
    const spE = await idsOf(SPOOF, 'echipe_competitie');
    const spC = await idsOf(SPOOF, 'competitii');
    record('S5 spoof header (randul lui B) nu da datele lui B contului A',
      spS.every((x) => x === CLUB_A) && spI.every((x) => x === CLUB_A) && !spE.includes(echBAct) && !spC.includes(FINAL_FARA),
      `sp=${spS.length} insc=${spI.length} ech=${spE.length}`);

    // ── 6. anon ──
    const anon = createClient(url!, anonKey!);
    const an1 = await anon.rpc('cont_club_curent');
    record('N6 anon: cont_club_curent -> eroare de permisiune', !!an1.error, an1.error?.message ?? 'fara eroare');
    const an2 = await anon.rpc('competitie_vizibila_cont_club', { p_competitie: ACTIVA, p_club: CLUB_A });
    record('N6 anon: competitie_vizibila_cont_club -> eroare de permisiune', !!an2.error, an2.error?.message ?? 'fara eroare');

    // ── 8. D-02 (inainte de D-15, tot cu service role) ──
    const cnt = async (rol: string) =>
      (await admin.from('utilizator_roluri_multicont').select('id', { count: 'exact', head: true }).eq('rol_denumire', rol)).count ?? -1;
    const nAdmin = await cnt('ADMIN_CLUB');
    const nInstr = await cnt('INSTRUCTOR');
    record('D02 ADMIN_CLUB/INSTRUCTOR identice cu baza din audit', nAdmin === BAZA_ADMIN_CLUB && nInstr === BAZA_INSTRUCTOR,
      `ADMIN_CLUB=${nAdmin}/${BAZA_ADMIN_CLUB} INSTRUCTOR=${nInstr}/${BAZA_INSTRUCTOR}`);

    // ── 7. D-15 schimbare email ──
    const emailA2 = `${EMAIL_PREFIX}a2_${RUN_ID}@example.com`;
    const sch = await schimbaEmailContClub(admin, { club_id: CLUB_A, email: emailA2, callerId });
    if (sch.userId) userIds.push(sch.userId);
    record('D15 schimbaEmailContClub(A, email nou) -> ok', sch.ok && !!sch.userId && sch.userId !== uidA, `status=${sch.status}${sch.avertisment ? ' ' + sch.avertisment : ''}`);
    const oldSp = await idsOf(CA, 'sportivi', 'club_id');
    const oldIns = await idsOf(CA, 'inscrieri_competitie', 'club_id');
    const oldEch = await idsOf(CA, 'echipe_competitie');
    record('D15 clientul vechi (inca logat) nu mai citeste datele clubului A',
      !oldSp.includes(CLUB_A) && !oldIns.includes(CLUB_A) && !oldEch.includes(echAAct), `sp=${oldSp.length} insc=${oldIns.length} ech=${oldEch.length}`);
    const vechi = await admin.auth.admin.getUserById(uidA);
    const banUntil = (vechi.data?.user as any)?.banned_until as string | undefined;
    record('D15 utilizatorul vechi are banned_until in viitor', !!banUntil && new Date(banUntil).getTime() > Date.now(), banUntil ? 'banat' : 'nebanat');
    const contNou = (await admin.from('conturi_competitie_club').select('club_id, user_id, email').eq('club_id', CLUB_A).maybeSingle()).data;
    record('D15 contul nou exista pe acelasi club cu emailul nou', contNou?.user_id === sch.userId && contNou?.email === emailA2);
    const dup = await creeazaContClub(admin, { club_id: CLUB_A, email: `${EMAIL_PREFIX}dup_${RUN_ID}@example.com`, callerId });
    if (dup.userId) userIds.push(dup.userId);
    record('D15 creeazaContClub pe club cu cont -> 409', !dup.ok && dup.status === 409, `status=${dup.status}`);
    const dupEmail = await schimbaEmailContClub(admin, { club_id: CLUB_A, email: emailB, callerId }); // emailB apartine unui utilizator existent
    if (dupEmail.userId) userIds.push(dupEmail.userId);
    record('D15 email de utilizator existent -> 409', !dupEmail.ok && dupEmail.status === 409, `status=${dupEmail.status}`);
  } catch (e) {
    record('executie fara exceptii', false, e instanceof Error ? e.message : String(e));
  } finally {
    try {
      // sweep pe prefix: prinde si utilizatori creati partial de o functie esuata
      const reziduali = await listaUtilizatoriTest();
      const toti = Array.from(new Set([...userIds, ...reziduali.map((u) => u.id)]));
      if (competitii.length) {
        await admin.from('inscrieri_competitie').delete().in('competitie_id', competitii);
        await admin.from('echipe_competitie').delete().in('competitie_id', competitii);
        await admin.from('categorii_competitie').delete().in('competitie_id', competitii);
        await admin.from('competitii').delete().in('id', competitii);
      }
      for (const id of toti) {
        await admin.from('conturi_competitie_club').delete().eq('user_id', id);
        await admin.from('utilizator_roluri_multicont').delete().eq('user_id', id);
        await admin.from('mfa_dispozitive_incredere').delete().eq('user_id', id);
        await admin.from('mfa_email_verificari').delete().eq('user_id', id);
        await admin.auth.admin.deleteUser(id);
      }
    } catch (e) {
      record('cleanup fara exceptii', false, e instanceof Error ? e.message : String(e));
    }

    const cn = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? -1;
    const rc = await cn(admin.from('competitii').select('id', { count: 'exact', head: true }).like('denumire', `${PREFIX}%`));
    const re = await cn(admin.from('echipe_competitie').select('id', { count: 'exact', head: true }).like('denumire_echipa', `${PREFIX}%`));
    const rk = await cn(admin.from('categorii_competitie').select('id', { count: 'exact', head: true }).like('denumire', `${PREFIX}%`));
    const rcont = await cn(admin.from('conturi_competitie_club').select('club_id', { count: 'exact', head: true }).in('club_id', [CLUB_A, CLUB_B]));
    const rrol = await cn(admin.from('utilizator_roluri_multicont').select('id', { count: 'exact', head: true }).eq('rol_denumire', 'REPREZENTANT_COMPETITIE'));
    const ru = (await listaUtilizatoriTest()).length;
    let platiNoi = 0;
    let vizeNoi = 0;
    if (spA && spB) {
      platiNoi = await cn(admin.from('plati').select('id', { count: 'exact', head: true }).in('sportiv_id', [spA, spB]).gte('created_at', startTs));
      vizeNoi = await cn(admin.from('vize_sportivi').select('id', { count: 'exact', head: true }).in('sportiv_id', [spA, spB]).gte('created_at', startTs));
    }
    record('reziduuri: competitii/echipe/categorii/conturi/roluri REPREZENTANT/utilizatori test=0, plati noi=0, vize noi=0',
      rc === 0 && re === 0 && rk === 0 && rcont === 0 && rrol === 0 && ru === 0 && platiNoi === 0 && vizeNoi === 0,
      `competitii=${rc} echipe=${re} categorii=${rk} conturi=${rcont} roluri=${rrol} utilizatori=${ru} plati=${platiNoi} vize=${vizeNoi}`);
  }

  const fail = results.filter((x) => !x.passed);
  console.log(`\n${results.length - fail.length}/${results.length} verificari trecute`);
  if (fail.length) {
    console.error('ESUATE:\n' + fail.map((x) => ` - ${x.name}${x.detail ? ` (${x.detail})` : ''}`).join('\n'));
    process.exit(1);
  }
}

main();
