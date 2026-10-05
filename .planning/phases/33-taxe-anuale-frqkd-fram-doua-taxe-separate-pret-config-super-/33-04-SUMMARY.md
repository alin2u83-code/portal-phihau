---
phase: 33
plan: 04
subsystem: taxe-anuale-frontend-contracts
tags: [typescript, utils, service, hook, tdd]
requires: [33-01]
provides: [tipuri taxe anuale, utils/taxeAnuale.ts, services/taxeAnualeService.ts, hooks/useReincarcaTaxe.ts, SelectorPerioadaTaxa]
affects: [hooks/useDataProvider.ts (vizeSportivi cu embed plata)]
key-files:
  created:
    - utils/taxeAnuale.ts
    - utils/taxeAnuale.test.ts
    - services/taxeAnualeService.ts
    - hooks/useReincarcaTaxe.ts
    - components/Plati/TaxeAnualeTabs/SelectorPerioadaTaxa.tsx
  modified:
    - types.ts
    - utils/anFiscal.ts
    - hooks/useDataProvider.ts
requirements: [TA-01, TA-06, TA-07, TA-08, TA-09, TA-10, TA-14, TA-15]
completed: 2026-10-05
---

# Phase 33 Plan 04: Contracte TypeScript taxe anuale Summary

Contractele frontend ale fazei: tipuri, perioada taxei, logica pura testata (stare / virat-neachitat / eligibilitate / mesaje WhatsApp fara link), serviciu RPC cu `{data, error}` romanesc, hook de reincarcare si selector comun tip+perioada.

## Commits
- e0766a5 test(33-04): test esuat (RED, modul inexistent)
- 1fcd83d feat(33-04): tipuri + anFiscal + utils/taxeAnuale.ts (GREEN, 11 teste)
- 7a775a3 feat(33-04): serviciu, hook, embed plata in useDataProvider, SelectorPerioadaTaxa

## Verificare
- `npx tsx utils/taxeAnuale.test.ts`: 11 teste trecute, 0 esuate (acopera fiecare bullet din behavior).
- `npx tsc --noEmit`: trece.
- `useDataProvider.ts`: doar import + linia select vizeSportivi.
- `taxeAnualeService.ts` nu foloseste `.in(`; utils/taxeAnuale.ts fara importuri react/supabase si fara "http".

## Decizii
- `stareTaxa`: `alt_club` are prioritate fata de `scutit` / `in_asteptare`.
- Factura lipsa din `plati` -> se foloseste `viza.plata` (embed); plata_id prezent fara status cunoscut -> `neachitat`.
- `construiesteSituatieTaxe`: sportivii activi ai clubului raman in lista chiar daca viza lor apartine altui club (stare `alt_club`); sportivii extra (inactivi / alt club) intra doar daca viza e pe clubul curent.
- `genereazaNotificariTaxe`: pentru sportiv fara telefon propriu se incearca reprezentantul familiei, apoi alt membru (diferit de sportiv).
- `incarcaDovadaPlataFederatie` deduce extensia din tipul MIME (png/jpg/pdf).

## Deviations from Plan
None - plan executat conform scrisului. RED a fost comis separat (modul lipsa).

## Known Stubs
None.

## Threat Flags
None. Mitigari T-33-27/28/30 implementate (validare upload, URL semnat 120 s, fara filtru IN).

## Note pentru planurile urmatoare
- RPC-urile nu au fost apelate/testate live (create in paralel de orchestrator); contractele urmeaza semnaturile din 33-02/33-03.
- `TaxeAnuale.tsx` / `FederationInvoices.tsx` vechi nu au fost atinse (inlocuite in 33-09); tsc trece cu tipurile extinse.

## Self-Check: PASSED
Fisierele create exista, commit-urile e0766a5, 1fcd83d, 7a775a3 exista in git log.
