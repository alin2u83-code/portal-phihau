// tests/plati_club_id_faza44.ts
//
// Faza 44 (44-05) — trigger plati_completeaza_club_id_trg sub RLS reala.
// Date EXCLUSIV efemere (prefix ZZ_TEST_FAZA44_, email zztest_faza44_), cleanup in finally,
// numaratori inainte/dupa pe tot tabelul plati, reziduuri 0. Output: doar PASS/FAIL, ID-uri, numaratori.
//
// Rulare: npx tsx tests/plati_club_id_faza44.ts [--dupa-not-null]
//   fara flag: cazul 3 (fara sportiv/familie/club) reuseste cu club_id NULL (apoi sters)
//   cu flag:   cazul 3 trebuie sa pice cu 23502 (dupa NOT NULL din 44-09)

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) {
  console.error('Lipsesc VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}
const DUPA_NOT_NULL = process.argv.includes('--dupa-not-null');

const CLUB_A = '83e7f771-46cf-4c4e-b70f-356d7b0bff06';
const CLUB_B = 'cbb0b228-b3e0-4735-9658-70999eb256c6';
const PREFIX = 'ZZ_TEST_FAZA44_';
const EMAIL_PREFIX = 'zztest_faza44_';
const RUN_ID = Date.now();
const TODAY = new Date().toISOString().slice(0, 10);
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const results: { name: string; passed: boolean }[] = [];
const record = (name: string, passed: boolean, detail?: string) => {
  results.push({ name, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
};
const info = (name: string, detail: string) => console.log(`INFO — ${name} (${detail})`);

type Actor = { c: SupabaseClient; uid: string; label: string };

async function main() {
  const userIds: string[] = [];
  const roleIds: string[] = [];
  const sportivIds: string[] = [];
  const plataIds: string[] = [];
  const parola = `Zz!${RUN_ID}aA`;
  const nrPlati = async () => (await admin.from('plati').select('id', { count: 'exact', head: true })).count ?? -1;
  const inainte = await nrPlati();
  info('plati inainte', String(inainte));

  const payload = (sp: string | null, tag: string, extra: any = {}) => ({
    sportiv_id: sp, suma: 10, status: 'Neachitat', tip: 'Taxa Examen',
    descriere: `${PREFIX}${tag}_${RUN_ID}`, data: TODAY, ...extra,
  });
  const clubDe = async (id: string) => (await admin.from('plati').select('club_id').eq('id', id).single()).data?.club_id ?? null;

  try {
    const { data: sp, error: es } = await admin.from('sportivi').insert({
      nume: `${PREFIX}SA_${RUN_ID}`, prenume: 'Test', status: 'Activ', club_id: CLUB_A, data_nasterii: '2010-01-01',
    }).select('id').single();
    if (es || !sp) throw new Error(`sportiv: ${es?.message}`);
    sportivIds.push(sp.id);
    const spA = sp.id as string;

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
    const ADM_B = await mkActor('ADMIN@B', 'ADMIN_CLUB', CLUB_B);
    const INS_A = await mkActor('INSTRUCTOR@A', 'INSTRUCTOR', CLUB_A);

    // 1. service role, fara club_id: club = clubul sportivului
    const r1 = await admin.from('plati').insert(payload(spA, 'c1')).select('id').single();
    if (r1.data) plataIds.push(r1.data.id);
    record('1. insert fara club_id: club = clubul sportivului', !r1.error && (await clubDe(r1.data!.id)) === CLUB_A, r1.error?.message);

    // 2. club_id explicit diferit ramane
    const r2 = await admin.from('plati').insert(payload(spA, 'c2', { club_id: CLUB_B })).select('id').single();
    if (r2.data) plataIds.push(r2.data.id);
    record('2. club_id explicit nu e suprascris', !r2.error && (await clubDe(r2.data!.id)) === CLUB_B, r2.error?.message);

    // 3. fara sportiv/familie/club
    const r3 = await admin.from('plati').insert(payload(null, 'c3')).select('id').maybeSingle();
    if (r3.data) plataIds.push(r3.data.id);
    if (DUPA_NOT_NULL) record('3. fara club (dupa NOT NULL) esueaza cu 23502', r3.error?.code === '23502', r3.error?.code ?? 'A REUSIT');
    else record('3. fara club (inainte de NOT NULL): reuseste cu club_id NULL', !r3.error && !!r3.data && (await clubDe(r3.data.id)) === null, r3.error?.message);

    // 4. ADMIN@A, sportiv propriu, fara club_id
    const r4 = await ADM_A.c.from('plati').insert(payload(spA, 'c4')).select('id').maybeSingle();
    if (r4.data) plataIds.push(r4.data.id);
    record('4. ADMIN@A: insert fara club_id completat cu clubul lui', !r4.error && !!r4.data && (await clubDe(r4.data.id)) === CLUB_A, r4.error ? `${r4.error.code} ${r4.error.message}` : '');

    // 5. ADMIN@B, sportiv din A, fara club_id: respins
    const r5 = await ADM_B.c.from('plati').insert(payload(spA, 'c5')).select('id').maybeSingle();
    if (r5.data) plataIds.push(r5.data.id);
    record('5. ADMIN@B pe sportiv din A: refuzat', !!r5.error || !r5.data, r5.error ? `cod=${r5.error.code}` : r5.data ? 'A REUSIT!' : 'fara rand');

    // 6. INSTRUCTOR@A, sportiv din A, fara club_id
    const r6 = await INS_A.c.from('plati').insert(payload(spA, 'c6')).select('id').maybeSingle();
    if (r6.data) plataIds.push(r6.data.id);
    if (r6.error) {
      info('6. INSTRUCTOR@A insert refuzat', `${r6.error.code} ${r6.error.message}`);
      record('6. INSTRUCTOR@A: refuzat (nu produce club NULL)', true);
    } else {
      // rand scris: club_id trebuie completat; verificam cu service role (instructorul poate sa nu-l vada)
      const { data: row } = await admin.from('plati').select('id, club_id').eq('descriere', `${PREFIX}c6_${RUN_ID}`).maybeSingle();
      if (row && !plataIds.includes(row.id)) plataIds.push(row.id);
      const club = row?.club_id ?? null;
      record('6. INSTRUCTOR@A: insert reusit cu club_id completat', club === CLUB_A,
        club === CLUB_A ? 'ok' : `club_id=${club}; lookup ascuns de RLS: NOT NULL ar esua (44-09: oprire, raportare)`);
      if (!r6.data) info('6. INSTRUCTOR@A nu vede randul inserat', 'RETURNING ascuns de RLS SELECT (relevant pentru creeazaPlata maybeSingle)');
    }
  } finally {
    const step = async (n: string, p: PromiseLike<{ error: any }>) => { const { error } = await p; if (error) console.log(`  cleanup ${n}: ${error.message}`); };
    const { data: pl } = await admin.from('plati').select('id').like('descriere', `${PREFIX}%`);
    for (const p of pl ?? []) if (!plataIds.includes(p.id)) plataIds.push(p.id);
    if (plataIds.length) {
      await step('tranzactie_plata', admin.from('tranzactie_plata').delete().in('plata_id', plataIds));
    }
    if (sportivIds.length) await step('sms_queue', admin.from('sms_queue').delete().in('sportiv_id', sportivIds));
    if (plataIds.length) await step('plati', admin.from('plati').delete().in('id', plataIds));
    if (sportivIds.length) await step('sportivi', admin.from('sportivi').delete().in('id', sportivIds));
    for (const id of userIds) {
      await admin.from('utilizator_roluri_multicont').delete().eq('user_id', id);
      await admin.auth.admin.deleteUser(id);
    }
    const toateAudit = [...new Set([...sportivIds, ...plataIds, ...roleIds])];
    if (toateAudit.length) await step('audit_log', admin.from('audit_log').delete().in('rand_id', toateAudit));
    const dupa = await nrPlati();
    record('numar plati neschimbat dupa cleanup', dupa === inainte, `${inainte} -> ${dupa}`);
    const { count: rezS } = await admin.from('sportivi').select('id', { count: 'exact', head: true }).like('nume', `${PREFIX}%`);
    const { count: rezP } = await admin.from('plati').select('id', { count: 'exact', head: true }).like('descriere', `${PREFIX}%`);
    let rezU = 0;
    for (let page = 1; page <= 50; page++) {
      const { data: left } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const us = left?.users ?? [];
      rezU += us.filter((u) => u.email?.startsWith(EMAIL_PREFIX)).length;
      if (us.length < 200) break;
    }
    record('reziduuri ZZ_TEST_FAZA44 = 0', (rezS ?? 0) + (rezP ?? 0) + rezU === 0, `sportivi=${rezS} plati=${rezP} utilizatori=${rezU}`);
  }

  const esuate = results.filter((r) => !r.passed).length;
  console.log(`\n${results.length - esuate}/${results.length} PASS`);
  process.exit(esuate ? 1 : 0);
}

main().catch((e) => { console.error('EROARE test:', e.message); process.exit(1); });
