---
phase: 14-corelare-prezente-facturi
plan: "01"
subsystem: financiar-prezenta
tags: [hook, util, service, migration, tdd]
dependency_graph:
  requires: []
  provides:
    - hooks/useDataStartFacturare.ts
    - hooks/usePrezenteLuna.ts
    - utils/luniLipsa.ts
    - services/facturaService.ts
    - sql/migrations/add_data_start_facturare.sql
  affects:
    - planurile 14-02/14-03/14-04 (consumatori ai acestor artefacte)
tech_stack:
  added: []
  patterns:
    - useQuery React Query v5 cu staleTime 5min
    - funcție pură cu date-fns eachMonthOfInterval
    - serviciu cu pattern { data, error }
    - TDD exportabil (fără vitest/jest)
key_files:
  created:
    - hooks/useDataStartFacturare.ts
    - hooks/usePrezenteLuna.ts
    - utils/luniLipsa.ts
    - utils/luniLipsa.test.ts
    - services/facturaService.ts
    - sql/migrations/add_data_start_facturare.sql
  modified: []
decisions:
  - sql/ este gitignored (securitate DB) — migrația există pe disk, aplicată manual prin checkpoint Task 4
  - TDD cu funcții exportabile (nu vitest/jest) — proiectul are doar Playwright E2E
  - usePrezenteLuna folosește vedere_prezenta_sportiv direct (status string confirmat din IstoricPrezentaGlobal.tsx)
  - genereazaFacturaAbonament nu recalculează soldul (anti-pattern interzis din RESEARCH.md)
metrics:
  duration: ~40min
  completed_date: "2026-06-23"
  tasks_completed: 4
  tasks_pending: 0
  files_created: 6
  files_modified: 0
---

# Phase 14 Plan 01: Fundație Corelare Prezențe-Facturi — Summary

**One-liner:** Infrastructură reutilizabilă pentru faza 14: hook citire/scriere data_start_facturare (fără types.ts), hook prezențe per lună pe vedere_prezenta_sportiv, util pur calcul luni lipsă cu date-fns, serviciu generare factură Abonament cu validare V5 și blocare duplicate.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrație data_start_facturare + hook citire/scriere | 675d1af | hooks/useDataStartFacturare.ts, sql/migrations/add_data_start_facturare.sql |
| 2 (RED) | Test failing pentru calculeazaLuniLipsa | 315b047 | utils/luniLipsa.test.ts |
| 2 (GREEN) | usePrezenteLuna + util calcul luni lipsă | ea05d9e | utils/luniLipsa.ts, hooks/usePrezenteLuna.ts |
| 3 | Serviciu generare factură Abonament reutilizabil | 9de76ff | services/facturaService.ts |

## Tasks Completed (continuare)

| Task | Name | Status | Confirmare |
|------|------|--------|------------|
| 4 | Checkpoint: aplicare migrație SQL în Supabase | COMPLETE | Migrație aplicată via MCP Supabase. Coloana data_start_facturare (DATE, nullable) există. Index parțial creat. RLS UPDATE verificat — Assumption A3 confirmată (politicile existente acoperă câmpul nou, nicio politică suplimentară necesară). |

## Artifacts Produced

### `sql/migrations/add_data_start_facturare.sql`
- `ALTER TABLE public.sportivi ADD COLUMN IF NOT EXISTS data_start_facturare DATE`
- `CREATE INDEX IF NOT EXISTS idx_sportivi_data_start_facturare` (parțial, WHERE NOT NULL)
- Idempotentă (IF NOT EXISTS) — poate fi rulată de mai multe ori
- Nota RLS: politicile existente acoperă câmpul nou (nu necesită politici suplimentare)
- **Notă**: fișierul există pe disk dar NU în git (sql/ este gitignored — securitate DB schema)

### `hooks/useDataStartFacturare.ts`
- Exportă `useDataStartFacturare(sportivId)`
- `useQuery` cu queryKey `['data-start-facturare', sportivId]`, staleTime 5min
- `useMutation` `setDataStartFacturare(value: string | null)` cu invalidare automată
- NU importă câmpul din `types.ts` — fetch separat cu `(data as any).data_start_facturare`
- NU modifică `types.ts`

### `utils/luniLipsa.ts`
- Exportă `calculeazaLuniLipsa(dataStart, platiSportiv): { luna: number; an: number }[]`
  - Funcție pură (fără efecte secundare, fără Supabase)
  - Guard: `!dataStart` → `[]`; `dataStart > azi` → `[]`
  - Luna 1-indexed (identic cu DB)
  - Ignoră tip != 'Abonament' și plăți cu luna/an null
  - Folosește `date-fns eachMonthOfInterval + parseISO + startOfMonth`
- Exportă `formatLuna(luna, an): string` — localizare ro-RO

### `utils/luniLipsa.test.ts`
- 7 teste ca funcții exportabile (no vitest — documentat în TDD Gate Compliance)
- Acoperire: null/undefined dataStart, non-Abonament ignorat, luni 2/4/5/6 lipsesc, luna/an null ignorat, 1-indexed corect, formatLuna română

### `hooks/usePrezenteLuna.ts`
- Exportă `usePrezenteLuna(sportivId, luna, an, enabled?)`
- `useQuery` pe `vedere_prezenta_sportiv`, filtru `status.toLowerCase() === 'prezent'`
- Parametru `enabled` pentru lazy-load la click (PLF-01 pattern)
- Returnează `string[]` — lista datelor ISO sortate crescător

### `services/facturaService.ts`
- Exportă `facturaAbonamentExista(sportivId, luna, an): Promise<boolean>`
- Exportă `genereazaFacturaAbonament(params): Promise<{ data: Plata | null; error: any }>`
  - Validare V5: luna 1-12, an 2020-2100, suma pozitivă (Threat T-14-01)
  - Blocare duplicate prin `facturaAbonamentExista` înainte de insert
  - NU recalculează soldul — status 'Neachitat' fix
  - Pattern insert din PlatiScadente.tsx lines 205-211

## Verification

- `npx tsc --noEmit`: zero erori (toate fișierele noi compilează clean)
- Fișiere locked intacte: `git diff --name-only HEAD~4 HEAD | grep -E "types\.ts|ui\.tsx|DataContext|NavigationContext"` → niciun rezultat
- Migrația SQL este idempotentă (IF NOT EXISTS) — aplicabilă fără risc de duplicare

## Deviations from Plan

### Documentat: sql/ gitignored

**Found during:** Task 1 (la git add sql/migrations/add_data_start_facturare.sql)
**Issue:** Directorul `sql/` este în `.gitignore` (securitate — schema DB conținând informații sensibile)
**Fix:** Migrația există pe disk și va fi aplicată manual de utilizator (Task 4 checkpoint). Nu s-a forțat adăugarea cu `git add -f` — acesta ar fi un anti-pattern explicit interzis în protocolul de commit.
**Impact:** Niciun impact funcțional. Fișierul este accesibil pe disk pentru copy-paste în Supabase SQL Editor.

### TDD Gate Compliance

**Proiectul nu are vitest/jest configurat** — doar Playwright E2E (`package.json` confirmă `"test": "playwright test"`).

Per instrucțiunile planului: "dacă nu, scrie testul ca funcție exportabilă cu asserții simple și documentează în SUMMARY".

**Implementat:** `utils/luniLipsa.test.ts` cu 7 teste ca funcții exportabile, runnable cu `node --import tsx utils/luniLipsa.test.ts`.

**TDD Gate commits:**
1. RED: `315b047` — `test(14-01): add failing test for calculeazaLuniLipsa + formatLuna`
2. GREEN: `ea05d9e` — `feat(14-01): calculeazaLuniLipsa + formatLuna + usePrezenteLuna`

## Known Stubs

Niciun stub — toate fișierele din acest plan sunt infrastructură pură (hooks, util, serviciu, SQL). Nu renderizează UI.

## Threat Flags

Nicio suprafață nouă de securitate introdusă față de `<threat_model>` din plan. Toate amenințările identificate (T-14-01, T-14-02, T-14-03, T-14-SC) sunt adresate:

- T-14-01: validare luna/an/suma în `genereazaFacturaAbonament` ✓
- T-14-02: RLS pe vedere_prezenta_sportiv acoperit de politicile existente ✓
- T-14-03: CONFIRMAT în checkpoint Task 4 — RLS UPDATE reușește pentru ADMIN_CLUB, Assumption A3 validată ✓
- T-14-SC: zero pachete noi instalate ✓

## Self-Check: PASSED

**Fișiere create verificate:**
- hooks/useDataStartFacturare.ts: FOUND (creat în Task 1)
- hooks/usePrezenteLuna.ts: FOUND (creat în Task 2)
- utils/luniLipsa.ts: FOUND (creat în Task 2)
- utils/luniLipsa.test.ts: FOUND (creat în Task 2 RED)
- services/facturaService.ts: FOUND (creat în Task 3)
- sql/migrations/add_data_start_facturare.sql: FOUND pe disk (gitignored — normal)

**Commits verificate:**
- 675d1af: feat(14-01) hook useDataStartFacturare ✓
- 315b047: test(14-01) RED phase ✓
- ea05d9e: feat(14-01) GREEN phase ✓
- 9de76ff: feat(14-01) serviciu facturaService ✓

**TypeScript:** npx tsc --noEmit → zero erori ✓
**Locked files:** types.ts, ui.tsx, DataContext, NavigationContext — neatinse ✓
