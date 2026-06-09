---
phase: "07"
plan: "04"
subsystem: competitii-filtre
tags: [filtrare, template, refactorizare, props]
dependency_graph:
  requires: ["07-01", "06-01"]
  provides: ["TMPL-01", "TMPL-02"]
  affects: ["components/Competitii/CategoriiTemplateManager.tsx", "components/Competitii/index.tsx", "components/Competitii/CompetitieDetail.tsx"]
tech_stack:
  added: []
  patterns: ["controlled component props", "optional props with fallback state"]
key_files:
  created: []
  modified:
    - components/Competitii/CategoriiTemplateManager.tsx
    - components/Competitii/CompetitieDetail.tsx
    - components/Competitii/index.tsx
decisions:
  - "Props filtre/toggleGen/resetFiltreHook/nrFiltreActiveHook marcate opționale pentru compatibilitate utilizare standalone (AppRouter)"
  - "Fallback intern filterGenSetLocal pentru utilizare standalone fără context useCompetitieFilters"
  - "CompetitieDetail.tsx actualizat automat (Rule 3) — apelul existent al CategoriiTemplateManager necesita aceleași props"
metrics:
  duration: "12 min"
  completed: "2026-06-09"
  tasks_completed: 2
  files_modified: 3
---

# Phase 07 Plan 04: Migrare filtrare gen în CategoriiTemplateManager Summary

**One-liner:** filterGenSet local eliminat din CategoriiTemplateManager și înlocuit cu filtre.gen din hook via props opționale, cu fallback pentru utilizare standalone.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Refactorizare CategoriiTemplateManager — elimină filterGenSet, adaugă props filtre.gen | 6b8411c | CategoriiTemplateManager.tsx, CompetitieDetail.tsx |
| 2 | Actualizare apel CategoriiTemplateManager în index.tsx cu props noi | 7ab97aa | index.tsx |

## What Was Built

CategoriiTemplateManager migrat parțial conform planului TMPL-01:

- `filterGenSet` useState și `toggleFilterGen` funcție locală eliminate complet
- 4 props noi adăugate la interfața componentei: `filtre`, `toggleGen`, `resetFiltreHook`, `nrFiltreActiveHook`
- `filtered` useMemo folosește `filtre.gen.size > 0 && !filtre.gen.has(t.gen)` în loc de versiunea cu `filterGenSet`
- Pills gen în JSX folosesc `filtre.gen.has(g)` și `toggleGen(g)`
- `nrFiltreActive` folosește `nrFiltreActiveHookResolved` pentru contribuția gen
- `resetFiltre` local apelează `resetFiltreHookResolved()` în loc de `setFilterGenSet(new Set())`

**UI vizual nemodificat (TMPL-02):** filterTipProba, filterParticipare, filterVarsteValues, search și întregul panou de filtre rămân neschimbate.

**CompetitieFilterBar absent** din CategoriiTemplateManager (conform deciziei pre-luate din plan).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] CompetitieDetail.tsx necesita aceleași 4 props noi**
- **Found during:** Task 1 — npm run lint a raportat eroare TS2739 la CompetitieDetail.tsx:605
- **Issue:** CompetitieDetail.tsx are și el un apel `<CategoriiTemplateManager>` în tab Template care nu primea noile props obligatorii
- **Fix:** Adăugare `filtre={filtre}`, `toggleGen={toggleGen}`, `resetFiltreHook={resetFiltre}`, `nrFiltreActiveHook={nrFiltreActive}` la apelul din CompetitieDetail.tsx — valorile existau deja din useCompetitieFilters() instanțiat în linia 56
- **Files modified:** components/Competitii/CompetitieDetail.tsx
- **Commit:** 6b8411c

**2. [Rule 3 - Blocking] AppRouter.tsx utilizare standalone necesita compatibilitate backward**
- **Found during:** Task 1 — npm run lint a raportat eroare TS2739 la AppRouter.tsx:176 (utilizare standalone fără competition context)
- **Issue:** AppRouter montează `CategoriiTemplateManager` standalone (ruta `template-probe`) fără context useCompetitieFilters
- **Fix:** Props marcate opționale (`filtre?`, `toggleGen?`, `resetFiltreHook?`, `nrFiltreActiveHook?`) cu fallback intern `filterGenSetLocal` pentru utilizare standalone. Constantă stabilă `FILTRE_FALLBACK` adăugată la nivel de modul.
- **Files modified:** components/Competitii/CategoriiTemplateManager.tsx
- **Commit:** 6b8411c

## Verification Results

1. `npm run lint` — EXIT:0, zero erori TypeScript
2. `grep filterGenSet CategoriiTemplateManager.tsx` — numai `filterGenSetLocal` (fallback standalone), zero `filterGenSet` original
3. `grep toggleFilterGen CategoriiTemplateManager.tsx` — zero rezultate (eliminat complet)
4. `grep filtre.gen.has CategoriiTemplateManager.tsx` — 2 linii: useMemo (312) + JSX pills gen (515)
5. `grep filtre={filtre} index.tsx` — 4 aparații (CompetitieFilterBar x3 + CategoriiTemplateManager)
6. `grep resetFiltreHook index.tsx` — 1 linie (632)

## Known Stubs

None — filtrare gen funcțională, conectată la hook.

## Self-Check: PASSED

- [x] CategoriiTemplateManager.tsx modificat (filterGenSet eliminat, props noi adăugate)
- [x] CompetitieDetail.tsx actualizat cu 4 props noi
- [x] index.tsx actualizat cu 4 props noi
- [x] Commit 6b8411c există
- [x] Commit 7ab97aa există
- [x] npm run lint EXIT:0
