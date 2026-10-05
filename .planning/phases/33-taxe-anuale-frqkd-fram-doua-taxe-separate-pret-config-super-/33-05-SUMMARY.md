---
phase: 33
plan: 05
subsystem: taxe-anuale-ui-club
tags: [react, ui, whatsapp, taxe-anuale]
requires: [33-04]
provides: [TabSituatieTaxe, TabRestantieriTaxe, BannerViratNeachitat, NotificariTaxeAnualeModal, ScutireTaxaModal]
affects: [33-09 (montare in shell)]
key-files:
  created:
    - components/Plati/TaxeAnualeTabs/NotificariTaxeAnualeModal.tsx
    - components/Plati/TaxeAnualeTabs/ScutireTaxaModal.tsx
    - components/Plati/TaxeAnualeTabs/BannerViratNeachitat.tsx
    - components/Plati/TaxeAnualeTabs/TabSituatieTaxe.tsx
    - components/Plati/TaxeAnualeTabs/TabRestantieriTaxe.tsx
requirements: [TA-06, TA-07, TA-09, TA-10, TA-14]
completed: 2026-10-05
---

# Phase 33 Plan 05: UI club taxe anuale Summary

Cinci componente independente (nemontate inca, montarea in 33-09) pentru ADMIN_CLUB: situatia taxelor cu generare in 3 moduri si scutiri, restantieri cu WhatsApp + CSV, banner informativ virat-neachitat si doua modale reutilizabile.

## Commits
- aa3a134 feat(33-05): NotificariTaxeAnualeModal, ScutireTaxaModal, BannerViratNeachitat
- 89236bc feat(33-05): TabSituatieTaxe, TabRestantieriTaxe

## Ce face fiecare componenta
- **NotificariTaxeAnualeModal**: carduri per destinatar, textarea editabila, link wa.me, "Copiaza mesaj/toate" (clipboard fara await, setState sincron), contoare, nota "se trimit manual".
- **ScutireTaxaModal**: motiv obligatoriu max 500 caractere cu contor; la anulare arata motivul curent + explicatie; se inchide doar cand `onConfirm` intoarce true.
- **BannerViratNeachitat**: `gasesteViratiNeachitati` din `useData()`; `null` cand lista e goala; primele 5 + "Vezi toti / Restrange"; doar informativ.
- **TabSituatieTaxe**: selector tip/perioada, linia de pret (sau avertisment amber cand pretul lipseste), 7 StatCard-uri, filtru stare + cautare, tabel (md+) / carduri (mobil), generare individuala / selectie / toti activii (ConfirmModal), sumar dupa generare, buton "Notifica pe WhatsApp" pentru facturate, scutiri prin modal. Starea `alt_club` fara actiuni.
- **TabRestantieriTaxe**: `restantieriTaxe(construiesteSituatieTaxe(...))`, total + numar, WhatsApp (mod 'restanta'), export CSV, EmptyState.

## Verificare
- `npx tsc --noEmit`: trece (fara erori).
- Greps automate din plan: toate OK (fara `supabase.from`, fara `await navigator.clipboard`).

## Decizii
- Dupa generare, notificarile folosesc `pret` din config ca suma pentru fiecare factura creata (pret nenul garantat cand `rezultat === 'facturat'`).
- Scutirea: `Scuteste` ascunsa cand sportivul e virat federatiei (RPC refuza oricum) si pentru starile `achitat`/`achitat_partial`/`alt_club`/`scutit`.
- Notificarea in-app NU se insereaza din client (T-33-35), doar din DB.

## Deviations from Plan
None - plan executat conform scrisului.

## Known Stubs
None.

## Threat Flags
None. Randare doar prin JSX (T-33-34), fara `dangerouslySetInnerHTML`; mesajele WhatsApp fara link de actiune.

## Self-Check: PASSED
Cele 5 fisiere exista; commit-urile aa3a134 si 89236bc exista in git log.
