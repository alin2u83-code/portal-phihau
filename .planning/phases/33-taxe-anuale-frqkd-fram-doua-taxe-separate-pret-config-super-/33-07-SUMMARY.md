---
phase: 33
plan: 07
subsystem: taxe-anuale-plata-federatie-ui
tags: [react, modal, export, csv, xlsx]
requires: [33-04, 33-03]
provides: [PlataFederatieModal, utils/exportPlatiFederatie.ts, FederationInvoices rescris]
affects: [components/AppRouter.tsx (props optionale pe deconturi-federatie)]
key-files:
  created:
    - components/Plati/TaxeAnualeTabs/PlataFederatieModal.tsx
    - utils/exportPlatiFederatie.ts
    - utils/exportPlatiFederatie.test.ts
  modified:
    - components/FederationInvoices.tsx
    - components/AppRouter.tsx
requirements: [TA-07, TA-08, TA-09, TA-13]
completed: 2026-10-05
---

# Phase 33 Plan 07: Plata catre federatie (UI) Summary

Modal de plata catre federatie cu bifare, total informativ, metoda/data/dovada/observatii; ecranul «Plati catre federatie» cu istoric de plati multiple pe perioada si export CSV/Excel (per plata si per perioada, cu foaia «Scutiti»).

## Commits
- a7c572f feat(33-07): PlataFederatieModal + utils/exportPlatiFederatie (+ test)
- f2fd0cb feat(33-07): FederationInvoices rescris + props optionale in AppRouter

## Ce s-a livrat
- `PlataFederatieModal`: checklist doar cu sportivi eligibili (facturati, nevirati), «Selecteaza toti», badge informativ «Achitat la club» / «Neachitat la club» (fara text despre banner), sectiuni nebifabile Scutiti / In asteptare, total live (`sumaPlataFederatie`), metoda obligatorie (Cash / Transfer Bancar / Revolut), data (implicit azi, max azi), dovada optionala cu preview imagine, observatii (max 1000). Salvare: upload optional (`incarcaDovadaPlataFederatie`) apoi RPC `inregistreazaPlataFederatie`; clientul trimite doar id-uri sportivi, metoda, data, cale dovada, observatii (nicio suma). La eroare dupa upload se mentioneaza ca fisierul ramane nelegat.
- `utils/exportPlatiFederatie.ts`: `construiesteRanduriExport` (pura, sortata, fallback club, data zz.ll.aaaa deterministica), `exportPlatiFederatieCSV` (exportToCsv), `exportPlatiFederatieXLSX` (foi «Plati federatie» + «Scutiti»), plus helper `formateazaDataRo`. 5 teste trec (`npx tsx utils/exportPlatiFederatie.test.ts`).
- `FederationInvoices`: props existente neschimbate + `sportivi?/plati?/clubs?`; selector tip+perioada, filtru club pentru federatie, KPI (De virat / Virat / Scutiti) si buton «Inregistreaza plata catre federatie» pentru ADMIN_CLUB, istoric fara grupare (mai multe plati pe aceeasi perioada), dovada prin URL semnat, modal «Sportivi», export CSV/Excel per plata si per perioada, tabel pe desktop / carduri pe mobil, randuri vechi `In asteptare` read-only cu eticheta «In asteptare (vechi)». Fara scriere directa in `deconturi_federatie`.
- `AppRouter.tsx`: o singura linie (case 'deconturi-federatie') cu `sportivi={filteredData.sportivi} plati={filteredData.plati} clubs={clubs}`.

## Verificare
- `npx tsx utils/exportPlatiFederatie.test.ts`: 5 teste (15 asertiuni) trecute.
- `npx tsc --noEmit`: trece fara erori.
- Verificari grep din plan: toate trec; `package.json` neatins.

## Deviations from Plan
None - plan executat conform scrisului. Nota: `showSuccess` din ErrorProvider are semnatura (titlu, mesaj), deci mesajul de succes e dat ca al doilea argument cu titlul «Plata catre federatie».

## Known Stubs
None.

## Threat Flags
None. Mitigari T-33-39 (fara sume trimise de client), T-33-40 (URL semnat), T-33-41 (validare in serviciu), T-33-42 (RLS prin incarcaSportiviAcoperiti; exportul de perioada filtreaza si pe deconturile vizibile) respectate. Verificarea vizuala in browser nu a fost rulata (fara acces DB / dev server in acest plan).

## Self-Check: PASSED
Fisierele create exista; commit-urile a7c572f si f2fd0cb exista in git log.
