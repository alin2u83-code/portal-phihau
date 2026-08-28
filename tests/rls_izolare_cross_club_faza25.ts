// tests/rls_izolare_cross_club_faza25.ts
//
// Faza 25 — Plan 04, Task 2.
// Test automat de izolare cross-club pe date reale, la citire SI la scriere,
// dupa aplicarea migratiei `fix_rls_izolare_cross_club_grupe_prezenta_abonamente`
// (supabase/migrations/20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente.sql).
//
// Foloseste 2 cluburi reale (identificate in 25-AUDIT.md, sectiunea "Cluburi de
// referinta pentru testul de izolare"):
//   CLUB_A = Kim Long Dao Falticeni — contextul activ al clientului testat
//   CLUB_B = C.S. Phi Hau           — clubul "strain", randuri canar aici
//
// Pregatire (client admin, SERVICE_ROLE_KEY, bypass RLS):
//   - creeaza un utilizator efemer + un rand ADMIN_CLUB @ CLUB_A in
//     utilizator_roluri_multicont (id-ul acelui rand = header active-role-context-id)
//   - creeaza randuri canar `ZZ_TEST_FAZA25_` apartinand CLUB_B in: grupe,
//     perioade_vacanta, tipuri_abonament, program_antrenamente
//
// Test (client anon + header active-role-context-id, autentificat ca userul de test):
//   - SELECT pe grupe/evenimente/perioade_vacanta/participare_vacanta/
//     tipuri_abonament/program_antrenamente: zero randuri din CLUB_B, zero canar
//   - INSERT cross-club respins pe perioade_vacanta si tipuri_abonament
//   - INSERT in propriul club (tipuri_abonament) acceptat
//   - cale SPORTIV pe tipuri_abonament: client separat cu context SPORTIV
//     (fara ADMIN_CLUB in context), verifica ca vede propriul club, fara regresie
//
// Cleanup obligatoriu in finally: sterge toate randurile canar, rolurile de test
// si utilizatorul efemer, indiferent daca testul pica sau trece.
//
// Rulare: npx tsx tests/rls_izolare_cross_club_faza25.ts

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Lipsesc variabile de mediu: VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Cluburile de referinta din 25-AUDIT.md, sectiunea "Cluburi de referinta pentru
// testul de izolare" — NU se hardcodeaza alte UUID-uri de club in acest fisier.
const CLUB_A = '83e7f771-46cf-4c4e-b70f-356d7b0bff06'; // Kim Long Dao Falticeni — context activ testat
const CLUB_B = 'cbb0b228-b3e0-4735-9658-70999eb256c6'; // C.S. Phi Hau — clubul "strain", randuri canar aici

const CANARY_PREFIX = 'ZZ_TEST_FAZA25_';
const RUN_ID = Date.now();

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

type Check = { name: string; passed: boolean; detail?: string };
const results: Check[] = [];

function record(name: string, passed: boolean, detail?: string) {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`);
  if (!passed) {
    throw new Error(`Assert esuat: ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main() {
  // ── Cleanup tracking ─────────────────────────────────────────────────────
  let testUserId: string | null = null;
  let contextAdminId: string | null = null;
  let contextSportivId: string | null = null;
  let canaryGrupaId: string | null = null;
  let canaryPerioadaId: string | null = null;
  let canaryTipAbonamentClubBId: string | null = null;
  let canaryTipAbonamentClubAId: string | null = null;
  let canaryProgramAntrenamentId: string | null = null;
  let ownClubTipAbonamentId: string | null = null;

  try {
    // ── PREGATIRE ────────────────────────────────────────────────────────
    const testEmail = `zztest_faza25_${RUN_ID}@example.com`;
    const testPassword = `TestFaza25_${RUN_ID}!Aa`;

    console.log(`\nCreare utilizator de test: ${testEmail}`);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    if (authError) throw authError;
    testUserId = authData.user.id;

    // Rol ADMIN_CLUB @ CLUB_A pentru clientul testat.
    const { data: roleRow, error: roleError } = await supabaseAdmin
      .from('utilizator_roluri_multicont')
      .insert({
        user_id: testUserId,
        club_id: CLUB_A,
        rol_denumire: 'ADMIN_CLUB',
        is_primary: true,
      })
      .select('id')
      .single();
    if (roleError) throw roleError;
    contextAdminId = roleRow.id;
    console.log(`Context ADMIN_CLUB @ CLUB_A creat: id=${contextAdminId}`);

    // Randuri canar in CLUB_B.
    const { data: grupaRow, error: grupaError } = await supabaseAdmin
      .from('grupe')
      .insert({ denumire: `${CANARY_PREFIX}Grupa_${RUN_ID}`, sala: CANARY_PREFIX, club_id: CLUB_B })
      .select('id')
      .single();
    if (grupaError) throw grupaError;
    canaryGrupaId = grupaRow.id;

    const { data: perioadaRow, error: perioadaError } = await supabaseAdmin
      .from('perioade_vacanta')
      .insert({
        denumire: `${CANARY_PREFIX}Perioada_${RUN_ID}`,
        data_start: '2026-01-01',
        data_end: '2026-01-02',
        club_id: CLUB_B,
      })
      .select('id')
      .single();
    if (perioadaError) throw perioadaError;
    canaryPerioadaId = perioadaRow.id;

    const { data: tipAbonamentRow, error: tipAbonamentError } = await supabaseAdmin
      .from('tipuri_abonament')
      .insert({ denumire: `${CANARY_PREFIX}Abonament_${RUN_ID}`, pret: 1, numar_membri: 1, club_id: CLUB_B })
      .select('id')
      .single();
    if (tipAbonamentError) throw tipAbonamentError;
    canaryTipAbonamentClubBId = tipAbonamentRow.id;

    // Canar suplimentar in CLUB_A (contextul PROPRIU al clientului testat).
    // Necesar pentru verificarea caii SPORTIV mai jos: 25-AUDIT.md confirma ca
    // toate cele 5 randuri reale de tipuri_abonament apartin azi CLUB_B (C.S. Phi
    // Hau) — CLUB_A (Kim Long Dao Falticeni) are ZERO randuri reale in aceasta
    // tabela. Fara acest canar, testul SPORTIV ar da fals-pozitiv "0 randuri
    // vazute" din lipsa de date, nu din blocarea RLS.
    const { data: tipAbonamentOwnRow, error: tipAbonamentOwnError } = await supabaseAdmin
      .from('tipuri_abonament')
      .insert({ denumire: `${CANARY_PREFIX}AbonamentPropriu_${RUN_ID}`, pret: 1, numar_membri: 1, club_id: CLUB_A })
      .select('id')
      .single();
    if (tipAbonamentOwnError) throw tipAbonamentOwnError;
    canaryTipAbonamentClubAId = tipAbonamentOwnRow.id;

    const { data: programRow, error: programError } = await supabaseAdmin
      .from('program_antrenamente')
      .insert({
        data: '2026-01-01',
        ora_start: '10:00',
        ora_sfarsit: '11:00',
        grupa_id: canaryGrupaId,
        club_id: CLUB_B,
        tip_antrenament: 'regular',
        is_recurent: false,
      })
      .select('id')
      .single();
    if (programError) throw programError;
    canaryProgramAntrenamentId = programRow.id;

    console.log('Randuri canar create in CLUB_B:', {
      grupa: canaryGrupaId,
      perioada: canaryPerioadaId,
      tipAbonament: canaryTipAbonamentClubBId,
      programAntrenament: canaryProgramAntrenamentId,
    });
    console.log('Randuri canar create in CLUB_A (propriul club, pt. calea SPORTIV):', {
      tipAbonament: canaryTipAbonamentClubAId,
    });

    // Map perioade_vacanta -> club_id (bypass RLS), folosit pt verificarea
    // participare_vacanta mai jos (tabela nu are club_id direct).
    const { data: toatePerioadele, error: perioadeMapError } = await supabaseAdmin
      .from('perioade_vacanta')
      .select('id, club_id');
    if (perioadeMapError) throw perioadeMapError;
    const perioadaClubMap = new Map<string, string | null>(
      (toatePerioadele || []).map((p: any) => [p.id, p.club_id])
    );

    // ── CLIENT DE TEST: context ADMIN_CLUB @ CLUB_A ─────────────────────────
    const clientAdminA = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { 'active-role-context-id': contextAdminId! } },
    });
    const { error: signInError } = await clientAdminA.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (signInError) throw signInError;
    console.log('\nAutentificat ca utilizator de test, context activ = ADMIN_CLUB @ CLUB_A.');

    // ── SELECT: zero randuri din CLUB_B, zero canar ─────────────────────────
    console.log('\n--- SELECT: izolare la citire ---');

    const { data: grupeVazute, error: eGrupe } = await clientAdminA.from('grupe').select('id, denumire, club_id');
    if (eGrupe) throw eGrupe;
    record(
      'grupe: zero randuri CLUB_B',
      (grupeVazute || []).every((r: any) => r.club_id !== CLUB_B),
      `total vazute=${grupeVazute?.length ?? 0}`
    );
    record(
      'grupe: zero canar',
      (grupeVazute || []).every((r: any) => !String(r.denumire).startsWith(CANARY_PREFIX))
    );

    const { data: evenimenteVazute, error: eEve } = await clientAdminA.from('evenimente').select('id, denumire, club_id');
    if (eEve) throw eEve;
    record(
      'evenimente: zero randuri CLUB_B',
      (evenimenteVazute || []).every((r: any) => r.club_id !== CLUB_B),
      `total vazute=${evenimenteVazute?.length ?? 0}`
    );

    const { data: perioadeVazute, error: ePer } = await clientAdminA.from('perioade_vacanta').select('id, denumire, club_id');
    if (ePer) throw ePer;
    record(
      'perioade_vacanta: zero randuri CLUB_B',
      (perioadeVazute || []).every((r: any) => r.club_id !== CLUB_B),
      `total vazute=${perioadeVazute?.length ?? 0}`
    );
    record(
      'perioade_vacanta: zero canar',
      (perioadeVazute || []).every((r: any) => !String(r.denumire).startsWith(CANARY_PREFIX))
    );

    const { data: participariVazute, error: ePart } = await clientAdminA
      .from('participare_vacanta')
      .select('id, perioada_id');
    if (ePart) throw ePart;
    record(
      'participare_vacanta: zero randuri legate de CLUB_B',
      (participariVazute || []).every((r: any) => perioadaClubMap.get(r.perioada_id) !== CLUB_B),
      `total vazute=${participariVazute?.length ?? 0}`
    );

    const { data: tipuriVazute, error: eTip } = await clientAdminA.from('tipuri_abonament').select('id, denumire, club_id');
    if (eTip) throw eTip;
    record(
      'tipuri_abonament: zero randuri CLUB_B',
      (tipuriVazute || []).every((r: any) => r.club_id !== CLUB_B),
      `total vazute=${tipuriVazute?.length ?? 0}`
    );
    record(
      'tipuri_abonament: canarul din CLUB_B invizibil',
      (tipuriVazute || []).every((r: any) => r.id !== canaryTipAbonamentClubBId)
    );
    record(
      'tipuri_abonament: canarul din propriul club (CLUB_A) vizibil (fara regresie)',
      (tipuriVazute || []).some((r: any) => r.id === canaryTipAbonamentClubAId)
    );

    const { data: programVazut, error: eProg } = await clientAdminA
      .from('program_antrenamente')
      .select('id, club_id, tip_antrenament');
    if (eProg) throw eProg;
    record(
      'program_antrenamente: zero randuri CLUB_B',
      (programVazut || []).every((r: any) => r.club_id !== CLUB_B),
      `total vazute=${programVazut?.length ?? 0}`
    );
    record(
      'program_antrenamente: zero canar (id explicit)',
      (programVazut || []).every((r: any) => r.id !== canaryProgramAntrenamentId)
    );

    // ── INSERT cross-club: trebuie respins ───────────────────────────────────
    console.log('\n--- INSERT cross-club: trebuie respins ---');

    const { error: insertPerioadaCrossClub } = await clientAdminA
      .from('perioade_vacanta')
      .insert({
        denumire: `${CANARY_PREFIX}InsertRespins_${RUN_ID}`,
        data_start: '2026-02-01',
        data_end: '2026-02-02',
        club_id: CLUB_B,
      });
    record('perioade_vacanta: INSERT cu club_id strain respins', !!insertPerioadaCrossClub, insertPerioadaCrossClub?.message);

    const { error: insertTipCrossClub } = await clientAdminA
      .from('tipuri_abonament')
      .insert({ denumire: `${CANARY_PREFIX}InsertRespins_${RUN_ID}`, pret: 1, numar_membri: 1, club_id: CLUB_B });
    record('tipuri_abonament: INSERT cu club_id strain respins', !!insertTipCrossClub, insertTipCrossClub?.message);

    // ── INSERT in propriul club: trebuie acceptat ────────────────────────────
    console.log('\n--- INSERT in propriul club: trebuie acceptat ---');

    const { data: ownInsert, error: insertTipOwnClub } = await clientAdminA
      .from('tipuri_abonament')
      .insert({ denumire: `${CANARY_PREFIX}InsertAcceptat_${RUN_ID}`, pret: 1, numar_membri: 1, club_id: CLUB_A })
      .select('id')
      .single();
    record('tipuri_abonament: INSERT in propriul club acceptat', !insertTipOwnClub && !!ownInsert, insertTipOwnClub?.message);
    if (ownInsert) {
      ownClubTipAbonamentId = ownInsert.id;
      // Sterge imediat prin acelasi client (dovedeste ca DELETE in propriul club functioneaza).
      const { error: deleteOwn } = await clientAdminA.from('tipuri_abonament').delete().eq('id', ownInsert.id);
      record('tipuri_abonament: DELETE propriu client reuseste', !deleteOwn, deleteOwn?.message);
      if (!deleteOwn) ownClubTipAbonamentId = null;
    }

    // ── Cale SPORTIV pe tipuri_abonament: fara regresie ──────────────────────
    console.log('\n--- Cale SPORTIV pe tipuri_abonament: fara regresie ---');

    const { data: sportivClubA, error: sportivLookupError } = await supabaseAdmin
      .from('sportivi')
      .select('id, club_id')
      .eq('club_id', CLUB_A)
      .limit(1)
      .maybeSingle();
    if (sportivLookupError) throw sportivLookupError;

    if (!sportivClubA) {
      console.log('AVERTISMENT: niciun sportiv existent gasit in CLUB_A — se sare peste verificarea caii SPORTIV.');
    } else {
      const { data: sportivRoleRow, error: sportivRoleError } = await supabaseAdmin
        .from('utilizator_roluri_multicont')
        .insert({
          user_id: testUserId,
          club_id: CLUB_A,
          sportiv_id: sportivClubA.id,
          rol_denumire: 'SPORTIV',
          is_primary: false,
        })
        .select('id')
        .single();
      if (sportivRoleError) throw sportivRoleError;
      contextSportivId = sportivRoleRow.id;

      // Client separat, cu contextul activ pe randul SPORTIV (nu ADMIN_CLUB) —
      // has_access_to_club()/este_staff_club() returneaza FALSE pentru acest
      // context, deci orice rand vazut trece STRICT prin get_own_sportiv_id().
      const clientSportivA = createClient(supabaseUrl!, supabaseAnonKey!, {
        global: { headers: { 'active-role-context-id': contextSportivId } },
      });
      const { error: signInSportivError } = await clientSportivA.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
      if (signInSportivError) throw signInSportivError;

      const { data: tipuriVazuteSportiv, error: eTipSportiv } = await clientSportivA
        .from('tipuri_abonament')
        .select('id, denumire, club_id');
      if (eTipSportiv) throw eTipSportiv;

      record(
        'tipuri_abonament (SPORTIV): vede cel putin propriul club',
        (tipuriVazuteSportiv || []).length > 0 &&
          (tipuriVazuteSportiv || []).every((r: any) => r.club_id === CLUB_A),
        `total vazute=${tipuriVazuteSportiv?.length ?? 0}`
      );
    }

    console.log('\n=== REZUMAT ===');
    console.table(results.map((r) => ({ Verificare: r.name, Rezultat: r.passed ? 'PASS' : 'FAIL' })));
    console.log(`\nToate cele ${results.length} verificari au trecut. Exit 0.`);
    process.exitCode = 0;
  } catch (err: any) {
    console.error('\nTEST ESUAT:', err?.message || err);
    console.log('\n=== REZUMAT PARTIAL ===');
    console.table(results.map((r) => ({ Verificare: r.name, Rezultat: r.passed ? 'PASS' : 'FAIL' })));
    process.exitCode = 1;
  } finally {
    console.log('\n--- Cleanup ---');

    if (canaryProgramAntrenamentId) {
      const { error } = await supabaseAdmin.from('program_antrenamente').delete().eq('id', canaryProgramAntrenamentId);
      console.log(`program_antrenamente canar sters: ${!error}`);
    }
    if (ownClubTipAbonamentId) {
      const { error } = await supabaseAdmin.from('tipuri_abonament').delete().eq('id', ownClubTipAbonamentId);
      console.log(`tipuri_abonament (own-club, fallback) sters: ${!error}`);
    }
    if (canaryTipAbonamentClubBId) {
      const { error } = await supabaseAdmin.from('tipuri_abonament').delete().eq('id', canaryTipAbonamentClubBId);
      console.log(`tipuri_abonament canar (CLUB_B) sters: ${!error}`);
    }
    if (canaryTipAbonamentClubAId) {
      const { error } = await supabaseAdmin.from('tipuri_abonament').delete().eq('id', canaryTipAbonamentClubAId);
      console.log(`tipuri_abonament canar (CLUB_A) sters: ${!error}`);
    }
    if (canaryPerioadaId) {
      const { error } = await supabaseAdmin.from('perioade_vacanta').delete().eq('id', canaryPerioadaId);
      console.log(`perioade_vacanta canar sters: ${!error}`);
    }
    // Sterge orice INSERT respins/incercat care ar fi putut, contrar asteptarilor,
    // sa lase reziduu (fallback defensiv prin prefix, doar pe CLUB_A/CLUB_B).
    await supabaseAdmin.from('perioade_vacanta').delete().like('denumire', `${CANARY_PREFIX}%`);
    await supabaseAdmin.from('tipuri_abonament').delete().like('denumire', `${CANARY_PREFIX}%`);
    if (canaryGrupaId) {
      const { error } = await supabaseAdmin.from('grupe').delete().eq('id', canaryGrupaId);
      console.log(`grupe canar sters: ${!error}`);
    }
    await supabaseAdmin.from('grupe').delete().like('denumire', `${CANARY_PREFIX}%`);

    if (contextSportivId) {
      const { error } = await supabaseAdmin.from('utilizator_roluri_multicont').delete().eq('id', contextSportivId);
      console.log(`context SPORTIV sters: ${!error}`);
    }
    if (contextAdminId) {
      const { error } = await supabaseAdmin.from('utilizator_roluri_multicont').delete().eq('id', contextAdminId);
      console.log(`context ADMIN_CLUB sters: ${!error}`);
    }
    if (testUserId) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(testUserId);
      console.log(`utilizator de test sters: ${!error}`);
    }
    console.log('Cleanup complet.');
  }
}

main();
