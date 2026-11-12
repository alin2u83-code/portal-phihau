---
phase: 07-aplicare-filtre-pe-tab-uri
plan: "01"
subsystem: competitii-filtrare
tags: [hook, filter, orchestration, tab-categorii, typescript]
dependency_graph:
  requires:
    - hooks/useCompetitieFilters.ts (Phase 6)
    - components/Competitii/CompetitieFilterBar.tsx (Phase 6)
  provides:
    - components/Competitii/index.tsx (useCompetitieFilters instanțiat + resetFiltre în handleSetActiveTab)
    - components/Competitii/index.tsx (CompetitieFilterBar în tab Categorii)
    - components/Competitii/index.tsx (filteredCategorii via aplicaFiltreCategorie)
  affects:
    - Phase 07 planurile 02-04 primesc filtre ca props din CompetitieDetail
tech_stack:
  added: []
  patterns:
    - Hook instanțiat o singură dată în orchestrator (CompetitieDetail) — props în jos la tab-uri
    - useMemo cu aplicaFiltreCategorie pentru filteredCategorii derivat
    - useCallback cu resetFiltre în deps pentru reset consistent la schimbare tab
key_files:
  created: []
  modified:
    - components/Competitii/index.tsx
decisions:
  - "useCompetitieFilters instanțiat o singură dată în CompetitieDetail (D-01) — nu în fiecare tab"
  - "resetFiltre() ca primă acțiune în handleSetActiveTab — stabil referențial, safe în useCallback deps"
  - "filteredCategorii = aplicaFiltreCategorie(baza, filtre) combinat cu selectedProbaId existent"
  - "selectedProbaId rămâne declarat — referențiat în filteredCategorii useMemo, elimnat în task viitor"
  - "Pills probe standalone înlocuite complet cu CompetitieFilterBar (D-05)"
metrics:
  duration: "~15 min"
  completed: "2026-06-08T19:42:35Z"
  tasks_completed: 2
  files_created: 0
  files_modified: 1
---

# Phase 07 Plan 01: Orchestrare Filtre în CompetitieDetail — Summary

**One-liner:** Hook `useCompetitieFilters` instanțiat o singură dată în `CompetitieDetail`, cu `resetFiltre` în `handleSetActiveTab` și `CompetitieFilterBar` montat în tab Categorii în locul pills-urilor standalone.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Instanțiere hook + resetFiltre în handleSetActiveTab + filteredCategorii via aplicaFiltreCategorie | 436d4e4 | components/Competitii/index.tsx |
| 2 | Înlocuire pills standalone cu CompetitieFilterBar în tab Categorii + actualizare counter tab | df3dd0a | components/Competitii/index.tsx |

## Artifacts Produced

### `components/Competitii/index.tsx` (modificat)

**Task 1 — Adăugiri:**
- Import `useCompetitieFilters`, `aplicaFiltreCategorie` din `../../hooks/useCompetitieFilters`
- Import `CompetitieFilterBar` din `./CompetitieFilterBar`
- `const { filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive } = useCompetitieFilters();` după `expandedCats` useState
- `resetFiltre()` ca primă acțiune în `handleSetActiveTab` (INSC-03); `resetFiltre` în deps array `useCallback`
- `filteredCategorii` recalculat via `useMemo` + `aplicaFiltreCategorie(baza, filtre)` cu deps `[categorii, selectedProbaId, filtre]`

**Task 2 — Adăugiri:**
- `<CompetitieFilterBar filtre={...} toggleGen={...} setFiltre={...} resetFiltre={...} nrFiltreActive={...} probe={probe} grade={grade} />` în tab Categorii
- Counter buton tab: `categorii.length` → `filteredCategorii.length` (TAB-03)
- Pills probe standalone (`{probe.length > 1 && (...)}`) eliminate — filtrul de probă intră în `CompetitieFilterBar`

## Requirements Satisfied

| ID | Status | Description |
|----|--------|-------------|
| TAB-01 | DONE | Filtrul de probă integrat în CompetitieFilterBar — nu dispare |
| TAB-02 | DONE | Filtrele gen + vârstă + grad aplicate pe lista de categorii via aplicaFiltreCategorie |
| TAB-03 | DONE | Counter categorii se actualizează live (filteredCategorii.length) |
| INSC-03 | DONE | resetFiltre în handleSetActiveTab — filtrele se șterg la orice schimbare de tab |

## Deviations from Plan

### Auto-fix: Merge main (Rule 3 — Blocker)

**Found during:** Setup (înainte de Task 1)

**Issue:** Worktree `worktree-agent-a5569fbbe9f782e41` era la commit `95979c1` (mai vechi decât `main` la `d58259b`). Phase 6 artifacts (`hooks/useCompetitieFilters.ts`, `components/Competitii/CompetitieFilterBar.tsx`) nu existau în worktree — blocau toate taskurile din plan.

**Fix:** `git merge main` (fast-forward, fără conflicte) — aduce toate artefactele Phase 6 în worktree.

**Files modified:** 34 fișiere aduse prin merge (toate Phase 6 artifacts + .planning files).

**Commit:** Fast-forward merge — HEAD advansat de la `95979c1` la `d58259b` fără commit nou.

Nicio altă deviere — planul executat conform specificațiilor.

## Verification Results

```
npm run lint: PASSED (zero erori TypeScript)
grep useCompetitieFilters index.tsx: 3 apariții (import + apel + comentariu)
grep resetFiltre index.tsx: 5 apariții (destructurare + comentariu + apel + deps array + prop)
grep aplicaFiltreCategorie index.tsx: 2 apariții (import + useMemo)
grep CompetitieFilterBar index.tsx: 3 apariții (import + comentariu + JSX)
grep filteredCategorii.length index.tsx (non-comment): 2 apariții (counter tab + empty state)
```

## Known Stubs

Niciun stub — toate artefactele sunt complet wire-uite. `selectedProbaId` rămâne declarat și folosit în `filteredCategorii` useMemo (combinat cu `filtre.probaId` din hook prin `CompetitieFilterBar`). Va fi eliminat în planuri viitoare când pills standalone nu mai sunt necesare.

## Threat Flags

Nicio suprafață de securitate nouă față de planul declarat. Filtrele operează pe date deja in-memory.

## Self-Check: PASSED

- `components/Competitii/index.tsx`: FOUND
- Commit 436d4e4: FOUND
- Commit df3dd0a: FOUND
- `npm run lint`: PASS
