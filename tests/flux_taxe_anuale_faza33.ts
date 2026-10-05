// tests/flux_taxe_anuale_faza33.ts
//
// Faza 33 — Plan 10, Task 2.
// Test live al fluxului complet de bani al taxelor anuale FRQKD + FRAM, ca ADMIN_CLUB real (PostgREST: JWT + header
// active-role-context-id), pe date canar (prefix ZZ_TEST_FAZA33_, perioada 2099 + perioadele curente pentru calea trigger).
//
//   F1 calea trigger (inscriere -> taxa activata)   F5 plata catre federatie cu bifare
//   F2 generare in masa (FRQKD 2099)                F6 dublare refuzata / scutit refuzat / a doua plata pe aceeasi perioada
//   F3 FRAM in asteptare -> pret setat -> facturat  F7 conditia bannerului «virat dar neachitat»
//   F4 scutire                                      F8 raport pe cluburi
//
// Cleanup obligatoriu in finally + verificare zero urme. Cheile se citesc din .env si NU se afiseaza.
// Rulare: npx tsx tests/flux_taxe_anuale_faza33.ts

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
const CLUB_B = 'cbb0b228-b3e0-4735-9658-70999eb256c6'; // C.S. Phi Hau (doar baseline citit)
const DECONT_REAL_FRQKD_2025 = 'e71edebc-1ee1-4b96-b469-4adbb220b67e';

const CANARY_PREFIX = 'ZZ_TEST_FAZA33_';
const RUN_ID = Date.now();
const AN = 2099;
const TODAY = new Date().toISOString().slice(0, 10);

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });

type Check = { name: string; passed: boolean; detail?: string };
const results: Check[] = [];

// Fluxul e secvential (fiecare pas depinde de precedentul): la primul esec se opreste, cleanup ruleaza oricum.
function record(name: string, passed: boolean, detail?: string) {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
  if (!passed) throw new Error(`Assert esuat: ${name}${detail ? ` — ${detail}` : ''}`);
}
function note(name: string, passed: boolean, detail?: string) {
  // inregistrare fara oprire (folosita in cleanup)
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

  // ordinea FK: decont_sportivi -> deconturi_federatie -> tranzactii -> vize -> plati -> sursa -> sportivi -> preturi -> context+user
  const { data: dec } = await supabaseAdmin.from('deconturi_federatie').select('id').eq('an_fiscal', AN).in('club_id', [CLUB_A, CLUB_B]);
  const decIds = (dec || []).map((r: any) => r.id);
  await step('decont_sportivi(an 2099)', supabaseAdmin.from('decont_sportivi').delete().eq('an', AN));
  if (ids.length) await step('decont_sportivi(sportivi canar)', supabaseAdmin.from('decont_sportivi').delete().in('sportiv_id', ids));
  if (decIds.length) await step('deconturi_federatie(2099)', supabaseAdmin.from('deconturi_federatie').delete().in('id', decIds));

  if (ids.length) {
    const platiIds = ((await supabaseAdmin.from('plati').select('id').in('sportiv_id', ids)).data || []).map((r: any) => r.id);
    if (platiIds.length) {
      await step('tranzactie_plata', supabaseAdmin.from('tranzactie_plata').delete().in('plata_id', platiIds));
    }
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

  const cnt = async (t: string, f: (q: any) => any) => {
    const { count } = await f(supabaseAdmin.from(t).select('id', { count: 'exact', head: true }));
    return count ?? 0;
  };
  const left = {
    sportivi_canar: await cnt('sportivi', (q) => q.like('nume', `${CANARY_PREFIX}%`)),
    config_2099: await cnt('taxa_anuala_config', (q) => q.eq('an_fiscal', AN)),
    deconturi_2099: await cnt('deconturi_federatie', (q) => q.eq('an_fiscal', AN)),
    vize_2099: await cnt('vize_sportivi', (q) => q.eq('an', AN)),
    plati_2099: await cnt('plati', (q) => q.eq('an', AN).in('tip', ['FRQKD', 'FRAM'])),
    vize_pe_sportivi_canar: ids.length ? await cnt('vize_sportivi', (q) => q.in('sportiv_id', ids)) : 0,
    plati_pe_sportivi_canar: ids.length ? await cnt('plati', (q) => q.in('sportiv_id', ids)) : 0,
    rol_efemer: ctx.roleIds.length ? await cnt('utilizator_roluri_multicont', (q) => q.in('id', ctx.roleIds)) : 0,
  };
  console.log('Verificare finala (asteptat zero):', JSON.stringify(left));
  for (const [k, v] of Object.entries(left)) if (v !== 0) probleme.push(`ramas ${k}=${v}`);
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

    // ── PREGATIRE ───────────────────────────────────────────────────────
    const testEmail = `zztest_faza33_flux_${RUN_ID}@example.com`;
    const testPassword = `TestFaza33_${RUN_ID}!Aa`;
    console.log(`\nCreare utilizator efemer: ${testEmail}`);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail, password: testPassword, email_confirm: true,
    });
    if (authError) throw authError;
    ctx.userId = authData.user.id;

    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from('utilizator_roluri_multicont')
      .insert({ user_id: ctx.userId, club_id: CLUB_A, rol_denumire: 'ADMIN_CLUB', is_primary: true })
      .select('id').single();
    if (roleErr) throw roleErr;
    ctx.roleIds.push(roleRow.id);

    const S: Array<{ id: string; nume: string }> = [];
    for (let i = 1; i <= 4; i++) {
      const { data, error } = await supabaseAdmin
        .from('sportivi')
        .insert({ nume: `${CANARY_PREFIX}S${i}_${RUN_ID}`, prenume: 'Test', status: 'Activ', club_id: CLUB_A, data_nasterii: '2010-01-01' })
        .select('id, nume').single();
      if (error) throw error;
      S.push(data);
    }
    const [S1, S2, S3, S4] = S;

    const { error: pretErr } = await supabaseAdmin.from('taxa_anuala_config').insert({ tip: 'FRQKD', an_fiscal: AN, suma: 170 });
    if (pretErr) throw pretErr;

    const admin = userClient(roleRow.id);
    const { error: signErr } = await admin.auth.signInWithPassword({ email: testEmail, password: testPassword });
    if (signErr) throw signErr;
    console.log('Pregatire completa: ADMIN_CLUB@CLUB_A efemer autentificat, 4 sportivi canar (S1..S4), pret FRQKD 2099 = 170, fara pret FRAM 2099.');

    // helpers de verificare (service role)
    const viza = async (sid: string, tip: string, an: number) => {
      const { data, error } = await supabaseAdmin.from('vize_sportivi').select('*').eq('sportiv_id', sid).eq('tip', tip).eq('an', an).maybeSingle();
      if (error) throw error;
      return data as any;
    };
    const plata = async (id: string | null) => {
      if (!id) return null;
      const { data, error } = await supabaseAdmin.from('plati').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as any;
    };

    // ── F1: calea trigger (inscriere -> taxa activata) ──────────────────
    console.log('\n--- F1: inscriere -> taxa activata prin trigger (perioade curente) ---');
    const anQ = (await supabaseAdmin.rpc('perioada_taxa', { p_tip: 'FRQKD', p_data: TODAY })).data as number;
    const anA = (await supabaseAdmin.rpc('perioada_taxa', { p_tip: 'FRAM', p_data: TODAY })).data as number;
    const { data: cfgQ } = await supabaseAdmin.from('taxa_anuala_config').select('suma').eq('tip', 'FRQKD').eq('an_fiscal', anQ).maybeSingle();
    const { data: cfgA } = await supabaseAdmin.from('taxa_anuala_config').select('suma').eq('tip', 'FRAM').eq('an_fiscal', anA).maybeSingle();
    console.log(`Perioade curente: FRQKD sezon ${anQ} (pret ${cfgQ?.suma ?? 'lipsa'}), FRAM an ${anA} (pret ${cfgA?.suma ?? 'lipsa'})`);

    let f1Actor = 'ADMIN_CLUB (client PostgREST)';
    const f1Row = { sportiv_id: S1.id, data: TODAY, arma: 'Baston' };
    const f1Try = await admin.from('stagii_cvd_participare').insert(f1Row);
    if (f1Try.error) {
      const rlsLike = errCode(f1Try.error) === '42501' || /row-level security|permission denied/i.test(errMsg(f1Try.error));
      if (!rlsLike) throw new Error(`F1 insert esuat din alt motiv: ${errMsg(f1Try.error)}`);
      f1Actor = `service role (ADMIN_CLUB respins de RLS: ${errCode(f1Try.error)} ${errMsg(f1Try.error)})`;
      const { error: e2 } = await supabaseAdmin.from('stagii_cvd_participare').insert(f1Row);
      if (e2) throw e2;
    }
    console.log(`F1 sursa = stagii_cvd_participare (sportiv_id, data, arma); insert facut de: ${f1Actor}`);
    const vQ = await viza(S1.id, 'FRQKD', anQ);
    const vA = await viza(S1.id, 'FRAM', anA);
    const pQ = await plata(vQ?.plata_id ?? null);
    const pA = await plata(vA?.plata_id ?? null);
    record(`F1 viza FRQKD ${anQ} creata de trigger pentru S1`, !!vQ && vQ.club_id === CLUB_A && !vQ.scutit);
    record(
      `F1 FRQKD ${anQ}: ${cfgQ ? `facturata (Neachitat, ${cfgQ.suma})` : 'in asteptare (fara pret)'}`,
      cfgQ ? !!pQ && pQ.status === 'Neachitat' && Number(pQ.suma) === Number(cfgQ.suma) && pQ.tip === 'FRQKD' && pQ.descriere === `FRQKD Sezonul ${anQ}-${anQ + 1}` : vQ.plata_id === null
    );
    record(`F1 viza FRAM ${anA} creata de trigger pentru S1`, !!vA && vA.club_id === CLUB_A && !vA.scutit);
    record(
      `F1 FRAM ${anA}: ${cfgA ? `facturata (Neachitat, ${cfgA.suma})` : 'in asteptare (fara pret)'}`,
      cfgA ? !!pA && pA.status === 'Neachitat' && Number(pA.suma) === Number(cfgA.suma) && pA.tip === 'FRAM' && pA.descriere === `FRAM Anul ${anA}` : vA.plata_id === null
    );

    // ── F2: generare in masa FRQKD 2099 ─────────────────────────────────
    console.log('\n--- F2: genereaza_taxe_anuale(CLUB_A, FRQKD, 2099, [S1..S4]) ---');
    const ids4 = [S1.id, S2.id, S3.id, S4.id];
    const g1 = await admin.rpc('genereaza_taxe_anuale', { p_club_id: CLUB_A, p_tip: 'FRQKD', p_an: AN, p_sportiv_ids: ids4 });
    record('F2 genereaza: facturat=4, in_asteptare=0, refuzat=0', !g1.error && g1.data.facturat === 4 && g1.data.in_asteptare === 0 && g1.data.refuzat === 0 && g1.data.exista === 0, `err=${errMsg(g1.error)} ${JSON.stringify(g1.data && { f: g1.data.facturat, a: g1.data.in_asteptare, e: g1.data.exista, r: g1.data.refuzat })}`);
    const g2 = await admin.rpc('genereaza_taxe_anuale', { p_club_id: CLUB_A, p_tip: 'FRQKD', p_an: AN, p_sportiv_ids: ids4 });
    record('F2 reapel idempotent: exista=4, facturat=0', !g2.error && g2.data.exista === 4 && g2.data.facturat === 0, `err=${errMsg(g2.error)} ${JSON.stringify(g2.data && { f: g2.data.facturat, e: g2.data.exista })}`);
    {
      const { data: pl } = await supabaseAdmin.from('plati').select('id, suma, status, descriere, tip, an').in('sportiv_id', ids4).eq('an', AN).eq('tip', 'FRQKD');
      record('F2 exact 4 facturi FRQKD 2099 Neachitat 170, descriere corecta', (pl || []).length === 4 && (pl || []).every((p: any) => p.status === 'Neachitat' && Number(p.suma) === 170 && p.descriere === `FRQKD Sezonul ${AN}-${AN + 1}`));
    }

    // ── F3: FRAM in asteptare -> pret -> facturat ───────────────────────
    console.log('\n--- F3: FRAM 2099 in asteptare, apoi pret FRAM 2099 = 100 ---');
    const g3 = await admin.rpc('genereaza_taxe_anuale', { p_club_id: CLUB_A, p_tip: 'FRAM', p_an: AN, p_sportiv_ids: [S1.id, S2.id] });
    record('F3 genereaza FRAM 2099 [S1,S2] fara pret: in_asteptare=2', !g3.error && g3.data.in_asteptare === 2 && g3.data.facturat === 0, `err=${errMsg(g3.error)} ${JSON.stringify(g3.data && { f: g3.data.facturat, a: g3.data.in_asteptare })}`);
    for (const s of [S1, S2]) {
      const v = await viza(s.id, 'FRAM', AN);
      record(`F3 viza FRAM 2099 ${s.nume.slice(CANARY_PREFIX.length, CANARY_PREFIX.length + 2)} in asteptare (plata_id NULL, nescutita)`, !!v && v.plata_id === null && !v.scutit);
    }
    const { error: pretFramErr } = await supabaseAdmin.from('taxa_anuala_config').insert({ tip: 'FRAM', an_fiscal: AN, suma: 100 });
    if (pretFramErr) throw pretFramErr;
    for (const s of [S1, S2]) {
      const v = await viza(s.id, 'FRAM', AN);
      const p = await plata(v?.plata_id ?? null);
      record(`F3 dupa pret: FRAM 2099 ${s.nume.slice(CANARY_PREFIX.length, CANARY_PREFIX.length + 2)} are factura Neachitat 100`, !!p && p.status === 'Neachitat' && Number(p.suma) === 100 && p.tip === 'FRAM' && p.descriere === `FRAM Anul ${AN}`);
    }

    // ── F4: scutire ─────────────────────────────────────────────────────
    console.log('\n--- F4: scutire S3 (FRQKD 2099) ---');
    const vS3 = await viza(S3.id, 'FRQKD', AN);
    const plataS3 = vS3.plata_id as string;
    const sc = await admin.rpc('seteaza_scutire_taxa', { p_sportiv_id: S3.id, p_tip: 'FRQKD', p_an: AN, p_scutit: true, p_motiv: 'ZZ test motiv' });
    record('F4 seteaza_scutire_taxa: stare=scutit, factura anulata returnata', !sc.error && sc.data.stare === 'scutit' && sc.data.plata_anulata_id === plataS3, `err=${errMsg(sc.error)} ${JSON.stringify(sc.data)}`);
    {
      const v = await viza(S3.id, 'FRQKD', AN);
      const p = await plata(plataS3);
      record('F4 viza S3 scutita (motiv, scutit_de) si factura S3 Anulat', v.scutit === true && v.motiv_scutire === 'ZZ test motiv' && !!v.scutit_de && p?.status === 'Anulat');
    }

    // ── F5: plata catre federatie cu bifare ─────────────────────────────
    console.log('\n--- F5: S1 Achitat la club; plata catre federatie [S1,S2] ---');
    const vS1 = await viza(S1.id, 'FRQKD', AN);
    const { error: achErr } = await supabaseAdmin.from('plati').update({ status: 'Achitat' }).eq('id', vS1.plata_id);
    if (achErr) throw achErr;
    const pf1 = await admin.rpc('inregistreaza_plata_federatie', { p_club_id: CLUB_A, p_tip: 'FRQKD', p_an: AN, p_sportiv_ids: [S1.id, S2.id], p_metoda_plata: 'Transfer Bancar' });
    record('F5 inregistreaza_plata_federatie [S1,S2]: suma 340, 2 participanti', !pf1.error && Number(pf1.data.suma_totala) === 340 && pf1.data.nr_participanti === 2, `err=${errMsg(pf1.error)} ${JSON.stringify(pf1.data && { s: pf1.data.suma_totala, n: pf1.data.nr_participanti })}`);
    {
      const { data: d } = await supabaseAdmin.from('deconturi_federatie').select('*').eq('id', pf1.data.decont_id).single();
      record('F5 decont: Platit, confirmata_federatie=true, 340, 2, Transfer Bancar, FRQKD 2099, CLUB_A', d.status_plata === 'Platit' && d.confirmata_federatie === true && Number(d.suma_totala) === 340 && d.nr_participanti === 2 && d.metoda_plata === 'Transfer Bancar' && d.tip_activitate === 'FRQKD' && d.an_fiscal === AN && d.club_id === CLUB_A && !!d.creat_de);
      const { data: ds } = await supabaseAdmin.from('decont_sportivi').select('sportiv_id, suma, plata_id, tip, an').eq('decont_id', pf1.data.decont_id);
      record('F5 decont_sportivi: S1 si S2, 170 fiecare, cu plata_id', (ds || []).length === 2 && (ds || []).every((r: any) => Number(r.suma) === 170 && !!r.plata_id && r.tip === 'FRQKD' && r.an === AN) && [S1.id, S2.id].every((id) => (ds || []).some((r: any) => r.sportiv_id === id)));
    }

    // ── F6: dublare / scutit / a doua plata ─────────────────────────────
    console.log('\n--- F6: dublare refuzata, scutit refuzat, a doua plata pe aceeasi perioada ---');
    const d1 = await admin.rpc('inregistreaza_plata_federatie', { p_club_id: CLUB_A, p_tip: 'FRQKD', p_an: AN, p_sportiv_ids: [S2.id], p_metoda_plata: 'Cash' });
    record('F6 reapel cu [S2] (deja virat) -> eroare P0001', !!d1.error && errCode(d1.error) === 'P0001', `code=${errCode(d1.error)}`);
    const d2 = await admin.rpc('inregistreaza_plata_federatie', { p_club_id: CLUB_A, p_tip: 'FRQKD', p_an: AN, p_sportiv_ids: [S3.id], p_metoda_plata: 'Cash' });
    record('F6 apel cu [S3] (scutit) -> eroare P0001', !!d2.error && errCode(d2.error) === 'P0001', `code=${errCode(d2.error)}`);
    const d3 = await admin.rpc('inregistreaza_plata_federatie', { p_club_id: CLUB_A, p_tip: 'FRQKD', p_an: AN, p_sportiv_ids: [S4.id], p_metoda_plata: 'Cash' });
    record('F6 apel cu [S4] -> a doua plata pe aceeasi perioada reuseste (170)', !d3.error && Number(d3.data.suma_totala) === 170 && d3.data.nr_participanti === 1 && d3.data.decont_id !== pf1.data.decont_id, `err=${errMsg(d3.error)}`);
    {
      const { count } = await supabaseAdmin.from('deconturi_federatie').select('id', { count: 'exact', head: true }).eq('club_id', CLUB_A).eq('an_fiscal', AN).eq('tip_activitate', 'FRQKD');
      const { count: nds } = await supabaseAdmin.from('decont_sportivi').select('id', { count: 'exact', head: true }).eq('an', AN).eq('tip', 'FRQKD');
      record('F6 refuzurile nu au lasat urme: 2 deconturi, 3 decont_sportivi pe FRQKD 2099', count === 2 && nds === 3, `deconturi=${count} decont_sportivi=${nds}`);
    }

    // ── F7: conditia bannerului «virat dar neachitat» ───────────────────
    console.log('\n--- F7: S2 virat dar neachitat (conditia BannerViratNeachitat) ---');
    {
      const vS2 = await viza(S2.id, 'FRQKD', AN);
      const p = await plata(vS2.plata_id);
      const { data: ds } = await supabaseAdmin.from('decont_sportivi').select('id').eq('sportiv_id', S2.id).eq('an', AN).eq('tip', 'FRQKD');
      record('F7 S2: are decont_sportivi si factura Neachitat', (ds || []).length === 1 && p?.status === 'Neachitat');
      // acelasi lucru vazut prin clientul ADMIN_CLUB (calea reala a bannerului)
      const dsC = await admin.from('decont_sportivi').select('sportiv_id, plata_id').eq('sportiv_id', S2.id).eq('an', AN);
      const plC = await admin.from('plati').select('id, status').eq('id', vS2.plata_id);
      record('F7 aceeasi conditie vizibila prin clientul ADMIN_CLUB (RLS)', !dsC.error && (dsC.data || []).length === 1 && !plC.error && plC.data?.[0]?.status === 'Neachitat', `dsErr=${errMsg(dsC.error)} plErr=${errMsg(plC.error)}`);
    }

    // ── F8: raport pe cluburi ───────────────────────────────────────────
    console.log('\n--- F8: raport_taxe_anuale_cluburi(FRQKD, 2099) ---');
    {
      const r = await admin.rpc('raport_taxe_anuale_cluburi', { p_tip: 'FRQKD', p_an: AN });
      const rows = (r.data || []) as any[];
      const row = rows.find((x) => x.club_id === CLUB_A);
      console.log('Rand raport CLUB_A:', JSON.stringify(row));
      record('F8 raport: exact un rand (CLUB_A)', !r.error && rows.length === 1 && !!row, `err=${errMsg(r.error)} n=${rows.length}`);
      record('F8 nr_sportivi=4, nr_scutiti=1, nr_in_asteptare=0, nr_facturati=3', row.nr_sportivi === 4 && row.nr_scutiti === 1 && row.nr_in_asteptare === 0 && row.nr_facturati === 3);
      record('F8 suma_facturata=510, suma_achitata_club=170, suma_restanta_club=340', Number(row.suma_facturata) === 510 && Number(row.suma_achitata_club) === 170 && Number(row.suma_restanta_club) === 340);
      record('F8 nr_virati=3, suma_virata=510, suma_de_virat=0', row.nr_virati === 3 && Number(row.suma_virata) === 510 && Number(row.suma_de_virat) === 0);
    }
  } catch (err: any) {
    console.error('\nTEST ESUAT:', err?.message || err);
    if (!results.some((r) => !r.passed)) results.push({ name: 'exceptie in executie', passed: false, detail: String(err?.message || err) });
  } finally {
    console.log('\n--- Cleanup ---');
    let probleme: string[] = [];
    try {
      probleme = await cleanupCanary(ctx);
      if (before) {
        const after = await counts();
        const eq = JSON.stringify(before) === JSON.stringify(after);
        console.log('Numaratori dupa:', JSON.stringify(after));
        note('numaratori plati(FRQKD+FRAM)/vize/deconturi/decont_sportivi/config identice inainte vs dupa', eq, eq ? 'identice' : `inainte=${JSON.stringify(before)} dupa=${JSON.stringify(after)}`);
        const bAfter = await baselineReal();
        note('decontul real FRQKD 2025 (CLUB_B) neschimbat', bAfter === baselineBefore, bAfter);
      }
    } catch (e: any) {
      probleme.push(`cleanup a aruncat: ${e?.message || e}`);
    }
    note('cleanup complet (zero urme canar, zero factura/viza pe sportivii canar)', probleme.length === 0, probleme.join(' | '));

    console.log('\n=== REZUMAT ===');
    console.table(results.map((r) => ({ Verificare: r.name, Rezultat: r.passed ? 'PASS' : 'FAIL' })));
    const failed = results.filter((r) => !r.passed);
    console.log(failed.length === 0 ? `\nToate cele ${results.length} verificari au trecut. Exit 0.` : `\n${failed.length} verificari ESUATE din ${results.length}. Exit 1.`);
    process.exitCode = failed.length === 0 ? 0 : 1;
  }
}

main();
