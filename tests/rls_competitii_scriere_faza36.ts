// tests/rls_competitii_scriere_faza36.ts
//
// Faza 36 — Plan 04. Izolarea SCRIERII pe tabelele de competitie (D-13, D-15, D-16).
// Ruleaza INAINTE si DUPA migratia 20261106b_rls_competitii_scriere_club_scoped.sql.
//
// Siguranta date reale: foloseste EXCLUSIV sportivi cu viza FRQKD pe anul fiscal curent
// (triggerul trg_taxa_anuala_inscrieri_competitie devine no-op). GDPR: doar UUID-uri.
// Colecteaza TOATE rezultatele; cod de iesire 1 daca exista cel putin un FAIL.
//
// Rulare: npx tsx tests/rls_competitii_scriere_faza36.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) {
  console.error('Lipsesc VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Cluburi de referinta (25-AUDIT.md / tests/rls_izolare_cross_club_faza25.ts)
const CLUB_A = '83e7f771-46cf-4c4e-b70f-356d7b0bff06'; // Kim Long Dao Falticeni
const CLUB_B = 'cbb0b228-b3e0-4735-9658-70999eb256c6'; // C.S. Phi Hau

const PREFIX = 'ZZ_TEST_FAZA36_';
const EMAIL_PREFIX = 'zztest_faza36w_';
const RUN_ID = Date.now();
const admin = createClient(url, serviceKey);

type Check = { name: string; passed: boolean; detail?: string };
const results: Check[] = [];
const record = (name: string, passed: boolean, detail?: string) => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
};

// "respins" = eroare RLS SAU niciun rand afectat/intors
const respins = (r: { data: any; error: any }) => !!r.error || !r.data || (Array.isArray(r.data) && r.data.length === 0);
const reusit = (r: { data: any; error: any }) => !r.error && !!r.data && (!Array.isArray(r.data) || r.data.length > 0);
const det = (r: { data: any; error: any }) => r.error?.message ?? `rows=${Array.isArray(r.data) ? r.data.length : r.data ? 1 : 0}`;

async function clientFor(email: string, parola: string, contextId: string): Promise<SupabaseClient> {
  const c = createClient(url!, anonKey!, { global: { headers: { 'active-role-context-id': contextId } } });
  const { error } = await c.auth.signInWithPassword({ email, password: parola });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return c;
}

async function main() {
  const competitii: string[] = [];
  const userIds: string[] = [];
  const parola = `Zz!${RUN_ID}aA`;
  let sportivA = '';
  let sportivB = '';
  const startTs = new Date().toISOString();

  try {
    // ── sportivi cu viza FRQKD pe anul fiscal curent ────────────────────────
    const { data: anF } = await admin.rpc('an_fiscal_federatie', { p_data: new Date().toISOString().slice(0, 10) });
    const an = typeof anF === 'number' ? anF : new Date().getFullYear();
    const pick = async (club: string) => {
      const { data } = await admin.from('vize_sportivi').select('sportiv_id, sportivi!inner(club_id)')
        .eq('an', an).eq('tip', 'FRQKD').eq('sportivi.club_id', club).limit(1);
      return data?.[0]?.sportiv_id as string | undefined;
    };
    const a = await pick(CLUB_A);
    const b = await pick(CLUB_B);
    if (!a || !b) throw new Error(`OPRIT: nu exista sportiv cu viza FRQKD an=${an} in ambele cluburi (A=${a}, B=${b})`);
    sportivA = a;
    sportivB = b;

    // ── competitii + categorii efemere ──────────────────────────────────────
    const mkComp = async (suffix: string, status: string, deadline: string | null) => {
      const { data, error } = await admin.from('competitii').insert({
        denumire: `${PREFIX}${suffix}_${RUN_ID}`, tip: 'tehnica', data_inceput: '2027-06-01', data_sfarsit: '2027-06-02',
        locatie: 'Test', status, deadline_inscrieri: deadline,
      }).select('id').single();
      if (error || !data) throw new Error(`competitie ${suffix}: ${error?.message}`);
      competitii.push(data.id);
      return data.id as string;
    };
    const mkCat = async (comp: string, suffix: string) => {
      const { data, error } = await admin.from('categorii_competitie').insert({
        competitie_id: comp, denumire: `${PREFIX}${suffix}_${RUN_ID}`, varsta_min: 8, gen: 'Mixt',
      }).select('id').single();
      if (error || !data) throw new Error(`categorie ${suffix}: ${error?.message}`);
      return data.id as string;
    };
    const cD = await mkComp('DESCHISA', 'inscrieri_deschise', null);
    const cI = await mkComp('INCHISA', 'inscrieri_inchise', null);
    const cE = await mkComp('EXPIRATA', 'inscrieri_deschise', '2020-01-01');
    const cX = await mkComp('ALTA', 'inscrieri_deschise', null);
    const catD = await mkCat(cD, 'catD');
    const catD3 = await mkCat(cD, 'catD3');
    const catI = await mkCat(cI, 'catI');
    const catE = await mkCat(cE, 'catE');
    const catX = await mkCat(cX, 'catX'); // categorie din ALTA competitie

    // ── tinte ale clubului B (service role) ─────────────────────────────────
    const { data: inscrB, error: e1 } = await admin.from('inscrieri_competitie').insert({
      competitie_id: cD, categorie_id: catD, club_id: CLUB_B, sportiv_id: sportivB,
    }).select('id').single();
    if (e1 || !inscrB) throw new Error(`inscriere B: ${e1?.message}`);
    const { data: echB, error: e2 } = await admin.from('echipe_competitie').insert({
      competitie_id: cD, categorie_id: catD, club_id: CLUB_B, denumire_echipa: `${PREFIX}echipaB_${RUN_ID}`,
    }).select('id').single();
    if (e2 || !echB) throw new Error(`echipa B: ${e2?.message}`);

    // ── utilizatori + roluri efemere ────────────────────────────────────────
    const mkUser = async (tag: string, rol: string, club: string | null) => {
      const email = `${EMAIL_PREFIX}${tag}_${RUN_ID}@example.com`;
      const { data, error } = await admin.auth.admin.createUser({ email, password: parola, email_confirm: true });
      if (error || !data.user) throw new Error(`user ${tag}: ${error?.message}`);
      userIds.push(data.user.id);
      const { data: rol_row, error: re } = await admin.from('utilizator_roluri_multicont')
        .insert({ user_id: data.user.id, rol_denumire: rol, club_id: club, is_primary: true }).select('id').single();
      if (re || !rol_row) throw new Error(`rol ${tag}: ${re?.message}`);
      return clientFor(email, parola, rol_row.id);
    };
    const adm = await mkUser('adm', 'ADMIN_CLUB', CLUB_A);
    const ins = await mkUser('ins', 'INSTRUCTOR', CLUB_A);
    const sup = await mkUser('sup', 'SUPER_ADMIN_FEDERATIE', null);

    // ── ADMIN_CLUB@A ────────────────────────────────────────────────────────
    let r: any = await adm.from('inscrieri_competitie').insert({ competitie_id: cD, categorie_id: catD, club_id: CLUB_A, sportiv_id: sportivA }).select('id');
    record('ADMIN@A inscrie sportiv A in club A (competitie deschisa)', reusit(r), det(r));
    r = await adm.from('inscrieri_competitie').insert({ competitie_id: cD, categorie_id: catD3, club_id: CLUB_B, sportiv_id: sportivB }).select('id');
    record('ADMIN@A NU poate insera inscriere cu club_id=B', respins(r), det(r));
    r = await adm.from('inscrieri_competitie').insert({ competitie_id: cD, categorie_id: catD3, club_id: CLUB_A, sportiv_id: sportivB }).select('id');
    record('ADMIN@A NU poate insera inscriere club A cu sportiv din B', respins(r), det(r));
    r = await adm.from('inscrieri_competitie').update({ observatii: 'hack' }).eq('id', inscrB.id).select('id');
    record('ADMIN@A NU poate modifica inscrierea clubului B', respins(r), det(r));
    r = await adm.from('inscrieri_competitie').delete().eq('id', inscrB.id).select('id');
    record('ADMIN@A NU poate sterge inscrierea clubului B', respins(r), det(r));
    const { data: stillB } = await admin.from('inscrieri_competitie').select('id, observatii').eq('id', inscrB.id).maybeSingle();
    record('inscrierea clubului B ramane intacta', !!stillB && stillB.observatii !== 'hack', stillB ? 'exista' : 'STEARSA');

    r = await adm.from('echipe_competitie').insert({ competitie_id: cD, categorie_id: catD3, club_id: CLUB_B, denumire_echipa: `${PREFIX}hack_${RUN_ID}` }).select('id');
    record('ADMIN@A NU poate insera echipa cu club_id=B', respins(r), det(r));
    r = await adm.from('echipa_sportivi').insert({ echipa_id: echB.id, sportiv_id: sportivB }).select('id');
    record('ADMIN@A NU poate adauga membru in echipa clubului B', respins(r), det(r));

    r = await adm.from('inscrieri_competitie').insert({ competitie_id: cI, categorie_id: catI, club_id: CLUB_A, sportiv_id: sportivA }).select('id');
    record('ADMIN@A NU poate inscrie pe competitie cu status inscrieri_inchise', respins(r), det(r));
    r = await adm.from('inscrieri_competitie').insert({ competitie_id: cE, categorie_id: catE, club_id: CLUB_A, sportiv_id: sportivA }).select('id');
    record('ADMIN@A NU poate inscrie dupa deadline', respins(r), det(r));
    r = await adm.from('inscrieri_competitie').insert({ competitie_id: cD, categorie_id: catX, club_id: CLUB_A, sportiv_id: sportivA }).select('id');
    record('ADMIN@A NU poate inscrie cu categorie din ALTA competitie', respins(r), det(r));

    // citire larga (D-16)
    r = await adm.from('inscrieri_competitie').select('id').eq('id', inscrB.id);
    record('ADMIN@A inca CITESTE inscrierea clubului B (D-16)', reusit(r), det(r));
    for (const t of ['competitii', 'probe_competitie', 'categorii_competitie'] as const) {
      const rr: any = await adm.from(t).select('id').limit(1);
      record(`ADMIN@A citeste ${t} (neschimbat)`, reusit(rr), det(rr));
    }

    // competitii / probe / categorii: scriere doar federatie (DEC-5)
    r = await adm.from('competitii').update({ observatii: 'hack' }).eq('id', cD).select('id');
    record('ADMIN@A NU poate modifica competitii', respins(r), det(r));
    r = await adm.from('categorii_competitie').update({ denumire: 'hack' }).eq('id', catD).select('id');
    record('ADMIN@A NU poate modifica categorii_competitie', respins(r), det(r));
    r = await adm.from('categorii_competitie').delete().eq('id', catD3).select('id');
    record('ADMIN@A NU poate sterge categorii_competitie', respins(r), det(r));
    r = await adm.from('probe_competitie').insert({ competitie_id: cD, tip_proba: 'thao_quyen_individual', denumire: 'hack' }).select('id');
    record('ADMIN@A NU poate insera probe_competitie', respins(r), det(r));
    r = await adm.from('competitii').delete().eq('id', cX).select('id');
    record('ADMIN@A NU poate sterge competitii', respins(r), det(r));

    // ── INSTRUCTOR@A (D-13) ─────────────────────────────────────────────────
    r = await ins.from('inscrieri_competitie').insert({ competitie_id: cD, categorie_id: catD3, club_id: CLUB_A, sportiv_id: sportivA }).select('id');
    record('INSTRUCTOR@A inscrie sportiv din club A (D-13)', reusit(r), det(r));
    r = await ins.from('inscrieri_competitie').insert({ competitie_id: cD, categorie_id: catD3, club_id: CLUB_B, sportiv_id: sportivB }).select('id');
    record('INSTRUCTOR@A NU poate inscrie in club B', respins(r), det(r));

    // ── SUPER_ADMIN (fluxurile federatiei) ──────────────────────────────────
    r = await sup.from('inscrieri_competitie').update({ taxa_achitata: true }).eq('id', inscrB.id).select('id');
    record('SUPER_ADMIN modifica taxa_achitata pe randul clubului B (FinanciarView)', reusit(r), det(r));
    r = await sup.from('inscrieri_competitie').insert({ competitie_id: cI, categorie_id: catI, club_id: CLUB_A, sportiv_id: sportivA }).select('id');
    record('SUPER_ADMIN inscrie pe competitie inchisa (fara gate)', reusit(r), det(r));
    r = await sup.from('echipa_sportivi').insert({ echipa_id: echB.id, sportiv_id: sportivA }).select('id');
    record('SUPER_ADMIN adauga membru de alt club in echipa (flux inter-club)', reusit(r), det(r));
    r = await sup.from('competitii').update({ observatii: 'ok' }).eq('id', cX).select('id');
    record('SUPER_ADMIN modifica competitii', reusit(r), det(r));

    // ── Follow-up 261105-gax: inchiderea inscrierilor (UPDATE/DELETE) ───────
    // randuri efemere create cu service role pe competitii inchise / expirate
    const seed = async (comp: string, cat: string, club: string, sp: string) => {
      const { data, error } = await admin.from('inscrieri_competitie').insert({ competitie_id: comp, categorie_id: cat, club_id: club, sportiv_id: sp }).select('id').single();
      if (error || !data) throw new Error(`seed inscriere: ${error?.message}`);
      return data.id as string;
    };
    const exista = async (tbl: string, id: string) => !!(await admin.from(tbl).select('id').eq('id', id).maybeSingle()).data;
    const obs = async (id: string) => (await admin.from('inscrieri_competitie').select('observatii').eq('id', id).maybeSingle()).data?.observatii;

    // randul (cI, catI, A, sportivA) a fost inserat de SUPER_ADMIN la pasul anterior
    const gaseste = async (comp: string, cat: string, club: string, sp: string) =>
      (await admin.from('inscrieri_competitie').select('id').eq('competitie_id', comp).eq('categorie_id', cat).eq('club_id', club).eq('sportiv_id', sp).limit(1).single()).data!.id as string;
    const inchisaA = await gaseste(cI, catI, CLUB_A, sportivA);
    r = await adm.from('inscrieri_competitie').update({ observatii: 'dupa-inchidere' }).eq('id', inchisaA).select('id');
    record('F1 ADMIN@A NU modifica inscriere dupa INCHIDERE (status)', respins(r) && (await obs(inchisaA)) !== 'dupa-inchidere', det(r));
    r = await ins.from('inscrieri_competitie').delete().eq('id', inchisaA).select('id');
    record('F1 INSTRUCTOR@A NU sterge/retrage dupa INCHIDERE', respins(r) && (await exista('inscrieri_competitie', inchisaA)), det(r));
    r = await adm.from('inscrieri_competitie').delete().eq('id', inchisaA).select('id');
    record('F1 ADMIN@A NU sterge dupa INCHIDERE', respins(r) && (await exista('inscrieri_competitie', inchisaA)), det(r));

    const expirata = await seed(cE, catE, CLUB_A, sportivA);
    r = await adm.from('inscrieri_competitie').update({ observatii: 'dupa-termen' }).eq('id', expirata).select('id');
    record('F1 ADMIN@A NU modifica dupa TERMEN depasit', respins(r) && (await obs(expirata)) !== 'dupa-termen', det(r));
    r = await adm.from('inscrieri_competitie').delete().eq('id', expirata).select('id');
    record('F1 ADMIN@A NU sterge dupa TERMEN depasit', respins(r) && (await exista('inscrieri_competitie', expirata)), det(r));

    r = await sup.from('inscrieri_competitie').update({ observatii: 'federatie' }).eq('id', inchisaA).select('id');
    record('F1 SUPER_ADMIN modifica dupa inchidere', reusit(r) && (await obs(inchisaA)) === 'federatie', det(r));
    r = await sup.from('inscrieri_competitie').delete().eq('id', expirata).select('id');
    record('F1 SUPER_ADMIN sterge dupa termen', reusit(r) && !(await exista('inscrieri_competitie', expirata)), det(r));

    // echipe + membri pe competitie inchisa
    const { data: echI } = await admin.from('echipe_competitie').insert({ competitie_id: cI, categorie_id: catI, club_id: CLUB_A, denumire_echipa: `${PREFIX}echI_${RUN_ID}` }).select('id').single();
    const { data: memI } = await admin.from('echipa_sportivi').insert({ echipa_id: echI!.id, sportiv_id: sportivA }).select('id').single();
    r = await adm.from('echipe_competitie').update({ denumire_echipa: 'hack' }).eq('id', echI!.id).select('id');
    record('F1 ADMIN@A NU modifica echipa dupa INCHIDERE', respins(r), det(r));
    r = await adm.from('echipe_competitie').delete().eq('id', echI!.id).select('id');
    record('F1 ADMIN@A NU sterge echipa dupa INCHIDERE', respins(r) && (await exista('echipe_competitie', echI!.id)), det(r));
    r = await adm.from('echipa_sportivi').delete().eq('id', memI!.id).select('id');
    record('F1 ADMIN@A NU scoate membru din echipa dupa INCHIDERE', respins(r) && (await exista('echipa_sportivi', memI!.id)), det(r));
    r = await sup.from('echipa_sportivi').delete().eq('id', memI!.id).select('id');
    record('F1 SUPER_ADMIN scoate membru dupa inchidere', reusit(r), det(r));

    // competitie DESCHISA: clubul isi modifica / retrage liber
    const deschisaA = await seed(cD, catD3, CLUB_A, sportivB);  // legacy inter-club (sportiv din B pe club A), creat de federatie
    r = await adm.from('inscrieri_competitie').update({ observatii: 'ok-deschisa' }).eq('id', deschisaA).select('id');
    record('F2 ADMIN@A modifica in timp ce e DESCHISA (si pe rand legacy inter-club)', reusit(r) && (await obs(deschisaA)) === 'ok-deschisa', det(r));
    // randul propriu al clubului A (inserat de ADMIN@A la inceput): schimbarea sportiv_id spre alt club -> trigger
    const catD4 = await mkCat(cD, 'catD4'); // categorie fara sportivB, ca mutarea sa nu loveasca unicitatea
    const propriu = await seed(cD, catD4, CLUB_A, sportivA);
    r = await adm.from('inscrieri_competitie').update({ sportiv_id: sportivB }).eq('id', propriu).select('id');
    record('F2 ADMIN@A NU repune inscrierea pe sportiv din alt club', respins(r) && ((await admin.from('inscrieri_competitie').select('sportiv_id').eq('id', propriu).single()).data?.sportiv_id === sportivA), det(r));
    r = await sup.from('inscrieri_competitie').update({ sportiv_id: sportivB }).eq('id', propriu).select('id');
    record('F2 SUPER_ADMIN poate muta sportivul (flux inter-club)', reusit(r), det(r));
    r = await adm.from('inscrieri_competitie').delete().eq('id', deschisaA).select('id');
    record('F2 ADMIN@A retrage in timp ce e DESCHISA', reusit(r) && !(await exista('inscrieri_competitie', deschisaA)), det(r));
  } catch (e) {
    record('executie fara exceptii', false, e instanceof Error ? e.message : String(e));
  } finally {
    if (competitii.length) await admin.from('competitii').delete().in('id', competitii);
    for (const id of userIds) {
      await admin.from('utilizator_roluri_multicont').delete().eq('user_id', id);
      await admin.auth.admin.deleteUser(id);
    }
    const { count: rc } = await admin.from('competitii').select('id', { count: 'exact', head: true }).like('denumire', `${PREFIX}%`);
    let platiNoi = 0;
    let vizeNoi = 0;
    if (sportivA && sportivB) {
      const p = await admin.from('plati').select('id', { count: 'exact', head: true }).in('sportiv_id', [sportivA, sportivB]).gte('created_at', startTs);
      const v = await admin.from('vize_sportivi').select('id', { count: 'exact', head: true }).in('sportiv_id', [sportivA, sportivB]).gte('created_at', startTs);
      platiNoi = p.count ?? 0;
      vizeNoi = v.count ?? 0;
    }
    record('reziduuri: competitii test=0, plati noi=0, vize noi=0', (rc ?? 0) === 0 && platiNoi === 0 && vizeNoi === 0,
      `competitii=${rc} plati=${platiNoi} vize=${vizeNoi}`);
  }

  const fail = results.filter((x) => !x.passed);
  console.log(`\n${results.length - fail.length}/${results.length} verificari trecute`);
  if (fail.length) {
    console.error('ESUATE:\n' + fail.map((x) => ` - ${x.name}${x.detail ? ` (${x.detail})` : ''}`).join('\n'));
    process.exit(1);
  }
}

main();
