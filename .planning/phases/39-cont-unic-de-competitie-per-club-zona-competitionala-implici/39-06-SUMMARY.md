---
phase: 39-cont-unic-de-competitie-per-club-zona-competitionala-implici
plan: 06
subsystem: frontend-ui
tags: [competitii, cont-club, proprietar, spa-nav]
requires:
  - phase: 39-02
    provides: POST /api/aproba-cerere-acces?action=cont-club (403 non-proprietar, 409 club/email existent)
  - phase: 39-03
    provides: listaConturiCluburi, creeazaContClub, schimbaEmailContClub, useEsteProprietar
provides:
  - components/ConturiCluburiProprietar.tsx (ecranul proprietarului)
  - view 'conturi-cluburi' (types, lazy, AppRouter, UserMenu doar proprietar, Header)
  - CereriAccesAdmin pe modelul de club (fara granturi per competitie, fara T2)
affects: [39-15]
key-files:
  created:
    - components/ConturiCluburiProprietar.tsx
  modified:
    - types.ts
    - components/LazyComponents.tsx
    - components/AppRouter.tsx
    - components/UserMenu.tsx
    - components/Header.tsx
    - components/Competitii/CereriAccesAdmin.tsx
key-decisions:
  - "Ecranul activeaza query-ul de conturi doar daca useEsteProprietar() e true (alti super admini nu fac nici cererea)"
  - "Avertismentul 'cont_existent_cu_alte_roluri' din panoul de cereri eliminat: endpoint-ul nou nu il mai emite (singurul avertisment e 'ban_esuat', doar la schimbare email)"
requirements-completed: [D-01, D-13, D-14, D-15, D-18]
duration: 15min
completed: 2026-11-11
---

# Phase 39 Plan 06: Ecran proprietar Conturi cluburi + curatare CereriAccesAdmin Summary

Proprietarul vede in meniul utilizatorului "Conturi cluburi (competitie)": lista cluburilor cu emailul contului sau "Fara cont", creare cont per club si schimbare email cu avertisment; panoul de cereri nu mai gestioneaza granturi per competitie sau management per grant, iar "Aproba" apare doar proprietarului.

## Tasks

| Task | Commit | Rezultat |
|------|--------|----------|
| 1 | 6d36879 | ConturiCluburiProprietar.tsx (garda, cautare, carduri, modale creare/schimbare email, busy global) |
| 2 | ad3707c | View 'conturi-cluburi', lazy, case in AppRouter (isSuperAdmin), MenuItem proprietar, titlu Header |
| 3 | 658f643 | CereriAccesAdmin refacut; GrantAccesExtern sters din types.ts (nefolosit nicaieri) |

## Verificare
- RULAT: `npx tsc --noEmit` pe intreg proiectul = 0 erori (erorile temporare din 39-03 in CereriAccesAdmin si CompetitieExterna au disparut; CompetitieExterna fusese reparat in 39-05).
- RULAT: greps de acceptanta (T2/acces_competitie_extern = 0; textul "Aprobarea creeaza contul..." = 1; useEsteProprietar prezent; nicio actiune in masa).
- NERULAT: UI in browser, apelurile reale create/schimba email (migrarile 39-01 nu sunt aplicate live pana la 39-04, deci esteProprietar() da false si ecranul/meniul raman ascunse); review separat de cod.

## Deviations from Plan
None in logica. Nota despre diff: diff-ul `components/Competitii/CereriAccesAdmin.tsx` fata de HEAD include si inlocuirea editarilor necomise anterioare (UI management per grant, modale Acorda/Retrage, importuri sterse in 39-03) - acestea nu au fost niciodata comise si au fost eliminate; in istoricul git apare doar stergerea granturilor din HEAD plus noua stare.

Plan-ul 39-06 nu pune comutatorul de management pe card (loc marcat cu comentariu in ConturiCluburiProprietar, vine in 39-15).

## Known Stubs
None.

## Threat Flags
None. Mitigari T-39-30..33: garda useEsteProprietar + RLS + endpoint 403; modal de confirmare cu avertisment la schimbare email; buton Aproba ascuns non-proprietarilor.

## Self-Check: PASSED
Fisier creat exista; commit-urile 6d36879, ad3707c, 658f643 exista.
