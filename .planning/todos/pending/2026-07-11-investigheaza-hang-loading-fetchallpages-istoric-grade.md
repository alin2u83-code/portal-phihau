---
created: 2026-07-11T20:16:44.138Z
title: Investigheaza hang loading fetchAllPages istoric grade
area: database
files:
  - hooks/useDataProvider.ts:373-408
---

## Problem

App ramane blocata indefinit pe loading screen general (`MartialArtsSkeleton`, gate-uit in `App.tsx` prin `useDataProvider.loading`). Debugging cu console.log a aratat ca flag-ul `loadingData` ramane `true` la nesfarsit dupa ce `activeRoleContext` devine disponibil.

Cauza localizata: request-ul `vedere_istoric_grade_sportiv?...&offset=0&limit=1000` (generat de `fetchAllPages` in `hooks/useDataProvider.ts:373-384`, folosit la linia ~405 pentru paginarea istoricului de grade per club) ramane PENDING indefinit in Network tab — fara raspuns, fara eroare, niciodata resolved.

Verificat separat: acelasi query rulat direct pe DB (`EXPLAIN ANALYZE`) dureaza 4.7ms. Deci nu-i query lent la nivel Postgres — hang-ul e undeva intre PostgREST/Supavisor pooler si browser. Posibil epuizare pool conexiuni cauzata de multele query-uri paralele declansate simultan la incarcarea initiala a aplicatiei (~15 criticalQueries + attendanceData + roles fetch, toate simultan).

Descoperit 11.07.2026 in timpul verificarii Playwright a fix-ului RLS "Necunoscut" din modulul Examene — NU e cauzat de acel fix, doar expus de el (blocheaza verificarea vizuala end-to-end).

Cod are deja un precedent similar documentat: comment "FIX TIMEOUT" in `hooks/useAttendanceData.ts` descrie o problema analoaga (statement_timeout) rezolvata anterior pentru alt query, separand un join embedded complex in query-uri simple + join in memorie.

## Solution

TBD. De investigat:
- Connection pooler settings Supabase (Supavisor) — limita conexiuni concurente
- Daca fetchAllPages ruleaza in paralel cu prea multe alte query-uri simultan la initializare (posibil connection limit browser/pooler epuizat)
- Aplicarea aceluiasi pattern de fix ca la `useAttendanceData.ts` (separare query complex in query-uri simple + join in memorie), daca problema e de complexitate query, nu de pool
