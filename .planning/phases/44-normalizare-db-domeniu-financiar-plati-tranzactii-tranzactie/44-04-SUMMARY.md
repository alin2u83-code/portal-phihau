# 44-04 SUMMARY — insert-uri `plati` unificate (18.11.2026)

## Făcut
- `services/facturaService.ts`: `PlataNoua` + `creeazaPlata(payload, client?)`, singurul `insert` în `plati` din serviciu; `genereazaFacturaAbonament` îl folosește.
- Comutate pe `creeazaPlata`: CalendarView (2 locuri), StagiiCompetitii, ExamenRegistrationPreview, GestiuneFacturi, JurnalIncasari. Niciun `from('plati').insert` direct rămas în aceste fișiere.
- D-03: CalendarView trimite acum `club_id` (sportivul curent / `sportiv.club_id` la lot). Înainte erau singurele inserturi UI fără club.
- Garda de tip a prins un câmp lipsă la ExamenRegistrationPreview (`familie_id`): adăugat `familie_id: null` (echivalent cu absent, coloana n-are default).
- CalendarView lot: `.single()` -> `maybeSingle` + `if (pData)` (nu mai împinge `null` în state).

## SC-02 (Stagii `eveniment_id`)
Verdict 44-VERIFICARE: `plati.eveniment_id` NU există live. Bug REAL. Scos din payload la StagiiCompetitii. Rămas în `types.ts` (`Plata.eveniment_id?`) cu comentariul corectat, fiindcă îl citesc alte locuri din StagiiCompetitii.
**Nerezolvat, în afara planului:** `StagiiCompetitii.tsx` ~linia 363-369 (mapă sportiv->plată pe `eveniment_id`) nu va găsi niciodată nimic, iar ~linia 623 (`delete().eq('eveniment_id', id)` pe `plati`) eșuează silențios. De decis separat.

## Verificat
- `npx tsc --noEmit`: 0 erori înainte și după.
- grep: niciun insert direct rămas; `creeazaPlata(` prezent în toate fișierele.
## Neverificat
- Niciun test în UI (human-check din plan: înscriere la stagiu/competiție, factură manuală, încasare cu factură nouă, examen) — de făcut la sfârșitul fazei.
- `services/facturaService.test.ts` nerulat.
- Triggerul `plati_completeaza_club_id_trg` NU e încă aplicat live; codul nu depinde de el.
