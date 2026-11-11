---
phase: 39-cont-unic-de-competitie-per-club-zona-competitionala-implici
plan: 14
subsystem: ui
tags: [competitie-externa, management-club, zona-test, demo]
requires:
  - phase: 39-12
    provides: zona externa cu stari lista/confirma/activ si autor modificari
provides:
  - buton "Management club" mereu vizibil in antetul zonei externe
  - zona de test read-only cu date fictive (ZonaTestManagement)
  - stare 'demo' in masina de stari a zonei externe
affects: [39-16]
key-files:
  created:
    - components/CompetitieExterna/dateDemoManagement.ts
    - components/CompetitieExterna/ZonaTestManagement.tsx
  modified:
    - components/CompetitieExterna/ShellExtern.tsx
    - components/CompetitieExterna/index.tsx
key-decisions:
  - "Acces de management = context ADMIN_CLUB/INSTRUCTOR cu acelasi clubId in lista de contexte; fara serviciu nou"
  - "Trecerea in management = seteazaContextActiv(roleRowId) + window.location.assign('/')"
requirements-completed: [D-05, D-11, D-17]
duration: 10min
completed: 2026-11-11
---

# Phase 39 Plan 14: Buton Management club + zona de test Summary

Butonul "Management club" apare in antetul shell-ului in toate starile (lista, activ, demo); fara acces acordat deschide o demonstratie cu date fictive statice, cu acces acordat intra in managementul real al portalului.

## Taskuri

1. Date fictive + ZonaTestManagement — commit af9418e. Banner amber cu textul exact cerut, taburi Sportivi/Grupe/Plati, buton "Inapoi la competiții"; zero importuri de date (gate grep = 0), fara campuri CNP/email/telefon.
2. Buton + ramura demo/real — commit a73e84d. `ShellExtern` primeste `onManagement` obligatoriu; `index.tsx` are `deschideManagement` (cauta context ADMIN_CLUB/INSTRUCTOR pe acelasi club, altfel stare `demo`). `EcranActiv` (39-09) si dialogul de actor raman neschimbate; starea demo nu are dialog de actor.

## Deviations from Plan

None - plan executat ca scris. Nu s-a adaugat niciun buton de actiune disabled in demo (planul le cerea doar daca apar).

## Verificari

- `npx tsc --noEmit`: curat (0 erori).
- Gate-uri grep din plan: citiri reale = 0, campuri sensibile = 0, `window.location.assign('/')` = 1.
- NEtestat in browser: banner, taburi, redirect catre portal cu context real; nici cazul cu rol acordat de 39-13 pe date live.

## Known Stubs

Date demo statice sunt intentionate (D-17), nu stub.

## Self-Check: PASSED

Fisierele create exista, commit-urile af9418e si a73e84d exista.
