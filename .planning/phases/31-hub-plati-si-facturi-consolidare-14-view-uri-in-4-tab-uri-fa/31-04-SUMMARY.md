---
phase: 31-hub-plati-si-facturi-consolidare-14-view-uri-in-4-tab-uri-fa
plan: 04
subsystem: payments
tags: [typescript, react, hub-pattern, ui]

# Dependency graph
requires:
  - phase: 31-01
    provides: "components/Plati/hub/platiHubConfig.ts (PlatiHubTabProps, SectiuneHub)"
  - phase: 31-03
    provides: "components/Plati/FacturaDetaliu.tsx (modal plataId/onClose)"
provides:
  - "components/Plati/hub/TabFacturi.tsx — tab-ul Facturi al hub-ului (D-01), monteaza PlatiScadente/GestiuneFacturi/FacturiFaraPrezenta cu props identice AppRouter"
  - "Props optionale hideBackButton pe PlatiScadente, GestiuneFacturi, FacturiFaraPrezenta"
  - "Prop optional onDeschideDetalii pe PlatiScadente si GestiuneFacturi — punct de intrare in ecranul de detaliu factura (D-08)"
affects: [31-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Props optionale (hideBackButton, onDeschideDetalii) adaugate la componente existente fara sa schimbe API-ul vechi — apelurile din AppRouter raman valide neschimbate"
    - "TabFacturi retine doar plataId (nu obiectul Plata) pentru deschiderea FacturaDetaliu — evita transmiterea de campuri calculate stale catre modal"

key-files:
  created:
    - components/Plati/hub/TabFacturi.tsx
  modified:
    - components/Plati/PlatiScadente.tsx
    - components/Plati/GestiuneFacturi.tsx
    - components/Plati/FacturiFaraPrezenta.tsx

key-decisions:
  - "onDeschideDetalii NU e adaugat pe FacturiFaraPrezenta — planul nu cerea buton de detalii acolo (doar hideBackButton), consecvent cu interfaces din plan"
  - "TabFacturi randeaza FacturaDetaliu necondiționat la finalul fragmentului (componenta returneaza null cand plataId e null) — un singur modal comun pentru toate cele 3 sectiuni"
  - "onBack transmis catre GestiuneFacturi in hub e cel al hub-ului (nu canGoBack/goBack din AppRouter) — butonul propriu e ascuns prin hideBackButton, transmiterea e doar pentru compatibilitate de tip"

patterns-established: []

requirements-completed: [D-01, D-08, D-09]

# Metrics
duration: ~15min
completed: 2026-09-26
---

# Phase 31 Plan 04: Tab-ul Facturi al hub-ului (D-01, D-08) Summary

**`TabFacturi.tsx` monteaza PlatiScadente/GestiuneFacturi/FacturiFaraPrezenta cu props identice celor din AppRouter (harta 31-01) si deschide modalul `FacturaDetaliu` (31-03) printr-un buton nou "Detalii" pe desktop si mobil, fara sa schimbe API-ul vechi al celor 3 componente.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-09-26
- **Tasks:** 2/2 completate
- **Files modified:** 4 (1 creat, 3 modificate)

## Accomplishments

- `PlatiScadente.tsx`, `GestiuneFacturi.tsx`, `FacturiFaraPrezenta.tsx` primesc `hideBackButton?: boolean` — ascunde butonul propriu "Meniu" cand sunt montate in hub, fara sa afecteze randarea existenta cand prop-ul nu e transmis (apelurile din `AppRouter.tsx` raman identice).
- `PlatiScadente.tsx` si `GestiuneFacturi.tsx` primesc `onDeschideDetalii?: (plata: Plata) => void` — buton nou "Detalii & corecție" (`ClipboardListIcon`) pe randul desktop si pe cardul mobil, langa butoanele existente (Încasează/Editează/Șterge), fara sa le inlocuiasca.
- `components/Plati/hub/TabFacturi.tsx` creat: randeaza exact una din cele 3 componente in functie de `sectiune`, cu props identice hartii verificate in 31-01 (inclusiv `tipuriPlati` nefiltrat pentru `GestiuneFacturi`), plus `FacturaDetaliu` montat o singura data la finalul fragmentului, controlat de `plataDetaliuId` (retine DOAR id-ul, nu obiectul `Plata`).
- `npm run lint` (`tsc --noEmit`) trece curat dupa fiecare task; toate gardele grep din acceptance criteria confirmate manual inainte de commit.
- Verificat explicit ca diff-ul pe `PlatiScadente.tsx` nu atinge `handleSaveEdit`, `handleProcessPayment`, `handleGenerateSubscriptions`, `handleIncasareClick` — zero modificari in afara interfetei/destructurarii/header/celule de actiuni.

## Task Commits

1. **Task 1: Props optionale hideBackButton + onDeschideDetalii pe PlatiScadente, GestiuneFacturi, FacturiFaraPrezenta** - `7d1a897` (feat)
2. **Task 2: Componenta TabFacturi cu ecranul de detaliu integrat** - `7045be6` (feat)

## Files Created/Modified

- `components/Plati/hub/TabFacturi.tsx` - `TabFacturi`, `TabFacturiProps` (extinde `PlatiHubTabProps`) — tab-ul Facturi al hub-ului, montare condiționată pe `sectiune` + `FacturaDetaliu`
- `components/Plati/PlatiScadente.tsx` - `hideBackButton?`, `onDeschideDetalii?` in props; buton "Meniu" condiționat; buton `ClipboardListIcon` desktop (celula Acțiuni) + mobil (card)
- `components/Plati/GestiuneFacturi.tsx` - `hideBackButton?`, `onDeschideDetalii?` in props; buton "Meniu" condiționat; buton `ClipboardListIcon` in coloana `actions` + `renderMobileItem`
- `components/Plati/FacturiFaraPrezenta.tsx` - `hideBackButton?` in props; buton "Meniu" condiționat

## Decisions Made

- `onDeschideDetalii` nu e adaugat pe `FacturiFaraPrezenta` — planul specifica explicit doar `hideBackButton` pentru acest fisier (facturile fara prezenta nu au flux de corecție rapidă în acest plan).
- `TabFacturi` transmite `onBack`-ul hub-ului catre `GestiuneFacturi` (nu `canGoBack ? goBack : handleBackToDashboard` din AppRouter) — butonul propriu e ascuns via `hideBackButton`, deci parametrul e transmis doar pentru compatibilitate de tip (props-ul e obligatoriu în interfața existentă).
- Modalul `FacturaDetaliu` e montat o singura data la finalul componentei (nu duplicat per sectiune) — controlat exclusiv de `plataDetaliuId`, simplifica logica si evita randarea a 3 instante ale aceluiasi modal.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

Niciunul. `TabFacturi` citeste live din `filteredData`/`useData()` (fara date mock), montează componentele reale existente (`PlatiScadente`, `GestiuneFacturi`, `FacturiFaraPrezenta`) si modalul real `FacturaDetaliu` — nimic nu e stub sau placeholder.

## Threat Flags

Niciuna in afara celor deja documentate in `<threat_model>`-ul planului (T-31-04-01..03, T-31-04-SC) — nicio suprafata noua de retea/auth/schema. `TabFacturi` nu are guard propriu (T-31-04-01 e mitigat de guard-ul `canManageFinances` al shell-ului `PlatiHub`, livrat in 31-08 — nemontat inca, deci nefolosit in productie pana atunci).

## Next Phase Readiness

- `components/Plati/hub/TabFacturi.tsx` e gata de import pentru planul 31-08 (shell `PlatiHub` + rutare `AppRouter`), care va monta acest tab cu guard `canManageFinances` identic celui vechi al celor 3 vederi.
- `AppRouter.tsx` continua sa monteze `PlatiScadente`, `GestiuneFacturi`, `FacturiFaraPrezenta` pe rutele vechi neschimbat (props-urile noi sunt optionale, apelurile existente nu le transmit) — zero schimbare de comportament pe rutele existente pana la 31-08, conform `<success_criteria>`.
- Niciun blocker cunoscut.

## Self-Check: PASSED

- FOUND: components/Plati/hub/TabFacturi.tsx
- FOUND: components/Plati/PlatiScadente.tsx (modificat)
- FOUND: components/Plati/GestiuneFacturi.tsx (modificat)
- FOUND: components/Plati/FacturiFaraPrezenta.tsx (modificat)
- FOUND: commit 7d1a897 (Task 1)
- FOUND: commit 7045be6 (Task 2)
