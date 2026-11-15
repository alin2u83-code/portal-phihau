---
phase: 42-competitie-editare-echipe-quyen-fram-an-calendaristic-arme-d
plan: 02
subsystem: ui
tags: [typescript, react, competitii, fram, tests]
requires: []
provides:
  - "Competitie.fram_obligatoriu (optional boolean) in types.ts"
  - "utils/editareCompetitie.ts: anFramCompetitie, statusFram, diferentaMembri (pure, tested)"
  - "WarningVizaFRAM blocat/an props; ArmePermiseGiaoDau eligibile prop"
affects: [42-05, 42-06, 42-07, 42-08, 42-09]
tech-stack:
  added: []
  patterns: ["pure helper mirroring a DB trigger rule, cross-referenced in comments"]
key-files:
  created: [utils/editareCompetitie.ts, utils/editareCompetitie.test.ts]
  modified: [types.ts, components/Competitii/constants.tsx]
key-decisions:
  - "statusFram uses slice(0,4) of data_inceput, same as SQL EXTRACT(YEAR) in 20261115b (verified in the migration)"
patterns-established:
  - "diferentaMembri: callers write adauga, then schimbaRol, then scoate (never delete before adding)"
requirements-completed: [D-01, D-04, D-05, D-06, D-08, D-11, D-13]
duration: 10min
completed: 2026-11-15
---

# Phase 42 Plan 02: Client contracts for FRAM rule and team edit Summary

**Pure tested helpers `statusFram` (ok/avertisment/blocat/exceptie, mirrors the DB FRAM trigger) and `diferentaMembri`, plus blocking FRAM warning and grade-aware Giao Dau weapons label.**

## Accomplishments
- `Competitie.fram_obligatoriu?: boolean` added to types.ts.
- `utils/editareCompetitie.ts` with `anFramCompetitie`, `StareFram`, `statusFram`, `MembruEchipa`, `diferentaMembri`; 15 test cases in `utils/editareCompetitie.test.ts`, all PASS (`npx tsx utils/editareCompetitie.test.ts`, exit 0).
- `WarningVizaFRAM`: new `blocat`/`an` props (red variants, "nu se poate înscrie"); unblocked texts unchanged.
- `ArmePermiseGiaoDau`: new `eligibile` prop filtering by grade; new warning text when none qualifies; behaviour unchanged when prop absent.

## Task Commits
1. Task 1: 6b2854bb (types, helpers, tests; RED run confirmed before implementation)
2. Task 2: e479b62e (constants.tsx)

## Deviations from Plan
None - plan executed as written. The SQL rule in 20261115b (EXTRACT(YEAR), scutit or Achitat) was checked and matches.

## Verification
- `npx tsx utils/editareCompetitie.test.ts`: 15 PASS, exit 0.
- `npx tsc --noEmit -p .`: 0 errors overall.
- Not checked: visual rendering of the new variants (no call site passes the new props yet; consumers are 42-05..42-09).

## Known Stubs
None.

## Self-Check: PASSED
Files and commits 6b2854bb, e479b62e exist.
