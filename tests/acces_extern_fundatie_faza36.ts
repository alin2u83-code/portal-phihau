// tests/acces_extern_fundatie_faza36.ts
//
// Faza 36 — Plan 02, Task 3.
// Test live pentru fundatia accesului extern la competitie (migratia
// supabase/migrations/20261106a_acces_extern_competitie_fundatie.sql):
//   - RPC get_competitie_publica / trimite_cerere_acces apelate ca ANON
//   - anon nu citeste cereri_acces_competitie / acces_competitie_extern
//   - helperii (este_doar_extern, acces_extern_competitie, competitie_deschisa_inscrieri,
//     vize_club_competitie) pentru un utilizator efemer cu grant
//
// GDPR: foloseste doar UUID-uri; nu afiseaza nume/prenume de sportivi.
// Cleanup obligatoriu in finally. Rulare: npx tsx tests/acces_extern_fundatie_faza36.ts

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey || !anonKey) {
  console.error('Lipsesc variabile de mediu: VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const CLUB_A = '83e7f771-46cf-4c4e-b70f-356d7b0bff06'; // Kim Long Dao Falticeni (din 25-AUDIT.md)
const CLUB_B = 'cbb0b228-b3e0-4735-9658-70999eb256c6'; // C.S. Phi Hau
const ROL = 'REPREZENTANT_COMPETITIE';
const PREFIX = 'ZZ_TEST_FAZA36_';
const EMAIL_PREFIX = 'zztest_faza36_';
const RUN_ID = Date.now();

const admin = createClient(supabaseUrl, serviceKey);
const anon = createClient(supabaseUrl, anonKey);

type Check = { name: string; passed: boolean; detail?: string };
const results: Check[] = [];
function record(name: string, passed: boolean, detail?: string) {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
}

async function main() {
  const competitiiIds: string[] = [];
  let userId: string | null = null;
  const emailExtern = `${EMAIL_PREFIX}${RUN_ID}@example.com`;
  const parola = `Zz!${RUN_ID}aA`;

  try {
    // ── Pregatire competitii efemere ────────────────────────────────────────
    const mk = async (suffix: string, status: string, deadline: string | null) => {
      const { data, error } = await admin.from('competitii').insert({
        denumire: `${PREFIX}${suffix}_${RUN_ID}`,
        tip: 'tehnica',
        data_inceput: '2027-06-01',
        data_sfarsit: '2027-06-02',
        locatie: 'Test',
        status,
        deadline_inscrieri: deadline,
        club_id: CLUB_A,
      }).select('id').single();
      if (error || !data) throw new Error(`insert competitie ${suffix}: ${error?.message}`);
      competitiiIds.push(data.id);
      return data.id as string;
    };
    const cDeschisa = await mk('DESCHISA', 'inscrieri_deschise', null);
    const cDraft = await mk('DRAFT', 'draft', null);
    const cExpirata = await mk('EXPIRATA', 'inscrieri_deschise', '2020-01-01');
    const cAlta = await mk('ALTA', 'inscrieri_deschise', null);

    for (const [i, nume] of ['Proba Unu', 'Proba Doi'].entries()) {
      const { error } = await admin.from('probe_competitie').insert({
        competitie_id: cDeschisa, tip_proba: 'thao_quyen_individual', denumire: nume, ordine_afisare: i + 1,
      });
      if (error) throw new Error(`insert proba: ${error.message}`);
    }

    // ── get_competitie_publica (anon) ──────────────────────────────────────
    const pub = await anon.rpc('get_competitie_publica', { p_id: cDeschisa });
    record('get_competitie_publica(deschisa) intoarce obiect cu denumire',
      !pub.error && !!pub.data && typeof pub.data.denumire === 'string' && pub.data.denumire.startsWith(PREFIX),
      pub.error?.message);
    record('get_competitie_publica(deschisa) are 2 probe in ordine',
      Array.isArray(pub.data?.probe) && pub.data.probe.length === 2 && pub.data.probe[0] === 'Proba Unu',
      JSON.stringify(pub.data?.probe));
    const pubDraft = await anon.rpc('get_competitie_publica', { p_id: cDraft });
    record('get_competitie_publica(draft) = NULL', !pubDraft.error && pubDraft.data === null, pubDraft.error?.message);
    const pubNone = await anon.rpc('get_competitie_publica', { p_id: '00000000-0000-0000-0000-000000000000' });
    record('get_competitie_publica(inexistenta) = NULL', !pubNone.error && pubNone.data === null, pubNone.error?.message);

    // ── trimite_cerere_acces (anon) ────────────────────────────────────────
    const emailCerere = `${EMAIL_PREFIX}cerere_${RUN_ID}@example.com`;
    const args = { p_competitie: cDeschisa, p_email: emailCerere, p_nume: 'Test Faza36', p_club: CLUB_A, p_mesaj: null };
    const r1 = await anon.rpc('trimite_cerere_acces', args);
    record('trimite_cerere_acces valid = ok', !r1.error && r1.data === 'ok', r1.error?.message ?? String(r1.data));
    const r2 = await anon.rpc('trimite_cerere_acces', args);
    record('trimite_cerere_acces repetat = deja_trimisa', !r2.error && r2.data === 'deja_trimisa', r2.error?.message ?? String(r2.data));
    const { count: nCereri } = await admin.from('cereri_acces_competitie')
      .select('id', { count: 'exact', head: true }).eq('email', emailCerere).eq('competitie_id', cDeschisa);
    record('un singur rand de cerere dupa 2 apeluri', nCereri === 1, `count=${nCereri}`);

    const bad = await anon.rpc('trimite_cerere_acces', { ...args, p_email: 'nu-e-email' });
    record('email invalid -> date_invalide', !!bad.error && /date_invalide/.test(bad.error.message), bad.error?.message);
    const badClub = await anon.rpc('trimite_cerere_acces', { ...args, p_email: `${EMAIL_PREFIX}x_${RUN_ID}@example.com`, p_club: 'ffffffff-ffff-4fff-bfff-fffffffffff1' });
    record('club inexistent -> club_invalid', !!badClub.error && /club_invalid/.test(badClub.error.message), badClub.error?.message);
    const badComp = await anon.rpc('trimite_cerere_acces', { ...args, p_email: `${EMAIL_PREFIX}y_${RUN_ID}@example.com`, p_competitie: cDraft });
    record('competitie draft -> competitie_indisponibila', !!badComp.error && /competitie_indisponibila/.test(badComp.error.message), badComp.error?.message);

    // ── anon nu citeste tabelele ───────────────────────────────────────────
    for (const t of ['cereri_acces_competitie', 'acces_competitie_extern']) {
      const r = await anon.from(t).select('id').limit(5);
      record(`anon SELECT ${t} = zero randuri / eroare`, !!r.error || (r.data?.length ?? 0) === 0, r.error?.message ?? `rows=${r.data?.length}`);
    }
    const ins = await anon.from('cereri_acces_competitie').insert({
      competitie_id: cDeschisa, email: `${EMAIL_PREFIX}direct_${RUN_ID}@example.com`, nume: 'Direct', club_id: CLUB_A,
    });
    record('anon INSERT direct pe cereri_acces_competitie respins', !!ins.error, ins.error?.message);

    // ── utilizator extern efemer + grant ───────────────────────────────────
    const { data: created, error: uErr } = await admin.auth.admin.createUser({ email: emailExtern, password: parola, email_confirm: true });
    if (uErr || !created.user) throw new Error(`createUser: ${uErr?.message}`);
    userId = created.user.id;

    const { error: rErr } = await admin.from('utilizator_roluri_multicont').insert({
      user_id: userId, rol_denumire: ROL, club_id: null, is_primary: true,
    });
    record('rand de rol REPREZENTANT_COMPETITIE cu club NULL acceptat', !rErr, rErr?.message);
    const { data: rolRow } = await admin.from('utilizator_roluri_multicont')
      .select('id, sportiv_id, rol_id').eq('user_id', userId).eq('rol_denumire', ROL).maybeSingle();
    record('rolul extern NU primeste sportiv_id automat (bypass trigger DEC-9)', !!rolRow && rolRow.sportiv_id === null, `sportiv_id=${rolRow?.sportiv_id}`);
    record('rol_id completat din roluri', !!rolRow && !!rolRow.rol_id);

    const { error: gErr } = await admin.from('acces_competitie_extern').insert({
      user_id: userId, competitie_id: cDeschisa, club_id: CLUB_A, email: emailExtern, activ: true,
    });
    record('grant (cDeschisa, CLUB_A) inserat', !gErr, gErr?.message);

    const ext = createClient(supabaseUrl!, anonKey!);
    const { error: sErr } = await ext.auth.signInWithPassword({ email: emailExtern, password: parola });
    record('login utilizator extern', !sErr, sErr?.message);

    const b = async (fn: string, a: Record<string, unknown> = {}) => {
      const r = await ext.rpc(fn, a);
      if (r.error) throw new Error(`${fn}: ${r.error.message}`);
      return r.data;
    };
    record('este_doar_extern() = true', (await b('este_doar_extern')) === true);
    record('acces_extern_competitie(cDeschisa, A) = true', (await b('acces_extern_competitie', { p_competitie: cDeschisa, p_club: CLUB_A })) === true);
    record('acces_extern_competitie(cDeschisa, B) = false', (await b('acces_extern_competitie', { p_competitie: cDeschisa, p_club: CLUB_B })) === false);
    record('acces_extern_competitie(cAlta, A) = false', (await b('acces_extern_competitie', { p_competitie: cAlta, p_club: CLUB_A })) === false);
    record('acces_extern_la_competitie(cDeschisa) = true / (cAlta) = false',
      (await b('acces_extern_la_competitie', { p_competitie: cDeschisa })) === true
      && (await b('acces_extern_la_competitie', { p_competitie: cAlta })) === false);
    record('acces_extern_la_club(A) = true / (B) = false',
      (await b('acces_extern_la_club', { p_club: CLUB_A })) === true && (await b('acces_extern_la_club', { p_club: CLUB_B })) === false);

    // sportiv din fiecare club (doar UUID)
    const { data: spA } = await admin.from('sportivi').select('id').eq('club_id', CLUB_A).limit(1).maybeSingle();
    const { data: spB } = await admin.from('sportivi').select('id').eq('club_id', CLUB_B).limit(1).maybeSingle();
    if (spA && spB) {
      record('acces_extern_la_sportiv(sportiv A) = true / (sportiv B) = false',
        (await b('acces_extern_la_sportiv', { p_sportiv: spA.id })) === true
        && (await b('acces_extern_la_sportiv', { p_sportiv: spB.id })) === false);
      record('sportiv_apartine_clubului corect',
        (await b('sportiv_apartine_clubului', { p_sportiv: spA.id, p_club: CLUB_A })) === true
        && (await b('sportiv_apartine_clubului', { p_sportiv: spA.id, p_club: CLUB_B })) === false);
    } else {
      record('sportivi de test disponibili in ambele cluburi', false, 'lipsesc sportivi');
    }

    const { data: cat } = await admin.from('categorii_competitie').insert({ competitie_id: cDeschisa, denumire: `${PREFIX}cat_${RUN_ID}`, varsta_min: 8, gen: 'Mixt' }).select('id').single();
    if (cat) {
      record('categorie_apartine_competitiei corect',
        (await b('categorie_apartine_competitiei', { p_categorie: cat.id, p_competitie: cDeschisa })) === true
        && (await b('categorie_apartine_competitiei', { p_categorie: cat.id, p_competitie: cAlta })) === false);
    } else {
      record('categorie efemera creata', false, 'insert categorie esuat (coloane obligatorii?)');
    }

    record('competitie_deschisa_inscrieri: deschisa=true, draft=false, expirata=false',
      (await b('competitie_deschisa_inscrieri', { p_competitie: cDeschisa })) === true
      && (await b('competitie_deschisa_inscrieri', { p_competitie: cDraft })) === false
      && (await b('competitie_deschisa_inscrieri', { p_competitie: cExpirata })) === false);

    const vizeA = await b('vize_club_competitie', { p_competitie: cDeschisa, p_club: CLUB_A });
    const vizeB = await b('vize_club_competitie', { p_competitie: cDeschisa, p_club: CLUB_B });
    record('vize_club_competitie: club fara grant = 0 randuri', Array.isArray(vizeB) && vizeB.length === 0, `rows=${vizeB?.length}`);
    record('vize_club_competitie: club cu grant raspunde fara eroare', Array.isArray(vizeA), `rows=${vizeA?.length}`);

    const own = await ext.from('acces_competitie_extern').select('id, user_id');
    record('extern vede doar propriile granturi', !own.error && (own.data?.length ?? 0) >= 1 && own.data!.every((r) => r.user_id === userId));
    const cereriExt = await ext.from('cereri_acces_competitie').select('id').limit(5);
    record('extern nu citeste cereri_acces_competitie', !!cereriExt.error || (cereriExt.data?.length ?? 0) === 0);
    const uid = await ext.rpc('user_id_dupa_email', { p_email: emailExtern });
    record('user_id_dupa_email respins pentru authenticated', !!uid.error, uid.error?.message);

    // dupa adaugarea unui rol intern, nu mai e "doar extern"
    const { error: adErr } = await admin.from('utilizator_roluri_multicont').insert({
      user_id: userId, rol_denumire: 'ADMIN_CLUB', club_id: CLUB_A, is_primary: false,
    });
    record('rol ADMIN_CLUB adaugat userului de test', !adErr, adErr?.message);
    record('este_doar_extern() = false dupa rol intern', (await b('este_doar_extern')) === false);
  } catch (e) {
    record('executie fara exceptii', false, e instanceof Error ? e.message : String(e));
  } finally {
    // ── Cleanup ─────────────────────────────────────────────────────────────
    await admin.from('cereri_acces_competitie').delete().like('email', `${EMAIL_PREFIX}%`);
    if (userId) {
      await admin.from('acces_competitie_extern').delete().eq('user_id', userId);
      await admin.from('utilizator_roluri_multicont').delete().eq('user_id', userId);
    }
    if (competitiiIds.length) await admin.from('competitii').delete().in('id', competitiiIds);
    if (userId) await admin.auth.admin.deleteUser(userId);

    const { count: r1 } = await admin.from('competitii').select('id', { count: 'exact', head: true }).like('denumire', `${PREFIX}%`);
    const { count: r2 } = await admin.from('cereri_acces_competitie').select('id', { count: 'exact', head: true }).like('email', `${EMAIL_PREFIX}%`);
    const { count: r3 } = userId
      ? await admin.from('utilizator_roluri_multicont').select('id', { count: 'exact', head: true }).eq('user_id', userId)
      : { count: 0 };
    const reziduuri = (r1 ?? 0) + (r2 ?? 0) + (r3 ?? 0);
    record('reziduuri de test in DB = 0', reziduuri === 0, `competitii=${r1} cereri=${r2} roluri=${r3}`);
  }

  const esuate = results.filter((r) => !r.passed);
  console.log(`\n${results.length - esuate.length}/${results.length} verificari trecute`);
  if (esuate.length) {
    console.error('ESUATE:\n' + esuate.map((r) => ` - ${r.name}${r.detail ? ` (${r.detail})` : ''}`).join('\n'));
    process.exit(1);
  }
}

main();
