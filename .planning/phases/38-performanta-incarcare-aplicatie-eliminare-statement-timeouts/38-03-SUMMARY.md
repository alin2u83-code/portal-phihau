---
phase: 38-performanta-incarcare-aplicatie-eliminare-statement-timeouts
plan: 03
subsystem: frontend-loading
tags: [react-query, supabase, pagination, chunking, data-provider]

requires: [38-02]
provides:
  - useSportivi/usePlati cu enabled guard (nicio cerere fara context de rol)
  - fetchSportiviData cu count exact doar la paginare
  - useAttendanceData cu prezenta pe bucati (100 id, 3 in zbor, paginat) + filtreIncarcate
  - o singura instanta a providerului de date (useData in 3 componente)
affects: [38-04]

key-files:
  modified:
    - hooks/useSportivi.ts
    - hooks/usePlati.ts
    - hooks/useAttendanceData.ts
    - components/AdminDashboard.tsx
    - components/Prezenta/MartialAttendance.tsx
    - components/SportivDashboard/index.tsx

key-decisions:
  - "Aceleasi apelanti, aceleasi chei de query; API-ul hook-urilor e compatibil (doar camp nou filtreIncarcate)"

requirements-completed: [D-01, D-03]
completed: 2026-11-16
---

# Phase 38 Plan 03: Hook-uri sigure la pornire tarzie Summary

**Hook-urile sportivi/plati nu mai trimit nimic inainte de contextul rolului, count exact doar la paginare, prezenta se incarca pe bucati de 100 id-uri (max 3 in zbor, paginat peste 1000), iar AdminDashboard/MartialAttendance/SportivDashboard nu mai creeaza o a doua instanta a providerului.**

## Task Commits

1. Task 1: guard enabled, count doar cu paginare, prezenta pe bucati - `5fb2ebab` (hooks/useSportivi.ts, hooks/usePlati.ts, hooks/useAttendanceData.ts)
2. Task 2: useData() in locul useDataProvider() - `5b625cf2` (components/AdminDashboard.tsx, components/Prezenta/MartialAttendance.tsx, components/SportivDashboard/index.tsx)

## Detalii

- `useSportivi`: `enabled: !!contextId`; `select(..., pagination ? { count: 'exact' } : undefined)`; `count: count ?? formattedData.length` (cu loadAll, pagination nu se trimite, deci totalul = randurile intoarse). Select-urile, filtrele, cheia neschimbate. Plafonul de 1000 de randuri la apelul fara paginare ramane (38-01 L11, in afara fazei).
- `usePlati`: `enabled: !!contextId`.
- `useAttendanceData`: `.in('antrenament_id', ids)` unic inlocuit cu `imparteInBucati(ids,100)` + `ruleazaCuLimita(...,3)` + `incarcaToatePaginile` (ordine antrenament_id, sportiv_id). Orice bucata respinsa sau cu eroare se arunca ca inainte (catch neschimbat). `filtreIncarcate` = `JSON.stringify(filters ?? null)` setat dupa `setAntrenamente` la succes, `null` pana la prima reusita.
- `components/*`: `useData()` din `contexts/DataContext`, aceleasi campuri destructurate, efectele fetchIstoricVedere pastrate. `grep "useDataProvider()" components` = 0 rezultate; doar `contexts/DataContext.tsx` mai instantiaza providerul. Cele trei componente nu sunt randate in zona externa (care nu are DataProvider).
- Nota: `istoricPrezenta` e acum partajat; ultimul ecran care apeleaza `fetchIstoricVedere` decide continutul (un singur ecran din cele trei e montat la un moment dat).

## Verificare

- `npx tsc --noEmit -p .`: 0 erori in tot proiectul (rulat dupa fiecare task).
- `npx tsx utils/incarcareDate.test.ts`: "Toate testele au trecut". `npx tsx utils/supabaseHelpers.test.ts`: "Toate testele au trecut".
- grep: `enabled: !!contextId` in useSportivi si usePlati; `imparteInBucati`, `filtreIncarcate` in useAttendanceData.
- NU verificat: rulare in browser, comportament real al paginarii prezentei pe date reale, flux Sportivi cu loadAll.

## Deviations from Plan

None - planul executat ca scris.

## Known Stubs

Niciunul. `filtreIncarcate` nu are inca consumator (38-04).

## Threat Flags

Niciunul. T-38-08/09/10 mitigate (useData, enabled guard, bucati de 100 cu 3 in zbor).

## Self-Check: PASSED

Commit-urile 5fb2ebab si 5b625cf2 exista; STATE.md/ROADMAP.md neatinse (le actualizeaza orchestratorul).
