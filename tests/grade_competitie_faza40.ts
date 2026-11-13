// tests/grade_competitie_faza40.ts
//
// Faza 40 — Plan 02. Baterie live pentru schimbarea gradului din zona de competitie: securitate (cross-club, anon, rol, sesiune de autor),
// reguli (D-01 +1, D-02 echivalare, D-03/D-04/D-05 undo, D-07 timp+varsta), constrangerea de deadline (D-14).
// Cere migrarile 20261112a (optional, vezi FAZA40_SKIP_DEADLINE) si 20261112b aplicate live.
//
// Rulare: npx tsx tests/grade_competitie_faza40.ts
//   FAZA40_SKIP_DEADLINE=1  -> verificarea 15 (NOT NULL / CHECK) devine SKIP (cand 20261112a nu e aplicata).
//
// Siguranta date: sportivi ZZ_TEST_FAZA40_* creati de test (data_inscrierii in trecut, ca sa nu se declanseze rand Debutant),
// cluburile A/B reale folosite doar pentru conturile de test; aborteaza (exit 2) daca au deja cont de competitie; cleanup in finally.
// audit_log nu are DELETE: randurile de audit generate raman si se numara. GDPR: output doar ID-uri/numaratori; parole aleatoare, neafisate.

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
const PREFIX = 'ZZ_TEST_FAZA40_';
const EMAIL_PREFIX = 'zztest_faza40_';
const RUN_ID = Date.now();
const NUME_LIBER = 'ZZ Persoana';
const SKIP_DEADLINE = process.env.FAZA40_SKIP_DEADLINE === '1';

const admin = createClient(url, serviceKey);

type Check = { name: string; passed: boolean; detail?: string };
const results: Check[] = [];
const record = (name: string, passed: boolean, detail?: string) => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
};
const skip = (name: string, why: string) => {
  results.push({ name, passed: true, detail: `SKIP: ${why}` });
  console.log(`SKIP — ${name} (${why})`);
};

const randomPass = () => `Zz!${randomBytes(12).toString('hex')}aA`;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const addMonthsIso = (base: Date, n: number) => { const d = new Date(base); d.setUTCMonth(d.getUTCMonth() + n); return iso(d); };

async function clientFor(email: string, parola: string, contextId: string | null): Promise<SupabaseClient> {
  const c = createClient(url!, anonKey!, contextId === null ? undefined : { global: { headers: { 'active-role-context-id': contextId } } });
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

async function preconditii() {
  const c = await admin.rpc('cont_club_curent');
  if (c.error) { console.error(`OPRIT (exit 2): cont_club_curent() lipseste: ${c.error.message}`); process.exit(2); }
  // service role => auth.uid() NULL => functia exista si refuza cu 42501; lipsa => PGRST202
  const p = await admin.rpc('previzualizeaza_schimbare_grad', { p_sportiv: randomUUID(), p_competitie: randomUUID() });
  if (p.error?.code === 'PGRST202' || /Could not find the function/i.test(p.error?.message ?? '')) {
    console.error('OPRIT (exit 2): previzualizeaza_schimbare_grad lipseste (20261112b neaplicata?)');
    process.exit(2);
  }
  const { data, error } = await admin.from('conturi_competitie_club').select('club_id').in('club_id', [CLUB_A, CLUB_B]);
  if (error || (data && data.length > 0)) {
    console.error('OPRIT (exit 2): conturi_competitie_club ilizibila sau cluburile de test au deja cont (pilot real). Nu modific nimic.');
    process.exit(2);
  }
}

const sqlState = (e: any) => e?.code ?? e?.message ?? 'fara eroare';

async function main() {
  await preconditii();

  const competitii: string[] = [];
  const userIds: string[] = [];
  const sportivIds: string[] = [];
  const startTs = new Date().toISOString();

  try {
    // ── grade dupa ordine ──
    const { data: gr } = await admin.from('grade').select('id, ordine').in('ordine', [12, 14, 15, 16, 17, 18]);
    const G = (o: number) => (gr ?? []).find((x: any) => x.ordine === o)?.id as string;
    if (![12, 14, 15, 16, 17, 18].every((o) => !!G(o))) throw new Error('OPRIT: lipsesc grade cu ordine 12/14/15/16/17/18');

    // ── competitie ──
    const azi = new Date();
    const dataInceput = addDays(azi, 30);
    const { data: comp, error: compErr } = await admin.from('competitii').insert({
      denumire: `${PREFIX}${RUN_ID}`, tip: 'tehnica', data_inceput: iso(dataInceput), data_sfarsit: iso(dataInceput),
      locatie: 'Test', status: 'inscrieri_deschise', deadline_inscrieri: iso(addDays(azi, 10)),
    }).select('id').single();
    if (compErr || !comp) throw new Error(`competitie: ${compErr?.message}`);
    const ACT = comp.id as string;
    competitii.push(ACT);

    // ── sportivi de test ──
    const mkSportiv = async (tag: string, club: string, varsta: number, ordine: number, dataGrad: string | null) => {
      const nasc = new Date(dataInceput); nasc.setUTCFullYear(nasc.getUTCFullYear() - varsta); nasc.setUTCDate(nasc.getUTCDate() - 10);
      const { data, error } = await admin.from('sportivi').insert({
        nume: `${PREFIX}${tag}`, prenume: `${RUN_ID}${tag}`, data_nasterii: iso(nasc), data_inscrierii: '2015-01-01', club_id: club, status: 'Activ',
      }).select('id').single();
      if (error || !data) throw new Error(`sportiv ${tag}: ${error?.message}`);
      sportivIds.push(data.id);
      if (dataGrad) {
        const { error: e2 } = await admin.from('istoric_grade').insert({ sportiv_id: data.id, grad_id: G(ordine), data_obtinere: dataGrad, club_id: club });
        if (e2) throw new Error(`istoric ${tag}: ${e2.message}`);
      }
      return data.id as string;
    };
    const S1 = await mkSportiv('S1', CLUB_A, 13, 12, addMonthsIso(azi, -2));    // echivalare
    const S2 = await mkSportiv('S2', CLUB_A, 15, 16, addMonthsIso(azi, -24));   // promovare 16 -> 17
    const S3 = await mkSportiv('S3', CLUB_A, 15, 16, addMonthsIso(azi, -1));    // blocat: timp
    const S4 = await mkSportiv('S4', CLUB_A, 12, 14, addMonthsIso(azi, -24));   // blocat: varsta
    const SB = await mkSportiv('SB', CLUB_B, 13, 12, addMonthsIso(azi, -2));    // alt club

    // ── conturi de club ──
    const callerId = randomUUID();
    const emailA = `${EMAIL_PREFIX}a_${RUN_ID}@example.com`;
    const emailB = `${EMAIL_PREFIX}b_${RUN_ID}@example.com`;
    const rA = await creeazaContClub(admin, { club_id: CLUB_A, email: emailA, callerId });
    if (rA.userId) userIds.push(rA.userId);
    const rB = await creeazaContClub(admin, { club_id: CLUB_B, email: emailB, callerId });
    if (rB.userId) userIds.push(rB.userId);
    record('creeazaContClub(A) si (B) -> ok', rA.ok && rB.ok && !!rA.userId && !!rB.userId, `A=${rA.status} B=${rB.status}`);
    if (!rA.ok || !rB.ok) throw new Error('OPRIT: conturile de club nu s-au creat');
    const parolaA = randomPass();
    const parolaB = randomPass();
    for (const [uid, p] of [[rA.userId!, parolaA], [rB.userId!, parolaB]] as const) {
      const { error } = await admin.auth.admin.updateUserById(uid, { password: p });
      if (error) throw new Error(`parola de test: ${error.message}`);
    }
    const rolReprez = async (uid: string) => {
      const { data } = await admin.from('utilizator_roluri_multicont').select('id').eq('user_id', uid).eq('rol_denumire', 'REPREZENTANT_COMPETITIE').maybeSingle();
      if (!data) throw new Error('rand REPREZENTANT lipsa');
      return data.id as string;
    };
    const rolA = await rolReprez(rA.userId!);
    const CA = await clientFor(emailA, parolaA, rolA);
    const CB = await clientFor(emailB, parolaB, await rolReprez(rB.userId!));
    const anon = createClient(url!, anonKey!);

    const prev = async (c: SupabaseClient, sp: string) => c.rpc('previzualizeaza_schimbare_grad', { p_sportiv: sp, p_competitie: ACT });
    const schimba = async (c: SupabaseClient, sp: string, grad: string) => c.rpc('schimba_grad_competitie', { p_sportiv: sp, p_competitie: ACT, p_grad_nou: grad });
    const gradActual = async (sp: string) => (await admin.from('sportivi').select('grad_actual_id').eq('id', sp).single()).data?.grad_actual_id as string | undefined;
    const nrIstoric = async (sp: string) => (await admin.from('istoric_grade').select('id', { count: 'exact', head: true }).eq('sportiv_id', sp)).count ?? -1;

    // 1. anon
    const fake = randomUUID();
    const anonRes = await Promise.all([
      anon.rpc('previzualizeaza_schimbare_grad', { p_sportiv: fake, p_competitie: fake }),
      anon.rpc('schimba_grad_competitie', { p_sportiv: fake, p_competitie: fake, p_grad_nou: fake }),
      anon.rpc('anuleaza_schimbare_grad_competitie', { p_schimbare: fake, p_motiv: null }),
      anon.rpc('marcheaza_schimbare_grad_achitata', { p_schimbare: fake }),
    ]);
    record('1 anon nu poate executa niciuna din cele 4 functii', anonRes.every((x) => !!x.error), anonRes.map((x) => sqlState(x.error)).join(','));

    // 2. fara sesiune de autor
    const nIst1 = await nrIstoric(S1);
    let r: any = await schimba(CA, S1, G(15));
    record('2 schimba fara sesiune de autor -> refuzat, fara rand nou in istoric',
      !!r.error && (await nrIstoric(S1)) === nIst1, r.error?.message ?? 'acceptat fara autor!');

    // sesiune de autor
    r = await CA.rpc('deschide_sesiune_actor', { p_competitie: ACT, p_actor_user_id: null, p_actor_nume: NUME_LIBER });
    if (r.error) throw new Error(`deschide_sesiune_actor: ${r.error.message}`);

    // 3. previzualizare echivalare
    r = await prev(CA, S1);
    record('3 preview S1 -> echivalare la 1 Cap Albastru, taxa 0, fara blocaj (D-02)',
      !r.error && r.data?.tip === 'echivalare' && r.data?.grad_nou_id === G(15) && Number(r.data?.taxa) === 0 && r.data?.blocat === null,
      r.error?.message ?? `tip=${r.data?.tip} blocat=${r.data?.blocat}`);

    // 4. aplicare + audit
    r = await schimba(CA, S1, G(15));
    const schId = r.data as string;
    record('4 schimba S1 -> id intors', !r.error && !!schId, r.error?.message ?? 'ok');
    record('4 grad_actual S1 = 1 Cap Albastru', (await gradActual(S1)) === G(15));
    const { data: sg } = await admin.from('schimbari_grad_competitie').select('actor_nume, istoric_grade_id, tip, taxa, achitat_la').eq('id', schId).maybeSingle();
    record('4 rand schimbari: actor_nume, istoric_grade_id, tip=echivalare, taxa 0, neachitat',
      !!sg && sg.actor_nume === NUME_LIBER && !!sg.istoric_grade_id && sg.tip === 'echivalare' && Number(sg.taxa) === 0 && sg.achitat_la === null);
    const { data: aud } = await admin.from('audit_log').select('actor_nume, operatie').eq('tabel', 'istoric_grade').eq('rand_id', sg?.istoric_grade_id ?? randomUUID());
    record('4 audit_log are INSERT istoric_grade cu autorul din sesiune', !!aud?.find((x: any) => x.operatie === 'INSERT' && x.actor_nume === NUME_LIBER), `randuri=${aud?.length ?? 0}`);

    // 5. cross-club
    const nSgB = async () => (await admin.from('schimbari_grad_competitie').select('id', { count: 'exact', head: true }).eq('sportiv_id', SB)).count ?? -1;
    const cr1 = await prev(CA, SB);
    const cr2 = await schimba(CA, SB, G(15));
    record('5 cont A pe sportivul lui B: preview si schimba -> 42501, zero randuri',
      cr1.error?.code === '42501' && cr2.error?.code === '42501' && (await nSgB()) === 0, `${sqlState(cr1.error)},${sqlState(cr2.error)}`);
    const cr3 = await prev(CB, S1);
    record('5 cont B pe sportivul lui A -> 42501', cr3.error?.code === '42501', sqlState(cr3.error));

    // 6. promovare +1
    r = await prev(CA, S2);
    const { data: pc } = await admin.from('grade_preturi_config').select('suma').eq('grad_id', G(17)).eq('is_activ', true).order('data_activare', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(1);
    const taxaAsteptata = pc?.[0]?.suma ?? null;
    record('6 preview S2 -> promovare la +1 (3 Cap Albastru), taxa = config activ sau null (D-01, D-13)',
      !r.error && r.data?.tip === 'promovare' && r.data?.grad_nou_id === G(17) && r.data?.blocat === null
      && (r.data?.taxa === null ? taxaAsteptata === null : Number(r.data.taxa) === Number(taxaAsteptata)),
      r.error?.message ?? `tip=${r.data?.tip} blocat=${r.data?.blocat}`);

    // 7. timp
    r = await prev(CA, S3);
    record('7 preview S3 -> blocat cu "Ultimul grad" si "mai trebuie" (D-07)',
      !r.error && /Ultimul grad/.test(r.data?.blocat ?? '') && /mai trebuie/.test(r.data?.blocat ?? ''), r.error?.message ?? String(r.data?.blocat));

    // 8. varsta
    r = await prev(CA, S4);
    record('8 preview S4 -> blocat "Vârsta minimă" (D-07)', !r.error && /Vârsta minimă/.test(r.data?.blocat ?? ''), r.error?.message ?? String(r.data?.blocat));

    // 9. grad vechi in UI
    r = await schimba(CA, S2, G(16));
    record('9 schimba S2 cu grad neactual -> "Situația gradului s-a schimbat"', !!r.error && /Situația gradului s-a schimbat/.test(r.error.message), r.error?.message ?? 'acceptat!');

    // 10. undo in fereastra, fara motiv
    r = await CA.rpc('anuleaza_schimbare_grad_competitie', { p_schimbare: schId, p_motiv: null });
    const { data: sg2 } = await admin.from('schimbari_grad_competitie').select('anulat_la, motiv').eq('id', schId).single();
    record('10 undo in fereastra fara motiv -> ok; grad S1 revine la 12; rand marcat anulat (D-03, D-04)',
      !r.error && (await gradActual(S1)) === G(12) && !!sg2?.anulat_la, r.error?.message ?? 'ok');
    r = await CA.rpc('anuleaza_schimbare_grad_competitie', { p_schimbare: schId, p_motiv: null });
    record('10 a doua anulare -> "deja anulată"', !!r.error && /deja anulată/.test(r.error.message), r.error?.message ?? 'acceptat!');

    // 11. undo refuzat daca nu mai e ultimul grad
    r = await schimba(CA, S2, G(17));
    const sch2 = r.data as string;
    record('11 schimba S2 la 3 Cap Albastru', !r.error && !!sch2, r.error?.message ?? 'ok');
    const { error: eIns } = await admin.from('istoric_grade').insert({ sportiv_id: S2, grad_id: G(18), data_obtinere: iso(azi), club_id: CLUB_A });
    r = await CA.rpc('anuleaza_schimbare_grad_competitie', { p_schimbare: sch2, p_motiv: null });
    record('11 undo cand sportivul are alt grad -> "Anularea nu mai este posibilă"; grad S2 ramane 4 Cap Albastru',
      !eIns && !!r.error && /Anularea nu mai este posibilă/.test(r.error.message) && (await gradActual(S2)) === G(18), r.error?.message ?? 'acceptat!');

    // 12. in afara ferestrei: cere motiv
    r = await schimba(CA, S1, G(15));
    const sch3 = r.data as string;
    record('12 schimba S1 din nou', !r.error && !!sch3, r.error?.message ?? 'ok');
    await admin.from('competitii').update({ deadline_inscrieri: iso(addDays(azi, -1)) }).eq('id', ACT);
    r = await CA.rpc('anuleaza_schimbare_grad_competitie', { p_schimbare: sch3, p_motiv: null });
    record('12 undo dupa deadline fara motiv -> cere motiv (D-04)', !!r.error && /motiv/.test(r.error.message), r.error?.message ?? 'acceptat!');
    r = await CA.rpc('anuleaza_schimbare_grad_competitie', { p_schimbare: sch3, p_motiv: 'Corecție test faza 40' });
    const { data: sg3 } = await admin.from('schimbari_grad_competitie').select('anulat_la, motiv').eq('id', sch3).single();
    record('12 undo dupa deadline cu motiv -> ok, motiv salvat (D-05)', !r.error && sg3?.motiv === 'Corecție test faza 40' && !!sg3?.anulat_la, r.error?.message ?? 'ok');

    // 13. doar federatia marcheaza achitat
    r = await CA.rpc('marcheaza_schimbare_grad_achitata', { p_schimbare: sch2 });
    record('13 cont de club nu poate marca achitat -> 42501', r.error?.code === '42501', sqlState(r.error));

    // 14. tabelul: fara scrieri directe, fara citire pentru contul extern
    const sel = await CA.from('schimbari_grad_competitie').select('id');
    record('14 contul de club nu citeste tabelul (eroare sau 0 randuri)', !!sel.error || (sel.data?.length ?? 0) === 0, sel.error?.message ?? `n=${sel.data?.length}`);
    const wi = await CA.from('schimbari_grad_competitie').insert({ sportiv_id: S1, club_id: CLUB_A, competitie_id: ACT, grad_nou_id: G(15), tip: 'promovare' }).select('id');
    const wu = await CA.from('schimbari_grad_competitie').update({ achitat_la: new Date().toISOString() }).eq('id', sch2).select('id');
    const wd = await CA.from('schimbari_grad_competitie').delete().eq('id', sch2).select('id');
    const { data: sch2Row } = await admin.from('schimbari_grad_competitie').select('achitat_la').eq('id', sch2).maybeSingle();
    record('14 insert/update/delete direct de cont club: refuzate sau fara efect',
      (!!wi.error || !wi.data?.length) && (!!wu.error || !wu.data?.length) && (!!wd.error || !wd.data?.length) && !!sch2Row && sch2Row.achitat_la === null,
      `${sqlState(wi.error)}|${sqlState(wu.error)}|${sqlState(wd.error)}`);

    // 15. deadline obligatoriu (D-14)
    const base = { denumire: `${PREFIX}dl_${RUN_ID}`, tip: 'tehnica', data_inceput: '2027-06-01', data_sfarsit: '2027-06-02', locatie: 'x', status: 'draft' };
    const dNull = await admin.from('competitii').insert({ ...base, deadline_inscrieri: null }).select('id');
    const dLate = await admin.from('competitii').insert({ ...base, deadline_inscrieri: '2027-06-05' }).select('id');
    for (const x of [dNull, dLate]) (x.data ?? []).forEach((y: any) => competitii.push(y.id));
    if (SKIP_DEADLINE) skip('15 deadline NULL / dupa start refuzate de DB (D-14)', '20261112a neaplicata (FAZA40_SKIP_DEADLINE=1)');
    else record('15 deadline NULL si deadline > data_inceput refuzate de DB (D-14)', !!dNull.error && !!dLate.error, `${sqlState(dNull.error)}|${sqlState(dLate.error)}`);

    // 16. rolul REPREZENTANT lipsa -> refuzat (D-09)
    await admin.from('utilizator_roluri_multicont').delete().eq('id', rolA);
    r = await prev(CA, S1);
    record('16 fara rand REPREZENTANT_COMPETITIE, preview -> 42501 (D-09)', r.error?.code === '42501', sqlState(r.error));
  } catch (e) {
    record('executie fara exceptii', false, e instanceof Error ? e.message : String(e));
  } finally {
    let auditGenerate = -1;
    try {
      const reziduali = await listaUtilizatoriTest();
      const toti = Array.from(new Set([...userIds, ...reziduali.map((u) => u.id)]));
      if (sportivIds.length) {
        await admin.from('schimbari_grad_competitie').delete().in('sportiv_id', sportivIds);
        await admin.from('istoric_grade').delete().in('sportiv_id', sportivIds);
        await admin.from('sportivi').delete().in('id', sportivIds);
      }
      if (competitii.length) await admin.from('competitii').delete().in('id', competitii);
      for (const id of toti) {
        await admin.from('sesiuni_actor_competitie').delete().eq('user_id', id);
        await admin.from('conturi_competitie_club').delete().eq('user_id', id);
        await admin.from('utilizator_roluri_multicont').delete().eq('user_id', id);
        await admin.from('mfa_dispozitive_incredere').delete().eq('user_id', id);
        await admin.from('mfa_email_verificari').delete().eq('user_id', id);
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) record('cleanup: stergere utilizator de test', false, `${id}: ${error.message}`);
      }
      if (competitii.length) auditGenerate = (await admin.from('audit_log').select('id', { count: 'exact', head: true }).in('competitie_id', competitii)).count ?? -1;
    } catch (e) {
      record('cleanup fara exceptii', false, e instanceof Error ? e.message : String(e));
    }

    const cn = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? -1;
    const rs = await cn(admin.from('sportivi').select('id', { count: 'exact', head: true }).like('nume', `${PREFIX}%`));
    const rc = await cn(admin.from('competitii').select('id', { count: 'exact', head: true }).like('denumire', `${PREFIX}%`));
    const rsg = sportivIds.length ? await cn(admin.from('schimbari_grad_competitie').select('id', { count: 'exact', head: true }).in('sportiv_id', sportivIds)) : 0;
    const rcont = await cn(admin.from('conturi_competitie_club').select('club_id', { count: 'exact', head: true }).in('club_id', [CLUB_A, CLUB_B]));
    const ru = (await listaUtilizatoriTest()).length;
    record('reziduuri: sportivi/competitii/schimbari/conturi/utilizatori test = 0',
      rs === 0 && rc === 0 && rsg === 0 && rcont === 0 && ru === 0, `sportivi=${rs} competitii=${rc} schimbari=${rsg} conturi=${rcont} utilizatori=${ru} (start ${startTs})`);
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
