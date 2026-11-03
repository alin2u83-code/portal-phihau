---
created: 2026-11-03T13:00:00.000Z
title: Faza 34 - re-test UAT (teste 3, 4, 6) si inchidere faza
area: ui
files:
  - .planning/phases/34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de/34-UAT.md
  - .planning/phases/34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de/34-15-SUMMARY.md
---

## Stare

Planurile de reparatie 34-14 si 34-15 executate si comise (4c655c6, e75705b). Code review: APPROVE, fara bug critic. tsc 0 erori, build OK, paritate meniu 8/8/8/4 OK, platiHubConfig 23/23. NIMIC verificat vizual dupa reparatii.

## De facut (in ordine)

1. Re-test manual pe `npm run dev` (localhost:5173), lista in 34-15-SUMMARY.md "Acceptare umana":
   - Sidebar 8 intrari, "Plati" fara submeniu, "Stagii" sub "Competitii" (admin club, federatie, instructor)
   - Plati-hub: 7 tab-uri ADMIN_CLUB / 5 federatie, fiecare tab nou se randeaza, fara dublu buton de intoarcere
   - Competitii fara tab Stagii; card "Necesita atentie"
   - Mobil 390x844: fara scroll orizontal, bottom nav federatie "Plati"
2. Daca ok: marcheaza testele 3, 4, 6 pass in 34-UAT.md, `/gsd-verify-work 34` pentru inchidere, apoi `/gsd-secure-phase 34` daca security_enforcement e activ.
3. Rulat Playwright `tests/ui_faza34_shell.spec.ts` (cere TEST_EMAIL/TEST_PASSWORD; MFA blocheaza - skip cu motiv).

## Decizii deschise (asteapta userul)

- Federatia (SUPER_ADMIN) pe `produse`/`vanzari-produse` cade tacut pe Facturi. Vrei acces? Schimba `poateVedeaEchipamente` in `permissions.isAdminClub || permissions.isFederationAdmin` (PlatiHub.tsx:66).
- Tab Echipamente + Vanzari randeaza aceeasi componenta cu strip intern propriu (duplicare "Vanzari"); h1 duplicat in PerioadaVacantaView si ProduseManagement.
- Nit: comentarii "13" in loc de 16 in platiHubConfig.ts; header "Plati & Facturi" vs sidebar "Plati"; bottom nav "Financiar"->"Plati" facut fara cerere explicita.

## Alte lucruri deschise

- `components/GestiuneExamene/SesiuneForm.tsx` si `components/ui.tsx` au modificari necomise mai vechi (Modal headerActions, club implicit in sesiune examen) - nelegate de faza 34; de revizuit si comis separat.
- Planuri vechi fara SUMMARY: 32-08 (blocat pe SMTP spatiul.ro), 18-04, 11-03.
