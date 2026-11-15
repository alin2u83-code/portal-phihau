---
phase: 42-competitie-editare-echipe-quyen-fram-an-calendaristic-arme-d
plan: 05
subsystem: ui
tags: [react, competitii, fram, wizard]
requires: [42-02]
provides:
  - "Pas1 wizard: athletes without FRAM for the competition year are blocked (disabled, red badge) when fram_obligatoriu is on"
  - "Super admin exception per athlete via ConfirmModal 'Excepție FRAM'"
affects: [42-08, 42-09]
key-files:
  modified:
    - components/Competitii/InscriereClubWizard/types.ts
    - components/Competitii/InscriereClubWizard/shared.tsx
    - components/Competitii/InscriereClubWizard/Pas1.tsx
key-decisions:
  - "esteSuperAdmin derived locally with usePermissions(useData().activeRoleContext); Pas1Props unchanged"
  - "FRAM state computed by statusFram (42-02); calculeazaEligibilitateGenerala now takes StareFram instead of computing areVizaFRAM"
requirements-completed: [D-04, D-05, D-06]
duration: 10min
completed: 2026-11-15
---

# Phase 42 Plan 05: FRAM block and super admin exception in Pas 1 Summary

**Pas 1 now blocks athletes without FRAM under the competition rule (red "Fără FRAM <an>" badge, not selectable, not via select-all) and lets the super admin enroll them only after an explicit per-athlete "Excepție FRAM" confirmation.**

## Accomplishments
- New eligibility status `blocat_fram` (types.ts) with a red badge branch in `BadgeEligibilitateGenerala` (shared.tsx); other branches untouched.
- Pas1: year = `anFramCompetitie` (year of data_inceput, D-06); `statusFram` per athlete; `blocat` -> disabled and visible; `exceptie` -> yellow warning, selectable only through ConfirmModal, excluded from select-all; `avertisment`/`ok` behave as before (rule off = identical, since `areVizaFRAM` and `statusFram` both use `areTaxaAchitata`).
- Footer shows "· N fără FRAM <an> (blocați de regula competiției)", and the existing "date incomplete" count no longer includes FRAM-blocked rows.

## Task Commits
1. Task 1: 550cca53 (types.ts, shared.tsx)
2. Task 2: 6fca2b36 (Pas1.tsx)

## Deviations from Plan
None. Minor: the FRAM footer note lives inside the existing select-all row, so (as for the existing excluded count) it shows only when more than one athlete is selectable; the per-row badge is always visible.

## Verification
- `npx tsc --noEmit -p .`: 0 errors.
- Plan grep checks: statusFram( x1, blocat_fram x3, usePermissions( x1, "Excepție FRAM" x1 in Pas1.tsx.
- NOT verified: browser/visual behaviour (blocking, badge, ConfirmModal flow, select-all); no component tests exist for the wizard. The wizard still receives `vizeSportivi` from index.tsx as before; 42-08 changes the data source. Migration 20261115b not live, so `fram_obligatoriu` is undefined on current data and the rule is effectively off until applied.

## Known Stubs
None.

## Self-Check: PASSED
Commits 550cca53, 6fca2b36 exist; the three files modified.
