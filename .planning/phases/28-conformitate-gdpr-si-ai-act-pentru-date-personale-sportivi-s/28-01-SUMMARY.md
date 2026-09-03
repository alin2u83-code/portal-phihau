---
phase: 28-conformitate-gdpr-si-ai-act-pentru-date-personale-sportivi-s
plan: 01
subsystem: database
tags: [gdpr, rls, supabase, migration, sql]

# Dependency graph
requires: []
provides:
  - "Sursa versionata a migratiei aditive GDPR (`sql/migrations/add_gdpr_consimtamant_si_cereri.sql`), gata de aplicat live prin Supabase MCP `apply_migration`"
  - "Design RLS complet pentru `public.cereri_gdpr`: 5 politici, 2 functii SECURITY DEFINER, 1 trigger de audit"
affects: [28-02, 28-03, 28-04, 28-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER join function pentru scoping RLS pe club, fara denormalizare de club_id (precedent fisa_practicant_club_id din Faza 16)"
    - "Trigger BEFORE UPDATE pentru audit server-side (procesat_de/procesat_la din auth.uid(), nu din payload client)"

key-files:
  created: [sql/migrations/add_gdpr_consimtamant_si_cereri.sql]
  modified: []

key-decisions:
  - "Migratia NU a fost aplicata live — Supabase MCP (execute_sql/apply_migration) nu e accesibil acestui subagent worktree, confirmat identic cu precedentul din 16-01-SUMMARY.md (\"gsd-executor nu are acces MCP Supabase\"); Task 2 si Task 3 raman blocate, predate orchestratorului"
  - "sql/migrations/ e in interiorul unui director gitignorat (sql/, *.sql in .gitignore), dar fisierul a fost adaugat cu git add -f, oglindind exact precedentul deja tracked add_anunturi_federatie.sql — sql/migrations/*.sql e sursa versionata intentionat, in ciuda regulii gitignore mai largi"
  - "Nu s-a putut rula in aceasta sesiune interogarile de verificare premise (a)-(d) din Task 1 (pg_get_functiondef pe get_active_club_id/is_super_admin, count user_id populat, coloane utilizator_roluri_multicont) — fara acces MCP; SQL-ul scris se bazeaza pe semnaturile confirmate in 28-RESEARCH.md si 16-01-SUMMARY.md (functii fara argumente, existente live), dar NU au fost re-verificate live in aceasta sesiune"

requirements-completed: []  # REQ-5 si REQ-9 raman INCOMPLETE pana la aplicarea live (Task 2) si verificarea live (Task 3) — vezi Deviations

# Metrics
duration: ~25min
completed: 2026-09-03
---

# Phase 28 Plan 01: Schema GDPR aditiva (consimtamant parinte + cereri_gdpr) Summary

**Migratie SQL aditiva scrisa si commisa (coloane consimtamant parinte pe `sportivi` + tabel `cereri_gdpr` cu RLS scopat pe club, 5 politici, 2 functii SECURITY DEFINER, 1 trigger de audit) — NEAPLICATA inca pe DB-ul live, Task 2/3 blocate din lipsa de acces MCP Supabase in acest worktree**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-03T~07:20Z
- **Completed:** 2026-09-03T07:46Z
- **Tasks:** 1 din 3 complete (Task 1); Task 2 si Task 3 blocate
- **Files modified:** 1

## Accomplishments
- Fisier `sql/migrations/add_gdpr_consimtamant_si_cereri.sql` scris complet (194 linii), acoperind exact cele 5 sectiuni cerute de plan: coloane consimtamant, tabel `cereri_gdpr`, functii helper SECURITY DEFINER, trigger de audit, RLS cu 5 politici
- Toate verificarile automate din plan (existenta fisier, `cereri_gdpr` >= 10 aparitii in cod non-comentat, zero aparitii `INSTRUCTOR` in cod non-comentat) trec local
- Toate cele 5 nume de politici exacte prezente: `Sportiv_Select_Propriile_Cereri_GDPR`, `Sportiv_Insert_Propriile_Cereri_GDPR`, `Admin_Club_Select_Cereri_GDPR`, `Admin_Club_Update_Cereri_GDPR`, `Bypass_Super_Admin_Cereri_GDPR`
- Ambele predicate `Admin_Club_*` contin explicit `get_active_club_id()` SI `rol_denumire IN ('ADMIN_CLUB','ADMIN')` (previne gap-ul cross-role identificat in Gotcha 2 din plan)

## Task Commits

Fiecare task finalizabil a fost commis atomic:

1. **Task 1: Verifica premisele live si scrie fisierul de migratie** (partial — vezi Deviations) - `9b6330e` (feat)

**Task 2 (Aplica migratia LIVE prin Supabase MCP) si Task 3 (Verifica live schema si politicile) NU au commit — raman neexecutate, predate orchestratorului.**

## Files Created/Modified
- `sql/migrations/add_gdpr_consimtamant_si_cereri.sql` - Migratie aditiva completa: 2 coloane pe `sportivi`, tabel `cereri_gdpr` (7 coloane), 2 indexuri, 2 functii SECURITY DEFINER, 1 trigger, 5 politici RLS

## Decisions Made

- **Aplicarea live ramane pentru orchestrator.** Precedentul din `16-01-SUMMARY.md` ("Executat direct de orchestrator (nu subagent — gsd-executor nu are acces MCP Supabase in acest mediu, confirmat deja in Phase 15)") si sectiunea "Environment Availability" din `28-RESEARCH.md` confirma explicit acelasi gap in acest mediu. Planul insusi (Task 2, actiune) instruieste: "Daca MCP Supabase nu este accesibil in contextul de executie curent (subagent), raporteaza acest lucru explicit si predă aplicarea orchestratorului — nu marca task-ul complet pe baza existentei fisierului." Am respectat aceasta instructiune literal.
- **`git add -f` pentru fisierul de migratie.** `sql/` si `*.sql` sunt in `.gitignore` (liniile 16 si 18), dar `sql/migrations/add_anunturi_federatie.sql` e deja tracked in acest repo (confirmat via `git ls-files`), stabilind ca `sql/migrations/*.sql` e sursa versionata intentionata pentru migratii, in ciuda regulii gitignore mai largi care probabil vizeaza alte subdirectoare (`sql/fixes/`, etc.). Am urmat acelasi precedent.
- **Predicatele SQL scrise conform semnaturilor documentate, NU re-verificate live in aceasta sesiune.** `28-RESEARCH.md` documenteaza `get_active_club_id()` si `is_super_admin()` ca functii fara argumente, confirmate ca existand live (referentiate cu numele exact in `16-01-SUMMARY.md` si notele STATE.md din Faza 25-04), dar RESEARCH.md insusi noteaza explicit ca "exact function names... their SQL bodies were not re-read this session — verify signatures via Supabase MCP before writing the final migration". Aceasta verificare live (interogarile a-d din Task 1) nu a putut fi rulata de acest subagent din acelasi motiv de lipsa acces MCP.

## Deviations from Plan

### Scope redus fata de plan (nu deviatie in sensul Regulilor 1-4, ci limitare de mediu documentata explicit in plan)

**1. Task 1 — interogarile de verificare premise (a)-(d) NU au fost rulate**
- **Motiv:** Necesita Supabase MCP `execute_sql`, inaccesibil acestui subagent (worktree parallel executor). Planul insusi anticipeaza acest scenariu in `<execution_context>`: "subagentul NU are acces la MCP Supabase... subagentul scrie fisierul SQL si raporteaza, iar orchestratorul aplica migratia."
- **Actiune:** Fisierul SQL a fost scris pe baza semnaturilor documentate in `28-RESEARCH.md` (Code Examples, Open Question 1 — marcata RESOLVED cu presupunerea ca planul ruleaza interogarea live, ceea ce nu s-a intamplat in acest mediu) si a precedentului `16-01-SUMMARY.md`.
- **Impact:** Daca `get_active_club_id()` sau `is_super_admin()` au alta semnatura decat cea presupusa (fara argumente) sau daca `utilizator_roluri_multicont` nu are coloanele `user_id`/`rol_denumire`/`sportiv_id`/`club_id` exact cu aceste nume, `apply_migration` (Task 2) va esua vizibil la aplicare — nu exista risc de "trecere silentioasa" a unei erori, pentru ca planul interzice explicit simplificarea tacita a predicatului daca aplicarea esueaza.

**2. Task 2 — migratia NU a fost aplicata live**
- **Motiv:** Necesita Supabase MCP `apply_migration`, inaccesibil acestui subagent.
- **Actiune:** Task marcat BLOCAT, nu complet. Fisierul sursa e gata pentru orchestrator sa il aplice direct.
- **Impact:** Coloanele si tabelul `cereri_gdpr` NU exista inca pe DB-ul live. Planurile 28-02..28-05 care depind de aceasta schema (formular consimtamant, pagina Protectia datelor, coada admin) NU pot fi verificate functional pana la aplicarea live.

**3. Task 3 — verificarea live a schemei/politicilor NU a fost rulata**
- **Motiv:** Depinde de Task 2 (schema trebuie sa existe live inainte de verificare) si necesita acelasi acces MCP.
- **Actiune:** Task marcat BLOCAT, nu complet.

---

**Total deviations:** 0 auto-fixate (Rule 1-4) — cele 3 puncte de mai sus sunt limitari de acces la unelte, nu deviatii de continut fata de plan. Continutul SQL scris respecta literal specificatia Task 1 (nume exacte de coloane, politici, functii).
**Impact on plan:** Planul NU e complet. Doar 1 din 3 taskuri e finalizabil de acest subagent. Aplicarea si verificarea live raman actiuni obligatorii pentru orchestrator inainte ca REQ-5/REQ-9 sa poata fi marcate complete.

## Issues Encountered

- Worktree-ul acestui subagent era la un commit vechi (`6280208`), inainte de commit-urile de planificare ale Fazei 28 pe `main` — fisierele `28-01-PLAN.md` etc. lipseau initial din worktree. Rezolvat prin fast-forward merge (`git merge main --ff-only`), sigur pentru ca HEAD-ul worktree-ului era exact `merge-base` cu `main` (nicio divergenta, deci fast-forward fara conflicte).
- `sql/` e director gitignorat in acest repo; fisierul de migratie nou a necesitat `git add -f` pentru a fi tracked, oglindind exact precedentul `sql/migrations/add_anunturi_federatie.sql`.

## User Setup Required

**Aplicare migratie live necesara — vezi mai sus.** Orchestratorul (sau operatorul uman cu acces Supabase MCP) trebuie sa:
1. Ruleze cele 4 interogari de verificare premise din Task 1 ((a)-(d) din `28-01-PLAN.md`) inainte de aplicare, sau sa confirme direct ca semnaturile presupuse sunt corecte.
2. Aplice `sql/migrations/add_gdpr_consimtamant_si_cereri.sql` live prin Supabase MCP `apply_migration` (numele migratiei: `add_gdpr_consimtamant_si_cereri`).
3. Ruleze cele 6 interogari de verificare din Task 3 pentru a confirma schema, RLS, trigger-ul si functiile aplicate corect.

## Next Phase Readiness

- Sursa SQL e completa si gata de aplicat — niciun blocaj de continut, doar de unealta (acces MCP).
- Planurile 28-02..28-05 (care ating UI-ul formularului de consimtamant, pagina Protectia datelor, coada admin `cereri_gdpr`) pot avansa pe partea de cod client, dar testarea lor end-to-end impotriva schemei reale ramane blocata pana la aplicarea live a acestei migratii.
- Recomandare pentru orchestrator: aplica Task 2/3 din acest plan (28-01) INAINTE de a rula verificarea functionala a planurilor care scriu in `cereri_gdpr` sau `sportivi.consimtamant_parinte_*`.

---
*Phase: 28-conformitate-gdpr-si-ai-act-pentru-date-personale-sportivi-s*
*Completed: 2026-09-03 (partial — Task 1 only, Task 2/3 blocked)*

## Self-Check: PASSED

- FOUND: `sql/migrations/add_gdpr_consimtamant_si_cereri.sql`
- FOUND: commit `9b6330e`
