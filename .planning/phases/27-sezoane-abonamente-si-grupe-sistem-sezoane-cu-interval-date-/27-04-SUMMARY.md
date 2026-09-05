---
phase: 27-sezoane-abonamente-si-grupe-sistem-sezoane-cu-interval-date-
plan: 04
subsystem: payments
tags: [react, supabase, testing]

requires:
  - phase: 27-01
    provides: "TipAbonament.sezon_id, hooks/useSezoane.ts"
provides:
  - "utils/abonamente.ts — regula unica testata de rezolvare tip abonament pe sezon"
  - "Cele 4 fluxuri de facturare (PlatiScadente, GestiuneFacturi, LuniLipsaWizard, JurnalIncasari) folosesc acelasi contract"
affects: [27-05]

tech-stack:
  added: []
  patterns:
    - "Fallback pe numar_membri ruleaza EXCLUSIV pe lista filtrata de filtreazaTipuriSezon; cautarea pe tip_abonament_id (asignare explicita) ruleaza pe lista completa prin gasesteTipDupaId — niciodata invers"

key-files:
  created:
    - utils/abonamente.ts
    - utils/abonamente.test.ts
  modified:
    - components/Plati/PlatiScadente.tsx
    - components/Plati/GestiuneFacturi.tsx
    - components/Plati/LuniLipsaWizard.tsx
    - components/Plati/JurnalIncasari.tsx

key-decisions:
  - "Open Question 1 rezolvata explicit ca optiunea (a): reasignare manuala a tip_abonament_id, nu remapare automata la schimbarea sezonului — PlatiScadente semnaleaza vizibil cazurile ramase pe tip arhivat"
  - "LuniLipsaWizard deriva sezonul din sportiv.club_id (nu din activeRoleContext) — wizardul poate fi deschis de un admin de federatie pe un sportiv din alt club"

patterns-established:
  - "Orice nou flux de facturare care alege un TipAbonament trebuie sa treaca prin utils/abonamente.ts, nu sa interogheze direct tipuriAbonament"

requirements-completed: [SEZ-08, SEZ-09]

duration: ~40min
completed: 2026-09-06
---

# Phase 27 Plan 04: Regula unica de facturare pe sezon Summary

**utils/abonamente.ts (3 functii pure, 12 teste PASS) elimina bug-ul de facturare pe pretul unui sezon arhivat in toate cele 4 fluxuri de emitere a facturilor, cu avertisment vizibil pentru sportivii ramasi pe tip vechi.**

## Performance

- **Duration:** ~40 min
- **Tasks:** 3
- **Files modified:** 6 (2 noi, 4 modificate)

## Accomplishments
- `utils/abonamente.ts`: `filtreazaTipuriSezon`, `gasesteTipDupaId`, `esteTipDinSezonArhivat` — pure, fara Supabase, 12/12 teste PASS
- `PlatiScadente.tsx` + `GestiuneFacturi.tsx`: toate fallback-urile pe `numar_membri` filtrate pe sezonul activ; `PlatiScadente` afiseaza avertisment nominal pentru sportivii facturati cu tip din sezon arhivat
- `LuniLipsaWizard.tsx` + `JurnalIncasari.tsx`: acelasi contract, cu sezonul derivat corect per context (club-ul sportivului, respectiv contextul activ)

## Task Commits

1. **Task 1: utils/abonamente.ts + test** - `0354c9b` (feat)
2. **Task 2: PlatiScadente + GestiuneFacturi** - `34e97bb` (feat)
3. **Task 3: LuniLipsaWizard + JurnalIncasari** - `4a11cad` (feat)

## Files Created/Modified
- `utils/abonamente.ts` - regula unica de rezolvare
- `utils/abonamente.test.ts` - 12 asertii, pattern colocat identic cu parola.test.ts
- `components/Plati/PlatiScadente.tsx` - filtrare + avertisment sezon arhivat
- `components/Plati/GestiuneFacturi.tsx` - filtrare (2 locuri)
- `components/Plati/LuniLipsaWizard.tsx` - filtrare, sezon din sportiv.club_id
- `components/Plati/JurnalIncasari.tsx` - filtrare + useData/useSezonActiv adaugate

## Decisions Made
- Cele deja fixate explicit in plan (Open Question 1 -> optiunea a).

## Deviations from Plan

None - plan executat conform specificatiei. Deviatia factuala documentata in 27-01-SUMMARY.md (`plati.tip_abonament_id` exista pe DB) nu a afectat acest plan — regula de rezolvare priveste catalogul `tipuriAbonament`, nu coloana de pe `plati` (care doar inregistreaza istoric ce s-a facturat).

## Issues Encountered
- Niciuna. Executat inline (fara subagent) — infra de worktree din mediu s-a dovedit nefunctionala in aceasta sesiune (vezi 27-02-SUMMARY.md).

## Next Phase Readiness
- 27-05 (TipuriAbonament legat de sezon activ) poate incepe — foloseste acelasi `utils/abonamente.ts`.

---
*Phase: 27-sezoane-abonamente-si-grupe-sistem-sezoane-cu-interval-date-*
*Completed: 2026-09-06*
