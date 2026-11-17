# 44-06 SUMMARY — citirile de plata_ids trec pe tranzactie_plata (18.11.2026)

Precondiție verificată: `MIGRARE_B: APLICATA LIVE; C1_dupa=0` în 44-DECIZII.md. 44-VERIFICARE secțiunea E: `club_member_access` acoperă alocările pentru orice rol care citește tranzacția (fără blocaj).

## Făcut
- `services/tranzactiiService.ts`: `SELECT_TRANZACTIE_CU_ALOCARI`, `normalizeazaTranzactie(i)` (plata_ids derivat din alocări, scris după spread, suprascrie coloana); `editeazaIncasare` întoarce rând normalizat.
- `types.ts`: `Tranzactie.alocari?`, comentariu "DERIVAT".
- `hooks/useDataProvider.ts`: loaderul `tranzactii` folosește embed + normalizare (păstrează restul rezultatului, ex. `error`).
- `utils/incasariPeTip.ts` + test (6 cazuri, roșu înainte de util, verde după): venit pe tip din alocări, rest nealocat la "Avans / Neclasificat". `FinancialDashboard` nu mai conține `plata_ids`.

## Verificat
- `npx tsx utils/incasariPeTip.test.ts` 6/6; `utils/facturaDetaliu.test.ts` 34 PASS, 0 FAIL (nemodificat).
- `tsc --noEmit`: 0 erori (baseline 0).
- grep: niciun `from('tranzactii').select('*')` în hooks/services.
## Neverificat
- UI (human-check dashboard financiar: total grafic = total încasări perioadă) la sfârșitul fazei.
- Cele 5 tranzacții orfane (C1o, 920 RON) au acum plata_ids=[] derivat și intră la "Avans / Neclasificat" în dashboard (erau deja neclasificate, factura nu mai există).
- Cele 5 site-uri de fetch din componente rămân pe `select('*')` -> 44-08.
- NU push înainte ca toată seria să fie verificată (main local conține Faza 43 neterminată).
