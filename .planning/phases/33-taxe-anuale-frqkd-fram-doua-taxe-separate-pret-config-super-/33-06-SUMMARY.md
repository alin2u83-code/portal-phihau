---
phase: 33
plan: 06
subsystem: taxe-anuale-ui-federatie
tags: [react, ui, taxe-anuale, federatie]
requires: [33-04, 33-03]
provides: [TabPreturiTaxe, TabRaportCluburi]
key-files:
  created:
    - components/Plati/TaxeAnualeTabs/TabPreturiTaxe.tsx
    - components/Plati/TaxeAnualeTabs/TabRaportCluburi.tsx
requirements: [TA-01, TA-02, TA-05, TA-07, TA-12]
completed: 2026-10-05
---

# Phase 33 Plan 06: UI federatie (preturi + raport pe cluburi) Summary

Doua componente noi, fara props, gata de montat in 33-09: ecranul unic de preturi FRQKD (pe sezon) + FRAM (pe an) si dashboard-ul federatiei pe cluburi cu export CSV.

## Commits
- b70f080 feat(33-06): TabPreturiTaxe
- d17d6e2 feat(33-06): TabRaportCluburi

## Livrat
- **TabPreturiTaxe**: doua sectiuni (md:grid-cols-2), cu formular «Setează prețul» (perioade curenta-1..+2 fara cele deja configurate, validare suma > 0, previzualizare perioada + numar taxe in asteptare inainte de salvare), lista perioadelor cu Badge «Curent» / «În așteptare: n», editare inline cu nota despre facturile emise, sectiune «Perioade fără preț cu taxe în așteptare». Dupa salvare reincarca datele (useReincarcaTaxe) si anunta cate taxe au fost facturate automat. Remindere: FRAM an curent fara pret -> amber in ian/feb, rosu dupa; FRQKD sezon curent fara pret -> rosu. Fara stergere, fara apeluri supabase directe (doar `salveazaPretTaxa`).
- **TabRaportCluburi**: SelectorPerioadaTaxa + `incarcaRaportCluburi` (useEffect cu flag de anulare, stari loading/eroare/gol), 6 StatCard-uri de total, tabel cu 9 coloane + rand TOTAL, «De virat» rosu > 0 / verde 0, cluburile cu 0 sportivi raman listate, Export CSV cu cheile romanesti din plan. Fara supabase direct.

## Verificare
- `npx tsc --noEmit` trece (fara erori).
- Verificarile grep din plan trec (salveazaPretTaxa, numarTaxeInAsteptare, useReincarcaTaxe, 'FRAM', 'FRQKD', februarie; fara .delete / supabase).
- Nu s-a verificat vizual in browser si nu s-au apelat RPC-urile live (montarea are loc in 33-09).

## Deviations from Plan
None - plan executat conform scrisului.

## Known Stubs
None.

## Threat Flags
None. T-33-36 mitigat (validare suma > 0 + previzualizare perioada/taxe in asteptare); T-33-38 respectat (doar RPC).

## Self-Check: PASSED
Fisierele exista, commit-urile b70f080 si d17d6e2 exista in git log.
