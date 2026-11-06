// tests/rls_definer_garzi_date_faza37.ts
//
// Faza 37 (37-05) — matrice live rol x functie pentru garzile din functiile cu DATE DE SPORTIVI/EXAMEN:
//   adauga_sportiv_complet, process_exam_row_v4, export_sportivi_selectati (+ tip reparat, limita ids),
//   decrypt_cnp, transfer_sportiv, add_sms_to_queue, get_all_app_data (stearsa).
// Date EXCLUSIV efemere (prefix ZZ_TEST_FAZA37_), cleanup in finally, numaratori inainte/dupa, reziduuri 0.
// Output: doar ID-uri/numaratori — fara CNP/nume/adrese.
//
// Rulare: npx tsx tests/rls_definer_garzi_date_faza37.ts

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
const PREFIX = 'ZZ_TEST_FAZA37_';
const EMAIL_PREFIX = 'zztest_faza37d_';
const RUN_ID = Date.now();
const TODAY = new Date().toISOString().slice(0, 10);
const NIL = '00000000-0000-0000-0000-000000000000';
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const results: { name: string; passed: boolean }[] = [];
const record = (name: string, passed: boolean, detail?: string) => {
  results.push({ name, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
};
const info = (name: string, detail: string) => console.log(`INFO — ${name} (${detail})`);

type Actor = { c: SupabaseClient; uid: string; label: string };
const denied = (e: any) => e?.code === '42501';
const rpcDenied = async (label: string, a: Actor, fn: string, args: any) => {
  const r = await a.c.rpc(fn, args);
  record(`${a.label}: ${label} = 42501`, denied(r.error), r.error ? `cod=${r.error.code}` : 'A REUSIT!');
  return r;
};
const rpcAllowed = async (label: string, a: Actor | null, fn: string, args: any) => {
  const r = await (a ? a.c : admin).rpc(fn, args);
  record(`${a?.label ?? 'service_role'}: ${label} fara 42501`, !denied(r.error), r.error ? `eroare non-permisiune: ${r.error.code}` : 'ok');
  return r;
};

async function counts() {
  const c = async (t: string, f?: (q: any) => any) => {
    let q: any = admin.from(t).select('id', { count: 'exact', head: true });
    if (f) q = f(q);
    const { count } = await q;
    return count ?? -1;
  };
  return {
    sportivi_A: await c('sportivi', (q) => q.eq('club_id', CLUB_A)),
    sportivi_B: await c('sportivi', (q) => q.eq('club_id', CLUB_B)),
    sms_queue: await c('sms_queue'),
    sesiuni_examene: await c('sesiuni_examene'),
  };
}

async function main() {
  const userIds: string[] = [];
  const sportivIds: string[] = [];
  const sesiuneIds: string[] = [];
  const roleIds: string[] = [];
  const parola = `Zz!${RUN_ID}aA`;
  const inainte = await counts();
  info('numaratori inainte', JSON.stringify(inainte));

  try {
    // ── fixturi efemere ────────────────────────────────────────────────────
    const mkSportiv = async (club: string, tag: string) => {
      const { data, error } = await admin.from('sportivi').insert({
        nume: `${PREFIX}${tag}_${RUN_ID}`, prenume: 'Test', status: 'Activ', club_id: club, data_nasterii: '2010-01-01',
      }).select('id').single();
      if (error || !data) throw new Error(`sportiv ${tag}: ${error?.message}`);
      sportivIds.push(data.id);
      return data.id as string;
    };
    const mkSesiune = async (club: string, tag: string) => {
      const { data, error } = await admin.from('sesiuni_examene').insert({
        nume: 'Vara', data: TODAY, localitate: `${PREFIX}${tag}_${RUN_ID}`, club_id: club, // nume are CHECK (Vara/Iarna)
      }).select('id').single();
      if (error || !data) throw new Error(`sesiune ${tag}: ${error?.message}`);
      sesiuneIds.push(data.id);
      return data.id as string;
    };
    const spA = await mkSportiv(CLUB_A, 'SA');
    const spB = await mkSportiv(CLUB_B, 'SB');
    const spT = await mkSportiv(CLUB_A, 'ST'); // tinta pentru transferuri
    const sesA = await mkSesiune(CLUB_A, 'sesA');
    const sesB = await mkSesiune(CLUB_B, 'sesB');

    const mkActor = async (tag: string, rol: string, club: string | null): Promise<Actor> => {
      const email = `${EMAIL_PREFIX}${tag.replace(/[^a-z0-9]/gi, '')}_${RUN_ID}@example.com`;
      const { data, error } = await admin.auth.admin.createUser({ email, password: parola, email_confirm: true });
      if (error || !data.user) throw new Error(`user ${tag}: ${error?.message}`);
      userIds.push(data.user.id);
      const { data: rr, error: er } = await admin.from('utilizator_roluri_multicont')
        .insert({ user_id: data.user.id, rol_denumire: rol, club_id: club, is_primary: true }).select('id').single();
      if (er || !rr) throw new Error(`rol ${tag}: ${er?.message}`);
      roleIds.push(rr.id);
      const c = createClient(url!, anonKey!, { global: { headers: { 'active-role-context-id': rr.id } }, auth: { persistSession: false, autoRefreshToken: false } });
      const { error: el } = await c.auth.signInWithPassword({ email, password: parola });
      if (el) throw new Error(`login ${tag}: ${el.message}`);
      return { c, uid: data.user.id, label: tag };
    };
    const ADM_A = await mkActor('ADMIN@A', 'ADMIN_CLUB', CLUB_A);
    const INS_A = await mkActor('INSTRUCTOR@A', 'INSTRUCTOR', CLUB_A);
    const ADM_B = await mkActor('ADMIN@B', 'ADMIN_CLUB', CLUB_B);
    const INS_B = await mkActor('INSTRUCTOR@B', 'INSTRUCTOR', CLUB_B);
    const SPO_A = await mkActor('SPORTIV@A', 'SPORTIV', CLUB_A);
    const EXT = await mkActor('extern', 'REPREZENTANT_COMPETITIE', null);
    const SUP = await mkActor('federatie', 'SUPER_ADMIN_FEDERATIE', null);
    const anonC = createClient(url!, anonKey!);

    const nrNume = async (tag: string) => {
      const { count } = await admin.from('sportivi').select('id', { count: 'exact', head: true }).like('nume', `${PREFIX}${tag}%_${RUN_ID}%`);
      return count ?? -1;
    };

    // ── 1. adauga_sportiv_complet ───────────────────────────────────────────
    const addArgs = (tag: string, club: string | null) => ({
      p_nume: `${PREFIX}${tag}_${RUN_ID}`, p_prenume: 'Test', p_data_nasterii: '2012-02-02',
      p_email: `${EMAIL_PREFIX}add_${tag}_${RUN_ID}@example.com`, p_parola: 'x', p_club_id: club,
    });
    for (const a of [EXT, SPO_A, ADM_B, INS_B]) await rpcDenied('adauga_sportiv_complet (club A)', a, 'adauga_sportiv_complet', addArgs(`deny${a.label.replace(/\W/g, '')}`, CLUB_A));
    await rpcDenied('adauga_sportiv_complet (club B strain)', ADM_A, 'adauga_sportiv_complet', addArgs('denyAdmAB', CLUB_B));
    record('adauga_sportiv_complet respins: zero sportivi creati', (await nrNume('deny')) === 0, `creati=${await nrNume('deny')}`);
    const addOk = async (a: Actor | null, tag: string) => {
      const r = await (a ? a.c : admin).rpc('adauga_sportiv_complet', addArgs(tag, CLUB_A));
      const n = await nrNume(tag);
      record(`${a?.label ?? 'service_role'}: adauga_sportiv_complet (club A) reuseste`, !r.error && n === 1, r.error ? `${r.error.code}` : `creati=${n}`);
    };
    await addOk(ADM_A, 'okAdmA');
    await addOk(INS_A, 'okInsA');
    await addOk(SUP, 'okSup');
    await addOk(null, 'okSvc');

    // ── 2. process_exam_row_v4 stearsa (decizie 6.11.2026: nefunctionala, zero apelanti) ──
    for (const [lbl, cl] of [['federatie', SUP.c], ['service_role', admin], ['ADMIN@A', ADM_A.c]] as const) {
      const r = await (cl as SupabaseClient).rpc('process_exam_row_v4', { p_nume: 'x', p_prenume: 'x', p_cnp: null, p_existing_sportiv_id: null, p_club_id: CLUB_A, p_ordine_grad: 1, p_rezultat: 'Admis', p_contributie: 0, p_data_examen: TODAY, p_sesiune_id: null, p_data_nasterii: null });
      record(lbl + ': process_exam_row_v4 inexistenta', r.error?.code === 'PGRST202', 'cod=' + r.error?.code);
    }

    // ── 3. export_sportivi_selectati ────────────────────────────────────────
    for (const a of [EXT, SPO_A, ADM_B, INS_B]) {
      const r = await rpcDenied('export [spA]', a, 'export_sportivi_selectati', { p_sportivi_ids: [spA] });
      record(`${a.label}: export respins => zero randuri`, !r.data || (Array.isArray(r.data) && r.data.length === 0));
    }
    const rMix = await rpcDenied('export [spA, spB] (un id din alt club => toata cererea)', ADM_A, 'export_sportivi_selectati', { p_sportivi_ids: [spA, spB] });
    record('ADMIN@A: export mixt => zero randuri', !rMix.data || rMix.data.length === 0);
    await rpcDenied('export [spB]', ADM_A, 'export_sportivi_selectati', { p_sportivi_ids: [spB] });
    await rpcDenied('export [id inexistent]', ADM_A, 'export_sportivi_selectati', { p_sportivi_ids: [spA, NIL] });
    const okExport = async (a: Actor | null, ids: string[], asteptat: number, tag: string) => {
      const r = await (a ? a.c : admin).rpc('export_sportivi_selectati', { p_sportivi_ids: ids });
      const n = Array.isArray(r.data) ? r.data.length : -1;
      record(`${a?.label ?? 'service_role'}: export ${tag} => ${asteptat} rand(uri), fara eroare de tip`, !r.error && n === asteptat, r.error ? `${r.error.code} ${r.error.message}` : `randuri=${n}`);
    };
    await okExport(ADM_A, [spA], 1, '[spA]');
    await okExport(INS_A, [spA], 1, '[spA]');
    await okExport(ADM_A, [spA, spA], 1, '[spA,spA] duplicate');
    await okExport(SUP, [spA, spB], 2, '[spA,spB]');
    await okExport(null, [spA, spB], 2, '[spA,spB]');
    const r1001 = await ADM_A.c.rpc('export_sportivi_selectati', { p_sportivi_ids: Array.from({ length: 1001 }, () => spA) });
    record('ADMIN@A: 1001 id-uri => prea_multe_ids', r1001.error?.message === 'prea_multe_ids', r1001.error?.message);
    const rNull = await ADM_A.c.rpc('export_sportivi_selectati', { p_sportivi_ids: null });
    record('ADMIN@A: NULL => ids_invalide', rNull.error?.message === 'ids_invalide', rNull.error?.message);
    const rGol = await ADM_A.c.rpc('export_sportivi_selectati', { p_sportivi_ids: [] });
    record('ADMIN@A: [] => ids_invalide', rGol.error?.message === 'ids_invalide', rGol.error?.message);

    // ── 4. decrypt_cnp (cheia app.cnp_encryption_key lipseste pe live: conteaza doar 42501 vs altceva) ──
    for (const a of [EXT, SPO_A]) await rpcDenied('decrypt_cnp', a, 'decrypt_cnp', { cnp_encrypted: 'AAAA' });
    for (const a of [ADM_A, INS_A, SUP]) await rpcAllowed('decrypt_cnp', a, 'decrypt_cnp', { cnp_encrypted: 'AAAA' });
    await rpcAllowed('decrypt_cnp', null, 'decrypt_cnp', { cnp_encrypted: 'AAAA' });

    // ── 5. transfer_sportiv ────────────────────────────────────────────────
    const clubDe = async (id: string) => (await admin.from('sportivi').select('club_id').eq('id', id).single()).data?.club_id;
    for (const a of [EXT, SPO_A, ADM_B, INS_B, INS_A]) await rpcDenied('transfer_sportiv A->B (tragere din alt club / instructor)', a, 'transfer_sportiv', { p_sportiv_id: spT, p_new_club_id: CLUB_B });
    record('transfer respins: sportivul ramane in A', (await clubDe(spT)) === CLUB_A);
    const rNf = await ADM_B.c.rpc('transfer_sportiv', { p_sportiv_id: NIL, p_new_club_id: CLUB_B });
    record('ADMIN@B: sportiv inexistent = comportament vechi (exceptie non-42501)', !!rNf.error && !denied(rNf.error), rNf.error?.code);
    const tOk = async (a: Actor | null, from: string, to: string, tag: string) => {
      const r = await (a ? a.c : admin).rpc('transfer_sportiv', { p_sportiv_id: spT, p_new_club_id: to });
      record(`${a?.label ?? 'service_role'}: transfer ${tag} reuseste`, !r.error && (await clubDe(spT)) === to, r.error ? `${r.error.code}` : 'ok');
    };
    await tOk(ADM_A, CLUB_A, CLUB_B, 'A->B (admin clubului sursa)');
    await tOk(SUP, CLUB_B, CLUB_A, 'B->A (federatie)');
    await tOk(null, CLUB_A, CLUB_B, 'A->B (service_role)');

    // ── 6. add_sms_to_queue ────────────────────────────────────────────────
    const smsArgs = (club: string, sp: string) => ({ p_club_id: club, p_sportiv_id: sp, p_tip: 'zz_tip_inexistent', p_variabile: {} });
    for (const a of [EXT, SPO_A, ADM_B, INS_B]) await rpcDenied('add_sms_to_queue (club A)', a, 'add_sms_to_queue', smsArgs(CLUB_A, spA));
    await rpcDenied('add_sms_to_queue (club A, sportiv din B)', ADM_A, 'add_sms_to_queue', smsArgs(CLUB_A, spB));
    await rpcDenied('add_sms_to_queue (club B strain)', ADM_A, 'add_sms_to_queue', smsArgs(CLUB_B, spB));
    await rpcDenied('add_sms_to_queue (sportiv NULL)', ADM_A, 'add_sms_to_queue', { p_club_id: CLUB_A, p_sportiv_id: null, p_tip: 'zz', p_variabile: {} });
    // SUP: has_access_to_club cere header de context SUPER_ADMIN (are) => trece
    for (const a of [ADM_A, INS_A, SUP]) await rpcAllowed('add_sms_to_queue (club+sportiv A, tip fara template)', a, 'add_sms_to_queue', smsArgs(CLUB_A, spA));
    const rSvc = await admin.rpc('add_sms_to_queue', smsArgs(CLUB_A, spA));
    info('service_role add_sms_to_queue (comportament preexistent: respins, api/sms.ts nefunctional)', rSvc.error ? `cod=${rSvc.error.code}` : 'ok');

    // ── 7. get_all_app_data stearsa ────────────────────────────────────────
    for (const [lbl, cl] of [['federatie', SUP.c], ['service_role', admin], ['anon', anonC]] as const) {
      const r = await (cl as SupabaseClient).rpc('get_all_app_data');
      record(`${lbl}: get_all_app_data inexistenta`, r.error?.code === 'PGRST202' || (r as any).status === 404, `cod=${r.error?.code}`);
    }

    // ── 8. anon respins ────────────────────────────────────────────────────
    for (const [fn, args] of [
      ['adauga_sportiv_complet', addArgs('anon', CLUB_A)],
      ['export_sportivi_selectati', { p_sportivi_ids: [spA] }],
      ['decrypt_cnp', { cnp_encrypted: 'AAAA' }],
      ['transfer_sportiv', { p_sportiv_id: spT, p_new_club_id: CLUB_B }],
      ['add_sms_to_queue', smsArgs(CLUB_A, spA)],
    ] as const) {
      const r = await anonC.rpc(fn, args as any);
      record(`anon: ${fn} = 42501`, denied(r.error), r.error?.code);
    }
    record('anon: zero sportivi creati', (await nrNume('anon')) === 0);
  } finally {
    const step = async (n: string, p: PromiseLike<{ error: any }>) => { const { error } = await p; if (error) console.log(`  cleanup ${n}: ${error.message}`); };
    const { data: toti } = await admin.from('sportivi').select('id').like('nume', `${PREFIX}%`);
    for (const s of toti ?? []) if (!sportivIds.includes(s.id)) sportivIds.push(s.id);
    if (sportivIds.length) {
      await step('sms_queue', admin.from('sms_queue').delete().in('sportiv_id', sportivIds));
      await step('plati', admin.from('plati').delete().in('sportiv_id', sportivIds));
      await step('vize_sportivi', admin.from('vize_sportivi').delete().in('sportiv_id', sportivIds));
      await step('istoric_grade', admin.from('istoric_grade').delete().in('sportiv_id', sportivIds));
      await step('sportivi', admin.from('sportivi').delete().in('id', sportivIds));
    }
    if (sesiuneIds.length) await step('sesiuni_examene', admin.from('sesiuni_examene').delete().in('id', sesiuneIds));
    for (const id of userIds) {
      await admin.from('utilizator_roluri_multicont').delete().eq('user_id', id);
      await admin.auth.admin.deleteUser(id);
    }
    // audit_log: triggerele scriu randuri pentru sportivii/rolurile efemere (si pentru stergerile din cleanup) => curatate la final
    const toateAudit = [...new Set([...sportivIds, ...roleIds])];
    if (toateAudit.length) await step('audit_log', admin.from('audit_log').delete().in('rand_id', toateAudit));
    const { count: rezAudit } = toateAudit.length
      ? await admin.from('audit_log').select('id', { count: 'exact', head: true }).in('rand_id', toateAudit)
      : { count: 0 };
    record('audit_log: zero randuri ramase pentru entitatile efemere', (rezAudit ?? 0) === 0, `ramase=${rezAudit}`);
    const dupa = await counts();
    record('numaratori neschimbate dupa cleanup', JSON.stringify(dupa) === JSON.stringify(inainte), JSON.stringify(dupa));
    const { count: rezS } = await admin.from('sportivi').select('id', { count: 'exact', head: true }).like('nume', `${PREFIX}%`);
    const { count: rezSes } = await admin.from('sesiuni_examene').select('id', { count: 'exact', head: true }).like('localitate', `${PREFIX}%`);
    let rezU = 0;
    for (let page = 1; page <= 50; page++) {
      const { data: left } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const us = left?.users ?? [];
      rezU += us.filter((u) => u.email?.startsWith(EMAIL_PREFIX)).length;
      if (us.length < 200) break;
    }
    record('reziduuri ZZ_TEST_FAZA37 = 0', (rezS ?? 0) + (rezSes ?? 0) + rezU === 0, `sportivi=${rezS} sesiuni=${rezSes} utilizatori=${rezU}`);
  }

  const esuate = results.filter((r) => !r.passed).length;
  console.log(`\n${results.length - esuate}/${results.length} PASS`);
  process.exit(esuate ? 1 : 0);
}

main().catch((e) => { console.error('EROARE test:', e.message); process.exit(1); });
