---
phase: 11-prezenta-refactorizata
plan: "04"
subsystem: prezenta
tags: [raport, prezenta, intervale-grad, lazy, router]
dependency_graph:
  requires: []
  provides: [raport-interval-examen]
  affects: [AppRouter, LazyComponents, types]
tech_stack:
  added: []
  patterns: [functie-pura-calcul, lazy-loading, filteredData-cache]
key_files:
  created:
    - components/Prezenta/RaportIntervalExamen.tsx
  modified:
    - types.ts
    - components/LazyComponents.tsx
    - components/AppRouter.tsx
decisions:
  - "Prezențele construite din filteredData.antrenamente (cache DataContext) — fără fetch suplimentar Supabase"
  - "Grade per sportiv din filteredData.istoricGrade (vedere_istoric_grade_sportiv deja în cache)"
  - "Funcția pură calculateGradeIntervals exportată din componentă (reutilizabilă)"
  - "Variante Button 'ghost'/'outline' nu există în design system — folosit 'secondary'"
metrics:
  duration: "~12 min"
  completed: "2026-06-19"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 3
---

# Phase 11 Plan 04: RaportIntervalExamen Summary

**One-liner:** Raport prezență per interval examen — count absolut per sportiv per perioadă delimitată de grade, accesat prin rută globală lazy `raport-interval-examen`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Creează RaportIntervalExamen.tsx | 4ce54b4 | components/Prezenta/RaportIntervalExamen.tsx |
| 2 | Înregistrare rută (Lazy + AppRouter + types) | 2567752 | types.ts, LazyComponents.tsx, AppRouter.tsx |

## What Was Built

### RaportIntervalExamen.tsx (nou, 331 linii)

Componentă React care implementează PRZ-05c: raport per interval examen la nivel de club.

**Funcție pură `calculateGradeIntervals`** (exportată): reproduce algoritmul din `useAttendanceStats.gradeStats` — calcul intervale Început→PrimulExamen, ExamenN→ExamenN+1, UltimulExamen→Prezent. Returnează count absolut de prezențe, fără procente. Ordine descrescătoare (cel mai recent interval primul).

**Date din cache DataContext** (fără query-uri suplimentare):
- `filteredData.antrenamente` → prezențe per sportiv (mapate din `p.status?.este_prezent`)
- `filteredData.istoricGrade` → grade per sportiv (view `vedere_istoric_grade_sportiv`)

**Funcționalități UI:**
- Filtru pe grupă (Select din design system intern)
- Card per sportiv cu intervale afișate ca badge-uri cu count
- Click pe nume sportiv → `onViewSportiv` callback
- Export CSV cu BOM pentru Excel (coloane: Nume Sportiv, Interval, Prezențe nr.)
- Header cu buton Back și titlu clar

### Înregistrare rută (3 fișiere modificate)

- **types.ts**: `'raport-interval-examen'` adăugat în union-ul `type View`
- **LazyComponents.tsx**: `export const RaportIntervalExamen = lazy(...)` după RaportLunarPrezenta
- **AppRouter.tsx**: `case 'raport-interval-examen'` cu `renderProtected(..., isAtLeastInstructor)` — SPORTIV nu are acces (T-11-08 mitigat)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Variante Button 'ghost'/'outline' nu există în design system**
- **Found during:** Task 1 — erori TypeScript la compilare
- **Issue:** `variant="ghost"` și `variant="outline"` nu sunt în union-ul ButtonProps din `components/ui.tsx`
- **Fix:** Înlocuit cu `variant="secondary"` (disponibil în design system)
- **Files modified:** components/Prezenta/RaportIntervalExamen.tsx
- **Commit:** 4ce54b4

## Security

- T-11-07: Date filtrate prin `filteredData` (deja per `visibleClubIds`); RLS pe `vedere_istoric_grade_sportiv` prin header `active-role-context-id`
- T-11-08: Ruta protejată cu `renderProtected(..., isAtLeastInstructor)` — SPORTIV nu poate accesa

## Known Stubs

None — componenta randează date reale din cache DataContext.

## Threat Flags

Nicio suprafață nouă de securitate față de `<threat_model>` din plan.

## Self-Check: PASSED

- [x] components/Prezenta/RaportIntervalExamen.tsx există
- [x] commit 4ce54b4 există
- [x] commit 2567752 există
- [x] `calculateGradeIntervals` exportată fără calcul procente (`* 100` absent)
- [x] `'raport-interval-examen'` în types.ts View union
- [x] `RaportIntervalExamen` în LazyComponents.tsx
- [x] `case 'raport-interval-examen'` cu `isAtLeastInstructor` în AppRouter.tsx
- [x] npx tsc --noEmit fără erori noi
