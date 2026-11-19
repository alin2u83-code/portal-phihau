// tests/competitie_cloneaza_faza45.ts
//
// Faza 45 - Plan 03. Dovedeste LIVE contractul RPC competitie_cloneaza (D-01, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-16):
// garda super admin, atomicitate, ce se copiaza / ce nu, remaparea probelor, structura initiala (structuraInitiala, aceeasi functie ca UI),
// renumerotare 1..N si clonarea unei competitii reale in copie temporara.
//
// Siguranta date: se scriu EXCLUSIV competitii ZZ_TEST_FAZA45_* (fara inscrieri/echipe => niciun trigger de taxa anuala); competitia reala sursa
// e doar citita (check 16 reconfirma ca ramane neschimbata). Output: doar UUID-uri si numaratori (GDPR). audit_log nu are DELETE: se raporteaza numarul de randuri.
//
// Rulare: npx tsx tests/competitie_cloneaza_faza45.ts   (cod 1 = cel putin un FAIL, cod 2 = precondiții nesigure)

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { structuraInitiala } from '../utils/clonareCompetitie';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) {
  console.error('Lipsesc VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const CLUB_A = '83e7f771-46cf-4c4e-b70f-356d7b0bff06'; // Kim Long Dao Falticeni
const PREFIX = 'ZZ_TEST_FAZA45_';
const EMAIL_PREFIX = 'zztest_faza45_';
const RUN_ID = Date.now();
const OP = 'competitie_cloneaza';
const admin = createClient(url, serviceKey);

type Check = { name: string; passed: boolean; detail?: string };
const results: Check[] = [];
const record = (name: string, passed: boolean, detail?: string) => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} - ${name}${detail ? ` (${detail})` : ''}`);
};

const msg = (r: { error: any }) => r.error?.message ?? '';
// jsonb nu pastreaza ordinea cheilor: comparatie independenta de ordine
const canon = (v: any): any => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
const same = (a: any, b: any) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const sorted = (a: string[]) => [...a].sort();

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
  const startTs = new Date().toISOString();

  const countByName = async (name: string) =>
    (await admin.from('competitii').select('id', { count: 'exact', head: true }).eq('denumire', name)).count ?? 0;
  const dataSet = { data_inceput: '2028-06-01', data_sfarsit: '2028-06-02', deadline: '2028-05-20' };
  const args = (sursa: string, name: string, extra: Record<string, any> = {}) => ({
    p_sursa: sursa, p_denumire: name, p_tip: 'tehnica', p_data_inceput: dataSet.data_inceput,
    p_data_sfarsit: dataSet.data_sfarsit, p_deadline: dataSet.deadline, p_setari: true, p_probe: true, p_categorii: [], ...extra,
  });
  // orice id intors de RPC intra imediat in lista de curatare
  const call = async (c: SupabaseClient, a: Record<string, any>) => {
    const r: any = await c.rpc(OP, a);
    if (r.data?.id) competitii.push(r.data.id);
    return r;
  };
  const nume = (tag: string) => `${PREFIX}${tag}_${RUN_ID}`;

  try {
    // ── precondiție: functia exista ─────────────────────────────────────────
    const probe = await admin.rpc(OP, args('00000000-0000-0000-0000-000000000000', nume('probe')));
    if (probe.error?.code === 'PGRST202') throw new Precond(`functia ${OP} nu exista live`);

    // ── setup: sursa S + alta competitie O ──────────────────────────────────
    const { data: sRow, error: sErr } = await admin.from('competitii').insert({
      denumire: nume('src'), tip: 'tehnica', status: 'draft', data_inceput: '2027-06-01', data_sfarsit: '2027-06-02',
      deadline_inscrieri: '2027-05-20', locatie: 'Test', organizator: 'Test', taxa_individual: 91, taxa_echipa: 93,
      config_taxe: { individual_tehnica: 91, individual_cvd: 92, echipa_seniori: 93, echipa_juniori: 94, cvd_echipa: 95, currency: 'RON' },
      fram_obligatoriu: true, observatii: 'nu se copiaza',
    }).select('id').single();
    if (sErr || !sRow) throw new Error(`sursa: ${sErr?.message}`);
    const S = sRow.id as string;
    competitii.push(S);
    const { data: oRow, error: oErr } = await admin.from('competitii').insert({
      denumire: nume('other'), tip: 'tehnica', status: 'draft', data_inceput: '2027-06-01', data_sfarsit: '2027-06-02', deadline_inscrieri: '2027-05-20',
    }).select('id').single();
    if (oErr || !oRow) throw new Error(`other: ${oErr?.message}`);
    const O = oRow.id as string;
    competitii.push(O);

    const mkProba = async (tip: string, den: string, ordine: number) => {
      const { data, error } = await admin.from('probe_competitie').insert({ competitie_id: S, tip_proba: tip, denumire: den, ordine_afisare: ordine }).select('id').single();
      if (error || !data) throw new Error(`proba ${den}: ${error?.message}`);
      return data.id as string;
    };
    const P1 = await mkProba('thao_quyen_individual', 'P1', 1);
    const P2 = await mkProba('sincron', 'P2', 2);
    const P3 = await mkProba('song_luyen', 'P3', 3);

    const mkCat = async (comp: string, tag: string, nr: number, proba: string | null, extra: Record<string, any> = {}) => {
      const { data, error } = await admin.from('categorii_competitie').insert({
        competitie_id: comp, proba_id: proba, denumire: nume(tag), varsta_min: 6, gen: 'Mixt', tip_participare: 'individual',
        numar_categorie: nr, ordine_afisare: nr, ...extra,
      }).select('id').single();
      if (error || !data) throw new Error(`categorie ${tag}: ${error?.message}`);
      return data.id as string;
    };
    const upd = async (id: string, patch: Record<string, any>) => {
      const { error } = await admin.from('categorii_competitie').update(patch).eq('id', id);
      if (error) throw new Error(`update categorie: ${error.message}`);
    };

    const k1 = await mkCat(S, 'k1', 1, P1);
    const k2 = await mkCat(S, 'k2', 2, P1, { status_categorie: 'anulata' });
    const k3 = await mkCat(S, 'k3', 3, P1);
    const k3a = await mkCat(S, 'k3a', 10, P1);
    const k3b = await mkCat(S, 'k3b', 11, P1);
    await upd(k3, { status_categorie: 'impartita', categorii_fuzionate_din: [k3a, k3b] });
    const k4 = await mkCat(S, 'k4', 4, P2, { status_categorie: 'fuzionata' });
    const k5 = await mkCat(S, 'k5', 5, P2, { status_categorie: 'fuzionata' });
    const k45 = await mkCat(S, 'k45', 12, P2, { este_fuzionata: true, categorii_fuzionate_din: [k4, k5] });
    const k6 = await mkCat(S, 'k6', 6, P3, { status_categorie: 'fuzionata' });
    const k7 = await mkCat(S, 'k7', 7, P3);
    await upd(k7, { este_fuzionata: true, categorii_fuzionate_din: [k6, k7] });
    const o1 = await mkCat(O, 'o1', 1, null);
    await admin.from('competitii').update({ status: 'finalizata' }).eq('id', S);

    const { data: srcCats } = await admin.from('categorii_competitie').select('*').eq('competitie_id', S);
    const { data: srcProbe } = await admin.from('probe_competitie').select('*').eq('competitie_id', S);
    const st = structuraInitiala((srcCats ?? []) as any);

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

    // 1: structura initiala calculata client-side
    const expIds = sorted([k1, k2, k3, k4, k5, k7]);
    record('1 structuraInitiala = {k1,k2,k3,k4,k5,k7}, 1 avertisment (k7), 1 anulata',
      same(sorted(st.ids), expIds) && st.avertismente.length === 1 && st.avertismente[0].categorieId === k7 && st.anulate === 1,
      `ids=${st.ids.length} avert=${st.avertismente.length} anulate=${st.anulate}`);

    // 2: ADMIN_CLUB refuzat
    const nClona = nume('clona');
    let r: any = await call(adm, args(S, nClona, { p_categorii: st.ids }));
    record('2 ADMIN_CLUB refuzat de RPC (42501), nimic creat', r.error?.code === '42501' && (await countByName(nClona)) === 0, `code=${r.error?.code}`);

    // 3: anon refuzat
    r = await call(anon, args(S, nClona, { p_categorii: st.ids }));
    record('3 anon refuzat, nimic creat', !!r.error && (await countByName(nClona)) === 0, `code=${r.error?.code}`);

    // 4: clonare reusita
    r = await call(sup, args(S, nClona, { p_categorii: st.ids }));
    const N = r.data?.id as string | undefined;
    record('4 super admin clonare reusita: probe 3, categorii 6', !r.error && !!N && r.data.probe === 3 && r.data.categorii === 6,
      r.error ? msg(r) : JSON.stringify(r.data));
    if (!N) throw new Error('clonarea de baza a esuat, restul verificarilor sunt imposibile');

    // 5: randul competitiei
    const { data: nc } = await admin.from('competitii').select('*').eq('id', N).single();
    const { data: sc } = await admin.from('competitii').select('*').eq('id', S).single();
    const ok5 = !!nc && !!sc && nc.status === 'draft' && nc.club_id === null && nc.legacy_eveniment_id === null && nc.tip === 'tehnica'
      && nc.data_inceput === dataSet.data_inceput && nc.data_sfarsit === dataSet.data_sfarsit && nc.deadline_inscrieri === dataSet.deadline
      && nc.locatie === sc.locatie && nc.organizator === sc.organizator && nc.taxa_individual === sc.taxa_individual
      && nc.taxa_echipa === sc.taxa_echipa && same(nc.config_taxe, sc.config_taxe) && nc.fram_obligatoriu === true
      && String(nc.observatii).includes(S) && String(nc.observatii).includes(sc.denumire) && !String(nc.observatii).includes('nu se copiaza');
    record('5 competitie noua: draft, fara club/legacy, date cerute, setari/taxe/FRAM ca sursa, observatii = nota de clonare', ok5,
      `status=${nc?.status} club=${nc?.club_id} taxa=${nc?.taxa_individual}/${nc?.taxa_echipa} fram=${nc?.fram_obligatoriu}`);

    // 6: probe remapate
    const { data: nProbe } = await admin.from('probe_competitie').select('*').eq('competitie_id', N);
    const sigProba = (p: any) => `${p.tip_proba}|${p.denumire}|${p.ordine_afisare}`;
    const { data: nCats } = await admin.from('categorii_competitie').select('*').eq('competitie_id', N);
    const nProbeIds = new Set((nProbe ?? []).map((p: any) => p.id));
    const tipProbaNou = new Map((nProbe ?? []).map((p: any) => [p.id, p.tip_proba]));
    const tipProbaSursa = new Map((srcProbe ?? []).map((p: any) => [p.id, p.tip_proba]));
    const srcByName = new Map((srcCats ?? []).map((c: any) => [c.denumire, c]));
    const ok6 = (nProbe?.length ?? 0) === 3 && same(sorted((nProbe ?? []).map(sigProba)), sorted((srcProbe ?? []).map(sigProba)))
      && (nCats ?? []).every((c: any) => nProbeIds.has(c.proba_id) && tipProbaNou.get(c.proba_id) === tipProbaSursa.get((srcByName.get(c.denumire) as any)?.proba_id));
    record('6 probe copiate (3, aceeasi semnatura), proba_id al fiecarei categorii remapat pe proba noua cu acelasi tip', ok6, `probe=${nProbe?.length}`);

    // 7: categorii noi
    const ordSrc = (srcCats ?? []).filter((c: any) => st.ids.includes(c.id))
      .sort((a: any, b: any) => a.ordine_afisare - b.ordine_afisare || a.numar_categorie - b.numar_categorie);
    const nOrd = [...(nCats ?? [])].sort((a: any, b: any) => a.numar_categorie - b.numar_categorie);
    const interzise = [k3a, k3b, k45, k6].map((id) => (srcCats ?? []).find((c: any) => c.id === id)!.denumire);
    const { count: nIns } = await admin.from('inscrieri_competitie').select('id', { count: 'exact', head: true }).eq('competitie_id', N);
    const { count: nEch } = await admin.from('echipe_competitie').select('id', { count: 'exact', head: true }).eq('competitie_id', N);
    const ok7 = nOrd.length === 6 && same(nOrd.map((c: any) => c.denumire), ordSrc.map((c: any) => c.denumire))
      && same(nOrd.map((c: any) => c.numar_categorie), [1, 2, 3, 4, 5, 6]) && same(nOrd.map((c: any) => c.ordine_afisare), [1, 2, 3, 4, 5, 6])
      && nOrd.every((c: any) => c.status_categorie === 'activa' && c.este_fuzionata === false && c.categorii_fuzionate_din === null)
      && !nOrd.some((c: any) => interzise.includes(c.denumire)) && nIns === 0 && nEch === 0;
    record('7 categorii: exact cele 6 alese, numerotate 1..6 in ordinea sursei, toate activa/nefuzionate, fara inscrieri/echipe', ok7,
      `n=${nOrd.length} insc=${nIns} ech=${nEch}`);

    // 8: atomicitate (categorie straina)
    const nAt = nume('atomic');
    r = await call(sup, args(S, nAt, { p_categorii: [...st.ids, o1] }));
    record('8 categorie din alta competitie => refuz 22023, nicio competitie ramasa', r.error?.code === '22023' && (await countByName(nAt)) === 0, `code=${r.error?.code}`);

    // 9: nume duplicat (case-insensitive + spatii)
    const inainte = await countByName(nClona);
    r = await call(sup, args(S, `  ${nClona.toUpperCase()}  `));
    record('9 nume duplicat (majuscule + spatii) => 23505, nimic nou', r.error?.code === '23505' && (await countByName(nClona)) === inainte, `code=${r.error?.code}`);

    // 10: date invalide
    const n10a = nume('d1');
    const n10b = nume('d2');
    const r10a = await call(sup, args(S, n10a, { p_deadline: '2028-06-05' }));
    const r10b = await call(sup, args(S, n10b, { p_data_sfarsit: '2028-05-30' }));
    record('10 deadline dupa inceput si sfarsit inainte de inceput => 22023, nimic creat',
      r10a.error?.code === '22023' && r10b.error?.code === '22023' && (await countByName(n10a)) === 0 && (await countByName(n10b)) === 0,
      `${r10a.error?.code}/${r10b.error?.code}`);

    // 11: tip stagiu
    const n11 = nume('stagiu');
    r = await call(sup, args(S, n11, { p_tip: 'stagiu' }));
    record('11 tip stagiu => 22023, nimic creat', r.error?.code === '22023' && (await countByName(n11)) === 0, `code=${r.error?.code}`);

    // 12: categorii fara probe
    const n12 = nume('faraprobe');
    r = await call(sup, args(S, n12, { p_probe: false, p_categorii: st.ids }));
    record('12 p_probe=false cu categorii => 22023 (D-03), nimic creat', r.error?.code === '22023' && (await countByName(n12)) === 0, `code=${r.error?.code}`);

    // 13: probe fara categorii
    r = await call(sup, args(S, nume('probe_only')));
    record('13 probe fara categorii: probe 3, categorii 0', !r.error && r.data?.probe === 3 && r.data?.categorii === 0, r.error ? msg(r) : JSON.stringify(r.data));

    // 14: fara setari
    r = await call(sup, args(S, nume('fara_setari'), { p_setari: false }));
    const { data: n14 } = r.data?.id ? await admin.from('competitii').select('*').eq('id', r.data.id).single() : { data: null };
    record('14 p_setari=false: locatie/organizator null, taxe implicite 80/120, config_taxe implicit, FRAM false',
      !r.error && !!n14 && n14.locatie === null && n14.organizator === null && n14.taxa_individual === 80 && n14.taxa_echipa === 120
        && same(n14.config_taxe, { individual_tehnica: 80, individual_cvd: 80, echipa_seniori: 120, echipa_juniori: 150, cvd_echipa: 80, currency: 'RON' })
        && n14.fram_obligatoriu === false,
      r.error ? msg(r) : `loc=${n14?.locatie} org=${n14?.organizator} taxa=${n14?.taxa_individual}/${n14?.taxa_echipa} cfg=${JSON.stringify(n14?.config_taxe)} fram=${n14?.fram_obligatoriu}`);

    // 15: tip incrucisat
    r = await call(sup, args(S, nume('cvd'), { p_tip: 'cvd', p_categorii: st.ids }));
    const { data: n15 } = r.data?.id ? await admin.from('competitii').select('tip').eq('id', r.data.id).single() : { data: null };
    record('15 clonare in tip cvd: tip cvd, 3 probe si 6 categorii copiate ca atare', !r.error && n15?.tip === 'cvd' && r.data?.probe === 3 && r.data?.categorii === 6,
      r.error ? msg(r) : JSON.stringify(r.data));

    // 16: date reale. Doua competitii poarta acest nume (74 categorii si 84 categorii); reperul de cercetare (72/2/9/12) e cea cu 84 de categorii.
    const { data: reale } = await admin.from('competitii').select('id, status').ilike('denumire', '%Juniori 1, Seniori, Veterani%');
    const cu = await Promise.all((reale ?? []).map(async (c: any) => ({
      id: c.id as string, status: c.status as string,
      n: (await admin.from('categorii_competitie').select('id', { count: 'exact', head: true }).eq('competitie_id', c.id)).count ?? 0,
    })));
    const real = cu.length === 1 ? cu[0] : cu.filter((c) => c.n === 84).length === 1 ? cu.find((c) => c.n === 84)! : null;
    if (!real) {
      record('16 competitia reala Juniori 1, Seniori, Veterani', false, `gasite=${cu.length}: ${cu.map((c) => `${c.status}/${c.n}`).join(', ')}`);
    } else {
      const citeste = async () => ((await admin.from('categorii_competitie').select('*').eq('competitie_id', real.id)).data ?? []) as any[];
      const rows = await citeste();
      const rs = structuraInitiala(rows as any);
      const perStatus: Record<string, number> = {};
      rows.forEach((c) => { const k = c.status_categorie + (c.este_fuzionata ? '+fuz' : ''); perStatus[k] = (perStatus[k] ?? 0) + 1; });
      const predictie = rs.ids.length === 72 && rs.avertismente.length === 2 && rs.anulate === 9 && rs.excluse.length === 12;
      const nJ = nume('J1SV');
      const rr = await call(sup, args(real.id, nJ, { p_categorii: rs.ids }));
      let copieOk = false;
      let detCopie = rr.error ? msg(rr) : '';
      if (!rr.error && rr.data?.id) {
        const { data: cj } = await admin.from('categorii_competitie').select('numar_categorie, ordine_afisare, status_categorie').eq('competitie_id', rr.data.id);
        const nrs = (cj ?? []).map((c: any) => c.numar_categorie).sort((a: number, b: number) => a - b);
        const ords = (cj ?? []).map((c: any) => c.ordine_afisare).sort((a: number, b: number) => a - b);
        const seq = Array.from({ length: rs.ids.length }, (_, i) => i + 1);
        copieOk = rr.data.categorii === rs.ids.length && (cj ?? []).length === rs.ids.length && same(nrs, seq) && same(ords, seq)
          && (cj ?? []).every((c: any) => c.status_categorie === 'activa');
        detCopie = `categorii=${rr.data.categorii} copiate=${cj?.length} probe=${rr.data.probe}`;
      }
      const dupa = await citeste();
      const neschimbat = same(rows.map((c) => `${c.id}|${c.status_categorie}`).sort(), dupa.map((c) => `${c.id}|${c.status_categorie}`).sort());
      record('16 competitie reala: previzualizare 72/2 avertismente/9 anulate/12 excluse = rezultatul clonei, renumerotare 1..N, sursa neschimbata',
        predictie && copieOk && neschimbat,
        `ids=${rs.ids.length} avert=${rs.avertismente.length} anulate=${rs.anulate} excluse=${rs.excluse.length} statusuri=${JSON.stringify(perStatus)} ${detCopie} sursa_neschimbata=${neschimbat}`);
    }
  } catch (e) {
    if (e instanceof Precond) {
      console.error(`PRECONDITIE NESIGURA: ${e.message}`);
      await cleanup(competitii, userIds);
      process.exit(2);
    }
    record('executie fara exceptii', false, e instanceof Error ? e.message : String(e));
  }

  // ── cleanup + reziduuri ───────────────────────────────────────────────────
  await cleanup(competitii, userIds);
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
  if (competitii.length) {
    const { error } = await admin.from('competitii').delete().in('id', competitii);
    if (error) console.error(`cleanup competitii: ${error.message}`);
  }
  for (const id of userIds) {
    await admin.from('utilizator_roluri_multicont').delete().eq('user_id', id);
    await admin.auth.admin.deleteUser(id);
  }
}

main();
