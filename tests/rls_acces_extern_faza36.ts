// tests/rls_acces_extern_faza36.ts
// SUPERSEDED de Faza 39 (cont de club): granturile per competitie nu mai dau acces; vezi tests/cont_club_faza39.ts
//
// Faza 36 — Plan 11. Baterie live de izolare/scurgere pentru rolul REPREZENTANT_COMPETITIE.
// Citire scoped, sweep pe toate relatiile PostgREST, scriere, escaladare, spoof header, regresii interne.
//
// Siguranta date reale: doar sportivi cu viza FRQKD curenta; competitii ZZ_TEST_FAZA36_*; cleanup in finally.
// GDPR: output doar cu ID-uri, nume de tabele si numaratori.
//
// Rulare: npx tsx tests/rls_acces_extern_faza36.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

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
const EMAIL_PREFIX = 'zztest_faza36x_';
const RUN_ID = Date.now();
const admin = createClient(url, serviceKey);

type Check = { name: string; passed: boolean; detail?: string };
const results: Check[] = [];
const record = (name: string, passed: boolean, detail?: string) => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
};
const info = (name: string, detail: string) => console.log(`INFO — ${name} (${detail})`);

const errOrRows = (r: { data: any; error: any }) => r.error?.message ?? `rows=${Array.isArray(r.data) ? r.data.length : r.data ? 1 : 0}`;
const ok = (r: { data: any; error: any }) => !r.error && !!r.data && (!Array.isArray(r.data) || r.data.length > 0);

// tabele permise pentru extern (ALLOW din DEC-7): in sweep nu se cer 0 randuri
const ALLOW_SCOPED = ['competitii', 'probe_competitie', 'categorii_competitie', 'inscrieri_competitie', 'echipe_competitie',
  'echipa_sportivi', 'sportivi', 'sportiv_arme', 'competitie_sportiv_arme', 'stagii_cvd_participare'];
const ALLOW_REF = ['grade', 'cluburi', 'tipuri_competitie', 'inlantuiri', 'inlantuiri_grade', 'arme', 'cerinte_stagii_cvd'];
const OWN_ONLY = ['utilizator_roluri_multicont', 'acces_competitie_extern'];
// view-uri security_invoker pe tabele ALLOW: mostenesc RLS-ul tabelei de baza (verificat in catalog)
const VIEW_SPORTIVI = ['rbv_sportivi_complet', 'sportiv_club', 'vedere_sportivi_complet', 'sportiv_detaliu', 'sportivi_instructor',
  'vedere_sportivi_detaliat', 'fisa_competitie_phi_hau', 'status_medical_frqkd'];
const VIEW_COMPETITII = ['rbv_competitii'];
const VIEW_REF = ['rbv_cluburi_lista'];
const VIEW_ROLURI = ['vedere_utilizator_roluri_completa'];

async function clientFor(email: string, parola: string, contextId: string): Promise<{ c: SupabaseClient; token: string }> {
  const c = createClient(url!, anonKey!, { global: { headers: { 'active-role-context-id': contextId } } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: parola });
  if (error || !data.session) throw new Error(`login ${email}: ${error?.message}`);
  return { c, token: data.session.access_token };
}

const idsOf = async (c: SupabaseClient, table: string, col = 'id'): Promise<string[]> => {
  const { data } = await c.from(table).select(col).limit(1000);
  return ((data as any[]) ?? []).map((x) => x[col]);
};

async function main() {
  const competitii: string[] = [];
  const userIds: string[] = [];
  const parola = `Zz!${RUN_ID}aA`;
  let spA = '';
  let spB = '';
  const startTs = new Date().toISOString();

  try {
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

    const mkComp = async (suffix: string, status: string) => {
      const { data, error } = await admin.from('competitii').insert({
        denumire: `${PREFIX}${suffix}_${RUN_ID}`, tip: 'tehnica', data_inceput: '2027-06-01', data_sfarsit: '2027-06-02',
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
    const C1 = await mkComp('C1', 'inscrieri_deschise');
    const C2 = await mkComp('C2', 'inscrieri_deschise');
    const CCLOSED = await mkComp('CLOSED', 'inscrieri_inchise');
    const CDRAFT = await mkComp('DRAFT', 'draft');
    const cat1 = await mkCat(C1, 'cat1');
    const cat1b = await mkCat(C1, 'cat1b');
    const cat2 = await mkCat(C2, 'cat2');
    const catClosed = await mkCat(CCLOSED, 'catClosed');
    await mkCat(CDRAFT, 'catDraft');
    await admin.from('probe_competitie').insert({ competitie_id: C1, tip_proba: 'thao_quyen_individual', denumire: `${PREFIX}proba_${RUN_ID}` });

    const seed = async (comp: string, cat: string, club: string, sp: string) => {
      const { data, error } = await admin.from('inscrieri_competitie').insert({
        competitie_id: comp, categorie_id: cat, club_id: club, sportiv_id: sp,
      }).select('id').single();
      if (error || !data) throw new Error(`seed inscriere: ${error?.message}`);
      return data.id as string;
    };
    const inscAC1 = await seed(C1, cat1, CLUB_A, spA);
    const inscBC1 = await seed(C1, cat1, CLUB_B, spB);
    const inscAC2 = await seed(C2, cat2, CLUB_A, spA);
    const mkEchipa = async (club: string, tag: string) => {
      const { data, error } = await admin.from('echipe_competitie').insert({
        competitie_id: C1, categorie_id: cat1, club_id: club, denumire_echipa: `${PREFIX}${tag}_${RUN_ID}`,
      }).select('id').single();
      if (error || !data) throw new Error(`echipa ${tag}: ${error?.message}`);
      return data.id as string;
    };
    const echB = await mkEchipa(CLUB_B, 'echB');

    // ── utilizatori ─────────────────────────────────────────────────────────
    const mkUserBase = async (tag: string) => {
      const email = `${EMAIL_PREFIX}${tag}_${RUN_ID}@example.com`;
      const { data, error } = await admin.auth.admin.createUser({ email, password: parola, email_confirm: true });
      if (error || !data.user) throw new Error(`user ${tag}: ${error?.message}`);
      userIds.push(data.user.id);
      return { email, uid: data.user.id };
    };
    const addRol = async (uid: string, rol: string, club: string | null, primary: boolean) => {
      const { data, error } = await admin.from('utilizator_roluri_multicont')
        .insert({ user_id: uid, rol_denumire: rol, club_id: club, is_primary: primary }).select('id').single();
      if (error || !data) throw new Error(`rol ${rol}: ${error?.message}`);
      return data.id as string;
    };
    const addGrant = async (uid: string, email: string, comp: string, club: string) => {
      const { data, error } = await admin.from('acces_competitie_extern')
        .insert({ user_id: uid, competitie_id: comp, club_id: club, email, nume: 'ZZ Test', activ: true }).select('id').single();
      if (error || !data) throw new Error(`grant: ${error?.message}`);
      return data.id as string;
    };

    const uA = await mkUserBase('exta');
    const rolA = await addRol(uA.uid, 'REPREZENTANT_COMPETITIE', null, true);
    const grantA1 = await addGrant(uA.uid, uA.email, C1, CLUB_A);
    await addGrant(uA.uid, uA.email, CCLOSED, CLUB_A);
    const uB = await mkUserBase('extb');
    const rolB = await addRol(uB.uid, 'REPREZENTANT_COMPETITIE', null, true);
    await addGrant(uB.uid, uB.email, C1, CLUB_B);
    const uN = await mkUserBase('extn');
    const rolN = await addRol(uN.uid, 'REPREZENTANT_COMPETITIE', null, true);
    const uAd = await mkUserBase('adm');
    const rolAd = await addRol(uAd.uid, 'ADMIN_CLUB', CLUB_A, true);
    const uM = await mkUserBase('mixt');
    const rolMAdmin = await addRol(uM.uid, 'ADMIN_CLUB', CLUB_A, true);
    await addRol(uM.uid, 'REPREZENTANT_COMPETITIE', null, false);
    await addGrant(uM.uid, uM.email, C1, CLUB_B);

    const EA = await clientFor(uA.email, parola, rolA);
    const EB = await clientFor(uB.email, parola, rolB);
    const EN = await clientFor(uN.email, parola, rolN);
    const ADM = await clientFor(uAd.email, parola, rolAd);
    const MIX = await clientFor(uM.email, parola, rolMAdmin);
    const SPOOF = await clientFor(uA.email, parola, rolAd); // EXT_A cu headerul altui utilizator

    // ── CITIRE EXT_A ────────────────────────────────────────────────────────
    const setEq = (x: string[], y: string[]) => x.length === y.length && x.every((v) => y.includes(v));
    const compA = await idsOf(EA.c, 'competitii');
    record('EXT_A vede exact competitiile din grant (C1, CLOSED)', setEq(compA, [C1, CCLOSED]), `n=${compA.length}`);
    const probeA = await idsOf(EA.c, 'probe_competitie', 'competitie_id');
    record('EXT_A: probe doar din C1', probeA.length > 0 && probeA.every((x) => x === C1), `n=${probeA.length}`);
    const catA = await idsOf(EA.c, 'categorii_competitie', 'competitie_id');
    record('EXT_A: categorii doar din C1/CLOSED', catA.length === 3 && catA.every((x) => x === C1 || x === CCLOSED), `n=${catA.length}`);
    const inscA = await idsOf(EA.c, 'inscrieri_competitie');
    record('EXT_A vede doar inscrierea (SP_A, C1)', setEq(inscA, [inscAC1]), `n=${inscA.length}`);
    const inscAcl = await idsOf(EA.c, 'inscrieri_competitie', 'club_id');
    record('EXT_A: zero inscrieri cu club B', !inscAcl.includes(CLUB_B));
    record('EXT_A: nu vede inscrierea C2 (fara grant)', !inscA.includes(inscAC2));
    const ech = await idsOf(EA.c, 'echipe_competitie');
    record('EXT_A: nu vede echipa clubului B', !ech.includes(echB), `n=${ech.length}`);
    const spvA = await idsOf(EA.c, 'sportivi', 'club_id');
    record('EXT_A: sportivi doar din club A', spvA.length > 0 && spvA.every((x) => x === CLUB_A), `n=${spvA.length}`);
    const spBvis = await EA.c.from('sportivi').select('id').eq('id', spB);
    record('EXT_A: SP_B (inscris in C1) invizibil', (spBvis.data?.length ?? 0) === 0, errOrRows(spBvis));
    const rolV = await idsOf(EA.c, 'utilizator_roluri_multicont', 'user_id');
    record('EXT_A: roluri doar proprii', rolV.length > 0 && rolV.every((x) => x === uA.uid), `n=${rolV.length}`);
    const grV = await idsOf(EA.c, 'acces_competitie_extern', 'user_id');
    record('EXT_A: granturi doar proprii', grV.length === 2 && grV.every((x) => x === uA.uid), `n=${grV.length}`);
    const cerV = await EA.c.from('cereri_acces_competitie').select('id').limit(5);
    record('EXT_A: cereri_acces_competitie zero randuri', (cerV.data?.length ?? 0) === 0, errOrRows(cerV));

    // EXT_B izolat reciproc
    const inscB = await idsOf(EB.c, 'inscrieri_competitie');
    record('EXT_B vede doar (SP_B, C1)', setEq(inscB, [inscBC1]), `n=${inscB.length}`);
    const spvB = await idsOf(EB.c, 'sportivi', 'club_id');
    record('EXT_B: zero sportivi din club A', spvB.length > 0 && spvB.every((x) => x === CLUB_B), `n=${spvB.length}`);
    // fara grant
    for (const t of ['competitii', 'inscrieri_competitie', 'sportivi', 'echipe_competitie', 'categorii_competitie']) {
      const n = (await idsOf(EN.c, t)).length;
      record(`EXT_NOGRANT: ${t} zero randuri`, n === 0, `n=${n}`);
    }
    // grant dezactivat
    await admin.from('acces_competitie_extern').update({ activ: false }).eq('id', grantA1);
    const compOff = await idsOf(EA.c, 'competitii');
    const inscOff = await idsOf(EA.c, 'inscrieri_competitie');
    record('EXT_A cu grant C1 dezactivat: C1 si inscrierile ei dispar', !compOff.includes(C1) && !inscOff.includes(inscAC1), `comp=${compOff.length} insc=${inscOff.length}`);
    await admin.from('acces_competitie_extern').update({ activ: true }).eq('id', grantA1);

    // spoof header
    const spC = await idsOf(SPOOF.c, 'competitii');
    const spI = await idsOf(SPOOF.c, 'inscrieri_competitie');
    const spS = await idsOf(SPOOF.c, 'sportivi', 'club_id');
    record('spoof header (rol ADMIN_A) nu extinde accesul EXT_A',
      setEq(spC, [C1, CCLOSED]) && setEq(spI, [inscAC1]) && spS.every((x) => x === CLUB_A), `comp=${spC.length} insc=${spI.length} sp=${spS.length}`);

    // ── SWEEP ───────────────────────────────────────────────────────────────
    const sweep = async (label: string, who: { c: SupabaseClient; token: string }, ctx: string, uid: string, grant: boolean) => {
      const hdr = { apikey: anonKey!, Authorization: `Bearer ${who.token}`, 'active-role-context-id': ctx };
      // lista de relatii (metadate OpenAPI) se citeste cu service role; datele se sondeaza cu tokenul extern
      const root = await fetch(`${url}/rest/v1/`, { headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}` } });
      const spec: any = await root.json().catch(() => ({}));
      const rels = Object.keys(spec.paths ?? {}).filter((p) => p !== '/' && !p.startsWith('/rpc/')).map((p) => p.slice(1));
      const leaks: string[] = [];
      let allow = 0;
      let okc = 0;
      for (const rel of rels) {
        const r = await fetch(`${url}/rest/v1/${rel}?select=*&limit=1`, { headers: hdr });
        const body: any = r.status === 200 ? await r.json().catch(() => []) : [];
        const rows = Array.isArray(body) ? body : [];
        if (OWN_ONLY.includes(rel)) {
          allow++;
          if (rows.length && rows[0].user_id !== uid) leaks.push(`${rel}(strain)`);
          continue;
        }
        if (ALLOW_REF.includes(rel) || VIEW_REF.includes(rel)) { allow++; continue; }
        if (VIEW_ROLURI.includes(rel)) {
          allow++;
          const full = await (await fetch(`${url}/rest/v1/${rel}?select=user_id&limit=1000`, { headers: hdr })).json().catch(() => []);
          if (Array.isArray(full) && full.some((x: any) => x.user_id !== uid)) leaks.push(`${rel}(strain)`);
          continue;
        }
        if (VIEW_SPORTIVI.includes(rel) || VIEW_COMPETITII.includes(rel)) {
          allow++;
          if (!grant && rows.length) { leaks.push(`${rel}(fara grant)`); continue; }
          if (grant && VIEW_SPORTIVI.includes(rel) && rel !== 'status_medical_frqkd' && rel !== 'fisa_competitie_phi_hau') {
            const full = await (await fetch(`${url}/rest/v1/${rel}?select=club_id&limit=1000`, { headers: hdr })).json().catch(() => []);
            if (Array.isArray(full) && full.some((x: any) => x.club_id !== CLUB_A)) leaks.push(`${rel}(alt club)`);
          }
          continue;
        }
        if (ALLOW_SCOPED.includes(rel)) {
          allow++;
          if (!grant && rows.length) leaks.push(`${rel}(fara grant)`);
          continue;
        }
        if (rows.length) leaks.push(rel); else okc++;
      }
      record(`SWEEP ${label}: 0 LEAK`, rels.length > 20 && leaks.length === 0,
        `relatii=${rels.length} ALLOW=${allow} OK=${okc} LEAK=${leaks.length}${leaks.length ? ' -> ' + leaks.join(',') : ''}`);
    };
    await sweep('EXT_A', EA, rolA, uA.uid, true);
    await sweep('EXT_NOGRANT', EN, rolN, uN.uid, false);

    // ── SCRIERE EXT_A ───────────────────────────────────────────────────────
    const stare = async (id: string) => (await admin.from('inscrieri_competitie').select('id, taxa_achitata, status').eq('id', id).maybeSingle()).data;
    const nrIns = async (filter: Record<string, any>) => {
      let q = admin.from('inscrieri_competitie').select('id', { count: 'exact', head: true });
      for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
      return (await q).count ?? 0;
    };

    let r: any = await EA.c.from('inscrieri_competitie').insert({ competitie_id: C1, categorie_id: cat1b, club_id: CLUB_A, sportiv_id: spA, status: 'inscris' }).select('id');
    record('W1 EXT_A inscrie (SP_A, C1, club A)', ok(r), errOrRows(r));
    const newId = r.data?.[0]?.id as string | undefined;

    r = await EA.c.from('inscrieri_competitie').insert({ competitie_id: C1, categorie_id: cat1b, club_id: CLUB_B, sportiv_id: spB, status: 'inscris' }).select('id');
    record('W1 EXT_A NU inscrie cu club_id=B', !ok(r) && (await nrIns({ categorie_id: cat1b, sportiv_id: spB })) === 0, errOrRows(r));
    r = await EA.c.from('inscrieri_competitie').insert({ competitie_id: C1, categorie_id: cat1b, club_id: CLUB_A, sportiv_id: spB, status: 'inscris' }).select('id');
    record('W1 EXT_A NU inscrie sportiv din B pe club A', !ok(r) && (await nrIns({ categorie_id: cat1b, sportiv_id: spB })) === 0, errOrRows(r));
    r = await EA.c.from('inscrieri_competitie').insert({ competitie_id: C2, categorie_id: cat2, club_id: CLUB_A, sportiv_id: spA, status: 'inscris' }).select('id');
    record('W1 EXT_A NU inscrie pe C2 (fara grant)', !ok(r) && (await nrIns({ competitie_id: C2 })) === 1, errOrRows(r));
    r = await EA.c.from('inscrieri_competitie').insert({ competitie_id: CCLOSED, categorie_id: catClosed, club_id: CLUB_A, sportiv_id: spA, status: 'inscris' }).select('id');
    record('W1 EXT_A NU inscrie pe competitie inchisa', !ok(r) && (await nrIns({ competitie_id: CCLOSED })) === 0, errOrRows(r));
    r = await EA.c.from('inscrieri_competitie').insert({ competitie_id: C1, categorie_id: cat2, club_id: CLUB_A, sportiv_id: spA, status: 'inscris' }).select('id');
    record('W1 EXT_A NU inscrie cu categorie din alta competitie', !ok(r) && (await nrIns({ categorie_id: cat2, competitie_id: C1 })) === 0, errOrRows(r));
    r = await EA.c.from('inscrieri_competitie').insert({ competitie_id: C1, categorie_id: cat1b, club_id: CLUB_A, sportiv_id: spA, status: 'inscris', taxa_achitata: true }).select('id');
    const taxaIns = (await admin.from('inscrieri_competitie').select('id').eq('categorie_id', cat1b).eq('taxa_achitata', true)).data ?? [];
    record('W1 EXT_A NU inscrie cu taxa_achitata=true', !ok(r) && taxaIns.length === 0, errOrRows(r));

    if (newId) {
      await EA.c.from('inscrieri_competitie').update({ taxa_achitata: true }).eq('id', newId);
      record('W2 EXT_A NU poate seta taxa_achitata=true', (await stare(newId))?.taxa_achitata === false);
      await EA.c.from('inscrieri_competitie').update({ status: 'confirmat' }).eq('id', newId);
      record('W2 EXT_A NU poate schimba statusul spre altceva decat retras', (await stare(newId))?.status === 'inscris', String((await stare(newId))?.status));
      await EA.c.from('inscrieri_competitie').update({ status: 'retras' }).eq('id', newId);
      record('W2 EXT_A poate retrage inscrierea proprie', (await stare(newId))?.status === 'retras', String((await stare(newId))?.status));
    } else {
      record('W2 (sarit: inscrierea pozitiva a esuat)', false);
    }

    r = await EA.c.from('inscrieri_competitie').delete().eq('id', inscBC1).select('id');
    record('W3 EXT_A NU sterge inscrierea clubului B', !ok(r) && !!(await stare(inscBC1)), errOrRows(r));
    await admin.from('inscrieri_competitie').update({ taxa_achitata: true }).eq('id', inscAC1);
    r = await EA.c.from('inscrieri_competitie').delete().eq('id', inscAC1).select('id');
    record('W3 EXT_A NU sterge inscriere achitata', !ok(r) && !!(await stare(inscAC1)), errOrRows(r));
    await admin.from('inscrieri_competitie').update({ taxa_achitata: false }).eq('id', inscAC1);

    r = await EA.c.from('competitii').update({ locatie: 'hack' }).eq('id', C1).select('id');
    const cst = (await admin.from('competitii').select('locatie').eq('id', C1).single()).data;
    record('W4 EXT_A NU modifica competitii', !ok(r) && cst?.locatie === 'Test', errOrRows(r));
    r = await EA.c.from('competitii').delete().eq('id', C1).select('id');
    record('W4 EXT_A NU sterge competitii', !ok(r) && !!(await admin.from('competitii').select('id').eq('id', C1).maybeSingle()).data, errOrRows(r));
    r = await EA.c.from('competitii').insert({ denumire: `${PREFIX}hack_${RUN_ID}`, tip: 'tehnica', data_inceput: '2027-06-01', data_sfarsit: '2027-06-02', locatie: 'x', status: 'draft' }).select('id');
    record('W4 EXT_A NU insereaza competitii', !ok(r), errOrRows(r));
    r = await EA.c.from('categorii_competitie').update({ denumire: 'hack' }).eq('id', cat1).select('id');
    record('W4 EXT_A NU modifica categorii', !ok(r), errOrRows(r));
    r = await EA.c.from('categorii_competitie').delete().eq('id', cat1b).select('id');
    record('W4 EXT_A NU sterge categorii', !ok(r) && !!(await admin.from('categorii_competitie').select('id').eq('id', cat1b).maybeSingle()).data, errOrRows(r));
    r = await EA.c.from('probe_competitie').insert({ competitie_id: C1, tip_proba: 'thao_quyen_individual', denumire: 'hack' }).select('id');
    record('W4 EXT_A NU insereaza probe', !ok(r), errOrRows(r));
    r = await EA.c.from('sportivi').insert({ nume: `${PREFIX}hack`, prenume: 'x', club_id: CLUB_A, data_nasterii: '2015-01-01' }).select('id');
    const hackSp = (await admin.from('sportivi').select('id').like('nume', `${PREFIX}%`)).data ?? [];
    record('W4 EXT_A NU insereaza sportivi', !ok(r) && hackSp.length === 0, errOrRows(r));
    if (hackSp.length) await admin.from('sportivi').delete().like('nume', `${PREFIX}%`);
    r = await EA.c.from('sportivi').update({ prenume: 'hack' }).eq('id', spA).select('id');
    record('W4 EXT_A NU modifica sportiv', !ok(r), errOrRows(r));

    // escaladare
    r = await EA.c.from('utilizator_roluri_multicont').insert({ user_id: uA.uid, rol_denumire: 'ADMIN_CLUB', club_id: CLUB_A, is_primary: false }).select('id');
    const escal = (await admin.from('utilizator_roluri_multicont').select('id').eq('user_id', uA.uid).eq('rol_denumire', 'ADMIN_CLUB')).data ?? [];
    record('W5 EXT_A NU isi atribuie ADMIN_CLUB', !ok(r) && escal.length === 0, errOrRows(r));
    r = await EA.c.from('utilizator_roluri_multicont').update({ rol_denumire: 'ADMIN_CLUB', club_id: CLUB_A }).eq('id', rolA).select('id');
    const rolSt = (await admin.from('utilizator_roluri_multicont').select('rol_denumire, club_id').eq('id', rolA).single()).data;
    record('W5 EXT_A NU isi modifica rolul', !ok(r) && rolSt?.rol_denumire === 'REPREZENTANT_COMPETITIE' && rolSt?.club_id === null, errOrRows(r));
    r = await EA.c.from('acces_competitie_extern').insert({ user_id: uA.uid, competitie_id: C2, club_id: CLUB_A, email: uA.email, nume: 'x' }).select('id');
    const gNou = (await admin.from('acces_competitie_extern').select('id').eq('user_id', uA.uid).eq('competitie_id', C2)).data ?? [];
    record('W5 EXT_A NU isi creeaza grant', !ok(r) && gNou.length === 0, errOrRows(r));
    r = await EA.c.from('acces_competitie_extern').update({ club_id: CLUB_B }).eq('id', grantA1).select('id');
    const gSt = (await admin.from('acces_competitie_extern').select('club_id, activ').eq('id', grantA1).single()).data;
    record('W5 EXT_A NU muta grantul pe club B', !ok(r) && gSt?.club_id === CLUB_A && gSt?.activ === true, errOrRows(r));
    r = await EA.c.from('acces_competitie_extern').delete().eq('id', grantA1).select('id');
    record('W5 EXT_A NU sterge grantul', !ok(r) && !!(await admin.from('acces_competitie_extern').select('id').eq('id', grantA1).maybeSingle()).data, errOrRows(r));
    r = await EA.c.from('cereri_acces_competitie').insert({ competitie_id: C1, email: 'zz@example.com', nume: 'ZZ Test', club_id: CLUB_A }).select('id');
    record('W5 EXT_A NU insereaza direct in cereri_acces_competitie', !ok(r), errOrRows(r));

    // echipe
    r = await EA.c.from('echipe_competitie').insert({ competitie_id: C1, categorie_id: cat1, club_id: CLUB_A, denumire_echipa: `${PREFIX}echA_${RUN_ID}`, status: 'inscrisa' }).select('id');
    record('W6 EXT_A creeaza echipa pentru club A', ok(r), errOrRows(r));
    r = await EA.c.from('echipe_competitie').insert({ competitie_id: C1, categorie_id: cat1, club_id: CLUB_B, denumire_echipa: `${PREFIX}echX_${RUN_ID}`, status: 'inscrisa' }).select('id');
    record('W6 EXT_A NU creeaza echipa pentru club B', !ok(r), errOrRows(r));
    r = await EA.c.from('echipa_sportivi').insert({ echipa_id: echB, sportiv_id: spA }).select('id');
    record('W6 EXT_A NU adauga membru in echipa clubului B', !ok(r), errOrRows(r));

    // ── REGRESII INTERNE (D-16) ─────────────────────────────────────────────
    const nSpA = (await admin.from('sportivi').select('id', { count: 'exact', head: true }).eq('club_id', CLUB_A)).count ?? 0;
    const admSp = (await ADM.c.from('sportivi').select('id', { count: 'exact', head: true }).eq('club_id', CLUB_A)).count ?? 0;
    record('ADMIN_A citeste toti sportivii clubului A', nSpA > 0 && admSp === nSpA, `${admSp}/${nSpA}`);
    const admComp = await idsOf(ADM.c, 'competitii');
    record('ADMIN_A vede C1 si C2', admComp.includes(C1) && admComp.includes(C2), `n=${admComp.length}`);
    const admInsc = await idsOf(ADM.c, 'inscrieri_competitie');
    record('ADMIN_A vede inscrierile clubului A', admInsc.includes(inscAC1) && admInsc.includes(inscAC2), `n=${admInsc.length}`);
    info('D-16: ADMIN_A vede inscrierea clubului B in C1', String(admInsc.includes(inscBC1)));
    const mixSp = (await MIX.c.from('sportivi').select('id', { count: 'exact', head: true }).eq('club_id', CLUB_A)).count ?? 0;
    record('MIXT (ADMIN_CLUB@A + REPREZENTANT) pastreaza drepturile interne', nSpA > 0 && mixSp === nSpA, `${mixSp}/${nSpA}`);
  } catch (e) {
    record('executie fara exceptii', false, e instanceof Error ? e.message : String(e));
  } finally {
    if (competitii.length) await admin.from('competitii').delete().in('id', competitii);
    for (const id of userIds) {
      await admin.from('acces_competitie_extern').delete().eq('user_id', id);
      await admin.from('utilizator_roluri_multicont').delete().eq('user_id', id);
      await admin.auth.admin.deleteUser(id);
    }
    const { count: rc } = await admin.from('competitii').select('id', { count: 'exact', head: true }).like('denumire', `${PREFIX}%`);
    const { count: rs } = await admin.from('sportivi').select('id', { count: 'exact', head: true }).like('nume', `${PREFIX}%`);
    let platiNoi = 0;
    let vizeNoi = 0;
    if (spA && spB) {
      const p = await admin.from('plati').select('id', { count: 'exact', head: true }).in('sportiv_id', [spA, spB]).gte('created_at', startTs);
      const v = await admin.from('vize_sportivi').select('id', { count: 'exact', head: true }).in('sportiv_id', [spA, spB]).gte('created_at', startTs);
      platiNoi = p.count ?? 0;
      vizeNoi = v.count ?? 0;
    }
    record('reziduuri: competitii/sportivi test=0, plati noi=0, vize noi=0', (rc ?? 0) === 0 && (rs ?? 0) === 0 && platiNoi === 0 && vizeNoi === 0,
      `competitii=${rc} sportivi=${rs} plati=${platiNoi} vize=${vizeNoi}`);
  }

  const fail = results.filter((x) => !x.passed);
  console.log(`\n${results.length - fail.length}/${results.length} verificari trecute`);
  if (fail.length) {
    console.error('ESUATE:\n' + fail.map((x) => ` - ${x.name}${x.detail ? ` (${x.detail})` : ''}`).join('\n'));
    process.exit(1);
  }
}

main();
