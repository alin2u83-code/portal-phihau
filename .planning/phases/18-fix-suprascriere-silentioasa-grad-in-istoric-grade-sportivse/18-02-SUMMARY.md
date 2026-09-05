---
phase: 18-fix-suprascriere-silentioasa-grad-in-istoric-grade-sportivse
plan: 02
subsystem: database
tags: [react, typescript, supabase, grad, istoric_grade, postgres-trigger]

requires:
  - phase: 18-01
    provides: "Trigger canonic trg_sync_grad_actual_canonical pe istoric_grade care deriva sportivi.grad_actual_id ca MAX(grade.ordine), activ pe INSERT/UPDATE/DELETE"
provides:
  - "ManagementInscrieri.tsx cu zero scrieri directe pe sportivi.grad_actual_id (D-03, D-04)"
  - "desyncedInscrieri corectat pe regula MAX(ordine) — elimina fals-pozitive permanente pentru sportivi cu grad superior gradului sesiunii"
  - "handleForceSync pastrat ca safety net, reparand exclusiv prin istoric_grade"
affects: [18-03, 18-04]

tech-stack:
  added: []
  patterns:
    - "Scriere unica in istoric_grade + stare optimista locala (sportiviUpdatesLocal/sportiviUpdates), fara update ulterior pe sportivi — pattern deja stabilit in services/sportivService.ts, replicat aici"
    - "Comparatie desync pe ordine (< nu !==) pentru a fi compatibila cu regula MAX(ordine) non-monotona din UI"

key-files:
  created: []
  modified:
    - components/GestiuneExamene/ManagementInscrieri.tsx

key-decisions:
  - "handleForceSync SE PASTREAZA (nu se sterge), cu criteriul desyncedInscrieri corectat pe ordine — vezi sectiunea dedicata mai jos, era punct deschis semnalat in 18-PATTERNS.md"
  - "sportiviUpdatesLocal.push / sportiviUpdates.push (stare optimista UI) raman neschimbate in toate cele 3 fluxuri — doar scrierea DB pe sportivi a fost eliminata"

requirements-completed: [D-03, D-04, D-09]

duration: ~15min
completed: 2026-09-05
---

# Phase 18 Plan 02: Elimina scrierile directe pe sportivi.grad_actual_id din ManagementInscrieri.tsx Summary

**Cele 3 call site-uri din `ManagementInscrieri.tsx` (rezultat individual, "Admite toți", sincronizare forțată) scriu acum exclusiv în `istoric_grade`, cu data reală a sesiunii; `grad_actual_id` e derivat integral de trigger-ul canonic din planul 18-01, iar detecția de desincronizare a fost corectată să nu mai genereze fals-pozitive sub regula MAX(ordine).**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2/2 complete
- **Files modified:** 1

## Accomplishments
- `handleResultChange` (ramura "Admis") și `handleAdmitAllConfirmed` nu mai fac niciun `supabase.from('sportivi').update({ grad_actual_id })` — race-ul din `Promise.all` cu upsert-ul în `istoric_grade` a fost eliminat prin dispariția celui de-al doilea scriitor
- `desyncedInscrieri` (useMemo) folosește acum comparație pe `grade.ordine` (`gradCurent.ordine < gradSustinut.ordine`), nu egalitate strictă de id — badge-ul "Sincronizare (N)" nu va mai marca permanent sportivii care au deja un grad superior gradului sesiunii curente
- `handleForceSync` a fost păstrat funcțional ca unealtă manuală de reparație (safety net), dar ultima sa scriere directă pe `sportivi` a fost eliminată — repară exclusiv prin insert-ul lipsă în `istoric_grade`
- Fișierul conține acum zero apariții ale `.update({ grad_actual_id` (linii de cod) și zero apariții ale `from('sportivi')`
- `npm run lint` (tsc --noEmit) trece fără erori după fiecare task

## Task Commits

Each task was committed atomically:

1. **Task 1: Elimina scrierile directe din handleResultChange si handleAdmitAllConfirmed** - `56f2070` (fix)
2. **Task 2: Corecteaza desyncedInscrieri si handleForceSync pentru regula MAX(ordine)** - `b782d7c` (fix)

## Files Created/Modified
- `components/GestiuneExamene/ManagementInscrieri.tsx` - eliminate cele 3 scrieri directe pe `sportivi.grad_actual_id` (handleResultChange, handleAdmitAllConfirmed, handleForceSync); `desyncedInscrieri` rescris pe comparatie de `ordine`

## Decizie: `handleForceSync` — PĂSTRAT, cu criteriu corectat

Acesta a fost un punct deschis semnalat explicit în `18-PATTERNS.md` (Site 3) și tranșat de plan în secțiunea `<decision_force_sync>`. Decizia aplicată:

**Se păstrează** ca unealtă manuală de reparație pentru admini (safety net), NU se șterge. Motive:
1. Post-fix, un desync real înseamnă că rândul din `istoric_grade` LIPSEȘTE — altfel trigger-ul canonic ar fi setat deja `grad_actual_id` la un grad cel puțin egal. Upsert-ul existent (`ignoreDuplicates: true`) chiar inserează rândul lipsă, iar trigger-ul repară `grad_actual_id`. Butonul rămâne funcțional fără nicio scriere pe `sportivi`.
2. Este singura suprafață din UI care repară în masă înscrierile vechi "Admis" rămase fără rând de istoric (rezultat plauzibil al race-ului de până acum) — utilă imediat după migrația 18-01.

**Corectat obligatoriu:** criteriul din `desyncedInscrieri` (`sportiv.grad_actual_id !== expectedGradId` → `ordine(grad curent) < ordine(grad sustinut)`, cu `-1`/`0` ca fallback-uri pentru grad lipsă). Sub regula MAX(ordine) (D-01), un sportiv cu grad deja SUPERIOR gradului sustinut în sesiunea curentă ar fi satisfăcut permanent inegalitatea veche — badge-ul "Sincronizare (N)" nu ar mai fi ajuns niciodată la 0.

**Ce NU s-a făcut:** upsert-ul din `handleForceSync` NU a fost transformat în `DO UPDATE` pe `data_obtinere` — ar fi reintrodus semantica "ultima scriere câștigă data" pe care faza o elimină (18-RESEARCH.md Pitfall 2, D-09). `ignoreDuplicates: true` rămâne neschimbat în toate cele 3 locuri (verificat: 3 apariții în fișier după ambele task-uri).

## Deviations from Plan

None - plan executat exact cum a fost scris. Ambele task-uri au corespuns 1:1 cu acțiunile și criteriile de acceptare din 18-02-PLAN.md.

## Issues Encountered

None.

## Next Phase Readiness

- Toate cele 3 call site-uri din `ManagementInscrieri.tsx` respectă acum D-03/D-04 — fișierul e gata pentru verificarea end-to-end live din 18-04.
- Rămân de tratat (per 18-CONTEXT.md, planuri separate ale fazei 18, în afara scope-ului 18-02): `hooks/useExamManager.ts` (~linia 169), `components/GestiuneExamene/RapoarteExamen.tsx` (~linia 269), `components/GestiuneExamene/ImportExamenModal.tsx` (~linia 609) — toate au acelasi pattern de eliminat.
- Nicio migrare DB suplimentară necesară în acest plan — trigger-ul canonic din 18-01 e deja live și gestionează corect toate cele 3 fluxuri acum corectate.

---
*Phase: 18-fix-suprascriere-silentioasa-grad-in-istoric-grade-sportivse*
*Completed: 2026-09-05*

## Self-Check: PASSED

- FOUND: components/GestiuneExamene/ManagementInscrieri.tsx
- FOUND: commit 56f2070 (Task 1)
- FOUND: commit b782d7c (Task 2)
