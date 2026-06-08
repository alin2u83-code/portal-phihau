---
phase: 06-infrastructur-filtrare-unificat
plan: "01"
subsystem: competitii-filtrare
tags: [hook, component, filter, typescript, tailwind]
dependency_graph:
  requires: []
  provides:
    - hooks/useCompetitieFilters.ts (useCompetitieFilters, aplicaFiltreCategorie, CompetitieFiltre)
    - components/Competitii/CompetitieFilterBar.tsx (CompetitieFilterBar, CompetitieFilterBarProps)
  affects:
    - Phase 7 va consuma aceste artefacte pe 4 tab-uri
tech_stack:
  added: []
  patterns:
    - Hook de stare grupat cu funcție pură co-locată
    - Componentă prezentațională props-driven cu un singur useState local
key_files:
  created:
    - hooks/useCompetitieFilters.ts
    - components/Competitii/CompetitieFilterBar.tsx
  modified: []
decisions:
  - "CompetitieFiltre definit în useCompetitieFilters.ts (nu types.ts) — tip UI state, nu domeniu"
  - "aplicaFiltreCategorie returnează CategorieCompetitie[] (nu Set<string>) — divergență intenționată D-07"
  - "Grad selects folosesc value=ordine.toString() (nu id) pentru compatibilitate cu aplicaFiltreCategorie"
  - "filtreVisible rămâne în componentă (nu în hook) — 4 tab-uri independente în Phase 7"
  - "resetFiltre construiește gen: new Set() explicit (nu referința din FILTRE_INITIALE) — Pitfall 1"
metrics:
  duration: "~10 min"
  completed: "2026-06-08T19:02:09Z"
  tasks_completed: 3
  files_created: 2
  files_modified: 0
---

# Phase 06 Plan 01: Infrastructură Filtrare Unificată — Summary

**One-liner:** Hook de stare `useCompetitieFilters` cu funcție pură `aplicaFiltreCategorie` și componentă prezentațională `CompetitieFilterBar` — infrastructura shared pentru sistemul de filtrare unificat din modulul Competiții.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CompetitieFiltre interface + FILTRE_INITIALE + aplicaFiltreCategorie | ff8d6ff | hooks/useCompetitieFilters.ts (creat) |
| 2 | useCompetitieFilters hook (state + toggle/set/reset + nrFiltreActive) | ff8d6ff | hooks/useCompetitieFilters.ts (inclus în Task 1) |
| 3 | CompetitieFilterBar presentational component | ae0b15f | components/Competitii/CompetitieFilterBar.tsx (creat) |

**Notă Task 2:** Hook-ul `useCompetitieFilters` a fost implementat complet în același commit ca Task 1 — ambele task-uri produceau conținut în același fișier și au fost create atomic.

## Artifacts Produced

### `hooks/useCompetitieFilters.ts` (81 linii)

- **`CompetitieFiltre`** — interfată exportată cu 6 câmpuri: `gen: Set<string>`, `probaId`, `varstaMin`, `varstaMax`, `gradMin`, `gradMax`
- **`FILTRE_INITIALE`** — const la nivel de modul, stabil referențial (evită `new Set()` la fiecare resetare)
- **`aplicaFiltreCategorie(categorii, filtre): CategorieCompetitie[]`** — funcție pură cu logică AND, garduri `!isNaN(Number(...))` pe toate câmpurile numerice (ASVS L1 V5 / T-06-01)
- **`useCompetitieFilters()`** — hook returnând `{ filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive }`

### `components/Competitii/CompetitieFilterBar.tsx` (154 linii)

- **`CompetitieFilterBarProps`** — interfată exportată cu 7 props
- **`CompetitieFilterBar`** — componentă prezentațională cu un singur `useState(false)` intern
- Controale: Gen chips hardcodate `['Feminin', 'Masculin', 'Mixt']`, Probă select, Vârstă inputs, Grad selects cu `ordine.toString()` ca value
- Buton toggle cu `touchAction: 'manipulation'`, badge count, chevron rotit 180° când deschis

## Requirements Satisfied

| ID | Status | Description |
|----|--------|-------------|
| INFR-01 | DONE | `useCompetitieFilters` hook exportat cu API complet grupat |
| INFR-02 | DONE | `CompetitieFilterBar` componentă prezentațională props-driven cu UI complet |
| INFR-03 | DONE | `aplicaFiltreCategorie` pură exportată cu logică AND și garduri NaN |

## Deviations from Plan

**Task 1 și Task 2 implementate în același commit:** Planul specifica task-uri separate pentru "interfața + funcția pură" și "hook-ul", dar ambele vizau același fișier `hooks/useCompetitieFilters.ts`. Implementarea completă a ambelor în Task 1 a eliminat un commit redundant fără a compromite funcționalitatea sau criteriile de acceptanță.

Nicio altă deviație — planul executat conform specificațiilor.

## Threat Mitigations Applied

| Threat | Mitigation |
|--------|-----------|
| T-06-01: Tampering pe cast-uri numerice | Garduri `!isNaN(Number(...))` adăugate pe toate 4 comparațiile numerice din `aplicaFiltreCategorie` |
| T-06-02: Information Disclosure | Filtrul operează pe date in-memory deja încărcate — niciun query Supabase nou |

## Verification

- `npm run lint` (tsc --noEmit): PASS — zero erori TypeScript
- Niciun fișier tab existent modificat (InscrieriView.tsx, index.tsx, CategoriiTemplateManager.tsx, RaportInscrieri.tsx)
- Niciun pachet npm nou adăugat

## Known Stubs

Niciun stub — artefactele sunt complete și exportate corect. Phase 7 le va monta pe tab-urile existente.

## Threat Flags

Nicio suprafață de securitate nouă față de planul declarat.

## Self-Check: PASSED

- `hooks/useCompetitieFilters.ts`: FOUND
- `components/Competitii/CompetitieFilterBar.tsx`: FOUND
- Commit ff8d6ff: FOUND
- Commit ae0b15f: FOUND
- `npm run lint`: PASS
