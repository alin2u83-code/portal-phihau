---
phase: 36-acces-extern-competitie-prin-link-login-email-otp-doar-zona-
plan: 03
subsystem: ui
tags: [react, competitii, acces-extern, wizard, read-only]
requires: [36-01]
provides:
  - "InscriereClubWizard cu prop interclubDezactivat (D-14)"
  - "PlatiClubExtern: vedere read-only taxe club (D-08)"
  - "CompetitieDetail exportat cu mode='extern' + externRol (D-06, D-07, D-09, D-10)"
affects: [36-09]
tech-stack:
  added: []
  patterns: ["mode opt-in prin prop; portalul principal neschimbat cand mode lipseste"]
key-files:
  created:
    - components/Competitii/PlatiClubExtern.tsx
  modified:
    - components/Competitii/InscriereClubWizard/types.ts
    - components/Competitii/InscriereClubWizard/index.tsx
    - components/Competitii/InscriereClubWizard/Pas3Echipe.tsx
    - components/Competitii/InscriereClubWizard/Pas4Sumar.tsx
    - components/Competitii/index.tsx
key-decisions:
  - "canEditArme false pentru externRol INSTRUCTOR (aliniere cu RLS Faza 35: arme editabile doar ADMIN_CLUB/federatie) - de confirmat"
  - "Wizardul ramane vizibil in extern doar daca permissions.isAdminClub (36-09 trebuie sa construiasca permisiunile corespunzator); altfel se vede InscrieriView"
  - "myClubId mutat inainte de fetchData (era declarat dupa) pentru filtrul extern"
requirements-completed: [ACX-04, ACX-05, ACX-06, ACX-07, ACX-08]
duration: 15min
completed: 2026-11-05
---

# Phase 36 Plan 03: Pregatire UI competitii pentru zona externa Summary

**CompetitieDetail cu mode='extern' (4 file: Inscrieri/Categorii/Taxe/Detalii), wizard fara functii inter-club si vedere read-only a taxelor clubului.**

## Task Commits
1. Task 1: flag `interclubDezactivat` in wizard - `7f15f78`
2. Task 2: `PlatiClubExtern` + `CompetitieDetail` mode extern - `a83ce77`

## Ce s-a facut
- Wizard: `interclubDezactivat` trece index -> Pas3 (nu citeste `cereri_coechipier`, ascunde butonul de cerere) si Pas4 (sare cele 2 scrieri in `solicitari_echipe_incomplete`). Flag lipsa = comportament identic.
- `PlatiClubExtern`: carduri Total/Achitat/Rest + tabel, calculat cu `construiesteRanduriPlata`, fara scrieri, fara FinanciarView, fara citiri plati/tranzactii.
- `CompetitieDetail`: exportat; in extern fara buton Inapoi, fara schimbare status (isAdmin ramane din permissions), doar 4 file, `handleSetActiveTab` ignora alte file, tab initial `inscrieri` fara sessionStorage, query-uri `inscrieri_competitie`/`echipe_competitie` cu `.eq('club_id', myClubId)`, fara efectul legacy, wizard cu `interclubDezactivat` si fara `onViewSportiv`.

## Deviations from Plan
None in logic. Nota de implementare: `myClubId` a fost mutat deasupra `fetchData` (necesar pentru filtru).

## Verificare
- `npx tsc --noEmit`: fara erori.
- Verificari grep din plan: OK (1 export, 0 referinte interzise in PlatiClubExtern).
- NU testat in browser (se verifica in 36-12 cu date reale).

## Known Stubs
None.

## Self-Check: PASSED
