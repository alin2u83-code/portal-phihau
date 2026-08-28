---
phase: 25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha
plan: 04
subsystem: security-rls
tags: [rls, postgres, supabase, multi-club, grupe, prezenta, abonamente, playwright, service-role-trigger-bug]

# Dependency graph
requires:
  - phase: 25 (25-01)
    provides: migratie RLS scrisa si revizuita pentru grupe/orar_exceptii/program_antrenamente/tipuri_abonament/perioade_vacanta/participare_vacanta/sesiune_activitate/plati(write)/evenimente
  - phase: 25 (25-02, 25-03)
    provides: EmptyState pe Grupe/Prezenta/Abonamente, derivare corecta a clubului activ in frontend
provides:
  - Migratie RLS aplicata live pe wuhidifzsutwgdfkwhmd (fix_rls_izolare_cross_club_grupe_prezenta_abonamente_v2)
  - Dovada automata reproductibila de izolare cross-club (tests/rls_izolare_cross_club_faza25.ts)
  - Dovada UI live cu cont ADMIN_CLUB real (nu super admin) pe al doilea club
  - Fix pentru un bug de infrastructura care bloca inregistrarea de roluri (trigger fara SECURITY DEFINER)
affects: [26-wizard-onboarding-club-nou]

tech-stack:
  added: []
  patterns:
    - "Test RLS cu client admin (service role) + client anon cu header active-role-context-id, randuri canar prefixate ZZ_TEST_ pentru identificare si cleanup garantat in finally"
    - "Verificare UI live cu Playwright scriptat manual (fara test runner), cont efemer creat/sters prin auth.admin API"

key-files:
  created:
    - tests/rls_izolare_cross_club_faza25.ts
    - .planning/phases/25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha/25-VERIFICARE.md
  modified:
    - .planning/STATE.md

key-decisions:
  - "get_my_club_ids() si get_my_clubs() sunt deprecate de facto (zero call-site-uri ramase in pg_policies) — functiile raman definite in DB, fara DROP FUNCTION"
  - "tipuri_abonament.club_id IS NULL: fail-closed by default (D-02), nicio ramura speciala de nomenclator federal inventata pentru date care nu exista azi"
  - "Bug conex (trigger tr_automatizeaza_roluri fara SECURITY DEFINER) fixat de orchestrator in afara scope-ului planului, pentru ca Task 2 sa poata rula deloc — documentat explicit ca risc rezidual, nu ca deviatie a acestui plan"

requirements-completed: [MCLB-01, MCLB-02, MCLB-03, MCLB-04, MCLB-05, MCLB-06, MCLB-07, MCLB-08]

duration: ~2h30min
completed: 2026-08-29
---

# Phase 25 Plan 04: Aplicare live si verificare izolare cross-club Summary

**Migratia RLS pentru Grupe/Prezenta/Abonamente e aplicata live pe Supabase (versiunea revizuita, `_v2`, dupa ce interogarea `pg_policies` a descoperit ~20 politici RLS fantoma nedocumentate) si dovedita cu un test automat (16/16 PASS, citire + scriere, pe date reale din 2 cluburi) plus verificare UI live cu un cont ADMIN_CLUB real, nu super admin.**

## Performance

- **Duration:** ~2h30min (inclusiv un blocaj de infrastructura rezolvat de orchestrator)
- **Completed:** 2026-08-29
- **Tasks:** 3 (Task 1 preluat de orchestrator inainte de a spawna acest agent; Task 2 si Task 3 executate de acest agent)
- **Files modified:** 4 (tests/rls_izolare_cross_club_faza25.ts nou, 25-VERIFICARE.md nou, 25-AUDIT-CORECTAT.md adaugat in istoric, STATE.md)

## Accomplishments

- **Task 1 (preluat de orchestrator):** migratia revizuita `fix_rls_izolare_cross_club_grupe_prezenta_abonamente_v2` aplicata cu succes pe `wuhidifzsutwgdfkwhmd`, dupa ce varianta initiala a esuat (eroare de sintaxa) si dupa ce interogarea directa `pg_policies` a descoperit ~20 politici RLS fantoma nedocumentate pe minim 9 tabele (agent `rls-securitate` a produs `25-AUDIT-CORECTAT.md` ca document de referinta corectat).
- **Task 2:** `tests/rls_izolare_cross_club_faza25.ts` — test automat reutilizabil care creeaza un utilizator efemer + randuri canar `ZZ_TEST_FAZA25_` intr-un club "strain", apoi verifica din contextul unui alt club: zero randuri/canar cross-club la SELECT pe 6 tabele (`grupe`, `evenimente`, `perioade_vacanta`, `participare_vacanta`, `tipuri_abonament`, `program_antrenamente`), INSERT cross-club respins pe 2 tabele, INSERT in propriul club acceptat, si cale SPORTIV pe `tipuri_abonament` fara regresie (client separat cu context SPORTIV, fara ADMIN_CLUB in context). 16/16 verificari PASS, exit 0, cleanup complet confirmat prin re-rularea `scripts/audit_rls_faza25.ts`.
- **Task 3:** verificare UI live cu un cont ADMIN_CLUB efemer (creat si sters pentru test) la clubul C.S. Phi Hau — Grupe & Orar, Prezenta (tab Rapid), Config. Abonamente, Vacante Antrenamente toate incarca date REALE ale clubului propriu, fara nicio urma de date din alt club, fara erori noi de consola pe cele 4 ecrane. `25-VERIFICARE.md` scris cu toate cele 5 sectiuni cerute + output brut.
- **Deviatie majora prinsa in Task 2:** trigger de infrastructura (`tr_automatizeaza_roluri`) fara `SECURITY DEFINER` bloca ORICE insert in `utilizator_roluri_multicont` (inclusiv cu service role) — diagnosticat si fixat de orchestrator, altfel Task 2 nu putea rula deloc. Acelasi cod path e folosit de `services/authService.ts` la inregistrarea reala de sportivi noi.

## Task Commits

1. **Task 1: Aplica migratia live si confirma politicile in pg_policies** — preluat de orchestrator (fara commit in acest repo — migratia SQL nu e tracked, `supabase/` e gitignored; sursa de adevar e DB live)
2. **Task 2: Test automat de izolare cross-club** — `05aaa92` (test)
3. **Task 3: Verificare UI live si consemnarea dovezilor** — `b067644` (docs)

## Files Created/Modified

- `tests/rls_izolare_cross_club_faza25.ts` — test automat de izolare cross-club, reutilizabil in fazele urmatoare
- `.planning/phases/25-.../25-VERIFICARE.md` — dovezi complete post-aplicare (pg_policies raportat, test automat, UI live, risc rezidual)
- `.planning/phases/25-.../25-AUDIT-CORECTAT.md` — adaugat in istoricul git (fusese scris de agentul `rls-securitate` inainte de spawnarea acestui agent, dar nu era inca comis)
- `.planning/STATE.md` — decizii Faza 25-04

## Decisions Made

- `get_my_club_ids()`/`get_my_clubs()` deprecate de facto — zero call-site-uri ramase, functiile raman definite in DB fara `DROP FUNCTION` (in afara scope-ului unei migratii de politici).
- `tipuri_abonament.club_id IS NULL` — fail-closed by default (D-02); 0 din 5 randuri reale au `club_id NULL` azi, nicio semantica "nomenclator federal" inventata pentru date inexistente.
- Cluburile de referinta pentru testul automat (`83e7f771...` Kim Long Dao Falticeni, `cbb0b228...` C.S. Phi Hau) preluate exact din `25-AUDIT.md`, documentate explicit ca atare intr-o constanta la inceputul fisierului de test.
- Verificarea UI a folosit un cont ADMIN_CLUB efemer (creat/sters programatic), NU contul `TEST_EMAIL` din `.env` (acela e cont super admin al userului, nu potrivit pentru scenariul "al doilea club, NU super admin" cerut de plan).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking, fixat de orchestrator] Trigger `tr_automatizeaza_roluri` fara `SECURITY DEFINER`**
- **Found during:** Task 2, la prima incercare de a insera randul `ADMIN_CLUB` in `utilizator_roluri_multicont` pentru utilizatorul de test efemer, folosind clientul `SUPABASE_SERVICE_ROLE_KEY`.
- **Issue:** Orice INSERT in `public.utilizator_roluri_multicont` (inclusiv cu privilegii depline de service role) esua cu `42501 permission denied for table users`. Reprodus izolat: insert identic in `public.grupe` (are acelasi trigger de audit `audit_trigger_fn`) a reusit fara eroare — a exclus `audit_trigger_fn()` ca sursa.
- **Fix:** Orchestrator a rulat un diagnostic `execute_sql` (`pg_trigger` JOIN `pg_proc`) si a gasit `tr_automatizeaza_roluri -> fn_automatizeaza_legatura_utilizator()`, singurul trigger de pe tabel FARA `SECURITY DEFINER` (spre deosebire de `audit_roluri`), care face JOIN direct pe `auth.users` — rulat cu privilegiile apelantului, nu ale proprietarului functiei. Fix aplicat: `CREATE OR REPLACE FUNCTION` cu `SECURITY DEFINER` adaugat, corpul functiei neschimbat, aplicat live pe `wuhidifzsutwgdfkwhmd`.
- **Files modified:** niciunul in acest repo (fix DB-side, aplicat de orchestrator prin MCP, in afara oricarui fisier tracked).
- **Verificare:** dupa fix, testul automat din Task 2 a reusit sa insereze 3 randuri diferite in `utilizator_roluri_multicont` (ADMIN_CLUB @ Club A, SPORTIV @ Club A) fara nicio eroare, pe parcursul a 3 rulari succesive (16/16 PASS de fiecare data).
- **Impact in afara acestui plan:** `services/authService.ts` (liniile 78 si 122) foloseste exact acelasi `.upsert()` pe `utilizator_roluri_multicont` la inregistrarea reala de sportivi noi — bug-ul, daca ramanea nedescoperit, ar fi putut afecta inregistrarea self-service in productie. Documentat explicit in `25-VERIFICARE.md` sectiunea "Risc rezidual" si in `STATE.md`.
- **Committed in:** n/a (fix pe DB live, nu pe cod din repo).

**2. [Rule 1 - Bug in testul propriu, corectat inainte de commit] Asertiune SPORTIV bazata pe o presupunere gresita despre date**
- **Found during:** prima rulare a testului automat — asertiunea "SPORTIV vede propriul club pe `tipuri_abonament`" a picat cu `total vazute=0`.
- **Issue:** Testul presupunea implicit ca CLUB_A (Kim Long Dao Falticeni) are randuri reale in `tipuri_abonament` — fals: `25-AUDIT.md` confirma ca toate cele 5 randuri reale apartin CLUB_B (C.S. Phi Hau). RLS functiona corect; testul avea o presupunere de date gresita.
- **Fix:** Adaugat un rand canar suplimentar `ZZ_TEST_FAZA25_AbonamentPropriu_` in CLUB_A (nu doar in CLUB_B), plus o asertiune pozitiva explicita ca acel canar propriu e vizibil (nu doar ca cel strain e invizibil).
- **Files modified:** `tests/rls_izolare_cross_club_faza25.ts` (inainte de commit).
- **Verificare:** re-rulare, 16/16 PASS.
- **Committed in:** `05aaa92` (inclus direct in commit-ul initial al testului, nu ca fix separat).

---

**Total deviations:** 2 auto-fixed (1 blocking infrastructura, fixat de orchestrator; 1 bug in testul propriu, corectat inainte de commit)
**Impact on plan:** Fara impact asupra continutului planului dupa fix — ambele au fost rezolvate inainte de a considera Task 2/3 complete.

## Issues Encountered

- Verificarea UI a necesitat ocolirea a doua obstacole specifice mediului de automatizare (nu bug-uri de produs): (1) sidebar-ul are un drawer mobil duplicat ascuns in DOM care primea click-urile simulate in loc de sidebar-ul desktop vizibil — rezolvat prin scoping pe `aside:visible`; (2) ghidul de onboarding ("Tur de prezentare") ramane montat global si intercepteaza click-urile Playwright simulate prin coordonate — rezolvat prin `element.click()` nativ (DOM), care nu face hit-testing la coordonate. Niciunul dintre acestea nu afecteaza userii reali (interactiune reala prin mouse functioneaza normal cu tour-ul, care are propriile butoane "Sari peste"/"Continuă" deasupra overlay-ului).
- 6 erori 401 observate in consola la incarcarea initiala a Dashboard-ului (`get_my_active_clubs`, `rbv_plati_club`, `rbv_sportivi_complet`) — analizate si documentate ca risc rezidual preexistent, nelegat de migratia acestei faze (cod HTTP 401 = lipsa sesiune la momentul cererii, nu blocaj RLS; zero din cele 8 tabele atinse de migratie sunt implicate). Zero erori noi pe cele 4 ecrane cerute explicit de plan.

## User Setup Required

None - nicio configurare de serviciu extern necesara. Contul de test folosit pentru verificarea UI a fost efemer (creat si sters programatic in aceeasi sesiune).

## Next Phase Readiness

- Faza 25 e completa functional: audit, fix RLS, aplicare live, verificare automata si UI toate finalizate.
- Riscuri reziduale documentate explicit in `25-VERIFICARE.md` pentru o faza viitoare de audit RLS: politici fantoma pe tabele din afara scope-ului (`tranzactii`, `grade`, `istoric_grade`, `eveniment`, `reduceri`, `cluburi`), `evenimente_public_select` neverificat, `prezenta_antrenament` posibil cu politici duplicate.
- Faza 26 (wizard onboarding club nou) poate continua — depinde de Faza 25, acum completa.

---
*Phase: 25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha*
*Completed: 2026-08-29*

## Self-Check: PASSED

- FOUND: `tests/rls_izolare_cross_club_faza25.ts`
- FOUND: `.planning/phases/25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha/25-VERIFICARE.md`
- FOUND: `.planning/phases/25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha/25-04-SUMMARY.md`
- FOUND: commit `05aaa92` (Task 2)
- FOUND: commit `b067644` (Task 3)
