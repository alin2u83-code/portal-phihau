---
created: 2026-09-08T19:04:54Z
completed: 2026-09-08T19:04:54Z
title: Fix cache localStorage stale la editare/stergere grupa
area: grupe
files:
  - components/Grupe/index.tsx:98-130 (UPDATE)
  - components/Grupe/index.tsx:265-284 (DELETE)
  - hooks/useGrupe.ts (sursa comportamentului de cache)
commit: d933b1d
---

## Problem

Editarea si stergerea unei grupe reuseau in DB (RLS ok, update/delete confirmat) dar UI nu reflecta schimbarea — fara nicio eroare vizibila. Cauza: `useGrupe.ts` serveste date din cache localStorage (`cache_grupe_*`, TTL 10 min) inainte de a interoga Supabase; `queryClient.invalidateQueries` marcheaza query-ul stale dar refetch-ul tot serveste cache-ul neexpirat. Ramura CREATE avea deja fix (BUG-4: golire cache + refetch explicit), UPDATE si DELETE nu.

## Solution

Aplicat acelasi fix ca la CREATE, pe ambele ramuri:
1. golire chei `cache_grupe_*` din localStorage
2. `queryClient.invalidateQueries({queryKey:['grupe']})`
3. `await refetchGrupe()` explicit

Verificat: RLS pe `grupe` corect (o singura policy `FOR ALL`), trigger audit ok, `tsc --noEmit` fara erori. Commit `d933b1d`, push pe `main`.

Note: nu a fost nevoie sa se atinga types.ts/DataContext/useDataProvider/supabaseClient.
