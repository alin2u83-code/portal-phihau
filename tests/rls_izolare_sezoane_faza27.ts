// tests/rls_izolare_sezoane_faza27.ts
//
// Faza 27 — Plan 01, Task 2.
// Test automat de izolare cross-club + gate de rol pe tabelul nou public.sezoane,
// dupa aplicarea migratiei add_sezoane_grupe_tipuri_abonament
// (supabase/migrations/20260902_add_sezoane_grupe_tipuri_abonament.sql).
//
// Foloseste aceleasi 2 cluburi de referinta ca in Faza 25/26:
//   CLUB_A = Kim Long Dao Falticeni — contextul activ al clientului testat
//   CLUB_B = C.S. Phi Hau           — clubul "strain", randul canar aici
//
// Verificari:
//   1. Pregatire: user efemer + rand ADMIN_CLUB @ CLUB_A si rand INSTRUCTOR @ CLUB_A
//      in utilizator_roluri_multicont; sezon canar in CLUB_B si unul in CLUB_A.
//   2. SELECT ca ADMIN_CLUB@CLUB_A: zero randuri CLUB_B; sezonul propriu vizibil.
//   3. INSERT ca ADMIN_CLUB@CLUB_A cu club_id=CLUB_B: respins.
//   4. INSERT ca ADMIN_CLUB@CLUB_A in propriul club: acceptat; DELETE propriu: acceptat.
//   5. INSERT ca INSTRUCTOR@CLUB_A in propriul club: RESPINS (D-02).
//   6. Enforcement D-03: al doilea INSERT activ=true in acelasi club esueaza cu 23505;
//      dupa dezactivarea primului, al doilea reuseste.
//
// Cleanup obligatoriu in finally: sterge toate randurile canar `ZZ_TEST_FAZA27_`,
// rolurile de test si userul efemer, indiferent daca testul pica sau trece.
//
// Rulare: npx tsx tests/rls_izolare_sezoane_faza27.ts

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Lipsesc variabile de mediu: VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Cluburile de referinta folosite in Faza 25/26 — NU se hardcodeaza alte UUID-uri.
const CLUB_A = '83e7f771-46cf-4c4e-b70f-356d7b0bff06'; // Kim Long Dao Falticeni — context activ testat
const CLUB_B = 'cbb0b228-b3e0-4735-9658-70999eb256c6'; // C.S. Phi Hau — clubul "strain"

const CANARY_PREFIX = 'ZZ_TEST_FAZA27_';
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
  let testUserId: string | null = null;
  let contextAdminId: string | null = null;
  let contextInstructorId: string | null = null;
  let canarySezonClubBId: string | null = null;
  let canarySezonClubAId: string | null = null;
  let ownClubInsertedId: string | null = null;
  let d03SezonId: string | null = null;

  try {
    // ── PREGATIRE ────────────────────────────────────────────────────────
    const testEmail = `zztest_faza27_${RUN_ID}@example.com`;
    const testPassword = `TestFaza27_${RUN_ID}!Aa`;

    console.log(`\nCreare utilizator de test: ${testEmail}`);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    if (authError) throw authError;
    testUserId = authData.user.id;

    const { data: adminRoleRow, error: adminRoleError } = await supabaseAdmin
      .from('utilizator_roluri_multicont')
      .insert({ user_id: testUserId, club_id: CLUB_A, rol_denumire: 'ADMIN_CLUB', is_primary: true })
      .select('id')
      .single();
    if (adminRoleError) throw adminRoleError;
    contextAdminId = adminRoleRow.id;
    console.log(`Context ADMIN_CLUB @ CLUB_A creat: id=${contextAdminId}`);

    const { data: instructorRoleRow, error: instructorRoleError } = await supabaseAdmin
      .from('utilizator_roluri_multicont')
      .insert({ user_id: testUserId, club_id: CLUB_A, rol_denumire: 'INSTRUCTOR', is_primary: false })
      .select('id')
      .single();
    if (instructorRoleError) throw instructorRoleError;
    contextInstructorId = instructorRoleRow.id;
    console.log(`Context INSTRUCTOR @ CLUB_A creat: id=${contextInstructorId}`);

    const { data: sezonBRow, error: sezonBError } = await supabaseAdmin
      .from('sezoane')
      .insert({
        denumire: `${CANARY_PREFIX}Sezon_${RUN_ID}`,
        data_start: '2026-01-01',
        data_final: '2026-06-30',
        activ: false,
        club_id: CLUB_B,
      })
      .select('id')
      .single();
    if (sezonBError) throw sezonBError;
    canarySezonClubBId = sezonBRow.id;

    const { data: sezonARow, error: sezonAError } = await supabaseAdmin
      .from('sezoane')
      .insert({
        denumire: `${CANARY_PREFIX}SezonPropriu_${RUN_ID}`,
        data_start: '2026-01-01',
        data_final: '2026-06-30',
        activ: false,
        club_id: CLUB_A,
      })
      .select('id')
      .single();
    if (sezonAError) throw sezonAError;
    canarySezonClubAId = sezonARow.id;

    console.log('Sezoane canar create:', { CLUB_B: canarySezonClubBId, CLUB_A: canarySezonClubAId });

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

    // ── 2. SELECT: izolare la citire ─────────────────────────────────────
    console.log('\n--- 2. SELECT: izolare la citire ---');
    const { data: sezoaneVazute, error: eSezoane } = await clientAdminA.from('sezoane').select('id, denumire, club_id');
    if (eSezoane) throw eSezoane;
    record(
      'sezoane: zero randuri CLUB_B',
      (sezoaneVazute || []).every((r: any) => r.club_id !== CLUB_B),
      `total vazute=${sezoaneVazute?.length ?? 0}`
    );
    record(
      'sezoane: canarul propriu (CLUB_A) vizibil (fara regresie)',
      (sezoaneVazute || []).some((r: any) => r.id === canarySezonClubAId)
    );

    // ── 3. INSERT cross-club: trebuie respins ────────────────────────────
    console.log('\n--- 3. INSERT cross-club: trebuie respins ---');
    const { error: insertCrossClub } = await clientAdminA.from('sezoane').insert({
      denumire: `${CANARY_PREFIX}InsertRespins_${RUN_ID}`,
      data_start: '2026-02-01',
      data_final: '2026-02-28',
      activ: false,
      club_id: CLUB_B,
    });
    record('sezoane: INSERT cu club_id strain respins', !!insertCrossClub, insertCrossClub?.message);

    // ── 4. INSERT/DELETE in propriul club: trebuie acceptat ──────────────
    console.log('\n--- 4. INSERT/DELETE in propriul club: trebuie acceptat ---');
    const { data: ownInsert, error: insertOwnClub } = await clientAdminA
      .from('sezoane')
      .insert({
        denumire: `${CANARY_PREFIX}InsertAcceptat_${RUN_ID}`,
        data_start: '2026-03-01',
        data_final: '2026-03-31',
        activ: false,
        club_id: CLUB_A,
      })
      .select('id')
      .single();
    record('sezoane: INSERT in propriul club acceptat', !insertOwnClub && !!ownInsert, insertOwnClub?.message);
    if (ownInsert) {
      ownClubInsertedId = ownInsert.id;
      const { error: deleteOwn } = await clientAdminA.from('sezoane').delete().eq('id', ownInsert.id);
      record('sezoane: DELETE propriu client reuseste', !deleteOwn, deleteOwn?.message);
      if (!deleteOwn) ownClubInsertedId = null;
    }

    // ── 5. INSERT ca INSTRUCTOR@CLUB_A: RESPINS (D-02) ───────────────────
    console.log('\n--- 5. INSERT ca INSTRUCTOR@CLUB_A: trebuie respins (D-02) ---');
    const clientInstructorA = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { 'active-role-context-id': contextInstructorId! } },
    });
    const { error: signInInstructorError } = await clientInstructorA.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (signInInstructorError) throw signInInstructorError;

    const { error: insertAsInstructor } = await clientInstructorA.from('sezoane').insert({
      denumire: `${CANARY_PREFIX}InstructorRespins_${RUN_ID}`,
      data_start: '2026-04-01',
      data_final: '2026-04-30',
      activ: false,
      club_id: CLUB_A,
    });
    record('sezoane: INSERT ca INSTRUCTOR respins (gate de rol D-02)', !!insertAsInstructor, insertAsInstructor?.message);

    // ── 6. Enforcement D-03: un singur sezon activ per club ──────────────
    console.log('\n--- 6. Enforcement D-03: un singur sezon activ per club ---');
    const { data: primulActiv, error: primulActivError } = await supabaseAdmin
      .from('sezoane')
      .insert({
        denumire: `${CANARY_PREFIX}D03_Primul_${RUN_ID}`,
        data_start: '2026-05-01',
        data_final: '2026-05-31',
        activ: true,
        club_id: CLUB_A,
      })
      .select('id')
      .single();
    if (primulActivError) throw primulActivError;
    d03SezonId = primulActiv.id;

    const { error: alDoileaActivError } = await supabaseAdmin.from('sezoane').insert({
      denumire: `${CANARY_PREFIX}D03_AlDoilea_${RUN_ID}`,
      data_start: '2026-06-01',
      data_final: '2026-06-30',
      activ: true,
      club_id: CLUB_A,
    });
    record(
      'sezoane: al doilea sezon activ in acelasi club respins cu 23505',
      !!alDoileaActivError && (alDoileaActivError as any).code === '23505',
      `code=${(alDoileaActivError as any)?.code} msg=${alDoileaActivError?.message}`
    );

    const { error: dezactivareError } = await supabaseAdmin
      .from('sezoane')
      .update({ activ: false })
      .eq('id', d03SezonId);
    if (dezactivareError) throw dezactivareError;

    const { data: alDoileaDupaDezactivare, error: alDoileaOkError } = await supabaseAdmin
      .from('sezoane')
      .insert({
        denumire: `${CANARY_PREFIX}D03_AlDoileaOK_${RUN_ID}`,
        data_start: '2026-06-01',
        data_final: '2026-06-30',
        activ: true,
        club_id: CLUB_A,
      })
      .select('id')
      .single();
    record(
      'sezoane: dupa dezactivarea primului, al doilea INSERT activ reuseste',
      !alDoileaOkError && !!alDoileaDupaDezactivare,
      alDoileaOkError?.message
    );
    if (alDoileaDupaDezactivare) {
      await supabaseAdmin.from('sezoane').delete().eq('id', alDoileaDupaDezactivare.id);
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

    if (d03SezonId) {
      const { error } = await supabaseAdmin.from('sezoane').delete().eq('id', d03SezonId);
      console.log(`sezon D-03 (primul) sters: ${!error}`);
    }
    if (ownClubInsertedId) {
      const { error } = await supabaseAdmin.from('sezoane').delete().eq('id', ownClubInsertedId);
      console.log(`sezon own-club (fallback) sters: ${!error}`);
    }
    if (canarySezonClubBId) {
      const { error } = await supabaseAdmin.from('sezoane').delete().eq('id', canarySezonClubBId);
      console.log(`sezon canar (CLUB_B) sters: ${!error}`);
    }
    if (canarySezonClubAId) {
      const { error } = await supabaseAdmin.from('sezoane').delete().eq('id', canarySezonClubAId);
      console.log(`sezon canar (CLUB_A) sters: ${!error}`);
    }
    // Fallback defensiv prin prefix, pentru orice rand ramas orfan.
    await supabaseAdmin.from('sezoane').delete().like('denumire', `${CANARY_PREFIX}%`);

    if (contextInstructorId) {
      const { error } = await supabaseAdmin.from('utilizator_roluri_multicont').delete().eq('id', contextInstructorId);
      console.log(`rol INSTRUCTOR test sters: ${!error}`);
    }
    if (contextAdminId) {
      const { error } = await supabaseAdmin.from('utilizator_roluri_multicont').delete().eq('id', contextAdminId);
      console.log(`rol ADMIN_CLUB test sters: ${!error}`);
    }
    if (testUserId) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(testUserId);
      console.log(`utilizator de test sters: ${!error}`);
    }
  }
}

main();
