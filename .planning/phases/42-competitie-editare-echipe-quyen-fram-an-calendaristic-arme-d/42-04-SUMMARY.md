---
phase: 42-competitie-editare-echipe-quyen-fram-an-calendaristic-arme-d
plan: 04
subsystem: database
tags: [supabase, triggers, rls, fram, competitii, audit, live-test]
requires: [42-01]
provides:
  - "Migration 20261115b applied live (competitii.fram_obligatoriu, FRAM trigger, compat check, finalizata freeze)"
  - "tests/fram_editare_faza42.ts: 21-check live battery"
affects: [42-05, 42-08, 42-09]
key-files:
  created: [tests/fram_editare_faza42.ts]
  modified: [supabase/migrations/20261115b_competitie_fram_editare.sql]
key-decisions:
  - "Task 1 decision: aplica, explicit OK from the user on 2026-11-15"
  - "Super admin FRAM exception audited as operatie='INSERT' + date_noi.exceptie_fram=true (audit_log CHECK rejects 'EXCEPTIE_FRAM')"
  - "finalizata freeze lets cascade deletes and sportiv_id repoints through (merge_sportivi); taxa_achitata stays writable"
requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-10]
metrics:
  tasks: 3
  completed: 2026-11-15
---

# Phase 42 Plan 04: Apply FRAM migration live and prove it Summary

Migration 20261115b is live (user OK 2026-11-15) and a 21-check live battery on throwaway ZZ_TEST_FAZA42_ competitions passes, plus the ACL ratchet (30/30) and the Faza 41 regression (16/16).

## Task 1: decision
Choice: **aplica**, date 2026-11-15, explicit user OK. Nothing was applied before the answer.

## Task 2: apply + catalog (done by the orchestrator)
Applied through Supabase MCP in its corrected form (commits 6aa6e4c5 and 1aeb7d94: freeze trigger lets cascade through and does not fire on sportiv_id updates; audit marker via operatie='INSERT'). Catalog verified live: column `competitii.fram_obligatoriu` present; 6 triggers present (trg_competitii_fram_imutabil, trg_inscrieri_fram, trg_echipa_sportivi_fram, trg_inscrieri_finalizata, trg_echipe_finalizata, trg_echipa_sportivi_finalizata); trigger functions SECURITY DEFINER with search_path set; EXECUTE for anon and authenticated = false; compatibility message present in trg_participant_categorie_activa. Header says "APLICATA LIVE 2026-11-15" and the file is tracked (git ls-files lists it).

## Task 3: live battery (commit 8e20d13)
`npx tsx tests/fram_editare_faza42.ts` -> exit 0, 21/21:

| # | Result |
|---|--------|
| 1 default fram_obligatoriu=false | PASS |
| 2 super admin sets on draft; refused on inscrieri_deschise (schiță, 23514) | PASS |
| 3 refused with active participant (participanți, 23514) | PASS |
| 4 ADMIN toggle refused (42501 from the trigger) | PASS |
| 5 ADMIN_CLUB enrolls athlete with paid FRAM | PASS |
| 6 ADMIN_CLUB refused without FRAM 2027 (23514, message has FRAM + year), no row | PASS |
| 7 super admin enrolls without FRAM; audit row with exceptie_fram marker | PASS |
| 8 reactivation (retras -> inscris) refused for ADMIN_CLUB | PASS |
| 9 team member: ADMIN_CLUB refused, super admin allowed + marker | PASS |
| 10 rule off: ADMIN_CLUB enrolls normally | PASS |
| 11 compatible move ok; to team category refused (adm and sup, 23514, compat message); to other competition refused | PASS |
| 12 after closure: ADMIN_CLUB 0 rows, super admin 1 row | PASS |
| 13 audit UPDATE row for the category move | PASS |
| 14 vize_club_competitie (tip FRAM, an Y) has the paid athlete, 48 rows | PASS |
| 15 no new plati / vize_sportivi rows (0 / 0) | PASS |
| 16 finalizata: 8 super admin operations refused (finalizată), nothing changed | PASS |
| 16b finalizata: taxa_achitata update allowed (1 row) | PASS |
| 16c finalizata: sportiv_id repoint allowed, restored | PASS |
| 17 super admin deletes finalizata competition, cascade leaves 0 rows | PASS |
| 18 D-09 source: audit shows ok1 -> ok2 via cat_veche/cat_noua | PASS |
| residual ZZ_TEST_FAZA42_ competitions = 0 | PASS |

audit_log rows created by the test users (cannot be deleted, T-42-19 accepted): 18.

Regression: `npx tsx tests/acl_definer_faza37.ts` -> 30/30 PASS (exit 0); `npx tsx tests/categorii_admin_faza41.ts` -> 16/16 PASS (exit 0, audit_log +57 informational).

## Deviations from Plan
- **[Plan adapted to corrected migration]** Check 16 no longer expects the sportiv_id repoint to be refused; added 16c (repoint allowed on finalizata) and kept 17 as the cascade check. The team category change in 16 targets a second compatible team category (nT2) so the finalizata trigger, not the compatibility trigger, produces the refusal (trigger order is alphabetical, categorie_activa fires first).
- **[Marker]** Checks 7 and 9 test `date_noi.exceptie_fram`, not operatie.
- Check 4 accepts a refusal by trigger (42501) or RLS (0 rows); it hit the trigger (42501).
- Check 12 verifies the closure gate for ADMIN_CLUB by RLS (0 rows) and the super admin bypass; it does not assert which policy blocked.

## Not verified
- UI behaviour (plans 42-05..42-09) and mobile are untested here; only DB rules were exercised.
- Tests use the service role key from .env and temp auth users (user-approved pattern); users and competitions removed in the finally block.

## Known Stubs
None.

## Self-Check: PASSED
tests/fram_editare_faza42.ts exists; commit 8e20d13 exists; migration tracked.
