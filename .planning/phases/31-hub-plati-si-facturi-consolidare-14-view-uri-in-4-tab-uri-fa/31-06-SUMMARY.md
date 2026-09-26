---
phase: 31-hub-plati-si-facturi-consolidare-14-view-uri-in-4-tab-uri-fa
plan: 06
subsystem: payments
tags: [typescript, react, hub-pattern, navigation]

# Dependency graph
requires:
  - phase: 31-01
    provides: "Contract PlatiHubTabProps, gruparea D-01..D-05 (platiHubConfig.ts)"
provides:
  - "components/Plati/hub/TabConfigurare.tsx — tab-ul Configurare al hub-ului (D-04)"
  - "Prop optional hideBackButton pe TipuriAbonamentManagement, ConfigurarePreturi, ReduceriManagement, TaxeAnuale, GestionareNomenclatoare"
affects: [31-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guard de acces pastrat in interiorul componentei de tab (nu doar la nivelul rezolvitorului de pozitie) — AccessDenied ca a doua linie de aparare pentru taxe-anuale"

key-files:
  created:
    - components/Plati/hub/TabConfigurare.tsx
  modified:
    - components/Plati/TipuriAbonament.tsx
    - components/Plati/ConfigurarePreturi.tsx
    - components/Plati/Reduceri.tsx
    - components/Plati/TaxeAnuale.tsx
    - components/Grade/GestionareNomenclatoare.tsx

key-decisions:
  - "hideBackButton invelit exclusiv in jurul elementului Button de intoarcere — la TaxeAnuale h1/p raman afisate in acelasi div"
  - "plati (GestionareNomenclatoare) si reduceri (ReduceriManagement) transmise NEFILTRAT din useData(), nu din filteredData — paritate exacta cu AppRouter.tsx:263,265"
  - "Guard-ul taxe-anuale (isSuperAdmin || isAdminClub) reimplementat identic in TabConfigurare, cu AccessDenied ca fallback vizibil"

patterns-established:
  - "Componenta de tab consuma PlatiHubTabProps si ramifica pe sectiune, cu hideBackButton pe fiecare montare — consistent cu TabFacturi/TabIncasari (31-04/31-05)"

requirements-completed: [D-04]

# Metrics
duration: ~15min
completed: 2026-09-26
---

# Phase 31 Plan 06: Tab Configurare hub Plati Summary

**Tab-ul "Configurare" al hub-ului Plăți & Facturi (D-04) montează cele 5 ecrane existente (Tipuri Abonament, Configurare Prețuri, Reduceri, Taxe Anuale, Nomenclatoare) cu props identice hărții verificate în 31-01, păstrând guard-ul de acces la Taxe Anuale.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-09-26
- **Tasks:** 2/2 completate
- **Files modified:** 6 (1 create, 5 modificate)

## Accomplishments

- Cele 5 componente de configurare (`TipuriAbonamentManagement`, `ConfigurarePreturi`, `ReduceriManagement`, `TaxeAnuale`, `GestionareNomenclatoare`) primesc acum un prop opțional `hideBackButton` care ascunde exclusiv butonul de întoarcere, fără nicio altă schimbare de logică — standalone rămân identice.
- `components/Plati/hub/TabConfigurare.tsx` creat: montează cele 5 ecrane pe baza `sectiune`, cu props identice celor din `AppRouter.tsx` (verificate în harta 31-01).
- Guard-ul vechi al vederii Taxe Anuale (`permissions.isSuperAdmin || permissions.isAdminClub`) reimplementat în interiorul tab-ului, cu `AccessDenied` afișat dacă un rol neautorizat ajunge totuși pe secțiunea `taxe-anuale` (a doua linie de apărare, după fallback-ul din `rezolvaPozitieHub` 31-01).
- `plati` (către `GestionareNomenclatoare`) și `reduceri` (către `ReduceriManagement`) transmise nefiltrat din `useData()`, exact ca în `AppRouter.tsx:263,265` — verificarea „tip în uz" continuă să vadă toate facturile.

## Task Commits

Fiecare task a fost comis atomic:

1. **Task 1: hideBackButton optional pe cele 5 componente de configurare** - `aee10a2` (feat)
2. **Task 2: Componenta TabConfigurare cu guard-ul Taxe Anuale** - `574b408` (feat)

## Files Created/Modified

- `components/Plati/hub/TabConfigurare.tsx` - Tab-ul Configurare al hub-ului: ramifică pe `sectiune` către cele 5 componente existente, cu guard taxe-anuale in-line
- `components/Plati/TipuriAbonament.tsx` - Prop opțional `hideBackButton`, buton de întoarcere ascuns condiționat
- `components/Plati/ConfigurarePreturi.tsx` - Prop opțional `hideBackButton`, buton de întoarcere ascuns condiționat
- `components/Plati/Reduceri.tsx` - Prop opțional `hideBackButton`, buton de întoarcere ascuns condiționat
- `components/Plati/TaxeAnuale.tsx` - Prop opțional `hideBackButton`, buton de întoarcere ascuns condiționat (h1/p rămân afișate)
- `components/Grade/GestionareNomenclatoare.tsx` - Prop opțional `hideBackButton`, buton de întoarcere ascuns condiționat

## Decisions Made

- `hideBackButton` a fost adăugat identic (nume, poziție în props, comentariu) pe toate cele 5 componente pentru consecvență cu pattern-ul deja stabilit în 31-04/31-05 (`TabFacturi`/`TabIncasari`).
- Nicio componentă de tab nu are `Suspense` propriu sau interogare Supabase directă — toată logica de date rămâne în componentele existente montate.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `TabConfigurare` e gata de consumat de shell-ul `PlatiHub` (31-08), alături de `TabFacturi` (31-04) și `TabIncasari`/`TabRapoarte` (31-05).
- Niciun blocker cunoscut.

## Self-Check: PASSED

- FOUND: components/Plati/hub/TabConfigurare.tsx
- FOUND: commit aee10a2 (Task 1)
- FOUND: commit 574b408 (Task 2)

---
*Phase: 31-hub-plati-si-facturi-consolidare-14-view-uri-in-4-tab-uri-fa*
*Completed: 2026-09-26*
