---
created: 2026-11-03T13:00:00.000Z
updated: 2026-11-04T00:00:00.000Z
title: Faza 34 - ramase dupa finalizare (retest instructor/mobil real, curatenie)
area: ui
files:
  - .planning/phases/34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de/34-UAT.md
  - .planning/phases/34-simplificare-ui-unificare-stil-sidebar-dashboard-4-roluri-de/34-SECURITY.md
---

## Stare

Faza 34 FINALIZATA 3.11.2026: UAT 8/8 (retest admin club + federatie, Playwright MCP, desktop + mobil 390), 34-SECURITY.md threats_open 0 (51/51), ROADMAP/STATE actualizate (2bbb032). Push pe main facut (ab2984d..606ee10, 58 commituri). Fixuri post-UAT comise: titlu dublu Echipamente/Vanzari (7ea11a7), Modal headerActions + SesiuneForm (606ee10).

Decizii luate: federatia NU vede Echipamente/Vanzari (intentionat, PlatiHub.tsx:67 ramane `isAdminClub`); feature viitor = circuit in care federatia propune produse spre vanzare (netrimis la plan).

## De facut

1. Netestat in productie/local: rol INSTRUCTOR (sidebar, Plati, Competitii/Stagii), telefon real/iOS, RLS live pe `cereri_inregistrare` (contor dashboard federatie, interogat `pg_policies`).
2. Bara interioara (Catalog/Intrari Marfa/Vanzari/Comenzi/Raport) din Echipamente/Vanzari dubleaza tab-ul din hub — ascunde tab-ul care nu corespunde.
3. `components/GestiuneExamene/RapoarteExamen.tsx:57` are un SesiuneForm local vechi (fara club implicit/Salveaza in antet) — aliniaza sau inlocuieste cu cel din SesiuneForm.tsx.
4. Observat, nereprodus: dupa resize 390->1440 cu pagina deschisa, corpul a ramas pe dashboard desi header/sidebar aratau Plati (AnimatePresence mode=wait?); reload rezolva.
5. Contrast: 8 perechi de teme sub 4,5:1 (ex. Amber sidebarActiveFg/sidebarActive 3,19:1) — raport din tests/ui_faza34_menu_parity.ts, nu pica testul.
6. Nit: comentarii "13" in loc de 16 in platiHubConfig.ts; header "Plati & Facturi" vs sidebar "Plati".
7. `.planning/phases/34-*/screens/` neurmarit si NU in .gitignore — nu folosi `git add -A`.
8. Rulat Playwright `tests/ui_faza34_shell.spec.ts` cu TEST_EMAIL/TEST_PASSWORD (acum trece 4/4 dar fara sesiune reala; MFA blocheaza).

## Alte lucruri deschise (nelegate de faza 34)

- Planuri vechi fara SUMMARY: 32-08 (blocat pe SMTP spatiul.ro), 18-04, 11-03. Faze 19-24 neinceputute. UAT 07 (7 scenarii) si 26-VERIFICATION (gaps_found) deschise.
