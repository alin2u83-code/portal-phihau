---
phase: 33-taxe-anuale-frqkd-fram-doua-taxe-separate-pret-config-super-
plan: 08
subsystem: ui
tags: [react, taxe-anuale, profil-sportiv, competitii, fram, frqkd]

requires:
  - phase: 33-04
    provides: utils/taxeAnuale.ts (stareTaxa, areTaxaAchitata, ETICHETE_STARE_TAXA), formatPerioadaTaxa, vizeSportivi/decontSportivi in useData
provides:
  - TaxeAnualeIstoric (istoric taxe FRQKD/FRAM per sportiv, in tab-ul Financiar al profilului)
  - areVizaFRAM cu semantica noua (taxa FRAM pe an achitata sau scutita), implementare unica in Competitii
affects: [33-09, 33-10, competitii]

tech-stack:
  added: []
  patterns:
    - "Componenta de profil fara query-uri proprii: date din useData() filtrate de RLS"
    - "Restante FRAM = doar avertisment, nicio prop disabled legata de areVizaFRAM"

key-files:
  created:
    - components/UserProfile/TaxeAnualeIstoric.tsx
  modified:
    - components/UserProfile.tsx
    - components/Competitii/constants.tsx
    - components/Competitii/InscriereClubWizard/Pas1.tsx

key-decisions:
  - "Coloana 'Virat federatiei' afiseaza '—' pentru rolul SPORTIV (nu vede deconturile); altfel 'Da · data' / 'Nu'"
  - "Starea taxei in istoric se calculeaza fara clubId, ca sportivul transferat sa-si vada istoricul complet"

requirements-completed: [TA-11, TA-15]

duration: 10min
completed: 2026-10-05
---

# Phase 33 Plan 08: Istoric taxe pe profil si avertisment FRAM corect Summary

**Istoric taxe anuale FRQKD/FRAM pe profilul sportivului si avertismentul «viza FRAM» din Competitii bazat doar pe taxa FRAM a anului (achitata sau scutita), strict informativ.**

## Accomplishments
- `TaxeAnualeIstoric`: card cu tabel (desktop) / carduri (mobil); coloane taxa (badge violet FRQKD / sky FRAM), perioada, stare (inclusiv scutit cu motiv, in asteptare), suma, virat federatiei. EmptyState cand nu exista vize.
- Randat in `UserProfile.tsx` sub `FinanciarTab` (+4 linii: import, fragment, wrapper `mt-6`).
- `areVizaFRAM` din `constants.tsx` delegat la `areTaxaAchitata(vize, sportivId, 'FRAM', an)`; copia locala din `Pas1.tsx` eliminata (import din `../constants`). Textul WarningVizaFRAM precizeaza ca inscrierea nu este blocata.

## Task Commits
1. Task 1: istoric taxe pe profil - `ed8b637`
2. Task 2: avertisment FRAM neblocant - `20e0653`

## Verification
- `npx tsc --noEmit` trece fara erori.
- grep: nicio `disabled={...areVizaFRAM|faraViza...}` in components/Competitii.
- `git diff --stat components/UserProfile.tsx`: 4 insertii.

## Deviations from Plan
None - plan executed exactly as written.

## Known Stubs
None.

## Threat Flags
None (fara query-uri noi, randare JSX a motivului scutirii).

## Self-Check: PASSED
