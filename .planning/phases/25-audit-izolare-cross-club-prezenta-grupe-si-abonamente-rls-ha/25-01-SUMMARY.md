---
phase: 25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha
plan: 01
subsystem: database
tags: [rls, postgres, supabase, security, multi-tenant, cross-club-isolation]

# Dependency graph
requires:
  - phase: 15-fix-rls-izolare-cross-club-pe-tabele-financiare-alocari-plat
    provides: pattern audit+fix RLS, helper functions has_access_to_club/este_staff_club/is_super_admin
  - phase: 16-elimina-politici-rls-using-true-ramase-rezultate-facturi-fed
    provides: al doilea val de fix-uri RLS similare, precedent de verificare
provides:
  - Audit live complet (politici + date) pentru Grupe/Prezenta/Abonamente, cu 3 corectii majore fata de research
  - Migratie SQL completa (scoping + structural), scrisa dar NEAPLICATA — gata pentru 25-04
  - Descoperire noua: gap real de tip Tampering pe rbv_plati_insert/update/delete (WRITE fara scoping de club)
  - Descoperire noua: risc rezidual pe prezenta_antrenament (posibile politici duplicate, in afara scopului acestui plan)
affects: [25-02, 25-03, 25-04, 26-wizard-onboarding-club-nou]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reconstruire inventar pg_policies din arheologia fisierelor supabase/migrations/ (datate) cand MCP Supabase nu e disponibil subagentului executor"
    - "Fail-closed explicit (club_id IS NOT NULL AND has_access_to_club(...)) in loc de a te baza implicit pe semantica NULL a helperelor"

key-files:
  created:
    - scripts/audit_rls_faza25.ts (gitignored, scripts/ nu e tracked in acest proiect)
    - .planning/phases/25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha/25-AUDIT.md
    - supabase/migrations/20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente.sql (gitignored, neaplicata)
  modified: []

key-decisions:
  - "evenimente NU se modifica in migratie — deja migrata pe has_access_to_club() din 2026-03-10 (inainte de research), NU foloseste get_my_club_ids() cum presupunea research/planul"
  - "program_antrenamente: politicile citate de research au fost DROP-uite de o migratie ulterioara (20260305_update_auth_functions_and_rls.sql) — fix-ul real tinteste alt bug (context-bleed multi-rol pe politici inline), nu fail-open pe orfane"
  - "plati: SELECT deja corect scopat (verificat din sursa role_based_views.sql), dar WRITE (insert/update/delete) verifica doar rolul fara club — gap real, reparat in Sectiunea 8"
  - "orar_exceptii are 4 politici live, nu 3 — a patra e o cale SPORTIV (Sportiv Read OrarExceptii) obligatoriu de pastrat, neatinsa"
  - "tipuri_abonament are 0 randuri cu club_id NULL azi (nu 5 cum implica research) — nu se adauga ramura de nomenclator federal, fail-closed by default"
  - "prezenta_antrenament: descoperire de politici potential duplicate (rbv_prezenta_* + politici vechi din 20260305) loggata ca risc rezidual, NEATINSA — in afara scopului si a invariantilor explicite ale acestui plan"

patterns-established:
  - "Cand un subagent executor nu are acces MCP Supabase, inventarul de politici live se reconstruieste prin identificarea celui mai recent fisier datat din supabase/migrations/ care modifica acel tabel, cross-verificat cu date live prin service role key"

requirements-completed: [MCLB-01, MCLB-02, MCLB-03, MCLB-04, MCLB-05]

# Metrics
duration: ~70min
completed: 2026-08-28
---

# Phase 25 Plan 01: Audit RLS live Grupe/Prezenta/Abonamente Summary

**Audit live complet + migratie SQL scrisa (neaplicata) pentru inchiderea a 3 leak-uri RLS active (`perioade_vacanta`, `participare_vacanta`, `tipuri_abonament` cu `USING(true)`), migrarea `grupe` de pe `get_my_club_ids()` non-context-aware, si corectarea a 2 verdicte gresite din research (`evenimente` deja migrata, `program_antrenamente` afectat de alt bug decat cel presupus) plus descoperirea unui gap real de WRITE pe `plati`.**

## Performance

- **Duration:** ~70 min (arheologie extinsa in `supabase/migrations/` — 101 fisiere — din cauza lipsei accesului MCP Supabase pentru acest subagent)
- **Started:** 2026-08-28 (sesiune continua din contextul de faza)
- **Completed:** 2026-08-28T16:25:00Z
- **Tasks:** 3/3
- **Files modified:** 3 (1 tracked: 25-AUDIT.md; 2 gitignored: audit_rls_faza25.ts, migratia SQL)

## Accomplishments

- Script de audit live read-only (`scripts/audit_rls_faza25.ts`, 225 linii) interogheaza toate cele 7 puncte cerute (a-g) direct pe DB live prin service role key — rulat cu succes, zero erori
- `25-AUDIT.md` (303 linii): inventar complet de 13 tabele cu politici live reconstruite din istoricul de migratii (fara acces MCP), verdict binar pe toate 3 Open Questions + semantica NULL + cai SPORTIV + cluburi de referinta
- Migratie SQL completa (~400 linii): 8 sectiuni (perioade_vacanta, participare_vacanta, tipuri_abonament, grupe, orar_exceptii, program_antrenamente, sesiune_activitate, plati) — toate gate-urile automate de verificare trec
- Corectate 2 verdicte gresite din research (vezi Deviations) inainte sa ajunga in migratie, prevenind un fix incorect pe `evenimente` si un fix incomplet pe `program_antrenamente`
- Descoperit si reparat un gap real (nu presupus) de Tampering pe `rbv_plati_insert/update/delete` — WRITE pe `plati` nu verifica deloc clubul

## Task Commits

1. **Task 1: Audit live (date + politici) si raspuns la cele 3 Open Questions** - `12272e7` (docs)
2. **Task 2: Scrie sectiunea de scoping RLS a migratiei** - fara commit (fisier gitignored, `supabase/`)
3. **Task 3: Scrie sectiunea structurala a migratiei** - fara commit (acelasi fisier gitignored)

**Plan metadata:** vezi commit final de mai jos

_Note: Task 2 si Task 3 modifica exclusiv `supabase/migrations/20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente.sql`, care e in `.gitignore` (`supabase/` — consistent cu Faza 15/16 si cu instructiunea explicita a planului "nu incerca git add pe el"). Verificate integral prin gate-urile automate din plan (vezi mai jos), dar nu au commit git propriu-zis._

## Files Created/Modified

- `scripts/audit_rls_faza25.ts` - script Node read-only, interogheaza live toate cele 7 puncte de audit (tipuri_abonament, program_antrenamente, sesiune_activitate, perioade/participare_vacanta, plati, grupe/evenimente, cluburi) — gitignored (`scripts/` nu e tracked in acest proiect, la fel ca celelalte 7 scripturi ad-hoc existente)
- `.planning/phases/25-.../25-AUDIT.md` - inventar politici live (13 tabele) + verdicte Open Questions + descoperiri corective
- `supabase/migrations/20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente.sql` - migratia completa, scrisa dar NEAPLICATA (aplicarea e in 25-04) — gitignored

## Decisions Made

Vezi `key-decisions` in frontmatter. Cea mai importanta: **research-ul (25-RESEARCH.md) a citat politici deja suprascrise pentru `evenimente` si `program_antrenamente`** — acest task a reconstruit inventarul live real prin arheologia fisierelor datate din `supabase/migrations/` (nu doar cele citate de research) inainte de a scrie orice SQL, evitand astfel un fix gresit sau incomplet.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in premisa planului] `evenimente` NU foloseste `get_my_club_ids()` — plan-ul cerea migrarea ei alaturi de `grupe`**
- **Found during:** Task 1 (audit)
- **Issue:** Research a caracterizat `evenimente` identic cu `grupe` (get_my_club_ids, de migrat pe has_access_to_club). Arheologia migratiilor datate arata ca politica veche a fost DROP-uita de `supabase/migrations/20260310_fix_rezultate_rls.sql` (fisier ulterior celui citat de research) si inlocuita cu `View Evenimente`/`Manage Evenimente`, care foloseste deja `has_access_to_club(club_id)`.
- **Fix:** `evenimente` a fost exclusa din Sectiunea 4 a migratiei; documentata explicit motivatia (comentariu in SQL + sectiune dedicata in 25-AUDIT.md). Verificat live: cele 2 randuri cu `club_id NULL` sunt evenimente federale legitime ("Stagiu National"/"Stagiu International"), nu date orfane.
- **Files modified:** `supabase/migrations/20260828_...sql` (Sectiunea 4), `25-AUDIT.md`
- **Verificare:** gate automat `TABLES_COVERED` confirma `public.evenimente` mentionata (in comentariu explicativ, nu in CREATE POLICY); zero `CREATE POLICY` scrisa pentru acest tabel
- **Committed in:** `12272e7` (25-AUDIT.md documenteaza descoperirea; migratia SQL e gitignored, fara commit propriu)

**2. [Rule 1 - Bug in premisa planului] `program_antrenamente` — politicile citate de plan nu mai exista live**
- **Found during:** Task 1 (audit)
- **Issue:** Plan-ul cerea rescrierea unei singure politici SELECT (`"Admin - Vizualizare Antrenamente Club"`, pattern fail-open `club_id IS NULL OR has_access_to_club`). Aceasta politica a fost DROP-uita de `20260305_update_auth_functions_and_rls.sql` (ulterioara celei citate de research) si inlocuita cu 3 politici per-rol (ADMIN_CLUB/INSTRUCTOR/SPORTIV) care reimplementeaza inline, NON-context-aware, aceeasi verificare de club — un bug diferit (context-bleed multi-rol, aceeasi clasa ca T-25-03), nu fail-open pe orfane (care erau deja invizibile prin absenta unei ramuri super_admin in cele 3 politici).
- **Fix:** Task 3 Sectiunea 6 rescrisa complet fata de textul literal al planului: backfill (neschimbat, confirmat 100% recuperabil live) + inlocuirea celor 3 politici per-rol cu variante context-aware si fail-closed explicit, pastrand identic mapping-ul rol->comanda (narrowing-only, Invariant 1) + eliminarea politicii INSTRUCTOR redundante (acoperita deja corect de `Admin_Select_Program`, rescrisa doar pentru fail-closed explicit).
- **Files modified:** `supabase/migrations/20260828_...sql` (Sectiunea 6)
- **Verificare:** gate automat `club_id IS NOT NULL AND public.has_access_to_club` >= 2 aparitii — trece (3 aparitii: program_antrenamente x2 prin Admin_Select_Program, sesiune_activitate x1)
- **Committed in:** documentat in `25-AUDIT.md` (`12272e7`); migratia e gitignored

**3. [Rule 2 - Missing critical] Gap real de Tampering gasit pe `rbv_plati_insert/update/delete`**
- **Found during:** Task 1 (rezolvarea Open Question #1)
- **Issue:** Citind sursa reala (`sql/migrations/role_based_views.sql`, fisier tracked dar negasit de research pentru ca a cautat doar in `supabase/migrations/`), SELECT (`rbv_plati_admin_club`) e deja corect scopat, dar cele 3 politici WRITE verifica DOAR rolul (`SUPER_ADMIN_FEDERATIE`/`ADMIN_CLUB`), fara nicio comparatie de club — un ADMIN_CLUB al Clubului A poate insera/edita/sterge plati ale Clubului B.
- **Fix:** Task 3 Sectiunea 8 rescrie cele 3 politici WRITE, pastrand verbatim verificarea de rol si adaugand acelasi conjunct de club deja folosit de `rbv_plati_admin_club` (`has_access_to_club(COALESCE(club_id, sportivi.club_id))`), USING+WITH CHECK identice unde aplicabil. SELECT si `rbv_plati_own` raman complet neatinse.
- **Files modified:** `supabase/migrations/20260828_...sql` (Sectiunea 8)
- **Verificare:** gate automat `rbv_plati_own` count = 0 — trece; migratia nu atinge SELECT
- **Committed in:** documentat in `25-AUDIT.md` (`12272e7`); migratia e gitignored

**4. [Rule 2 - Missing critical, corectie plan] `orar_exceptii` are o a 4-a politica (cale SPORTIV) nementionata de plan**
- **Found during:** Task 1 (audit)
- **Issue:** Plan-ul cerea consolidarea "celor 3 politici duplicate" de pe `orar_exceptii`. Live sunt 4 politici — a patra (`Sportiv Read OrarExceptii`, SELECT via `sportivi.grupa_id`) e o cale SPORTIV reala, neamintita de plan/research. Consolidarea oarba a celor "3" ar fi putut include din greseala si aceasta a 4-a, rupand accesul SPORTIV la exceptiile de orar ale propriei grupe.
- **Fix:** Task 2 Sectiunea 5 consolideaza DOAR cele 3 politici de staff (SuperAdmin/AdminClub/Instructor); `Sportiv Read OrarExceptii` ramane complet neatinsa (fara DROP, fara CREATE) — conform Invariantului 5.
- **Files modified:** `supabase/migrations/20260828_...sql` (Sectiunea 5)
- **Verificare:** inspectie manuala a fisierului — politica SPORTIV nu apare in nicio instructiune `DROP`/`CREATE` din Sectiunea 5
- **Committed in:** documentat in `25-AUDIT.md` (`12272e7`)

---

**Total deviations:** 4 auto-fixed (2 corectii de premisa gresita din research/plan — Rule 1, 2 completari de securitate/corectitudine gasite prin citirea sursei reale — Rule 2)
**Impact on plan:** Toate 4 deviatii au fost necesare pentru corectitudine — a scrie migratia conform textului literal al planului ar fi produs fie un fix inutil (evenimente), fie un fix incomplet care lasa live bug-ul real neatins (program_antrenamente), fie ar fi ratat un gap real de securitate (plati WRITE), fie ar fi rupt o cale SPORTIV existenta (orar_exceptii). Zero scope creep — toate modificarile raman in interiorul celor 8 tabele si a invariantilor din plan.

## Issues Encountered

- **Acces MCP Supabase indisponibil acestui subagent** (confirmat identic cu precedentul Faza 15/16). Interogarea directa `pg_policies` ceruta explicit de Task 1 nu a putut fi rulata. Rezolvat prin arheologie exhaustiva a `supabase/migrations/` (101 fisiere locale, gitignored, istoric complet al migratiilor aplicate) — pentru fiecare tabel, identificat cel mai recent fisier datat care modifica politicile lui si tratat ca stare live. Aceasta metoda a scos la iveala 2 corectii majore fata de research (vezi Deviations #1-2), sugerand ca metoda a fost NECESARA, nu doar un substitut inferior.
- **`scripts/` e complet gitignored in acest proiect** (verificat: 0 fisiere tracked in `scripts/`, inclusiv cele 7 scripturi ad-hoc preexistente). Plan-ul frontmatter declara `scripts/audit_rls_faza25.ts` ca "fisier nou (tracked)" — inexact fata de conventia reala a proiectului. Scriptul exista pe disc si a fost rulat cu succes; nu a fost fortat in git (`git add -f`) pentru a nu incalca conventia stabilita a proiectului.

## User Setup Required

None - migratia e scrisa dar NEAPLICATA (aplicarea live e in 25-04, cu checkpoint uman conform D-01).

## Next Phase Readiness

- Migratia SQL completa exista pe disc, gata de aplicat in 25-04, cu toate gate-urile automate din plan trecute
- `25-AUDIT.md` documenteaza dovada completa pentru fiecare decizie — 25-04 poate aplica direct fara nicio decizie suplimentara de continut
- Risc rezidual loggat, NEATINS: posibile politici RLS duplicate pe `prezenta_antrenament` (politici vechi din `20260305_update_auth_functions_and_rls.sql` coexistand cu `rbv_prezenta_*`) — necesita o faza de audit separata, in afara scopului si a invariantilor explicite ale Fazei 25
- 2 din 3 cluburi de referinta pentru testul de izolare din 25-04 identificate cu date reale: Kim Long Dao Falticeni (`83e7f771-46cf-4c4e-b70f-356d7b0bff06`) si C.S. Phi Hau (`cbb0b228-b3e0-4735-9658-70999eb256c6`)

---
*Phase: 25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha*
*Completed: 2026-08-28*

## Self-Check: PASSED

- FOUND: scripts/audit_rls_faza25.ts
- FOUND: .planning/phases/25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha/25-AUDIT.md
- FOUND: supabase/migrations/20260828_fix_rls_izolare_cross_club_grupe_prezenta_abonamente.sql
- FOUND: .planning/phases/25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha/25-01-SUMMARY.md
- FOUND commit: 12272e7
