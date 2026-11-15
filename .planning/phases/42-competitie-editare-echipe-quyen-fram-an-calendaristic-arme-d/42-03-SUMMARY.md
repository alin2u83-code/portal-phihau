---
phase: 42-competitie-editare-echipe-quyen-fram-an-calendaristic-arme-d
plan: 03
subsystem: ui
tags: [typescript, competitii, arme-cvd, tests]
requires: []
provides:
  - "armeEligibileLaGrad, motivFaraArme in utils/armeCvd.ts"
  - "TipLipsa 'arma-neeligibila' + optional inputs drepturiSportiv / inscrieriArma in calculeazaLipsuriCvd"
affects: [42-06]
tech-stack:
  added: []
  patterns: ["optional callback input; absent = unchanged behaviour"]
key-files:
  created: []
  modified: [utils/armeCvd.ts, utils/armeCvdLipsuri.ts, tests/armeCvd_reguli.ts, tests/armeCvdLipsuri.ts]
key-decisions:
  - "drepturiSportiv returning undefined disables filtering (T-42-13); helpers only report, never delete (T-42-14)"
  - "Enrolled-but-ineligible weapon and chosen-but-ineligible weapon for the same pair yield one lipsa (dedup via a per-athlete set)"
patterns-established:
  - "Weapon-eligibility warnings are non-blocking; only fara-forma blocks"
requirements-completed: [D-11, D-12, D-13, D-14, D-15]
duration: 8min
completed: 2026-11-15
---

# Phase 42 Plan 03: Pure weapon-eligibility rules Summary

**Pure, tested rules: `armeEligibileLaGrad` / `motivFaraArme` and a non-blocking `arma-neeligibila` lipsa (chosen or already-enrolled weapons) in `calculeazaLipsuriCvd`.**

## Accomplishments
- `armeEligibileLaGrad(arme, drept)` filters active weapons by the grade's rights; `motivFaraArme` explains no-grade / no-weapon-in-program / no-category cases.
- `calculeazaLipsuriCvd` gets optional `drepturiSportiv` and `inscrieriArma`; ineligible weapons produce `arma-neeligibila` warnings (enrollment stays, D-14) and skip fara-categorie/fara-forma; `fara-arma` text now says it does not block (D-15).
- No existing caller passes the new inputs, so behaviour is unchanged for them (all old assertions pass).

## Verification
- `npx tsx tests/armeCvd_reguli.ts` -> `armeCvd_reguli: OK`
- `npx tsx tests/armeCvdLipsuri.ts` -> `OK`
- `npx tsc --noEmit -p .` -> no output (clean)
- RED confirmed before each implementation (missing export / assertion error).

## Task Commits
1. Task 1: 4238438d (armeEligibileLaGrad + motivFaraArme)
2. Task 2: 363fd594 (arma-neeligibila, fara-arma text)

## Deviations from Plan
None - plan executed as written. Note: an athlete with an ineligible enrolled weapon but no chosen weapon yields both `arma-neeligibila` and `fara-arma` (literal reading of the plan).

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
