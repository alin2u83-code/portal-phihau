// tests/rls_taxe_anuale_faza33.ts
//
// Faza 33 — Plan 10, Task 1.
// Test live (PostgREST real: JWT + header active-role-context-id) de izolare cross-club si refuzuri RPC
// pe tabelele/functiile taxelor anuale FRQKD + FRAM.
//
//   CLUB_A = Kim Long Dao Falticeni — contextul testat (ADMIN_CLUB / INSTRUCTOR)
//   CLUB_B = C.S. Phi Hau           — clubul "strain" (contine decontul real FRQKD 2025: se doar CITESTE, 0 randuri asteptate)
//
// Date canar: prefix ZZ_TEST_FAZA33_, perioada 2099. Cleanup in finally + verificare finala zero urme.
// Cheile se citesc din .env si NU se afiseaza.
//
// Rulare: npx tsx tests/rls_taxe_anuale_faza33.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Lipsesc variabile de mediu: VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const CLUB_A = '83e7f771-46cf-4c4e-b70f-356d7b0bff06'; // Kim Long Dao Falticeni
const CLUB_B = 'cbb0b228-b3e0-4735-9658-70999eb256c6'; // C.S. Phi Hau
const DECONT_REAL_FRQKD_2025 = 'e71edebc-1ee1-4b96-b469-4adbb220b67e'; // baseline, NU se scrie

const CANARY_PREFIX = 'ZZ_TEST_FAZA33_';
const RUN_ID = Date.now();
const AN = 2099;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });

type Check = { name: string; passed: boolean; detail?: string };
const results: Check[] = [];

// Nu arunca la primul esec: colectam toate rezultatele; exit 1 la orice FAIL.
function record(name: string, passed: boolean, detail?: string) {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
}

function userClient(contextId: string | null): SupabaseClient {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: contextId ? { headers: { 'active-role-context-id': contextId } } : undefined,
  });
}

const errCode = (e: any) => (e ? String(e.code ?? '') : '');
const errMsg = (e: any) => (e ? String(e.message ?? '') : '');

async function counts() {
  const c = async (t: string, f?: (q: any) => any) => {
    let q: any = supabaseAdmin.from(t).select('id', { count: 'exact', head: true });
    if (f) q = f(q);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  };
  return {
    plati_frqkd_fram: await c('plati', (q) => q.in('tip', ['FRQKD', 'FRAM'])),
    vize: await c('vize_sportivi'),
    deconturi: await c('deconturi_federatie'),
    decont_sportivi: await c('decont_sportivi'),
    config: await c('taxa_anuala_config'),
  };
}

async function baselineReal() {
  const { data, error } = await supabaseAdmin
    .from('deconturi_federatie')
    .select('suma_totala, nr_participanti, status_plata, metoda_plata, confirmata_federatie')
    .eq('id', DECONT_REAL_FRQKD_2025)
    .single();
  if (error) throw error;
  const { count } = await supabaseAdmin.from('decont_sportivi').select('id', { count: 'exact', head: true }).eq('decont_id', DECONT_REAL_FRQKD_2025);
  return JSON.stringify({ ...data, legaturi: count });
}

// Cleanup complet pe date canar (prefix pe sportivi + perioada 2099). Intoarce lista de probleme ramase.
async function cleanupCanary(ctx: { userId: string | null; roleIds: string[] }): Promise<string[]> {
  const probleme: string[] = [];
  const step = async (label: string, p: PromiseLike<{ error: any }>) => {
    const { error } = await p;
    if (error) {
      probleme.push(`${label}: ${error.message}`);
      console.log(`cleanup ${label}: EROARE ${error.message}`);
    }
  };
  const { data: sp } = await supabaseAdmin.from('sportivi').select('id').like('nume', `${CANARY_PREFIX}%`);
  const ids = (sp || []).map((r: any) => r.id);

  // decont_sportivi / deconturi_federatie canar (an 2099)
  const { data: dec } = await supabaseAdmin.from('deconturi_federatie').select('id').eq('an_fiscal', AN).in('club_id', [CLUB_A, CLUB_B]);
  const decIds = (dec || []).map((r: any) => r.id);
  await step('decont_sportivi(an 2099)', supabaseAdmin.from('decont_sportivi').delete().eq('an', AN));
  if (ids.length) await step('decont_sportivi(sportivi canar)', supabaseAdmin.from('decont_sportivi').delete().in('sportiv_id', ids));
  if (decIds.length) await step('deconturi_federatie(2099)', supabaseAdmin.from('deconturi_federatie').delete().in('id', decIds));

  if (ids.length) {
    await step('tranzactie_plata', supabaseAdmin.from('tranzactie_plata').delete().in(
      'plata_id',
      ((await supabaseAdmin.from('plati').select('id').in('sportiv_id', ids)).data || []).map((r: any) => r.id)
    ));
    await step('vize_sportivi', supabaseAdmin.from('vize_sportivi').delete().in('sportiv_id', ids));
    await step('plati', supabaseAdmin.from('plati').delete().in('sportiv_id', ids));
    await step('stagii_cvd_participare', supabaseAdmin.from('stagii_cvd_participare').delete().in('sportiv_id', ids));
    await step('notificari', supabaseAdmin.from('notificari').delete().like('body', `%${CANARY_PREFIX}%`));
    await step('sportivi', supabaseAdmin.from('sportivi').delete().in('id', ids));
  }
  await step('taxa_anuala_config(2099)', supabaseAdmin.from('taxa_anuala_config').delete().eq('an_fiscal', AN));
  for (const rid of ctx.roleIds) {
    await step(`rol ${rid}`, supabaseAdmin.from('utilizator_roluri_multicont').delete().eq('id', rid));
  }
  if (ctx.userId) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(ctx.userId);
    if (error) probleme.push(`user efemer: ${error.message}`);
    console.log(`utilizator efemer sters: ${!error}`);
  }

  // verificare finala
  const { count: nSp } = await supabaseAdmin.from('sportivi').select('id', { count: 'exact', head: true }).like('nume', `${CANARY_PREFIX}%`);
  const { count: nCfg } = await supabaseAdmin.from('taxa_anuala_config').select('id', { count: 'exact', head: true }).eq('an_fiscal', AN);
  const { count: nDec } = await supabaseAdmin.from('deconturi_federatie').select('id', { count: 'exact', head: true }).eq('an_fiscal', AN);
  const { count: nVz } = await supabaseAdmin.from('vize_sportivi').select('id', { count: 'exact', head: true }).eq('an', AN);
  const { count: nPl } = await supabaseAdmin.from('plati').select('id', { count: 'exact', head: true }).eq('an', AN).in('tip', ['FRQKD', 'FRAM']);
  const left = { sportivi_canar: nSp, config_2099: nCfg, deconturi_2099: nDec, vize_2099: nVz, plati_2099: nPl };
  console.log('Verificare finala (asteptat zero):', JSON.stringify(left));
  for (const [k, v] of Object.entries(left)) if ((v ?? 0) !== 0) probleme.push(`ramas ${k}=${v}`);
  return probleme;
}

async function main() {
  const ctx = { userId: null as string | null, roleIds: [] as string[] };
  let before: Awaited<ReturnType<typeof counts>> | null = null;
  let baselineBefore = '';
  try {
    before = await counts();
    baselineBefore = await baselineReal();
    console.log('Numaratori inainte:', JSON.stringify(before));

    // ── PREGATIRE (service role) ────────────────────────────────────────
    const testEmail = `zztest_faza33_rls_${RUN_ID}@example.com`;
    const testPassword = `TestFaza33_${RUN_ID}!Aa`;
    console.log(`\nCreare utilizator efemer: ${testEmail}`);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail, password: testPassword, email_confirm: true,
    });
    if (authError) throw authError;
    ctx.userId = authData.user.id;

    const mkRole = async (rol: string, primary: boolean) => {
      const { data, error } = await supabaseAdmin
        .from('utilizator_roluri_multicont')
        .insert({ user_id: ctx.userId, club_id: CLUB_A, rol_denumire: rol, is_primary: primary })
        .select('id').single();
      if (error) throw error;
      ctx.roleIds.push(data.id);
      return data.id as string;
    };
    const ctxAdmin = await mkRole('ADMIN_CLUB', true);
    const ctxInstr = await mkRole('INSTRUCTOR', false);

    const mkSportiv = async (club: string, tag: string) => {
      const { data, error } = await supabaseAdmin
        .from('sportivi')
        .insert({ nume: `${CANARY_PREFIX}${tag}_${RUN_ID}`, prenume: 'Test', status: 'Activ', club_id: club, data_nasterii: '2010-01-01' })
        .select('id, nume').single();
      if (error) throw error;
      return data as { id: string; nume: string };
    };
    const sB = await mkSportiv(CLUB_B, 'SB');
    const sA = await mkSportiv(CLUB_A, 'SA');

    // pret FRQKD 2099 (service role)
    const { error: pretErr } = await supabaseAdmin.from('taxa_anuala_config').insert({ tip: 'FRQKD', an_fiscal: AN, suma: 170 });
    if (pretErr) throw pretErr;

    // viza + factura 2099 pentru SB si SA (prin functia interna, apelata cu service role)
    for (const s of [sB, sA]) {
      const { error } = await supabaseAdmin.rpc('activeaza_taxa_sportiv', { p_sportiv_id: s.id, p_tip: 'FRQKD', p_an: AN });
      if (error) throw new Error(`pregatire activeaza_taxa_sportiv: ${error.message}`);
    }
    const { data: vizeCanar, error: vzErr } = await supabaseAdmin
      .from('vize_sportivi').select('id, sportiv_id, club_id, plata_id, scutit').eq('an', AN).eq('tip', 'FRQKD').in('sportiv_id', [sB.id, sA.id]);
    if (vzErr) throw vzErr;
    const vizaB = vizeCanar!.find((v: any) => v.sportiv_id === sB.id)!;
    const vizaA = vizeCanar!.find((v: any) => v.sportiv_id === sA.id)!;
    if (!vizaB?.plata_id || !vizaA?.plata_id) throw new Error('pregatire: viza/factura canar negenerate');

    // decont canar CLUB_B 2099 + decont_sportivi legat
    const { data: decB, error: decBErr } = await supabaseAdmin
      .from('deconturi_federatie')
      .insert({
        club_id: CLUB_B, an_fiscal: AN, tip_activitate: 'FRQKD', suma_totala: 170, nr_participanti: 1,
        status_plata: 'Platit', metoda_plata: 'Cash', confirmata_federatie: true,
        data_decont: new Date().toISOString().slice(0, 10), data_generare: new Date().toISOString(),
      })
      .select('id').single();
    if (decBErr) throw decBErr;
    const { error: dsErr } = await supabaseAdmin.from('decont_sportivi').insert({
      decont_id: decB.id, sportiv_id: sB.id, an: AN, tip: 'FRQKD', plata_id: vizaB.plata_id, suma: 170,
    });
    if (dsErr) throw dsErr;
    console.log('Pregatire completa: canar SB(CLUB_B) cu viza+factura+decont, SA(CLUB_A) cu viza+factura, pret FRQKD 2099=170.');

    // ── CLIENTI ─────────────────────────────────────────────────────────
    const adminA = userClient(ctxAdmin);
    const instrA = userClient(ctxInstr);
    const noHdr = userClient(null);
    for (const c of [adminA, instrA, noHdr]) {
      const { error } = await c.auth.signInWithPassword({ email: testEmail, password: testPassword });
      if (error) throw error;
    }
    console.log('Autentificat ca utilizator efemer (ADMIN_CLUB@A, INSTRUCTOR@A, fara header).');

    // ── 1. SELECT: izolare la citire ────────────────────────────────────
    console.log('\n--- 1. SELECT cross-club (ADMIN_CLUB@CLUB_A) ---');
    {
      const r1 = await adminA.from('vize_sportivi').select('id, club_id').eq('club_id', CLUB_B);
      record('vize_sportivi: 0 randuri pentru club_id=CLUB_B', !r1.error && (r1.data || []).length === 0, `err=${errMsg(r1.error)} n=${r1.data?.length}`);
      const r1b = await adminA.from('vize_sportivi').select('id').eq('id', vizaB.id);
      record('vize_sportivi: viza canar a sportivului din CLUB_B invizibila', !r1b.error && (r1b.data || []).length === 0);
      const r1c = await adminA.from('vize_sportivi').select('id, club_id').limit(2000);
      record('vize_sportivi: nicio viza din CLUB_B in lista completa', !r1c.error && (r1c.data || []).every((v: any) => v.club_id !== CLUB_B), `total vazute=${r1c.data?.length}`);
      const r1d = await adminA.from('vize_sportivi').select('id').eq('id', vizaA.id);
      record('vize_sportivi: viza proprie (CLUB_A) vizibila (fara regresie)', !r1d.error && (r1d.data || []).length === 1);

      const r2 = await adminA.from('deconturi_federatie').select('id, club_id').eq('club_id', CLUB_B);
      record('deconturi_federatie: 0 randuri pentru club_id=CLUB_B', !r2.error && (r2.data || []).length === 0, `err=${errMsg(r2.error)} n=${r2.data?.length}`);
      const r2b = await adminA.from('deconturi_federatie').select('id').in('id', [decB.id, DECONT_REAL_FRQKD_2025]);
      record('deconturi_federatie: decontul canar 2099 si decontul real FRQKD 2025 al CLUB_B invizibile', !r2b.error && (r2b.data || []).length === 0);

      const r3 = await adminA.from('decont_sportivi').select('id').eq('decont_id', decB.id);
      record('decont_sportivi: 0 randuri pentru decontul canar CLUB_B', !r3.error && (r3.data || []).length === 0);
      const r3b = await adminA.from('decont_sportivi').select('id').eq('decont_id', DECONT_REAL_FRQKD_2025);
      record('decont_sportivi: 0 randuri pentru decontul real FRQKD 2025 (CLUB_B)', !r3b.error && (r3b.data || []).length === 0);

      const r4 = await adminA.from('plati').select('id').eq('id', vizaB.plata_id);
      console.log(`INFO (neasertat, in afara scopului fazei): plati canar CLUB_B vizibile pentru ADMIN_CLUB@A = ${r4.data?.length ?? 'eroare'}`);
    }

    // ── 2. Scrieri directe respinse ─────────────────────────────────────
    console.log('\n--- 2. Scrieri directe respinse ---');
    {
      const r1 = await adminA.from('deconturi_federatie').insert({
        club_id: CLUB_A, an_fiscal: AN, tip_activitate: 'FRQKD', suma_totala: 1, nr_participanti: 1,
        status_plata: 'Platit', metoda_plata: 'Cash', confirmata_federatie: true,
      });
      record('INSERT direct in deconturi_federatie (CLUB_A) respins', !!r1.error, `code=${errCode(r1.error)}`);

      const r1b = await adminA.from('vize_sportivi').insert({ sportiv_id: sA.id, an: 2098, tip: 'FRAM', club_id: CLUB_A, status_viza: 'Activ', data_platii: '2098-01-01' });
      record('INSERT direct in vize_sportivi (propriu club) respins', !!r1b.error, `code=${errCode(r1b.error)}`);

      const r1c = await adminA.from('decont_sportivi').insert({ decont_id: decB.id, sportiv_id: sA.id, an: AN, tip: 'FRQKD' });
      record('INSERT direct in decont_sportivi respins', !!r1c.error, `code=${errCode(r1c.error)}`);

      const r2 = await adminA.from('vize_sportivi').update({ scutit: true, motiv_scutire: 'ZZ test' }).eq('id', vizaA.id).select('id');
      const { data: vChk } = await supabaseAdmin.from('vize_sportivi').select('scutit').eq('id', vizaA.id).single();
      record('UPDATE vize_sportivi SET scutit=true (viza proprie) -> 0 randuri afectate', (r2.data || []).length === 0 && vChk?.scutit === false, `err=${errCode(r2.error)} afectate=${r2.data?.length}`);
      const r2b = await adminA.from('vize_sportivi').update({ scutit: true, motiv_scutire: 'ZZ test' }).eq('id', vizaB.id).select('id');
      const { data: vChkB } = await supabaseAdmin.from('vize_sportivi').select('scutit').eq('id', vizaB.id).single();
      record('UPDATE vize_sportivi SET scutit=true (viza CLUB_B) -> 0 randuri afectate', (r2b.data || []).length === 0 && vChkB?.scutit === false, `afectate=${r2b.data?.length}`);

      const r2c = await adminA.from('deconturi_federatie').update({ suma_totala: 1 }).eq('id', decB.id).select('id');
      const { data: dChk } = await supabaseAdmin.from('deconturi_federatie').select('suma_totala').eq('id', decB.id).single();
      record('UPDATE deconturi_federatie (decont CLUB_B) -> 0 randuri afectate', (r2c.data || []).length === 0 && Number(dChk?.suma_totala) === 170);

      const r3 = await adminA.from('taxa_anuala_config').insert({ tip: 'FRAM', an_fiscal: AN, suma: 1 });
      record('INSERT taxa_anuala_config (non-super-admin) respins', !!r3.error, `code=${errCode(r3.error)}`);
      const r3b = await adminA.from('taxa_anuala_config').update({ suma: 1 }).eq('tip', 'FRQKD').eq('an_fiscal', AN).select('id');
      const { data: cChk } = await supabaseAdmin.from('taxa_anuala_config').select('suma').eq('tip', 'FRQKD').eq('an_fiscal', AN).single();
      record('UPDATE taxa_anuala_config (non-super-admin) -> 0 randuri afectate, pret neschimbat', (r3b.data || []).length === 0 && Number(cChk?.suma) === 170, `err=${errCode(r3b.error)} afectate=${r3b.data?.length} pret=${cChk?.suma}`);
      const r3c = await adminA.from('taxa_anuala_config').delete().eq('tip', 'FRQKD').eq('an_fiscal', AN).select('id');
      const { data: cChk2 } = await supabaseAdmin.from('taxa_anuala_config').select('suma').eq('tip', 'FRQKD').eq('an_fiscal', AN);
      record('DELETE taxa_anuala_config (non-super-admin) -> 0 randuri sterse', (r3c.data || []).length === 0 && (cChk2 || []).length === 1);
    }

    // ── 3. RPC cross-club si fara drept ─────────────────────────────────
    console.log('\n--- 3. RPC cross-club (ADMIN_CLUB@CLUB_A) ---');
    {
      const r1 = await adminA.rpc('genereaza_taxe_anuale', { p_club_id: CLUB_B, p_tip: 'FRQKD', p_an: AN, p_sportiv_ids: [sB.id] });
      record('genereaza_taxe_anuale(CLUB_B) -> 42501', errCode(r1.error) === '42501', `code=${errCode(r1.error)}`);

      const r2 = await adminA.rpc('seteaza_scutire_taxa', { p_sportiv_id: sB.id, p_tip: 'FRQKD', p_an: AN, p_scutit: true, p_motiv: 'ZZ test motiv' });
      record('seteaza_scutire_taxa(sportiv din CLUB_B) -> 42501', errCode(r2.error) === '42501', `code=${errCode(r2.error)}`);
      const { data: vChkB } = await supabaseAdmin.from('vize_sportivi').select('scutit').eq('id', vizaB.id).single();
      record('seteaza_scutire_taxa refuzata: viza CLUB_B ramane nescutita', vChkB?.scutit === false);

      const r3 = await adminA.rpc('inregistreaza_plata_federatie', { p_club_id: CLUB_B, p_tip: 'FRQKD', p_an: AN, p_sportiv_ids: [sB.id], p_metoda_plata: 'Cash' });
      record('inregistreaza_plata_federatie(CLUB_B) -> 42501', errCode(r3.error) === '42501', `code=${errCode(r3.error)}`);

      const r4 = await adminA.rpc('inregistreaza_plata_federatie', { p_club_id: CLUB_A, p_tip: 'FRQKD', p_an: AN, p_sportiv_ids: [sB.id], p_metoda_plata: 'Cash' });
      const m4 = errMsg(r4.error);
      record('inregistreaza_plata_federatie(CLUB_A, sportiv CLUB_B) -> eroare (P0001)', !!r4.error && errCode(r4.error) === 'P0001', `code=${errCode(r4.error)}`);
      record(
        'mesajul de eroare NU dezvaluie numele sportivului din alt club',
        !!r4.error && !m4.includes(CANARY_PREFIX) && !m4.includes(sB.nume),
        'mesaj fara prefix/nume canar'
      );
      const { count: nDecA } = await supabaseAdmin.from('deconturi_federatie').select('id', { count: 'exact', head: true }).eq('an_fiscal', AN).eq('club_id', CLUB_A);
      record('plata refuzata nu a creat decont in CLUB_A', (nDecA ?? 0) === 0);
    }

    // ── 4. Functii interne neexpuse ─────────────────────────────────────
    console.log('\n--- 4. Functii interne neexpuse prin /rpc ---');
    {
      const interne: Array<[string, any]> = [
        ['activeaza_taxa_anuala', { p_sportiv_id: sA.id }],
        ['activeaza_taxa_sportiv', { p_sportiv_id: sA.id, p_tip: 'FRAM', p_an: AN }],
        ['factureaza_viza_taxa', { p_viza_id: vizaA.id }],
        ['proceseaza_taxe_in_asteptare', { p_tip: 'FRQKD', p_an: AN }],
      ];
      for (const [fn, args] of interne) {
        const r = await adminA.rpc(fn, args);
        const code = errCode(r.error);
        // 42501 = permission denied for function; PGRST202 = functia nu mai e expusa in schema cache
        record(`rpc ${fn} refuzat pentru authenticated`, !!r.error && (code === '42501' || code === 'PGRST202'), `code=${code}`);
      }
      const { count: nVzFram } = await supabaseAdmin.from('vize_sportivi').select('id', { count: 'exact', head: true }).eq('sportiv_id', sA.id).eq('tip', 'FRAM').eq('an', AN);
      record('apelul intern refuzat nu a creat viza FRAM 2099', (nVzFram ?? 0) === 0);
    }

    // ── 5. Raport + INSTRUCTOR + fara header ────────────────────────────
    console.log('\n--- 5. Raport / INSTRUCTOR / fara header ---');
    {
      const r1 = await adminA.rpc('raport_taxe_anuale_cluburi', { p_tip: 'FRQKD', p_an: AN });
      const rows = (r1.data || []) as any[];
      record('raport (ADMIN_CLUB@A): exact un rand, club_id = CLUB_A', !r1.error && rows.length === 1 && rows[0].club_id === CLUB_A, `err=${errMsg(r1.error)} n=${rows.length}`);
      record('raport (ADMIN_CLUB@A): sportivul canar propriu numarat (nr_sportivi=1, facturati=1)', rows.length === 1 && rows[0].nr_sportivi === 1 && rows[0].nr_facturati === 1, JSON.stringify(rows[0] ? { nr_sportivi: rows[0].nr_sportivi, nr_facturati: rows[0].nr_facturati } : {}));

      const i1 = await instrA.rpc('genereaza_taxe_anuale', { p_club_id: CLUB_A, p_tip: 'FRQKD', p_an: AN, p_sportiv_ids: [sA.id] });
      record('genereaza_taxe_anuale ca INSTRUCTOR@A (propriul club) -> 42501', errCode(i1.error) === '42501', `code=${errCode(i1.error)}`);
      const i2 = await instrA.rpc('raport_taxe_anuale_cluburi', { p_tip: 'FRQKD', p_an: AN });
      record('raport ca INSTRUCTOR@A -> 0 randuri', !i2.error && (i2.data || []).length === 0, `err=${errMsg(i2.error)} n=${(i2.data || []).length}`);
      const i3 = await instrA.rpc('inregistreaza_plata_federatie', { p_club_id: CLUB_A, p_tip: 'FRQKD', p_an: AN, p_sportiv_ids: [sA.id], p_metoda_plata: 'Cash' });
      record('inregistreaza_plata_federatie ca INSTRUCTOR@A -> 42501', errCode(i3.error) === '42501', `code=${errCode(i3.error)}`);
      const i4 = await instrA.rpc('seteaza_scutire_taxa', { p_sportiv_id: sA.id, p_tip: 'FRQKD', p_an: AN, p_scutit: true, p_motiv: 'ZZ test motiv' });
      record('seteaza_scutire_taxa ca INSTRUCTOR@A -> 42501', errCode(i4.error) === '42501', `code=${errCode(i4.error)}`);

      const n1 = await noHdr.rpc('genereaza_taxe_anuale', { p_club_id: CLUB_A, p_tip: 'FRQKD', p_an: AN, p_sportiv_ids: [sA.id] });
      record('genereaza_taxe_anuale fara header de context -> 42501', errCode(n1.error) === '42501', `code=${errCode(n1.error)}`);
      const n2 = await noHdr.rpc('raport_taxe_anuale_cluburi', { p_tip: 'FRQKD', p_an: AN });
      record('raport fara header de context -> 0 randuri', !n2.error && (n2.data || []).length === 0, `err=${errMsg(n2.error)}`);

      // anon fara login: nicio functie nu e apelabila
      const anon = userClient(null);
      const a1 = await anon.rpc('genereaza_taxe_anuale', { p_club_id: CLUB_A, p_tip: 'FRQKD', p_an: AN });
      record('genereaza_taxe_anuale ca anon (neautentificat) refuzat', !!a1.error, `code=${errCode(a1.error)}`);
    }

    // Starea canar nu a fost alterata de apelurile refuzate
    {
      const { data: vz } = await supabaseAdmin.from('vize_sportivi').select('id, scutit').in('id', [vizaA.id, vizaB.id]);
      record('nicio viza canar nu a fost scutita de apelurile refuzate', (vz || []).length === 2 && (vz || []).every((v: any) => v.scutit === false));
    }
  } catch (err: any) {
    console.error('\nTEST ESUAT (exceptie):', err?.message || err);
    results.push({ name: 'exceptie in executie', passed: false, detail: String(err?.message || err) });
  } finally {
    console.log('\n--- Cleanup ---');
    let probleme: string[] = [];
    try {
      probleme = await cleanupCanary(ctx);
      if (before) {
        const after = await counts();
        const eq = JSON.stringify(before) === JSON.stringify(after);
        console.log('Numaratori dupa:', JSON.stringify(after));
        record('numaratori plati(FRQKD+FRAM)/vize/deconturi/decont_sportivi/config identice inainte vs dupa', eq, eq ? 'identice' : `inainte=${JSON.stringify(before)} dupa=${JSON.stringify(after)}`);
        const bAfter = await baselineReal();
        record('decontul real FRQKD 2025 (CLUB_B) neschimbat', bAfter === baselineBefore, bAfter);
      }
    } catch (e: any) {
      probleme.push(`cleanup a aruncat: ${e?.message || e}`);
    }
    record('cleanup complet (zero urme canar)', probleme.length === 0, probleme.join(' | '));

    console.log('\n=== REZUMAT ===');
    console.table(results.map((r) => ({ Verificare: r.name, Rezultat: r.passed ? 'PASS' : 'FAIL' })));
    const failed = results.filter((r) => !r.passed);
    console.log(failed.length === 0 ? `\nToate cele ${results.length} verificari au trecut. Exit 0.` : `\n${failed.length} verificari ESUATE din ${results.length}. Exit 1.`);
    process.exitCode = failed.length === 0 ? 0 : 1;
  }
}

main();
