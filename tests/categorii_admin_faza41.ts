// tests/categorii_admin_faza41.ts
//
// Faza 41 - Plan 04. Dovedeste LIVE contractul RPC categorii_aplica_operatie (D-01, D-03, D-04, D-07, D-08, D-09)
// si ca noile stringuri de select (SELECT_INSCRIERI_COMPETITIE / SELECT_ECHIPE_COMPETITIE) se incarca fara erori PostgREST.
//
// Siguranta date reale: competitii efemere ZZ_TEST_FAZA41_*, EXCLUSIV sportivi cu viza FRQKD pe anul fiscal curent
// (triggerul trg_taxa_anuala_inscrieri_competitie devine no-op; verificat la check 15). GDPR: doar UUID-uri / numaratori.
// finally: sterge competitiile (CASCADE) + cei 2 utilizatori temporari; audit_log nu are DELETE (se raporteaza numarul de randuri).
//
// Rulare: npx tsx tests/categorii_admin_faza41.ts   (cod 1 = cel putin un FAIL, cod 2 = precondiții nesigure)

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { SELECT_INSCRIERI_COMPETITIE, SELECT_ECHIPE_COMPETITIE } from '../components/Competitii/constants';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) {
  console.error('Lipsesc VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const CLUB_A = '83e7f771-46cf-4c4e-b70f-356d7b0bff06'; // Kim Long Dao Falticeni
const CLUB_B = 'cbb0b228-b3e0-4735-9658-70999eb256c6'; // C.S. Phi Hau
const PREFIX = 'ZZ_TEST_FAZA41_';
const EMAIL_PREFIX = 'zztest_faza41_';
const RUN_ID = Date.now();
const OP = 'categorii_aplica_operatie';
const admin = createClient(url, serviceKey);

type Check = { name: string; passed: boolean; detail?: string };
const results: Check[] = [];
const record = (name: string, passed: boolean, detail?: string) => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} - ${name}${detail ? ` (${detail})` : ''}`);
};

const rpc = (c: SupabaseClient, args: Record<string, any>) => c.rpc(OP, args);
const msg = (r: { error: any }) => r.error?.message ?? '';
const refuzat = (r: { data: any; error: any }) => !!r.error;

async function clientFor(email: string, parola: string, contextId: string): Promise<SupabaseClient> {
  const c = createClient(url!, anonKey!, { global: { headers: { 'active-role-context-id': contextId } } });
  const { error } = await c.auth.signInWithPassword({ email, password: parola });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return c;
}

class Precond extends Error {}

async function main() {
  const competitii: string[] = [];
  const userIds: string[] = [];
  const parola = `Zz!${RUN_ID}aA`;
  const sportivi: string[] = [];
  const startTs = new Date().toISOString();

  try {
    // ── precondiție: functia exista ─────────────────────────────────────────
    const probe = await admin.rpc(OP, { p_operatie: 'mutare', p_competitie: '00000000-0000-0000-0000-000000000000' });
    if (probe.error?.code === 'PGRST202') throw new Precond(`functia ${OP} nu exista live`);

    // ── sportivi cu viza FRQKD pe anul fiscal curent ────────────────────────
    const { data: anF } = await admin.rpc('an_fiscal_federatie', { p_data: new Date().toISOString().slice(0, 10) });
    const an = typeof anF === 'number' ? anF : new Date().getFullYear();
    const pick = async (club: string, n: number) => {
      const { data } = await admin.from('vize_sportivi').select('sportiv_id, sportivi!inner(club_id)')
        .eq('an', an).eq('tip', 'FRQKD').eq('sportivi.club_id', club).limit(40);
      return [...new Set((data ?? []).map((x: any) => x.sportiv_id as string))].slice(0, n);
    };
    const pa = await pick(CLUB_A, 4);
    const pb = await pick(CLUB_B, 1);
    if (pa.length < 4 || pb.length < 1) throw new Precond(`sportivi cu viza FRQKD an=${an} insuficienti (A=${pa.length}/4, B=${pb.length}/1)`);
    const [s1, s2, s3, s4] = pa;
    const s5 = pb[0];
    sportivi.push(...pa, s5);

    // ── competitii + categorii + inscrieri efemere ──────────────────────────
    const mkComp = async (suffix: string, status: string) => {
      const { data, error } = await admin.from('competitii').insert({
        denumire: `${PREFIX}${suffix}_${RUN_ID}`, tip: 'tehnica', data_inceput: '2027-06-01', data_sfarsit: '2027-06-02',
        locatie: 'Test', status, deadline_inscrieri: '2027-06-01',
      }).select('id').single();
      if (error || !data) throw new Error(`competitie ${suffix}: ${error?.message}`);
      competitii.push(data.id);
      return data.id as string;
    };
    const mkCat = async (comp: string, suffix: string, nr: number, tip = 'individual') => {
      const { data, error } = await admin.from('categorii_competitie').insert({
        competitie_id: comp, denumire: `${PREFIX}${suffix}_${RUN_ID}`, varsta_min: 6, gen: 'Mixt',
        tip_participare: tip, numar_categorie: nr, ordine_afisare: nr,
      }).select('id').single();
      if (error || !data) throw new Error(`categorie ${suffix}: ${error?.message}`);
      return data.id as string;
    };
    const mkIns = async (comp: string, cat: string, club: string, sp: string, extra: Record<string, any> = {}) => {
      const { data, error } = await admin.from('inscrieri_competitie').insert({
        competitie_id: comp, categorie_id: cat, club_id: club, sportiv_id: sp, ...extra,
      }).select('id').single();
      if (error || !data) throw new Error(`inscriere: ${error?.message}`);
      return data.id as string;
    };
    const catDe = async (inscId: string) => (await admin.from('inscrieri_competitie').select('categorie_id').eq('id', inscId).single()).data?.categorie_id as string;
    const stat = async (catId: string) => (await admin.from('categorii_competitie').select('status_categorie').eq('id', catId).single()).data?.status_categorie as string;
    const nrCat = async (comp: string) => (await admin.from('categorii_competitie').select('id', { count: 'exact', head: true }).eq('competitie_id', comp)).count ?? 0;

    const C = await mkComp('C', 'inscrieri_deschise');
    const CF = await mkComp('CF', 'finalizata');
    const CO = await mkComp('CO', 'inscrieri_deschise');
    const c1 = await mkCat(C, 'c1', 1);
    const c2 = await mkCat(C, 'c2', 2);
    const c3 = await mkCat(C, 'c3', 3);
    const c4 = await mkCat(C, 'c4', 4, 'echipa');
    const cS = await mkCat(C, 'cS', 5);
    const cf1 = await mkCat(CF, 'cf1', 1);
    const co1 = await mkCat(CO, 'co1', 1);

    const i1c1 = await mkIns(C, c1, CLUB_A, s1, { taxa_achitata: true });
    const i2c1 = await mkIns(C, c1, CLUB_A, s2);
    const i3c2 = await mkIns(C, c2, CLUB_A, s3);
    const i4c2 = await mkIns(C, c2, CLUB_A, s4, { status: 'retras' });
    const i1c3 = await mkIns(C, c3, CLUB_A, s1);
    const i2cS = await mkIns(C, cS, CLUB_A, s2);
    const i3cS = await mkIns(C, cS, CLUB_A, s3);
    await mkIns(CO, co1, CLUB_B, s5);
    const { error: eEch } = await admin.from('echipe_competitie').insert({
      competitie_id: C, categorie_id: c4, club_id: CLUB_A, denumire_echipa: `${PREFIX}echipa_${RUN_ID}`,
    });
    if (eEch) throw new Error(`echipa: ${eEch.message}`);

    // ── utilizatori + roluri efemere ────────────────────────────────────────
    const mkUser = async (tag: string, rol: string, club: string | null) => {
      const email = `${EMAIL_PREFIX}${tag}_${RUN_ID}@example.com`;
      const { data, error } = await admin.auth.admin.createUser({ email, password: parola, email_confirm: true });
      if (error || !data.user) throw new Error(`user ${tag}: ${error?.message}`);
      userIds.push(data.user.id);
      const { data: rolRow, error: re } = await admin.from('utilizator_roluri_multicont')
        .insert({ user_id: data.user.id, rol_denumire: rol, club_id: club, is_primary: true }).select('id').single();
      if (re || !rolRow) throw new Error(`rol ${tag}: ${re?.message}`);
      return clientFor(email, parola, rolRow.id);
    };
    const sup = await mkUser('sup', 'SUPER_ADMIN_FEDERATIE', null);
    const adm = await mkUser('adm', 'ADMIN_CLUB', CLUB_A);
    const anon = createClient(url!, anonKey!);

    // 1: ADMIN_CLUB refuzat
    let r: any = await rpc(adm, { p_operatie: 'anulare', p_competitie: C, p_surse: [c1], p_asteptat: 2 });
    record('1 ADMIN_CLUB refuzat de RPC (42501), c1 neschimbata', r.error?.code === '42501' && (await stat(c1)) === 'activa', `code=${r.error?.code}`);

    // 2: anon refuzat
    r = await rpc(anon, { p_operatie: 'anulare', p_competitie: C, p_surse: [c1], p_asteptat: 2 });
    record('2 anon refuzat, nimic schimbat', refuzat(r) && (await stat(c1)) === 'activa', `code=${r.error?.code}`);

    // 3: asteptat gresit
    r = await rpc(sup, { p_operatie: 'anulare', p_competitie: C, p_surse: [c1], p_asteptat: 99 });
    record('3 anulare cu p_asteptat gresit refuzata ("redeschide"), c1 inca activa', refuzat(r) && msg(r).includes('redeschide') && (await stat(c1)) === 'activa', msg(r).slice(0, 60));

    // 4: anulare reusita
    r = await rpc(sup, { p_operatie: 'anulare', p_competitie: C, p_surse: [c1], p_asteptat: 2 });
    const taxa1 = (await admin.from('inscrieri_competitie').select('taxa_achitata').eq('id', i1c1).single()).data?.taxa_achitata;
    record('4 anulare reusita: c1 anulata, randuri ramase pe c1, taxe 1/1, taxa achitata neatinsa',
      !r.error && (await stat(c1)) === 'anulata' && (await catDe(i1c1)) === c1 && (await catDe(i2c1)) === c1
        && r.data?.taxe_anulate === 1 && r.data?.taxe_achitate_anulate === 1 && taxa1 === true,
      r.error ? msg(r) : JSON.stringify(r.data));

    // 5: mutari refuzate
    const mut = (tinta: string) => [{ tip: 'inscriere', id: i2c1, tinta }];
    const r5a: any = await rpc(sup, { p_operatie: 'mutare', p_competitie: C, p_mutari: mut(c4) });
    const r5b: any = await rpc(sup, { p_operatie: 'mutare', p_competitie: C, p_mutari: mut(co1) });
    const r5c: any = await rpc(sup, { p_operatie: 'mutare', p_competitie: C, p_mutari: mut(c1) });
    record('5 mutare refuzata: tinta incompatibila (echipa), alta competitie, categoria anulata; nimic mutat',
      refuzat(r5a) && refuzat(r5b) && refuzat(r5c) && (await catDe(i2c1)) === c1,
      `${r5a.error ? 'ok' : 'NU'}/${r5b.error ? 'ok' : 'NU'}/${r5c.error ? 'ok' : 'NU'}`);

    // 6: mutare reusita (realocare)
    r = await rpc(sup, { p_operatie: 'mutare', p_competitie: C, p_mutari: mut(c2) });
    record('6 mutare s2 c1->c2 reusita (inscrieri_mutate=1), randul e pe c2',
      !r.error && r.data?.inscrieri_mutate === 1 && (await catDe(i2c1)) === c2, r.error ? msg(r) : JSON.stringify(r.data));

    // 7: fuziune cu mutari incomplete
    const noua = { cheie: 'N', denumire: `${PREFIX}fuz_${RUN_ID}`, varsta_min: 6, varsta_max: null, gen: 'Mixt' };
    const mFull = [
      { tip: 'inscriere', id: i2c1, tinta: 'N' }, { tip: 'inscriere', id: i3c2, tinta: 'N' }, { tip: 'inscriere', id: i1c3, tinta: 'N' },
    ];
    const nrInainte = await nrCat(C);
    r = await rpc(sup, { p_operatie: 'fuziune', p_competitie: C, p_surse: [c2, c3], p_categorii_noi: [noua], p_mutari: mFull.slice(0, 2) });
    record('7 fuziune cu mutari incomplete refuzata ("redeschide"), nicio categorie creata',
      refuzat(r) && msg(r).includes('redeschide') && (await nrCat(C)) === nrInainte, msg(r).slice(0, 60));

    // 8: dublura s1 (c2 + c3 -> aceeasi tinta)
    const { data: extra, error: eEx } = await admin.from('inscrieri_competitie')
      .insert({ competitie_id: C, categorie_id: c2, club_id: CLUB_A, sportiv_id: s1 }).select('id').single();
    if (eEx || !extra) throw new Error(`rand extra s1/c2: ${eEx?.message}`);
    r = await rpc(sup, { p_operatie: 'fuziune', p_competitie: C, p_surse: [c2, c3], p_categorii_noi: [noua],
      p_mutari: [...mFull, { tip: 'inscriere', id: extra.id, tinta: 'N' }] });
    const dupOk = refuzat(r) && msg(r).includes('de două ori') && (await nrCat(C)) === nrInainte;
    await admin.from('inscrieri_competitie').delete().eq('id', extra.id);
    record('8 fuziune cu sportiv dublat refuzata (mesaj dublura), nicio categorie creata', dupOk, 'mesaj dublura'); // mesajul contine numele sportivului: nu se tipareste (GDPR)

    // 9: fuziune reusita
    const maxNr = (await admin.from('categorii_competitie').select('numar_categorie').eq('competitie_id', C)).data!.reduce((m: number, x: any) => Math.max(m, x.numar_categorie ?? 0), 0);
    r = await rpc(sup, { p_operatie: 'fuziune', p_competitie: C, p_surse: [c2, c3], p_categorii_noi: [noua], p_mutari: mFull });
    const nid = r.data?.categorii_noi?.[0]?.id as string | undefined;
    let ok9 = !r.error && !!nid;
    let d9 = r.error ? msg(r) : '';
    if (ok9) {
      const { data: nc } = await admin.from('categorii_competitie').select('este_fuzionata, categorii_fuzionate_din, numar_categorie, status_categorie').eq('id', nid!).single();
      const din = [...(nc?.categorii_fuzionate_din ?? [])].sort().join(',');
      const cheie = [c2, c3].sort().join(',');
      const moved = (await catDe(i2c1)) === nid && (await catDe(i3c2)) === nid && (await catDe(i1c3)) === nid;
      ok9 = !!nc?.este_fuzionata && din === cheie && nc.numar_categorie === maxNr + 1 && nc.status_categorie === 'activa'
        && (await stat(c2)) === 'fuzionata' && (await stat(c3)) === 'fuzionata' && moved && (await catDe(i4c2)) === c2;
      d9 = `nr=${nc?.numar_categorie} (asteptat ${maxNr + 1}) moved=${moved}`;
    }
    record('9 fuziune [c2,c3] reusita: categorie noua fuzionata, surse fuzionata, randuri mutate, retrasul ramas pe c2', ok9, d9);

    // 10: impartire cS
    const nA = { cheie: 'A', denumire: `${PREFIX}impA_${RUN_ID}`, varsta_min: 6, varsta_max: 9, gen: 'Mixt' };
    const nB = { cheie: 'B', denumire: `${PREFIX}impB_${RUN_ID}`, varsta_min: 10, varsta_max: null, gen: 'Mixt' };
    r = await rpc(sup, { p_operatie: 'impartire', p_competitie: C, p_surse: [cS], p_categorii_noi: [nA, nB],
      p_mutari: [{ tip: 'inscriere', id: i2cS, tinta: 'A' }, { tip: 'inscriere', id: i3cS, tinta: 'B' }] });
    let ok10 = !r.error;
    let d10 = r.error ? msg(r) : '';
    if (ok10) {
      const idA = r.data.categorii_noi.find((x: any) => x.cheie === 'A')?.id;
      const idB = r.data.categorii_noi.find((x: any) => x.cheie === 'B')?.id;
      const { data: sc } = await admin.from('categorii_competitie').select('status_categorie, categorii_fuzionate_din').eq('id', cS).single();
      const dinS = [...(sc?.categorii_fuzionate_din ?? [])].sort().join(',');
      ok10 = !!idA && !!idB && sc?.status_categorie === 'impartita' && dinS === [idA, idB].sort().join(',')
        && (await catDe(i2cS)) === idA && (await catDe(i3cS)) === idB;
      d10 = `sursa=${sc?.status_categorie}`;
    }
    record('10 impartire cS in 2 categorii noi: cS impartita, categorii_fuzionate_din = cele 2 id-uri, randuri mutate dupa mapare', ok10, d10);

    // 11: mutare rand retras
    r = await rpc(sup, { p_operatie: 'mutare', p_competitie: C, p_mutari: [{ tip: 'inscriere', id: i4c2, tinta: nid ?? c1 }] });
    record('11 mutarea randului retras refuzata, randul ramane pe c2', refuzat(r) && (await catDe(i4c2)) === c2, msg(r).slice(0, 70));

    // 12: competitie finalizata
    const r12a: any = await rpc(sup, { p_operatie: 'anulare', p_competitie: CF, p_surse: [cf1], p_asteptat: 0 });
    const r12b: any = await rpc(sup, { p_operatie: 'mutare', p_competitie: CF, p_mutari: [{ tip: 'inscriere', id: i1c1, tinta: cf1 }] });
    record('12 operatii pe competitie finalizata refuzate ("finalizată"), cf1 ramasa activa',
      refuzat(r12a) && refuzat(r12b) && msg(r12a).includes('finalizat') && msg(r12b).includes('finalizat') && (await stat(cf1)) === 'activa',
      `${msg(r12a).slice(0, 40)}`);

    // 13: clonare/editare directa prin RLS existenta
    const ins13: any = await sup.from('categorii_competitie').insert({
      competitie_id: C, denumire: `${PREFIX}clona_${RUN_ID}`, varsta_min: 6, gen: 'Mixt', tip_participare: 'individual',
    }).select('id');
    const clonaId = ins13.data?.[0]?.id;
    const upS: any = clonaId ? await sup.from('categorii_competitie').update({ varsta_max: 12 }).eq('id', clonaId).select('id') : { data: [], error: { message: 'fara clona' } };
    const upA: any = clonaId ? await adm.from('categorii_competitie').update({ varsta_max: 99 }).eq('id', clonaId).select('id') : { data: [], error: null };
    const vmax = clonaId ? (await admin.from('categorii_competitie').select('varsta_max').eq('id', clonaId).single()).data?.varsta_max : null;
    record('13 super admin insereaza clona + modifica camp; ADMIN_CLUB nu poate modifica',
      !!clonaId && !upS.error && (upS.data?.length ?? 0) === 1 && (!!upA.error || (upA.data?.length ?? 0) === 0) && vmax === 12,
      `ins=${ins13.error?.message ?? 'ok'} sup=${upS.error?.message ?? upS.data?.length} adm=${upA.error?.message ?? upA.data?.length} varsta_max=${vmax}`);

    // 14: stringuri de select
    const sel = async (c: SupabaseClient) => ({
      i: await c.from('inscrieri_competitie').select(SELECT_INSCRIERI_COMPETITIE).eq('competitie_id', C),
      e: await c.from('echipe_competitie').select(SELECT_ECHIPE_COMPETITIE).eq('competitie_id', C),
    });
    const sS = await sel(sup);
    const sA = await sel(adm);
    record('14 select-urile (inlantuire_id hints) se incarca fara eroare pentru super admin si admin club; super admin vede randuri',
      !sS.i.error && !sS.e.error && !sA.i.error && !sA.e.error && (sS.i.data?.length ?? 0) > 0 && (sS.e.data?.length ?? 0) > 0,
      `sup i=${sS.i.error?.message ?? sS.i.data?.length} e=${sS.e.error?.message ?? sS.e.data?.length}; adm i=${sA.i.error?.message ?? sA.i.data?.length} e=${sA.e.error?.message ?? sA.e.data?.length}`);
  } catch (e) {
    if (e instanceof Precond) {
      console.error(`PRECONDITIE NESIGURA: ${e.message}`);
      await cleanup(competitii, userIds);
      process.exit(2);
    }
    record('executie fara exceptii', false, e instanceof Error ? e.message : String(e));
  }

  // ── cleanup + check 15 + reziduuri ────────────────────────────────────────
  await cleanup(competitii, userIds);
  let platiNoi = 0;
  let vizeNoi = 0;
  if (sportivi.length) {
    const p = await admin.from('plati').select('id', { count: 'exact', head: true }).in('sportiv_id', sportivi).gte('created_at', startTs);
    const v = await admin.from('vize_sportivi').select('id', { count: 'exact', head: true }).in('sportiv_id', sportivi).gte('created_at', startTs);
    platiNoi = p.count ?? 0;
    vizeNoi = v.count ?? 0;
  }
  record('15 fara efecte de taxa anuala: plati noi=0, vize noi=0', platiNoi === 0 && vizeNoi === 0, `plati=${platiNoi} vize=${vizeNoi}`);
  const { count: rc } = await admin.from('competitii').select('id', { count: 'exact', head: true }).like('denumire', `${PREFIX}%`);
  const { count: cc } = await admin.from('categorii_competitie').select('id', { count: 'exact', head: true }).like('denumire', `${PREFIX}%`);
  record('reziduuri: competitii test=0, categorii test=0', (rc ?? 0) === 0 && (cc ?? 0) === 0, `competitii=${rc} categorii=${cc}`);
  const aud = await admin.from('audit_log').select('id', { count: 'exact', head: true }).gte('created_at', startTs);
  console.log(`INFO audit_log randuri create in timpul testului (nu se pot sterge): ${aud.error ? 'n/a (' + aud.error.message + ')' : aud.count}`);

  const fail = results.filter((x) => !x.passed);
  console.log(`\n${results.length - fail.length}/${results.length} verificari trecute`);
  if (fail.length) {
    console.error('ESUATE:\n' + fail.map((x) => ` - ${x.name}${x.detail ? ` (${x.detail})` : ''}`).join('\n'));
    process.exit(1);
  }
}

async function cleanup(competitii: string[], userIds: string[]) {
  if (competitii.length) await admin.from('competitii').delete().in('id', competitii);
  for (const id of userIds) {
    await admin.from('utilizator_roluri_multicont').delete().eq('user_id', id);
    await admin.auth.admin.deleteUser(id);
  }
}

main();
