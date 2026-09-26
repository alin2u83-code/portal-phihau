---
phase: 31-hub-plati-si-facturi-consolidare-14-view-uri-in-4-tab-uri-fa
plan: 05
subsystem: payments
tags: [typescript, react, navigation, hub-pattern]

# Dependency graph
requires:
  - phase: 31-01
    provides: "platiHubConfig.ts — contract PlatiHubTabProps, harta props verificata"
  - phase: 31-02
    provides: "referinta (context) — verificata dar fara consum direct de artefacte noi in acest plan"
provides:
  - "components/Plati/hub/TabIncasari.tsx — tab Incasari (D-02), exporta TabIncasari + TabIncasariProps"
  - "components/Plati/hub/TabRapoarte.tsx — tab Rapoarte (D-03), exporta TabRapoarte"
  - "hideBackButton?: boolean pe JurnalIncasari, IstoricPlati (FacturiPersonale.tsx), FinancialDashboard"
affects: [31-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "onJurnalBack dedicat (nu onBack generic) pentru componente cu efect automat post-succes (JurnalIncasari apeleaza onBack la 1500ms dupa incasare) — evita ca ascunderea butonului sa rupa fluxul automat"
    - "hideBackButton?: boolean randat conditionat ({!hideBackButton && (<Button ... />)}) — pattern consecvent cu TabFacturi (31-04)"

key-files:
  created:
    - components/Plati/hub/TabIncasari.tsx
    - components/Plati/hub/TabRapoarte.tsx
  modified:
    - components/Plati/JurnalIncasari.tsx
    - components/Plati/FacturiPersonale.tsx
    - components/Plati/FinancialDashboard.tsx

key-decisions:
  - "TabIncasari primeste onJurnalBack (nu onBack) pentru montarea JurnalIncasari — oglinda handleJurnalBack din AppRouter.tsx, pastreaza fluxul de incasare multipla F1-F4 functional in hub"
  - "RaportFinanciar nu primeste hideBackButton — nu randeaza niciun buton de intoarcere (prop declarat dar nefolosit), confirmat pe cod real"
  - "preturiConfig, tipuriPlati, reduceri preluate NEFILTRAT direct din useData() (nu din filteredData) pentru JurnalIncasari, identic cu AppRouter.tsx"

patterns-established:
  - "TabIncasariProps extends PlatiHubTabProps cu platiPentruIncasare/onIncasareProcesata/onJurnalBack — contract consumat de shell-ul PlatiHub in 31-08"

requirements-completed: [D-02, D-03]

# Metrics
duration: ~10min
completed: 2026-09-26
---

# Phase 31 Plan 05: Tab-urile Încasări și Rapoarte Summary

**TabIncasari și TabRapoarte create cu props identice hărții verificate în 31-01; JurnalIncasari, IstoricPlati și FinancialDashboard primesc `hideBackButton?` opțional fără a atinge apelul automat `setTimeout(() => onBack(), 1500)` al Jurnalului.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-09-26
- **Tasks:** 2/2 completate
- **Files modified:** 5 (2 create, 3 modificate)

## Accomplishments

- `hideBackButton?: boolean` adăugat pe `JurnalIncasari`, `IstoricPlati` (FacturiPersonale.tsx) și `FinancialDashboard`, cu butonul "Înapoi" randat condiționat — comportamentul standalone (rol SPORTIV, deep-link) rămâne identic fără prop.
- Apelul automat `setTimeout(() => onBack(), 1500)` din `JurnalIncasari.tsx:494` verificat neatins (1 ocurență, identică înainte/după).
- `TabIncasari.tsx` creat (D-02): montează `JurnalIncasari` (cu `onJurnalBack` dedicat, nu `onBack` generic) și `IstoricPlati`, cu props identice hărții din `platiHubConfig.ts`.
- `TabRapoarte.tsx` creat (D-03): montează `RaportFinanciar` (fără `hideBackButton` — nu are buton de întoarcere) și `FinancialDashboard`.
- Fluxul de încasare multiplă (F1-F4) are toate conexiunile pregătite pentru shell-ul din 31-08: `platiPentruIncasare`, `onIncasareProcesata`, `onJurnalBack`.

## Task Commits

Fiecare task a fost commis atomic:

1. **Task 1: hideBackButton optional pe JurnalIncasari, IstoricPlati si FinancialDashboard** - `1b940e7` (feat)
2. **Task 2: Componentele TabIncasari si TabRapoarte** - `c40c1e2` (feat)

**Plan metadata:** (commit final, vezi mai jos)

## Files Created/Modified

- `components/Plati/hub/TabIncasari.tsx` - Tab Încasări (D-02): jurnal-incasari + istoric-plati, cu `onJurnalBack` dedicat
- `components/Plati/hub/TabRapoarte.tsx` - Tab Rapoarte (D-03): raport-financiar + financial-dashboard
- `components/Plati/JurnalIncasari.tsx` - `hideBackButton?: boolean` opțional, buton condiționat, `setTimeout(onBack)` neatins
- `components/Plati/FacturiPersonale.tsx` - `IstoricPlatiProps.hideBackButton?: boolean`, buton "Înapoi la Portal" condiționat
- `components/Plati/FinancialDashboard.tsx` - `FinancialDashboardProps.hideBackButton?: boolean`, buton "Înapoi la Meniu" condiționat

## Decisions Made

- `onJurnalBack` transmis către `JurnalIncasari.onBack` în loc de `onBack`-ul generic al hub-ului — necesar pentru ca golirea selecției (`setPlatiPentruIncasare([])`, implementată în PlatiHub 31-08) să se întâmple corect chiar și când `onBack` e apelat automat la 1500ms, nu doar la click manual.
- `RaportFinanciar` exclus explicit de la `hideBackButton` — verificat pe cod real (`grep -n onBack components/Plati/RaportFinanciar.tsx`) că nu randează niciun buton de întoarcere.
- Props `preturiConfig`, `tipuriPlati`, `reduceri` preluate direct din `useData()` (nefiltrat), nu din `filteredData` — identic cu `AppRouter.tsx:239` pentru `JurnalIncasari`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `TabIncasari` (export `TabIncasari`, `TabIncasariProps`) și `TabRapoarte` (export `TabRapoarte`) gata de import pentru shell-ul `PlatiHub` din 31-08.
- Contractul `onJurnalBack`/`onIncasareProcesata`/`platiPentruIncasare` documentat explicit — 31-08 trebuie să implementeze golirea selecției identic cu `handleJurnalBack`/`handleIncasareProcesata` din `AppRouter.tsx:78-89`.
- Niciun blocker cunoscut.

## Self-Check: PASSED

- FOUND: components/Plati/hub/TabIncasari.tsx
- FOUND: components/Plati/hub/TabRapoarte.tsx
- FOUND: commit 1b940e7 (Task 1)
- FOUND: commit c40c1e2 (Task 2)

---
*Phase: 31-hub-plati-si-facturi-consolidare-14-view-uri-in-4-tab-uri-fa*
*Completed: 2026-09-26*
