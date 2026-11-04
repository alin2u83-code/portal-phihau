---
phase: 36-acces-extern-competitie-prin-link-login-email-otp-doar-zona-
plan: 07
subsystem: auth
tags: [react, roles, guard, rbac]

requires:
  - phase: 36-05
    provides: "Rol.nume include REPREZENTANT_COMPETITIE"
provides:
  - "Pagina AccesLimitatPage + garda in App.tsx pentru contul extern"
  - "Rolul extern filtrat din selectia de context si din allRoles"
affects: [36-11, 36-12]

key-files:
  created: [components/AccesLimitatPage.tsx]
  modified: [App.tsx, hooks/useUserRoles.ts, hooks/useDataProvider.ts, components/RoleSelectionPage.tsx]

key-decisions:
  - "Rolul extern e scos din lista de roluri doar daca utilizatorul are si alte roluri; singur, trece prin garda AccesLimitatPage"
  - "Garda e un return conditionat dupa toate hook-urile, inainte de SystemGuardian"

requirements-completed: [ACX-08, ACX-11]

duration: 10min
completed: 2026-11-05
---

# Phase 36 Plan 07: Garda portal principal pentru rolul extern Summary

Un cont cu doar REPREZENTANT_COMPETITIE vede "Acces limitat" cu Deconectare pe `/`, fara shell si fara fetchAppData; rolul extern dispare din selectia de context si din allRoles pentru utilizatorii interni.

## Commits
- 34bbc94: filtrare rol extern (useUserRoles, useDataProvider, RoleSelectionPage)
- 71dde47: AccesLimitatPage + garda in App.tsx

## Deviations from Plan

**1. [Rule 2 - Missing critical] Filtru si in RoleSelectionPage.tsx**
- **Issue:** RoleSelectionPage isi interogheaza singura `utilizator_roluri_multicont` (nu foloseste `userRoles`), deci rolul extern ar fi aparut in selectie si ar fi fost auto-selectat daca ramanea singurul vizibil dupa filtrare.
- **Fix:** filtru local, acelasi criteriu (doar daca exista roluri interne).
- **Files:** components/RoleSelectionPage.tsx (nu era in files_modified)

## Verification
- `npx tsc --noEmit` curat; grep REPREZENTANT_COMPETITIE prezent in App.tsx, useUserRoles.ts, useDataProvider.ts.
- Nu s-a testat vizual in browser (planificat in 36-12). Nu s-a rulat cod-review separat.

## Known Stubs
None.

## Self-Check: PASSED
