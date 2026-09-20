---
phase: 30-imbunatatiri-inspirate-din-abonix-gratie-reinnoire-abonament
plan: 02
subsystem: payments
tags: [postgres, react, typescript, date-fns, supabase]

requires: []
provides:
  - "coloana public.cluburi.perioada_gratie_zile (default 30, CHECK 0-365)"
  - "utils/perioadaGratie.ts — decideGratieReinnoire() + primaZiLunaCurenta() (functii pure)"
  - "card UI 'Perioadă de grație la reînnoire' in TipuriAbonament.tsx"
affects: [30-05]

tech-stack:
  added: []
  patterns: ["functie pura de decizie + coloana config per club + card UI care citeste/scrie coloana — separat de integrarea reala in fluxul de facturare (planul consumator)"]

key-files:
  created: [supabase/migrations/20260918b_perioada_gratie_cluburi.sql, utils/perioadaGratie.ts, utils/perioadaGratie.test.ts]
  modified: [types.ts, components/Plati/TipuriAbonament.tsx]

key-decisions:
  - "Executat inline (nu prin subagent gsd-executor) — acelasi motiv ca 30-01, vezi acel SUMMARY"
  - "Gating card: permissions?.isAdminClub || isFederationAdmin — RLS-ul live pe cluburi (politica 'Cluburi - UPDATE pentru admin') confirma ca ADMIN_CLUB poate actualiza randul propriului club, deci nu s-a restrans la doar federatie"

patterns-established: []

requirements-completed: [ABX-04]

duration: ~25min
completed: 2026-09-20
---

# Phase 30 Plan 02: Perioadă de grație configurabilă la reînnoire

**Coloana `cluburi.perioada_gratie_zile` (default 30) + functie pura `decideGratieReinnoire()` + card de configurare in Tipuri Abonament — fundatia pentru integrarea din planul 30-05**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Migratie `perioada_gratie_cluburi` aplicata live: coloana `NOT NULL DEFAULT 30`, CHECK `0-365` verificat activ (testat cu UPDATE -1, blocat corect)
- `utils/perioadaGratie.ts` — functie pura `decideGratieReinnoire()`, zero dependinte Supabase, 6/6 teste trec (`npx tsx utils/perioadaGratie.test.ts`)
- Card "Perioadă de grație la reînnoire" in `TipuriAbonament.tsx`, citeste/scrie `cluburi.perioada_gratie_zile`, verificat cu update real (45 → persistat → revert la 30)

## Files Created/Modified
- `supabase/migrations/20260918b_perioada_gratie_cluburi.sql` — coloana + CHECK + comentariu
- `types.ts` — camp `Club.perioada_gratie_zile?: number | null`
- `utils/perioadaGratie.ts` — `DecizieGratie`, `decideGratieReinnoire()`, `primaZiLunaCurenta()`
- `utils/perioadaGratie.test.ts` — 6 teste (5 din acceptance criteria + 1 bonus prag negativ)
- `components/Plati/TipuriAbonament.tsx` — card nou, state `pragGratie`/`savingGratie`, `handleSaveGratie()`

## RLS pe `cluburi` (verificat live, Task 1)

Politici UPDATE existente (mai multe suprapuse — pattern deja semnalat in STATE.md ca posibil "RLS fantoma" pe alte tabele, nu reparat aici, in afara scope-ului):
- `CLUBURI_UPDATE`: doar `is_super_admin()`
- `Cluburi - UPDATE pentru admin`: `SUPER_ADMIN_FEDERATIE`/`ADMIN` SAU `ADMIN_CLUB` cu `urm.club_id = cluburi.id`
- `cluburi_tema_config_admin_update`: `ADMIN_CLUB`/`SUPER_ADMIN_FEDERATIE` cu club propriu

Concluzie: **ADMIN_CLUB poate actualiza randul propriului club** (politica "Cluburi - UPDATE pentru admin" e permisiva, RLS e OR intre politici). Cardul e gatat pe `permissions?.isAdminClub || isFederationAdmin`, conform acestei concluzii — nu s-a restrans artificial la doar federatie.

## Decisions Made
- Reutilizare `newClubId` (state existent, folosit si de formularul de adaugare abonament) pentru selectorul de club al cardului de gratie, la cererea federatiei — evita un component de selectie duplicat.
- Fallback dublu la incarcare: intai citeste `clubs` (prop, deja in memorie), doar daca lipseste campul face fetch punctual `select('perioada_gratie_zile')`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Executie] Plan rulat inline in orchestrator, nu prin subagent**
- Identic cu 30-01 — subagentul `gsd-executor` nu are acces la MCP tools Supabase in acest mediu. Executat inline, tool-uri Supabase incarcate explicit prin ToolSearch in sesiunea orchestrator.

---

**Total deviations:** 1 (identic cu 30-01, limitare de infrastructura)
**Impact on plan:** Zero impact asupra continutului — plan executat exact cum a fost scris.

## Issues Encountered
None in plus fata de 30-01.

## User Setup Required
None.

## Next Phase Readiness
- `decideGratieReinnoire()` si `cluburi.perioada_gratie_zile` sunt gata de consumat direct in planul 30-05 (`handleGenerateSubscriptions`, singurul owner al `PlatiScadente.tsx`).
- Verificarea vizuala manuala din browser (human-check din PLAN.md: deschide Plăți → Tipuri Abonament ca ADMIN_CLUB) **NU a fost efectuata** in aceasta rulare — verificarea automata (lint, grep, test suite, roundtrip DB direct) confirma comportamentul corect al mecanismului, dar randarea vizuala a cardului in UI ramane neverificata vizual.

---
*Phase: 30-imbunatatiri-inspirate-din-abonix-gratie-reinnoire-abonament*
*Completed: 2026-09-20*
