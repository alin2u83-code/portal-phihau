---
phase: 25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha
plan: 03
subsystem: frontend
tags: [react, multi-club, rbac, activeRoleContext, prezenta, grupe, plati]

# Dependency graph
requires:
  - phase: 25 (25-01, 25-04)
    provides: RLS context-aware reparat pe tabele Grupe/Prezenta/Plati (defense in depth pentru scrierile cross-club)
provides:
  - Audit exhaustiv scris al tuturor locurilor din Grupe/Prezenta/Plati care deriva clubul (verdict per loc)
  - Derivare unica a clubului activ in Prezenta/index.tsx (activeClubId memoizat), refolosita in 3 locuri
  - Prop optional activeClubId pe GrupaFormModal (backwards compatible)
  - PlatiScadente.handleGenerateSubscriptions scrie in clubul contextului activ, nu al profilului
affects: [26-wizard-onboarding-club-nou]

tech-stack:
  added: []
  patterns:
    - "Derivare club: federatie -> null, altfel activeRoleContext.club_id, currentUser.club_id doar fallback final"
    - "Valoare unica memoizata (useMemo) pentru clubul activ, refolosita in tot componentul in loc de calcul duplicat"

key-files:
  created:
    - .planning/phases/25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha/25-AUDIT-FRONTEND.md
  modified:
    - components/Prezenta/index.tsx
    - components/Grupe/GrupaFormModal.tsx
    - components/Plati/PlatiScadente.tsx

key-decisions:
  - "GrupaFormModal primeste activeClubId ca prop OPTIONAL, nu obligatoriu — Grupe/index.tsx (apelantul, detinut de planul 25-02 din aceeasi unda) nu se modifica in acest plan; cablarea prop-ului e follow-up"
  - "5 locuri suplimentare FIX gasite in audit (Familii.tsx, GestiuneFacturi.tsx, JurnalIncasari.tsx x2, TaxeAnuale.tsx) raman NEreparate — fisiere in afara files_modified ale acestui plan, necesita prop nou activeRoleContext (schimbare de semnatura); documentate ca follow-up pentru Faza 26"

patterns-established:
  - "Pattern canonic de derivare club (regula din PLAN, sectiunea 'Regula de derivare a clubului'): 1) rol federatie -> null, 2) activeRoleContext?.club_id, 3) currentUser?.club_id doar fallback final"

requirements-completed: [MCLB-06]

duration: 45min
completed: 2026-08-28
---

# Phase 25 Plan 03: Elimina presupuneri single-club in Grupe/Prezenta/Plati Summary

**Audit exhaustiv scris (25-AUDIT-FRONTEND.md) + fix pe 3 fisiere: Prezenta/index.tsx deriva clubul activ o singura data (memoizat) pentru fetch grupe si pentru DashboardPrezentaAzi/GeneratorProgramMasiv, GrupaFormModal primeste activeClubId optional pentru clubul implicit al grupei noi, PlatiScadente.handleGenerateSubscriptions genereaza abonamente in clubul contextului activ, nu al profilului.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-08-28T21:19:09Z
- **Tasks:** 2
- **Files modified:** 4 (1 nou creat, 3 modificate)

## Accomplishments
- Audit exhaustiv al derivarii clubului pe cele 3 module (Grupe/Prezenta/Plati), cu verdict `FIX` / `OK-FALLBACK` / `OK-IRELEVANT` pentru fiecare loc gasit de cele 4 cautari cerute de plan
- Confirmate cele 4 locuri semnalate de planner ca `FIX`, toate reparate in Task 2
- `Prezenta/index.tsx`: eliminata duplicarea calculului de club — o singura valoare `activeClubId` memoizata, folosita in fetch-ul de grupe si in prop-urile `clubId` ale `DashboardPrezentaAzi` si `GeneratorProgramMasiv`
- `GrupaFormModal.tsx`: prop nou opțional `activeClubId`, folosit ca sursa primara pentru clubul implicit al unei grupe noi si pentru filtrarea locatiilor disponibile — zero regresie pentru apelul existent din `Grupe/index.tsx` (prop-ul lipseste acolo azi, comportamentul e identic cu inainte)
- `PlatiScadente.tsx`: `handleGenerateSubscriptions` deriva `clubId` din `activeRoleContext` cu fallback pe `currentUser`, garda pentru adminii de federatie neschimbata
- 5 locuri suplimentare cu risc real (derivare club din profil la scriere) identificate si documentate ca follow-up in afara scope-ului acestui plan (`Familii.tsx`, `GestiuneFacturi.tsx`, `JurnalIncasari.tsx` x2, `TaxeAnuale.tsx`) — nu au acces la `activeRoleContext` azi, necesita prop nou similar cu `activeClubId`

## Task Commits

Fiecare task a fost commis atomic:

1. **Task 1: Audit exhaustiv al derivarii clubului in Grupe/Prezenta/Abonamente** - `b2a13eb` (docs)
2. **Task 2: Repara derivarea clubului in Prezenta, GrupaFormModal si PlatiScadente** - `6d390fe` (fix)

_Notă: acest plan a rulat intr-un worktree paralel; commit-ul de metadata (STATE.md/ROADMAP.md) e facut de orchestrator dupa merge, nu de acest agent._

## Files Created/Modified
- `.planning/phases/25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha/25-AUDIT-FRONTEND.md` - Audit exhaustiv, rezultate cautari, verdict per loc, lista "de reparat" si "confirmat corect"
- `components/Prezenta/index.tsx` - `activeClubId` memoizat unic, refolosit la fetch grupe + `DashboardPrezentaAzi` + `GeneratorProgramMasiv`
- `components/Grupe/GrupaFormModal.tsx` - prop optional `activeClubId`, folosit in `formState.club_id` initial si `locatiiFiltrate`
- `components/Plati/PlatiScadente.tsx` - `activeRoleContext` adaugat la destructurare, `clubId` derivat din context in `handleGenerateSubscriptions`

## Decisions Made
- `activeClubId` pe `GrupaFormModal` e prop optional (nu obligatoriu) pentru a nu sparge apelul existent din `Grupe/index.tsx`, fisier detinut de planul 25-02 din aceeasi unda si explicit exclus de la modificare in acest plan
- Cele 5 locuri FIX suplimentare gasite in audit (in `Familii.tsx`, `GestiuneFacturi.tsx`, `JurnalIncasari.tsx`, `TaxeAnuale.tsx`) NU au fost reparate — fisierele nu sunt in `files_modified` ale acestui plan si repararea lor cere adaugarea unui prop nou `activeRoleContext`/`activeClubId` (schimbare de semnatura a componentelor), deci depaseste scope-ul strict al Task 2. Documentate explicit in audit ca follow-up pentru Faza 26 (wizard onboarding club nou), ca sa nu fie redescoperite de la zero.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree-ul a pornit dintr-un commit anterior planurilor 25-01..25-04**
- **Found during:** Task 1 (citirea fisierelor de input) — `.planning/phases/25-.../25-03-PLAN.md` nu exista in worktree
- **Issue:** Worktree-ul a fost creat inainte ca documentele de planificare Faza 25 (inclusiv acest plan) sa fie commise pe `main`; branch-ul agentului era la acelasi commit (`f2ce539`) ca merge-base-ul cu `main`, fara divergenta reala — doar `main` avansase cu commit-uri docs-only + 2 fisiere din planul 25-02 (`components/Grupe/index.tsx`, `components/Plati/TipuriAbonament.tsx`, `components/Prezenta/GrupeList.tsx`, `components/ui.tsx`)
- **Fix:** `git merge main` (fast-forward curat, fara conflicte — fisierele atinse de 25-02 nu se suprapun cu fisierele acestui plan)
- **Files modified:** niciunul relevant pentru plan (fast-forward, nu modificare de continut)
- **Verificare:** `git log --oneline f2ce539..main -- .planning/phases/25-...` a confirmat ca toate commit-urile lipsa erau docs sau 25-02 (fisiere disjuncte)
- **Committed in:** n/a (fast-forward, fara commit nou)

---

**Total deviations:** 1 auto-fixed (1 blocking — worktree sync)
**Impact on plan:** Fara impact asupra continutului planului; a fost necesar doar pentru a avea acces la fisierele de input (`25-03-PLAN.md`, `25-CONTEXT.md`, `25-RESEARCH.md`).

## Issues Encountered
None in afara sincronizarii worktree-ului documentata mai sus.

## User Setup Required
None - nicio configurare de serviciu extern necesara.

## Next Phase Readiness
- `25-AUDIT-FRONTEND.md` e pregatit ca punct de plecare pentru Faza 26 (wizard onboarding club nou) — contine deja lista celor 5 locuri neremediate (Familii/GestiuneFacturi/JurnalIncasari/TaxeAnuale) care vor avea nevoie de acces la `activeRoleContext`.
- Verificarea consolidata cu cont multi-rol (schimbare context activ intre doua cluburi, verificare Prezenta + Plati) ramane de facut in 25-04, conform sectiunii `<verification>` a acestui plan.
- Zero regresii de compilare (`npm run lint` / `tsc --noEmit` trece curat) si zero schimbari de API care sparg apelanti existenti.

---
*Phase: 25-audit-izolare-cross-club-prezenta-grupe-si-abonamente-rls-ha*
*Completed: 2026-08-28*
