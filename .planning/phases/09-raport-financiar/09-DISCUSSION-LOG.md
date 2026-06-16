# Phase 9: Raport Financiar - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md.

**Date:** 2026-06-16
**Phase:** 9-raport-financiar
**Areas discussed:** Amplasare UI, Structura tabel, Filtrare perioadă, Export

---

## Amplasare UI

| Option | Selected |
|--------|----------|
| Tab nou în RaportFinanciar existent | ✓ |
| Componentă separată cu activeView propriu | — |
| Extinde AgingReport existent | — |

## Structura tabel (FIN-01)

| Option | Selected |
|--------|----------|
| 1 rând per sportiv: Sportiv \| Sumă Totală \| Nr. facturi \| Cea mai veche scadență | ✓ |
| Expandabil cu detalii facturi la click | — |
| Flat: 1 rând per factură | — |

## Filtrare perioadă (FIN-02)

| Option | Selected |
|--------|----------|
| data_scadenta a facturilor neachitate | ✓ |
| data_emitere | — |
| Ambele filtre separate | — |

## Export (FIN-03, FIN-04)

| Option | Selected |
|--------|----------|
| Funcții noi în utils/exportFinanciar.ts | ✓ |
| Adaptează funcțiile existente | — |
| Inline în componentă | — |
