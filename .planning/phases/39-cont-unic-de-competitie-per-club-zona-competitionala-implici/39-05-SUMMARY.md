---
phase: 39-cont-unic-de-competitie-per-club-zona-competitionala-implici
plan: 05
subsystem: frontend-zona-competitie
tags: [competitii, cont-club, acces-extern, ui]
requires:
  - phase: 39-03
    provides: incarcaContexteEligibile(userId), incarcaCompetitiiClub, esteZonaCompetitie, esteListaZona
provides:
  - components/CompetitieExterna/ListaCompetitiiClub.tsx
  - masina de stari lista/confirma/activ in CompetitieExterna/index.tsx
  - ruta /competitie + redirect din portal pentru contul de club
affects: [39-06, 39-14, 39-16]
key-files:
  created:
    - components/CompetitieExterna/ListaCompetitiiClub.tsx
  modified:
    - components/CompetitieExterna/index.tsx
    - components/CompetitieExterna/ShellExtern.tsx
    - components/CompetitieExterna/ExternDataProvider.tsx
    - index.tsx
    - components/AccesLimitatPage.tsx
key-decisions:
  - "Schimbarea contextului (club) din antet duce mereu in lista, nu ramane in competitie: singura cale spre 'activ' e butonul Intra din dialog"
  - "TipuriLabelsContext.Provider mutat la nivelul intregii pagini ca sa serveasca si lista"
requirements-completed: [D-03, D-04, D-09, D-10, D-11, D-12]
completed: 2026-11-11
---

# Phase 39 Plan 05: Zona de competitie a contului de club Summary

Dupa login contul de club vede mereu lista (active + istoric "Doar citire"), intrarea intr-o competitie cere confirmare (dialog diferit pentru link direct vs lista), iar `/competitie` este servit de zona externa; contul de club care intra pe `/` este redirectionat acolo.

## Tasks

| Task | Commit | Rezultat |
|------|--------|----------|
| 1 | bf4b1a7 | ListaCompetitiiClub, ShellExtern (denumire optionala, buton "Toate competițiile") |
| 2 | 0d516cf | stari `lista`/`confirma`/`activ`, dialog D-10 / D-03, mesaj link indisponibil |
| 3 | 410bf27 | `esteZonaCompetitie` in index.tsx, AccesLimitatPage = redirect `/competitie` |

## Verificare
- `tsc --noEmit`: 0 erori in CompetitieExterna/*, index.tsx, AccesLimitatPage.tsx (erorile ramase sunt in CereriAccesAdmin.tsx, 39-06).
- Greps de acceptanta: textele D-10/D-03 prezente cate o data; `setStare({ t: 'activ' ...})` apare o singura data (handlerul "Intră"); `App.tsx` neatins.
- NEVERIFICAT: browser/Playwright (tabelele si regula RLS `competitie_vizibila_cont_club` nu sunt live pana in 39-04; verificare in 39-16); nu s-a rulat review separat de cod; mobil netestat.

## Deviations from Plan
**[Rule 3] `faraRetryPeAuth` exportat din ExternDataProvider.tsx** (fisier in afara listei planului): era neexportat si planul cere refolosirea lui in lista; un singur cuvant `export`, fara duplicare.

Alegere de design (mai stricta decat planul): schimbarea contextului din selectorul din antet foloseste `intraInZona(..., cuLink=false)` si aterizeaza in lista, nu in 'activ'.

## Known Stubs
None.

## Riscuri / de stiut
- Linkul direct fara sesiune: dupa login in aceeasi pagina, `/competitie/<id>` ramane in URL pana la "Intră"/"Vezi toate" (replaceState).
- Fara `id` si fara cont de club (0 contexte) se afiseaza doar mesajul si Deconectare; butonul "Solicită acces" exista numai pe link cu competitie.
- `/competitie` pe server: vercel.json are deja rewrite catre index.html (neverificat live).

## Self-Check: PASSED
Fisierul ListaCompetitiiClub.tsx exista; commit-urile bf4b1a7, 0d516cf, 410bf27 exista.
