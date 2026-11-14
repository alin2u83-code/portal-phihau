---
phase: 41-administrare-categorii-competitie-super-admin-modificare-anu
plan: 03
subsystem: ui
tags: [typescript, competitii, taxe, financiar, categorii-anulate]
requires: []
provides:
  - "utils/taxeCompetitie.ts: RandPlataCompetitie.taxaAnulata, SituatiePlataCompetitie.totalAchitatAnulat / nrTaxeAnulate"
  - "FinanciarView, PlatiClubExtern, RaportInscrieri, InscrieriView afiseaza taxe anulate si 'Fara categorie'"
affects: [41-05, 41-07]
tech-stack:
  added: []
  patterns: ["o singura regula de taxa (construiesteRanduriPlata) consumata de toate ecranele", "test assert-based cu npx tsx"]
key-files:
  created:
    - utils/taxeCompetitie.test.ts
  modified:
    - utils/taxeCompetitie.ts
    - components/Competitii/FinanciarView.tsx
    - components/Competitii/PlatiClubExtern.tsx
    - components/Competitii/RaportInscrieri.tsx
    - components/Competitii/InscrieriView.tsx
key-decisions:
  - "Taxa anulata = categoria exista si !categorieActiva(cat); categorie lipsa din lista pastreaza comportamentul legacy"
  - "Linia anulata ramane in lista; nu intra in totalCalculat/totalAchitat/nrIndividuale/nrEchipe"
  - "Taxa achitata pe categorie anulata nu e resetata; apare in totalAchitatAnulat (de realocat / returnat); in FinanciarView ramane butonul de toggle pentru a inregistra o returnare"
  - "FinanciarView foloseste construiesteRanduriPlata in loc de bucla proprie duplicata"
requirements-completed: [D-04, D-07, D-08]
duration: ~25min
completed: 2026-11-14
---

# Phase 41 Plan 03: Taxe anulate pe categorii anulate Summary

Regula D-08 implementata intr-un singur loc (`construiesteRanduriPlata`): taxa unei inscrieri/echipe dintr-o categorie nemaiactiva nu mai e datorata, iar taxa deja achitata ramane achitata si e semnalata "de realocat / returnat"; cele 4 ecrane o afiseaza consecvent.

## Ce s-a livrat
- **Task 1** (`1ae66a9c` RED, `d1c9481f` GREEN): `taxaAnulata` pe rand, `totalAchitatAnulat` si `nrTaxeAnulate` in situatie; `calculeazaTaxaIndividuala` / `calculeazaTaxaEchipa` neatinse. 8 teste.
- **Task 2** (`8a3dfadb`):
  - `FinanciarView`: bucla duplicata inlocuita cu `construiesteRanduriPlata`; totaluri doar pe linii active; "Marcheaza tot achitat" sare liniile anulate; header "Achitat pe categorii anulate: X lei (de realocat / returnat)"; coloana CSV "Taxă anulată"; rand anulat: suma taiata, badge "Taxă anulată" (neachitat) sau toggle "Achitat — de realocat / returnat".
  - `PlatiClubExtern`: badge "Anulată" / "Achitat — de realocat", suma taiata, nota explicativa cand `nrTaxeAnulate > 0`.
  - `RaportInscrieri`: aceleasi stari in coloana de status, "Anulate: N" langa totaluri.
  - `InscrieriView`: badge amber "Fără categorie" langa categorie (individual si echipe), celula de taxa arata "Anulată" / "Achitată (de realocat)".

## Verificare
- `npx tsx utils/taxeCompetitie.test.ts`: 8 PASS, exit 0 (RED confirmat: 8 FAIL inainte de implementare).
- `npx tsc --noEmit`: 0 erori pe intregul proiect.
- Verificarile grep din plan: FinanciarView apeleaza `construiesteRanduriPlata`, nu mai apeleaza `calculeazaTaxa*`; `taxaAnulata` prezent in cele 3 ecrane; `nrTaxeAnulate` in PlatiClubExtern; "Fără categorie" + `categorieActiva` in InscrieriView.

## Deviations from Plan
Mici ajustari, fara impact de arhitectura:
- In `FinanciarView`, numarul de sportivi/echipe afisat pe club exclude liniile anulate (coerent cu totalurile); nu era specificat in plan.
- Un club cu doar linii anulate apare cu status "Achitat" (neachitat = 0); acceptat.
- `RandPlataCompetitie` primeste `taxaAnulata` obligatoriu; `tsc` confirma ca nu exista alti constructori ai tipului.

## Limitari de verificare
- Nu am rulat `/code-review` separat pe diff (recomandat inainte de inchiderea fazei).
- Fara test in browser: modificarile UI sunt verificate doar prin `tsc` si grep, nu vizual. Coloana Categorie din `InscrieriView` e `hidden md:table-cell`, deci badge-ul "Fără categorie" nu se vede pe mobil (comportament existent al coloanei).
- Nicio migrare aplicata pe DB live; planul nu are scrieri noi (toggle-ul `taxa_achitata` e calea existenta, RLS neschimbat).

## Known Stubs
None.

## Threat Flags
None (T-41-13 mitigat: `taxa_achitata` nu e resetat, "Marcheaza tot achitat" sare liniile anulate).

## Self-Check: PASSED
- utils/taxeCompetitie.test.ts, utils/taxeCompetitie.ts, cele 4 componente: FOUND
- commits 1ae66a9c, d1c9481f, 8a3dfadb: FOUND
