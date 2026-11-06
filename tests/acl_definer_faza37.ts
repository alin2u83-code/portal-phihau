// tests/acl_definer_faza37.ts
//
// Faza 37 (37-01) — plasa de regresie ACL: functiile SECURITY DEFINER din `public` apelabile de
// anon / authenticated trebuie sa fie in allowlist (tests/acl_definer_faza37.allowlist.json).
// Pica daca apare o functie definer noua expusa. Citeste doar catalogul (acl_functii_snapshot, service_role).
// Output: doar semnaturi de functii si numaratori (fara date personale).
//
// Rulare:            npx tsx tests/acl_definer_faza37.ts
// Baseline (o data): npx tsx tests/acl_definer_faza37.ts --write-baseline   (NU ruleaza verificarile)

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) {
  console.error('Lipsesc VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const ALLOWLIST_PATH = join(dirname(fileURLToPath(import.meta.url)), 'acl_definer_faza37.allowlist.json');

type Rand = { semnatura: string; nume: string; definer: boolean; tip_retur: string; anon: boolean; authenticated: boolean; service_role: boolean };
type Allowlist = {
  nota: string;
  exceptii_prefix: { anon: string[]; authenticated: string[] };
  anon: string[];
  authenticated: string[];
  anon_obligatoriu: string[];
};
type Rol = 'anon' | 'authenticated';

const results: { name: string; passed: boolean }[] = [];
const record = (name: string, passed: boolean, detail?: string) => {
  results.push({ name, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
};
const info = (name: string, detail: string) => console.log(`INFO — ${name} (${detail})`);

const admin = createClient(url, serviceKey);
const anon = createClient(url, anonKey);

async function snapshot(): Promise<Rand[]> {
  const { data, error } = await admin.rpc('acl_functii_snapshot');
  if (error) throw new Error(`acl_functii_snapshot: ${error.message}`);
  return (data as Rand[]) ?? [];
}

const prefixat = (nume: string, prefixe: string[]) => prefixe.some((p) => nume.startsWith(p));

// Functii definer expuse rolului, care nu sunt nici in allowlist, nici sub un prefix exceptie.
function neincluse(rows: Rand[], al: Allowlist, rol: Rol): string[] {
  const permise = new Set(al[rol]);
  return rows
    .filter((r) => r.definer && r[rol] && !permise.has(r.semnatura) && !prefixat(r.nume, al.exceptii_prefix[rol]))
    .map((r) => r.semnatura);
}

async function scrieBaseline() {
  const rows = await snapshot();
  let existent: Partial<Allowlist> = {};
  try { existent = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8')); } catch { /* prima rulare */ }
  const prefixe = existent.exceptii_prefix ?? { anon: ['scoala_ioncreanga_'], authenticated: ['scoala_ioncreanga_'] };
  const al: Allowlist = {
    nota: existent.nota ?? 'Baseline = starea expusa la momentul 37-01 (inainte de REVOKE). Ratchet: se micsoreaza manual in 37-03/37-05 conform 37-TRIAJ.md. scoala_ioncreanga_* = aplicatie separata, exceptie documentata (decizie 5.11.2026), nu se modifica.',
    exceptii_prefix: prefixe,
    anon: rows.filter((r) => r.definer && r.anon && !prefixat(r.nume, prefixe.anon)).map((r) => r.semnatura),
    authenticated: rows.filter((r) => r.definer && r.authenticated && !prefixat(r.nume, prefixe.authenticated)).map((r) => r.semnatura),
    anon_obligatoriu: existent.anon_obligatoriu ?? [],
  };
  // Ratchet: baseline-ul nu poate CRESTE tacit (ar transforma un test rosu in verde). Cresterea cere --allow-grow.
  const adaugate = (['anon', 'authenticated'] as Rol[]).flatMap((rol) =>
    al[rol].filter((s) => !(existent[rol] ?? []).includes(s)).map((s) => `${rol}:${s}`));
  if (existent.anon && adaugate.length && !process.argv.includes('--allow-grow')) {
    console.error(`REFUZ: baseline-ul ar creste cu ${adaugate.length} functii expuse (triaj necesar): ${adaugate.join(' | ')}\nFoloseste --allow-grow doar dupa triaj.`);
    process.exitCode = 1;
    return;
  }
  writeFileSync(ALLOWLIST_PATH, JSON.stringify(al, null, 2) + '\n');
  console.log(`Baseline scris: anon=${al.anon.length}, authenticated=${al.authenticated.length}, prefixe exceptie=${prefixe.anon.join(',')}`);
}

async function main() {
  if (process.argv.includes('--write-baseline')) {
    await scrieBaseline();
    return;
  }

  const rows = await snapshot();
  const al: Allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));

  // (1) snapshot nevid si cu semnaturi unice
  record('snapshot nevid (> 100 functii)', rows.length > 100, `n=${rows.length}`);
  record('semnaturi unice in snapshot', new Set(rows.map((r) => r.semnatura)).size === rows.length);
  info('functii definer', `total=${rows.filter((r) => r.definer).length}, anon=${rows.filter((r) => r.definer && r.anon).length}, authenticated=${rows.filter((r) => r.definer && r.authenticated).length}`);

  // (2) verificarea principala, per rol
  for (const rol of ['anon', 'authenticated'] as Rol[]) {
    const noi = neincluse(rows, al, rol);
    record(`${rol}: nicio functie SECURITY DEFINER noua expusa`, noi.length === 0, noi.length ? `noi=${noi.join(' | ')}` : undefined);
    if (noi.length) console.log('  -> adauga in allowlist DOAR dupa triaj, sau fa REVOKE/GRANT explicit (ALTER DEFAULT PRIVILEGES nu mai acorda anon implicit)');
  }

  // (3) functii care trebuie sa ramana apelabile de anon
  const dupaSemn = new Map(rows.map((r) => [r.semnatura, r]));
  const lipsa = al.anon_obligatoriu.filter((s) => !dupaSemn.get(s)?.anon);
  record('anon_obligatoriu inca apelabile de anon', lipsa.length === 0, lipsa.length ? `lipsa=${lipsa.join(' | ')}` : `n=${al.anon_obligatoriu.length}`);

  record('anon_obligatoriu nevid (altfel verificarea trece pe gol)', al.anon_obligatoriu.length > 0);

  // (4) intrari invechite = FAIL (ratchet): dupa un REVOKE, scoate intrarea din allowlist, altfel o re-expunere ar trece tacut
  for (const rol of ['anon', 'authenticated'] as Rol[]) {
    const invechite = al[rol].filter((s) => !(dupaSemn.get(s)?.definer && dupaSemn.get(s)?.[rol]));
    record(`${rol}: allowlist fara intrari invechite`, invechite.length === 0, invechite.length ? `scoate: ${invechite.join(' | ')}` : undefined);
  }

  // (5) proba functionala: anon nu poate apela functia de snapshot
  const { data: dAnon, error: eAnon } = await anon.rpc('acl_functii_snapshot');
  const respins = !!eAnon && !(Array.isArray(dAnon) && dAnon.length > 0);
  record('anon respins pe acl_functii_snapshot', respins, eAnon ? `cod=${eAnon.code ?? eAnon.message}` : 'a primit date!');

  // (6) self-check de sensibilitate: scoate un nume apelabil din allowlist-ul authenticated; trebuie detectat
  const mutat: Allowlist = { ...al, authenticated: [...al.authenticated] };
  const tinta = mutat.authenticated.find((s) => dupaSemn.get(s)?.definer && dupaSemn.get(s)?.authenticated);
  if (!tinta) {
    record('self-check sensibilitate (exista o tinta in allowlist)', false, 'allowlist authenticated gol sau fara functii apelabile');
  } else {
    mutat.authenticated = mutat.authenticated.filter((s) => s !== tinta);
    const detectate = neincluse(rows, mutat, 'authenticated');
    record('self-check sensibilitate: mutatia e detectata', detectate.length === 1 && detectate[0] === tinta, `tinta=${tinta}`);
  }

  // (7) probe functionale (37-03): D functioneaza pentru anon; cauta_utilizatori_comisie cere staff; triggere auth OK
  await probeFunctionale();

  const esuate = results.filter((r) => !r.passed).length;
  console.log(`\n${results.length - esuate}/${results.length} PASS`);
  process.exit(esuate ? 1 : 0);
}


const CLUB_A = '83e7f771-46cf-4c4e-b70f-356d7b0bff06';
const EMAIL_PREFIX = 'zztest_faza37x_';
const RUN_ID = Date.now();
const SERVICE_ONLY = ['check_user_access', 'encrypt_cnp', 'find_similar_sportivi', 'genereaza_antrenamente_din_orar',
  'get_primary_user_context', 'get_statistici_financiare', 'get_user_context', 'get_user_contexts',
  'inregistreaza_sportiv_v2', 'schedule_training_reminders'];

async function probeFunctionale() {
  // anon pe D: eroare/valoare din corp, NICIODATA 42501
  const nonPerm = (e: any) => !e || e.code !== '42501';
  const r1 = await anon.rpc('lista_cluburi_publice');
  record('anon: lista_cluburi_publice fara 42501', nonPerm(r1.error), r1.error?.code);
  const r2 = await anon.rpc('get_competitie_publica', { p_id: '00000000-0000-0000-0000-000000000000' });
  record('anon: get_competitie_publica fara 42501', nonPerm(r2.error), r2.error?.code);
  const r3 = await anon.rpc('trimite_cerere_acces', { p_competitie: '00000000-0000-0000-0000-000000000000', p_email: 'invalid', p_nume: 'x', p_club: '00000000-0000-0000-0000-000000000000', p_mesaj: 'x' });
  record('anon: trimite_cerere_acces fara 42501 (date invalide)', nonPerm(r3.error), r3.error?.code ?? r3.error?.message);
  const r4 = await anon.rpc('inregistreaza_email_auth', { p_tip: 'tip_invalid_zz', p_reusit: false });
  record('anon: inregistreaza_email_auth fara 42501', nonPerm(r4.error), r4.error?.code ?? r4.error?.message);
  const r5 = await anon.rpc('cauta_utilizatori_comisie', { p_query: 'a' });
  record('anon: cauta_utilizatori_comisie = 42501', r5.error?.code === '42501', r5.error?.code ?? 'a primit date');
  const r6 = await anon.rpc('transfer_sportiv', { p_sportiv_id: '00000000-0000-0000-0000-000000000000', p_new_club_id: '00000000-0000-0000-0000-000000000000' });
  record('anon: transfer_sportiv = 42501', r6.error?.code === '42501', r6.error?.code);

  const userIds: string[] = [];
  try {
    const parola = `Zz!${RUN_ID}aA`;
    const mk = async (tag: string, rol: string | null) => {
      const email = `${EMAIL_PREFIX}${tag}_${RUN_ID}@example.com`;
      const { data, error } = await admin.auth.admin.createUser({ email, password: parola, email_confirm: true });
      if (error || !data.user) throw new Error(`user ${tag}: ${error?.message}`);
      userIds.push(data.user.id);
      let ctx = '';
      if (rol) {
        const { data: rr, error: er } = await admin.from('utilizator_roluri_multicont')
          .insert({ user_id: data.user.id, rol_denumire: rol, club_id: rol === 'REPREZENTANT_COMPETITIE' ? null : CLUB_A, is_primary: true }).select('id').single();
        if (er || !rr) throw new Error(`rol ${rol}: ${er?.message}`);
        ctx = rr.id;
      }
      const c = createClient(url!, anonKey!, { global: { headers: { 'active-role-context-id': ctx } } });
      const { error: el } = await c.auth.signInWithPassword({ email, password: parola });
      if (el) throw new Error(`login ${tag}: ${el.message}`);
      return { c, uid: data.user.id };
    };
    // (4) crearea utilizatorului a reusit => triggerele de pe auth.users merg dupa REVOKE C
    const adm = await mk('adm', 'ADMIN_CLUB');
    record('creare utilizator efemer OK (triggere auth.users dupa REVOKE C)', !!adm.uid);
    const spo = await mk('spo', 'SPORTIV');
    const ext = await mk('ext', 'REPREZENTANT_COMPETITIE');
    // UPDATE efemer pe auth.users -> triggerele sync_user_metadata / sync_email_to_sportivi
    const { error: eUp } = await admin.auth.admin.updateUserById(adm.uid, { user_metadata: { zz_faza37: RUN_ID } });
    record('UPDATE auth.users (triggere sync_*) fara eroare', !eUp, eUp?.message);

    const q = await adm.c.rpc('cauta_utilizatori_comisie', { p_query: 'a' });
    record('ADMIN_CLUB: cauta_utilizatori_comisie fara eroare', !q.error, q.error?.message ?? `rows=${(q.data as any[])?.length}`);
    for (const [tag, u] of [['SPORTIV', spo], ['extern', ext]] as const) {
      const r = await u.c.rpc('cauta_utilizatori_comisie', { p_query: 'a' });
      record(`${tag}: cauta_utilizatori_comisie = 42501`, r.error?.code === '42501', r.error?.code ?? 'a primit date');
    }
    // SERVICE_ONLY: authenticated respins (42501), fara efecte (argumente inexistente)
    const z = '00000000-0000-0000-0000-000000000000';
    const args: Record<string, any> = {
      check_user_access: { p_user_id: z }, get_primary_user_context: { p_user_id: z }, get_user_context: { p_user_id: z },
      get_user_contexts: { p_user_id: z }, encrypt_cnp: { cnp_plain: '0000000000000' },
    };
    for (const f of ['check_user_access', 'get_primary_user_context', 'get_user_context', 'get_user_contexts', 'encrypt_cnp', 'find_similar_sportivi']) {
      const r = await adm.c.rpc(f, args[f] ?? {});
      record(`ADMIN_CLUB: ${f} = 42501 (service-only)`, r.error?.code === '42501', r.error?.code ?? r.error?.message ?? 'a primit date');
    }
    // vizibilitate catalog: toate SERVICE_ONLY fara EXECUTE pentru authenticated/anon, cu EXECUTE pentru service_role
    const rows = await snapshot();
    const so = rows.filter((r) => SERVICE_ONLY.includes(r.nume) && r.definer);
    record('SERVICE_ONLY: 10 semnaturi definer prezente', so.length === 10, `n=${so.length}`);
    record('SERVICE_ONLY: fara authenticated/anon, cu service_role', so.every((r) => !r.authenticated && !r.anon && r.service_role));
  } finally {
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
    const { data: left } = await admin.auth.admin.listUsers({ perPage: 200 });
    const ramase = (left?.users ?? []).filter((u) => u.email?.startsWith(EMAIL_PREFIX)).length;
    record('reziduuri utilizatori ZZ_TEST_FAZA37 = 0', ramase === 0, `n=${ramase}`);
  }
}

main().catch((e) => {
  console.error('EROARE test:', e.message);
  process.exit(1);
});
