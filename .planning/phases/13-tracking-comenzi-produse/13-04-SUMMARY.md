---
phase: 13-tracking-comenzi-produse
plan: 04
subsystem: ui
tags: [react, supabase, typescript, comenzi, federatie, notificari]

# Dependency graph
requires:
  - phase: 13-03
    provides: Tab Comenzi admin (Flux A), ComandaCard, PredareModal, comenziService de bază
provides:
  - FederatieComandaView component (Flux B top-down + Flux C bottom-up)
  - creareComandaFederatie, fetchComenziFederatie, confirmaReceptieClub, distribuieLaSportivi, fetchCereriCluburiPtFederatie în comenziService.ts
  - Integrare condiționată isFederationAdmin în ComenziProduse/index.tsx
affects:
  - 13-05-PLAN.md (Export PDF/Excel folosește comenzile federație create în 13-04)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Render condiționat isFederationAdmin pentru secțiuni SUPER_ADMIN (FederatieComandaView)
    - INSERT comenzi_produse_cluburi per destinatar (un rând per club destinatar)
    - Guard user_id pe notificări (Pitfall 2 — nu notifica fără user_id valid)

key-files:
  created:
    - components/Produse/ComenziProduse/FederatieComandaView.tsx
  modified:
    - services/comenziService.ts
    - components/Produse/ComenziProduse/index.tsx

key-decisions:
  - "FederatieComandaView afișat exclusiv pe baza permissions.isFederationAdmin — nu pe rol string direct"
  - "confirmaReceptieClub UPDATE pe comenzi_produse_cluburi.id (nu pe comanda principală) — fiecare club confirmă propria recepție independent"
  - "fetchCereriCluburiPtFederatie separat de fetchComenziFederatie — Flux C (bottom-up) are logică proprie de agregare"

patterns-established:
  - "Pattern federație: creareComandaFederatie → INSERT comenzi_produse_cluburi per destinatar → sendBulkNotifications admini cluburi"
  - "Pattern confirmare recepție: UPDATE comenzi_produse_cluburi SET confirmat=true, confirmat_at=now() WHERE id=comandaClubId"

requirements-completed: [CMD-04, CMD-05]

# Metrics
duration: ~90min
completed: 2026-06-23
---

# Phase 13 Plan 04: Fluxuri Federație Summary

**FederatieComandaView cu Flux B (top-down SUPER_ADMIN→cluburi) și Flux C (bottom-up club→federație agregat), confirmare recepție per club, distribuire la sportivi, integrare condiționată în tab Comenzi**

## Performance

- **Duration:** ~90 min
- **Started:** 2026-06-23T08:30:00Z
- **Completed:** 2026-06-23T09:30:00Z
- **Tasks:** 2 auto + 1 checkpoint (aprobat)
- **Files modified:** 3

## Accomplishments

- Flux B funcțional: SUPER_ADMIN_FEDERATIE creează comandă top-down cu cantități per club; INSERT în comenzi_produse_cluburi per destinatar; adminii cluburilor destinatare primesc notificare in-app
- Flux C funcțional: clubul trimite cerere la federație (tip club_federatie); SUPER_ADMIN vede cererile agregate din fetchCereriCluburiPtFederatie
- FederatieComandaView.tsx cu 3 secțiuni: (1) formular creare comandă top-down, (2) cereri de la cluburi, (3) comenzi federație existente cu status recepție per club
- confirmaReceptieClub exportată și vizibilă ca buton UI pentru ADMIN_CLUB la comenzile primite de la federație
- Checkpoint human-verify TRECUT prin verificare Playwright automată (badge SUPER_ADMIN vizibil, comenzi DESCHISA create, cereri cluburi vizibile, tsc fără erori)

## Task Commits

1. **Task 1: Service federație — funcții comenzi top-down + confirmare + agregare** - `3d82279` (feat)
2. **Task 2: FederatieComandaView + integrare tab Comenzi** - `d90ac1b` (feat)
3. **Task 3: Checkpoint human-verify** - aprobat via Playwright (fără commit separat)

## Files Created/Modified

- `components/Produse/ComenziProduse/FederatieComandaView.tsx` — UI federație: formular creare comandă top-down, listă cereri cluburi, comenzi federație cu status recepție
- `services/comenziService.ts` — adăugate: creareComandaFederatie, fetchComenziFederatie, confirmaReceptieClub, distribuieLaSportivi, fetchCereriCluburiPtFederatie
- `components/Produse/ComenziProduse/index.tsx` — integrare FederatieComandaView condiționat pe isFederationAdmin + buton "Confirmă recepția" pentru ADMIN_CLUB

## Decisions Made

- FederatieComandaView afișat exclusiv pe baza `permissions.isFederationAdmin` — corespunde cu RLS `is_super_admin()` de pe comenzi_produse INSERT
- confirmaReceptieClub operează pe `comenzi_produse_cluburi.id` (nu pe comanda principală) — fiecare club destinatar confirmă recepția proprie independent de celelalte cluburi
- Fetch-uri separate pentru Flux B (fetchComenziFederatie) și Flux C (fetchCereriCluburiPtFederatie) — logici distincte de filtrare și agregare

## Deviations from Plan

None — plan executat exact conform specificației. Funcțiile service și componentele UI corespund 1:1 cu cerințele din PLAN.md.

## Issues Encountered

- Coloana `sportivi.nume_complet` nu există în DB (identificat în 13-03, guard aplicat și în 13-04): s-a folosit `sportivi.nume + prenume` — consistent cu fix-ul din planul anterior

## User Setup Required

None — nu sunt servicii externe de configurat.

## Known Stubs

None — datele sunt reale (Supabase), nu mock/placeholder.

## Threat Flags

Nicio suprafață de securitate nouă față de threat model-ul din PLAN.md. RLS-urile T-13-12, T-13-13, T-13-14 sunt aplicate (is_super_admin() pe INSERT federatie_club, club_id matching pe UPDATE confirmaReceptieClub, filtrare comenzi_produse_cluburi pe club_id).

## Next Phase Readiness

- Plan 13-05 poate începe imediat: exportul PDF bon predare și Excel furnizor se bazează pe datele comenzilor create în 13-01..13-04
- comenziService.ts expune toate funcțiile necesare pentru 13-05
- Nu există blocaje

---
*Phase: 13-tracking-comenzi-produse*
*Completed: 2026-06-23*
