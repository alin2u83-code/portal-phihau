---
phase: 38-performanta-incarcare-aplicatie-eliminare-statement-timeouts
plan: 02
subsystem: frontend-loading
tags: [react-query, concurrency, retry, pagination, supabase]

requires: []
provides:
  - utils/incarcareDate.ts (ruleazaCuLimita, esteTimeoutStatement, trebuieReincercat, fereastraPrezenta, imparteInBucati, incarcaToatePaginile)
  - processSettledQueries intoarce erori[]; cheia lipseste din data la eroare non-RLS
  - CheieLaCerere in types.ts
  - QueryClient retry = trebuieReincercat
affects: [38-03, 38-04, 38-05]

tech-stack:
  added: []
  patterns:
    - "Sarcini ca thunk-uri pentru limitator (query builder-ele supabase sunt lazy thenable)"
    - "Teste colocate rulate cu npx tsx, iesire 1 la esec"

key-files:
  created:
    - utils/incarcareDate.ts
    - utils/incarcareDate.test.ts
    - utils/supabaseHelpers.test.ts
  modified:
    - types.ts
    - utils/supabaseHelpers.ts
    - index.tsx

key-decisions:
  - "Fara dependinte noi (nu p-limit): limitator cu lucratori care iau urmatorul index"
  - "Log doar cheie + cod eroare, niciodata randuri"

requirements-completed: [D-01, D-03, D-04]

duration: ~10min
completed: 2026-11-16
---

# Phase 38 Plan 02: Contracte pure de incarcare Summary

**Limitator de concurenta, regula de retry fara reincercare pe statement timeout, fereastra de prezenta azi-90/azi+30, chunking si paginare ca functii pure testate; processSettledQueries nu mai transforma o cerere esuata in [].**

## Task Commits

1. Task 1: contracte incarcareDate + CheieLaCerere - `a65c755b` (types.ts, utils/incarcareDate.ts, utils/incarcareDate.test.ts)
2. Task 2: processSettledQueries + retry QueryClient - `956aad56` (utils/supabaseHelpers.ts, utils/supabaseHelpers.test.ts, index.tsx)

TDD: testele au fost scrise primele si au picat (modul lipsa / 5 din 6 cazuri), apoi implementarea le-a facut verzi. Commit-uri cu RED+GREEN combinate per task (nu commit separat de test).

## Verificare

- `npx tsx utils/incarcareDate.test.ts`: 24 PASS, 0 FAIL, exit 0.
- `npx tsx utils/supabaseHelpers.test.ts`: 6 PASS, 0 FAIL, exit 0.
- `npx tsc --noEmit -p .`: 0 erori in tot proiectul.
- `retry: trebuieReincercat` prezent in index.tsx; CheieLaCerere are cele 13 membri.
- Apelantii existenti ai processSettledQueries (hooks/useDataProvider.ts:418, 459) compileaza si imbina cu `|| prev.x` / `?.length`, deci o cheie absenta pastreaza datele anterioare. Nu am rulat aplicatia in browser.

## Deviations from Plan

None - planul executat ca scris. Teste suplimentare fata de lista: thunk sincron care arunca in ruleazaCuLimita (24 in loc de minimum 18).

## Known Stubs

Niciunul. Functiile noi nu sunt inca apelate de nimeni in afara de `trebuieReincercat` (index.tsx); `useDataProvider` inlocuieste fetchAllPages si foloseste `erori` in 38-04.

## Threat Flags

Niciunul. T-38-05/06/07 mitigate (retry fara timeout, cheie lasata afara din data, log doar cod).

## Self-Check: PASSED

Fisiere create gasite, commit-urile a65c755b si 956aad56 exista. STATE.md/ROADMAP.md nu au fost actualizate (conform instructiunii de a nu atinge alte fisiere); le actualizeaza orchestratorul.
