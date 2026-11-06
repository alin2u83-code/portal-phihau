// tests/rls_definer_garzi_bani_faza37.ts
//
// Faza 37 (37-04) — matrice live rol x functie pentru garzile din functiile de BANI:
//   proceseaza_incasare_normalizata, recalculare_stare_plata, generare_factura_examen(uuid,uuid)
// + generare_factura_examen(uuid) trebuie sa NU mai existe.
// Date EXCLUSIV efemere (prefix ZZ_TEST_FAZA37_), cleanup in finally, numaratori inainte/dupa, reziduuri 0.
// Nu se citesc/modifica plati sau tranzactii reale. Output: doar ID-uri/numaratori.
//
// Rulare: npx tsx tests/rls_definer_garzi_bani_faza37.ts

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
const EMAIL_PREFIX = 'zztest_faza37b_';
const RUN_ID = Date.now();
const TODAY = new Date().toISOString().slice(0, 10);
const NIL_ID = '00000000-0000-0000-0000-000000000000';
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
  record(`${a?.label ?? 'service_role'}: ${label} fara 42501`, !denied(r.error), r.error ? `eroare non-permisiune: ${r.error.message}` : 'ok');
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
    plati_A: await c('plati', (q) => q.eq('club_id', CLUB_A)),
    plati_B: await c('plati', (q) => q.eq('club_id', CLUB_B)),
    tranzactii_A: await c('tranzactii', (q) => q.eq('club_id', CLUB_A)),
    tranzactii_B: await c('tranzactii', (q) => q.eq('club_id', CLUB_B)),
    tranzactie_plata: await c('tranzactie_plata'),
    vize_sportivi: await c('vize_sportivi'),
  };
}

async function main() {
  const userIds: string[] = [];
  const sportivIds: string[] = [];
  const plataIds: string[] = [];
  const familieIds: string[] = [];
  const roleIds: string[] = [];
  const auditIds: string[] = []; // rand_id-uri ale randurilor efemere (audit_log are triggere pe sportivi/plati/tranzactii/roluri)
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
    const mkPlata = async (sportiv: string | null, club: string | null, tag: string) => {
      const { data, error } = await admin.from('plati').insert({
        sportiv_id: sportiv, club_id: club, suma: 10, status: 'Neachitat', tip: 'Taxa Examen',
        descriere: `${PREFIX}${tag}_${RUN_ID}`, data: TODAY,
      }).select('id').single();
      if (error || !data) throw new Error(`plata ${tag}: ${error?.message}`);
      plataIds.push(data.id);
      return data.id as string;
    };
    const spA = await mkSportiv(CLUB_A, 'SA');
    const spB = await mkSportiv(CLUB_B, 'SB');
    const pRej = await mkPlata(spA, CLUB_A, 'rej');            // tinta respingerilor
    const pAdmA = await mkPlata(spA, CLUB_A, 'admA');
    const pInsA = await mkPlata(spA, CLUB_A, 'insA');
    const pSup = await mkPlata(spA, CLUB_A, 'sup');
    const pSvc = await mkPlata(spA, CLUB_A, 'svc');
    const pDer = await mkPlata(spA, CLUB_A, 'derivat');        // fara club_id in payload
    const pTrg = await mkPlata(spA, CLUB_A, 'trigger');        // DML direct (cale trigger)
    const pB = await mkPlata(spB, CLUB_B, 'plataB');
    let pNoClub: string | null = null;
    try { pNoClub = await mkPlata(null, null, 'faraClub'); } catch (e: any) { info('plata fara club/sportiv nu se poate crea', e.message); }

    const mkFamilie = async (club: string, sp: string, tag: string) => {
      const { data, error } = await admin.from('familii').insert({ nume: `${PREFIX}${tag}_${RUN_ID}`, club_id: club }).select('id').single();
      if (error || !data) throw new Error(`familie ${tag}: ${error?.message}`);
      familieIds.push(data.id);
      const { error: eu } = await admin.from('sportivi').update({ familie_id: data.id }).eq('id', sp);
      if (eu) throw new Error(`familie_id sportiv ${tag}: ${eu.message}`);
      return data.id as string;
    };
    const famA = await mkFamilie(CLUB_A, spA, 'famA');
    const famB = await mkFamilie(CLUB_B, spB, 'famB');
    const { data: pFamRow, error: pFamErr } = await admin.from('plati').insert({
      sportiv_id: null, club_id: null, familie_id: famA, suma: 10, status: 'Neachitat', tip: 'Taxa Examen',
      descriere: `${PREFIX}pFam_${RUN_ID}`, data: TODAY,
    }).select('id').single();
    if (pFamErr || !pFamRow) throw new Error(`plata familie: ${pFamErr?.message}`);
    const pFam = pFamRow.id as string;
    plataIds.push(pFam);

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

    const tx = (sp: string, club: string | null, suma = 1) => ({
      sportiv_id: sp, familie_id: null, suma, data_platii: TODAY, metoda_plata: 'Cash', ...(club ? { club_id: club } : {}),
    });
    const alloc = (plata: string, suma = 1) => [{ plata_id: plata, suma_alocata: suma }];
    const nrTx = async () => {
      const { count } = await admin.from('tranzactii').select('id', { count: 'exact', head: true }).in('sportiv_id', sportivIds);
      return count ?? -1;
    };
    const nrTp = async () => {
      const { count } = await admin.from('tranzactie_plata').select('id', { count: 'exact', head: true }).in('plata_id', plataIds);
      return count ?? -1;
    };
    const plata = async (id: string) => (await admin.from('plati').select('status, suma_ramasa').eq('id', id).single()).data as any;

    // ── 0. varianta cu 1 argument nu mai exista ─────────────────────────────
    const { data: snap } = await admin.rpc('acl_functii_snapshot');
    const sigs = ((snap as any[]) ?? []).filter((r) => r.nume === 'generare_factura_examen').map((r) => r.semnatura);
    record('generare_factura_examen(uuid) stearsa; ramane (uuid,uuid)', sigs.length === 1 && sigs[0].includes('uuid,uuid'), sigs.join(' | '));

    // ── 1. proceseaza_incasare_normalizata: respingeri (zero efecte) ────────
    const tx0 = await nrTx(); const tp0 = await nrTp();
    for (const a of [EXT, SPO_A, ADM_B, INS_B]) {
      await rpcDenied('proceseaza_incasare (club A)', a, 'proceseaza_incasare_normalizata', { p_tranzactie: tx(spA, CLUB_A), p_plati: alloc(pRej) });
    }
    await rpcDenied('proceseaza_incasare (club B strain)', ADM_A, 'proceseaza_incasare_normalizata', { p_tranzactie: tx(spB, CLUB_B), p_plati: alloc(pB) });
    await rpcDenied('proceseaza_incasare (tranzactie A, plata din B)', ADM_A, 'proceseaza_incasare_normalizata', { p_tranzactie: tx(spA, CLUB_A), p_plati: alloc(pB) });
    await rpcDenied('proceseaza_incasare (club_id A dar sportiv din B)', ADM_A, 'proceseaza_incasare_normalizata', { p_tranzactie: tx(spB, CLUB_A), p_plati: alloc(pRej) });
    if (pNoClub) await rpcDenied('proceseaza_incasare (plata fara club)', ADM_A, 'proceseaza_incasare_normalizata', { p_tranzactie: tx(spA, CLUB_A), p_plati: alloc(pNoClub) });
    await rpcDenied('proceseaza_incasare (fara club in payload si sportiv din B)', ADM_A, 'proceseaza_incasare_normalizata', { p_tranzactie: tx(spB, null), p_plati: alloc(pB) });
    record('respingeri: zero tranzactii / tranzactie_plata noi', (await nrTx()) === tx0 && (await nrTp()) === tp0, `tx ${tx0}->${await nrTx()}, tp ${tp0}->${await nrTp()}`);
    const pr = await plata(pRej);
    record('respingeri: plata tinta neschimbata', pr.status === 'Neachitat' && Number(pr.suma_ramasa) === 10, `${pr.status}/${pr.suma_ramasa}`);

    // ── 2. proceseaza_incasare_normalizata: succes + efect verificat ────────
    const okCase = async (a: Actor | null, plataId: string, club: string | null, tag: string) => {
      const before = await nrTx();
      const r = await (a ? a.c : admin).rpc('proceseaza_incasare_normalizata', { p_tranzactie: tx(spA, club), p_plati: alloc(plataId) });
      const p = await plata(plataId);
      record(`${tag}: incasare reusita + efect (tranzactie noua, plata Achitat Partial, rest 9)`,
        !r.error && (await nrTx()) === before + 1 && p.status === 'Achitat Parțial' && Number(p.suma_ramasa) === 9,
        r.error ? r.error.message : `${p.status}/${p.suma_ramasa}`);
    };
    await okCase(ADM_A, pAdmA, CLUB_A, 'ADMIN@A');
    await okCase(INS_A, pInsA, CLUB_A, 'INSTRUCTOR@A');
    await okCase(SUP, pSup, CLUB_A, 'federatie');
    await okCase(null, pSvc, CLUB_A, 'service_role (auth.uid() NULL)');
    await okCase(ADM_A, pDer, null, 'ADMIN@A (club derivat din sportiv)');
    const { count: fara_club } = await admin.from('tranzactii').select('id', { count: 'exact', head: true }).in('sportiv_id', sportivIds).is('club_id', null);
    record('tranzactie fara club in payload: club derivat scris in INSERT (0 tranzactii cu club NULL)', fara_club === 0, `club_null=${fara_club}`);
    if (pNoClub) {
      const r = await SUP.c.rpc('proceseaza_incasare_normalizata', { p_tranzactie: tx(spA, CLUB_A), p_plati: alloc(pNoClub) });
      record('federatie: incaseaza plata fara club', !r.error, r.error?.message);
    }
    await rpcDenied('proceseaza_incasare (fara club in payload, sportiv A)', ADM_B, 'proceseaza_incasare_normalizata', { p_tranzactie: tx(spA, null), p_plati: alloc(pRej) });

    // ── 3. recalculare_stare_plata ──────────────────────────────────────────
    const before = await plata(pRej);
    for (const a of [EXT, SPO_A, ADM_B, INS_B]) await rpcDenied('recalculare_stare_plata', a, 'recalculare_stare_plata', { p_plata_id: pRej });
    const after = await plata(pRej);
    record('recalculare respinsa: plata neschimbata', before.status === after.status && Number(before.suma_ramasa) === Number(after.suma_ramasa));
    for (const a of [ADM_A, INS_A, SUP]) await rpcAllowed('recalculare_stare_plata', a, 'recalculare_stare_plata', { p_plata_id: pRej });
    await rpcAllowed('recalculare_stare_plata', null, 'recalculare_stare_plata', { p_plata_id: pRej });
    await rpcAllowed('recalculare_stare_plata (plata inexistenta = comportament vechi)', ADM_B, 'recalculare_stare_plata', { p_plata_id: '00000000-0000-0000-0000-000000000000' });

    // ── 3b. cale trigger: DML direct pe tranzactii / tranzactie_plata ───────
    const dml = async (a: Actor, expectOk: boolean) => {
      const t = await a.c.from('tranzactii').insert({ sportiv_id: spA, club_id: CLUB_A, suma: 1, data_platii: TODAY, metoda_plata: 'Cash' }).select('id').maybeSingle();
      if (t.error || !t.data) {
        record(`${a.label}: INSERT tranzactii direct ${expectOk ? 'permis' : 'respins'}`, !expectOk, t.error?.message ?? 'fara rand');
        return;
      }
      auditIds.push(t.data.id);
      const tp = await a.c.from('tranzactie_plata').insert({ tranzactie_id: t.data.id, plata_id: pTrg, suma_alocata: 1 }).select('id').maybeSingle();
      const efect = await plata(pTrg);
      const del = await a.c.from('tranzactie_plata').delete().eq('tranzactie_id', t.data.id);
      const efectDel = await plata(pTrg);
      record(`${a.label}: INSERT/DELETE tranzactie_plata (trigger -> recalculare)`,
        expectOk ? !tp.error && efect.status === 'Achitat Parțial' && !del.error && efectDel.status === 'Neachitat' : !!tp.error,
        `insert=${tp.error?.code ?? 'ok'} ${efect.status} / delete=${del.error?.code ?? 'ok'} ${efectDel.status}`);
      await admin.from('tranzactii').delete().eq('id', t.data.id);
    };
    await dml(ADM_A, true);
    await dml(INS_A, true);
    // ADMIN@B pe plata din A: RLS sau garda trebuie sa opreasca; plata ramane neschimbata
    const tB = await ADM_B.c.from('tranzactii').insert({ sportiv_id: spA, club_id: CLUB_B, suma: 1, data_platii: TODAY, metoda_plata: 'Cash' }).select('id').maybeSingle();
    if (tB.data) {
      auditIds.push(tB.data.id);
      const tpB = await ADM_B.c.from('tranzactie_plata').insert({ tranzactie_id: tB.data.id, plata_id: pTrg, suma_alocata: 1 }).select('id').maybeSingle();
      const pt = await plata(pTrg);
      record('ADMIN@B: tranzactie_plata pe plata din A nu schimba plata', pt.status === 'Neachitat', `insert=${tpB.error?.code ?? 'ok'} ${pt.status}`);
      await admin.from('tranzactie_plata').delete().eq('tranzactie_id', tB.data.id);
      await admin.from('tranzactii').delete().eq('id', tB.data.id);
    } else {
      record('ADMIN@B: INSERT tranzactii pe club strain respins de RLS', true, tB.error?.code);
    }

    // ── 3c. familie: plata fara club/sportiv (club derivat din familie) + familie_id strain ──
    const txFam = (fam: string | null, sp: string | null, club: string) => ({
      sportiv_id: sp, familie_id: fam, suma: 1, data_platii: TODAY, metoda_plata: 'Cash', club_id: club,
    });
    const txBefore = await nrTx();
    await rpcDenied('incasare plata de familie (alt club)', ADM_B, 'proceseaza_incasare_normalizata', { p_tranzactie: txFam(famA, null, CLUB_B), p_plati: alloc(pFam) });
    await rpcDenied('incasare cu familie_id din alt club', ADM_A, 'proceseaza_incasare_normalizata', { p_tranzactie: txFam(famB, spA, CLUB_A), p_plati: alloc(pRej) });
    record('familie respinsa: zero tranzactii noi', (await nrTx()) === txBefore);
    await rpcDenied('recalculare plata de familie (alt club)', ADM_B, 'recalculare_stare_plata', { p_plata_id: pFam });
    const rFam = await ADM_A.c.rpc('proceseaza_incasare_normalizata', { p_tranzactie: txFam(famA, null, CLUB_A), p_plati: alloc(pFam) });
    const pf = await plata(pFam);
    record('ADMIN@A: incaseaza plata de familie fara club/sportiv (club derivat din familie)',
      !rFam.error && pf.status === 'Achitat Parțial' && Number(pf.suma_ramasa) === 9, rFam.error?.message ?? `${pf.status}/${pf.suma_ramasa}`);
    await rpcAllowed('recalculare plata de familie', ADM_A, 'recalculare_stare_plata', { p_plata_id: pFam });

    // ── 4. generare_factura_examen(uuid,uuid) ───────────────────────────────
    for (const a of [EXT, SPO_A, ADM_B, INS_B]) await rpcDenied('generare_factura_examen', a, 'generare_factura_examen', { p_sportiv_id: spA, p_sesiune_id: null });
    // garda inaintea verificarilor care dezvaluie date: sportiv inexistent => 42501 pentru non-federatie, eroare obisnuita pentru federatie
    await rpcDenied('generare_factura_examen (sportiv inexistent)', ADM_B, 'generare_factura_examen', { p_sportiv_id: NIL_ID, p_sesiune_id: null });
    await rpcAllowed('generare_factura_examen (sportiv inexistent)', SUP, 'generare_factura_examen', { p_sportiv_id: NIL_ID, p_sesiune_id: null });
    for (const a of [ADM_A, INS_A, SUP]) await rpcAllowed('generare_factura_examen', a, 'generare_factura_examen', { p_sportiv_id: spA, p_sesiune_id: null });
    await rpcAllowed('generare_factura_examen', null, 'generare_factura_examen', { p_sportiv_id: spA, p_sesiune_id: null });

    // ── 5. anon respins pe toate trei ───────────────────────────────────────
    const anonC = createClient(url!, anonKey!);
    for (const [fn, args] of [
      ['proceseaza_incasare_normalizata', { p_tranzactie: tx(spA, CLUB_A), p_plati: alloc(pRej) }],
      ['recalculare_stare_plata', { p_plata_id: pRej }],
      ['generare_factura_examen', { p_sportiv_id: spA, p_sesiune_id: null }],
    ] as const) {
      const r = await anonC.rpc(fn, args as any);
      record(`anon: ${fn} = 42501`, denied(r.error), r.error?.code);
    }
  } finally {
    const step = async (n: string, p: PromiseLike<{ error: any }>) => { const { error } = await p; if (error) console.log(`  cleanup ${n}: ${error.message}`); };
    if (sportivIds.length) {
      const { data: pl } = await admin.from('plati').select('id').in('sportiv_id', sportivIds);
      for (const p of pl ?? []) if (!plataIds.includes(p.id)) plataIds.push(p.id);
      const { data: tr } = await admin.from('tranzactii').select('id').in('sportiv_id', sportivIds);
      const trIds = (tr ?? []).map((t) => t.id);
      auditIds.push(...trIds);
      if (familieIds.length) {
        const { data: trF } = await admin.from('tranzactii').select('id').in('familie_id', familieIds);
        for (const t of trF ?? []) if (!trIds.includes(t.id)) { trIds.push(t.id); auditIds.push(t.id); }
      }
      if (plataIds.length) await step('tranzactie_plata', admin.from('tranzactie_plata').delete().in('plata_id', plataIds));
      if (trIds.length) await step('tranzactie_plata(tx)', admin.from('tranzactie_plata').delete().in('tranzactie_id', trIds));
      if (trIds.length) await step('tranzactii', admin.from('tranzactii').delete().in('id', trIds));
      await step('sms_queue', admin.from('sms_queue').delete().in('sportiv_id', sportivIds));
      if (plataIds.length) await step('plati', admin.from('plati').delete().in('id', plataIds));
      await step('vize_sportivi', admin.from('vize_sportivi').delete().in('sportiv_id', sportivIds));
      await step('sportivi', admin.from('sportivi').delete().in('id', sportivIds));
    }
    if (familieIds.length) await step('familii', admin.from('familii').delete().in('id', familieIds));
    for (const id of userIds) {
      await admin.from('utilizator_roluri_multicont').delete().eq('user_id', id);
      await admin.auth.admin.deleteUser(id);
    }
    // audit_log: triggerele scriu randuri pentru entitatile efemere (si pentru stergerile din cleanup) => curatate la final
    const toateAudit = [...new Set([...auditIds, ...sportivIds, ...plataIds, ...roleIds])];
    if (toateAudit.length) await step('audit_log', admin.from('audit_log').delete().in('rand_id', toateAudit));
    const { count: rezAudit } = toateAudit.length
      ? await admin.from('audit_log').select('id', { count: 'exact', head: true }).in('rand_id', toateAudit)
      : { count: 0 };
    record('audit_log: zero randuri ramase pentru entitatile efemere', (rezAudit ?? 0) === 0, `ramase=${rezAudit}`);
    const dupa = await counts();
    record('numaratori neschimbate dupa cleanup', JSON.stringify(dupa) === JSON.stringify(inainte), JSON.stringify(dupa));
    const { count: rezS } = await admin.from('sportivi').select('id', { count: 'exact', head: true }).like('nume', `${PREFIX}%`);
    const { count: rezF } = await admin.from('familii').select('id', { count: 'exact', head: true }).like('nume', `${PREFIX}%`);
    const { count: rezP } = await admin.from('plati').select('id', { count: 'exact', head: true }).like('descriere', `${PREFIX}%`);
    let rezU = 0;
    for (let page = 1; page <= 50; page++) {
      const { data: left } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const us = left?.users ?? [];
      rezU += us.filter((u) => u.email?.startsWith(EMAIL_PREFIX)).length;
      if (us.length < 200) break;
    }
    record('reziduuri ZZ_TEST_FAZA37 = 0', (rezS ?? 0) + (rezP ?? 0) + (rezF ?? 0) + rezU === 0, `sportivi=${rezS} plati=${rezP} familii=${rezF} utilizatori=${rezU}`);
  }

  const esuate = results.filter((r) => !r.passed).length;
  console.log(`\n${results.length - esuate}/${results.length} PASS`);
  process.exit(esuate ? 1 : 0);
}

main().catch((e) => { console.error('EROARE test:', e.message); process.exit(1); });
