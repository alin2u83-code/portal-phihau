---
phase: 42-competitie-editare-echipe-quyen-fram-an-calendaristic-arme-d
plan: 06
subsystem: ui
tags: [react, competitii, arme-cvd, wizard]
requires: [42-02, 42-03]
provides:
  - "Thao Lo individual: arma fara drept pe gradul efectiv nu produce categorie / forma / rand Pas4 (nu mai blocheaza Finalizeaza)"
  - "Pas Arme explica de ce un sportiv nu are arme; Giao Dau listeaza doar armele eligibile pe grad"
  - "De rezolvat: avertismente arma-neeligibila (inscris sau ales) si fara-arma, ambele nebloccante"
affects: [42-09]
key-files:
  modified:
    - components/Competitii/InscriereClubWizard/index.tsx
    - components/Competitii/InscriereClubWizard/Pas2Arme.tsx
    - components/Competitii/InscriereClubWizard/PasArme.tsx
    - components/Competitii/InscriereClubWizard/Pas3Echipe.tsx
key-decisions:
  - "drepturiGata fail-open: filtrarea se aplica doar cand drepturile sunt incarcate fara eroare si nevide (T-42-23)"
  - "Nimic nu sterge inscrieri; armele inscrise devenite neeligibile raman si apar doar in De rezolvat (D-14)"
  - "Song Luyen (echipe) neatins, filtrul pe grad ramane amanat conform CONTEXT"
requirements-completed: [D-11, D-12, D-13, D-14, D-15]
duration: 12min
completed: 2026-11-15
---

# Phase 42 Plan 06: Filtru arme eligibile dupa grad in wizard Summary

**Wizardul CVD filtreaza armele dupa drepturile gradului efectiv la data competitiei (Thao Lo, Pas Arme, Giao Dau) si semnaleaza neeligibilitatea doar ca avertisment in "De rezolvat".**

## Accomplishments
- `index.tsx`: `drepturiGata` (fail-open); `categoriePerArma` sare armele fara drept la gradul efectiv; `bannerLipsuri` paseaza `drepturiSportiv` si `inscrieriArma` catre `calculeazaLipsuriCvd`, `arma-neeligibila` -> "Mergi la Arme"; `drepturiArme` ajunge la Pas3.
- `Pas2Arme.tsx`: text "Armă nepermisă gradului la data competiției — nu se înscrie" cand sectiunea nu are optiuni.
- `PasArme.tsx`: `armeEligibileLaGrad` + `motivFaraArme` (inlocuieste textul static "Nicio armă disponibilă...").
- `Pas3Echipe.tsx`: prop `drepturiArme`; Giao Dau paseaza `eligibile` la `ArmePermiseGiaoDau`.

## Task Commits
1. Task 2 (PasArme, Pas3Echipe): b860b0f9 (comis primul ca Task 1 sa compileze, index.tsx paseaza prop-ul nou)
2. Task 1 (index, Pas2Arme): 7d07fcc5

## Deviations from Plan
Ordinea commit-urilor inversata (Task 2 inainte de Task 1) ca fiecare commit sa compileze. Altfel, planul a fost urmat. `sportivPeId` (map-ul existent) a fost mutat mai sus in `bannerLipsuri` ca sa fie refolosit in `drepturiSportiv`.

## Verification
- `npx tsc --noEmit -p .`: 0 erori.
- `npx tsx tests/armeCvd_reguli.ts` -> OK; `npx tsx tests/armeCvdLipsuri.ts` -> OK (regulile pure acoperite de 42-03).
- NOT verified: browser / vizual (nu exista teste de componenta pentru wizard); revizuire separata de cod (code-review) nu a rulat; comportament cu date reale (Roman 21/29). Migrarea 20261115b nu e aplicata live; UI-ul nu depinde de ea.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
Commits b860b0f9, 7d07fcc5 exista; cele 4 fisiere modificate.
