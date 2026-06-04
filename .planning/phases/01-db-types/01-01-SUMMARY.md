---
phase: 01-db-types
plan: "01"
subsystem: db-schema
tags: [migration, types, antrenamente, stagii, sql, typescript]
dependency_graph:
  requires: []
  provides: [program_antrenamente.status, program_antrenamente.motiv_anulare, tipuri_stagii.pret, Antrenament.status, Antrenament.motiv_anulare, TipStagiu]
  affects: [components/Grupe, components/Competitii/StagiiCompetitii.tsx, components/Competitii/TipuriStagiiAdmin.tsx]
tech_stack:
  added: []
  patterns: [ADD COLUMN IF NOT EXISTS, DO/plpgsql idempotent constraint, optional TypeScript fields]
key_files:
  created:
    - sql/migrations/add_status_motiv_antrenamente.sql
    - sql/migrations/add_pret_tipuri_stagii.sql
  modified:
    - types.ts
decisions:
  - "D-01..D-03: status cu CHECK 3 valori + DEFAULT planificat + bloc DO idempotent pe pg_constraint"
  - "D-04..D-05: motiv_anulare TEXT nullable fara DEFAULT"
  - "D-06..D-07: pret NUMERIC(10,2) nullable pe tipuri_stagii, NULL = fallback taxa globala"
  - "D-08..D-10: Antrenament.status + motiv_anulare optional; TipStagiu interface exportata cu pret"
metrics:
  duration: "2m07s"
  completed: "2026-06-04"
  tasks_completed: 2
  tasks_total: 3
  files_created: 2
  files_modified: 1
---

# Phase 01 Plan 01: DB & Types — Migratii schema + TypeScript Summary

**One-liner:** Doua migratii SQL idempotente (status/motiv_anulare pe program_antrenamente, pret pe tipuri_stagii) si update types.ts cu interfata Antrenament extinsa si TipStagiu noua.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migratie status + motiv_anulare pe program_antrenamente | gitignored (sql/) | sql/migrations/add_status_motiv_antrenamente.sql |
| 2 | Migratie pret pe tipuri_stagii + update types.ts | 7cc6dbb | sql/migrations/add_pret_tipuri_stagii.sql, types.ts |

> Note: SQL files are excluded from git by project .gitignore (sql/ + *.sql are ignored intentionally — DB schema considered sensitive). The files exist on disk for manual Supabase application.

## Task 3: Awaiting Manual Application

Task 3 is a `checkpoint:human-action` — migration files are ready on disk, awaiting manual application in Supabase Studio.

## Deviations from Plan

### SQL Files Not Committed to Git

**Found during:** Task 1 commit attempt
**Issue:** Project .gitignore explicitly excludes `sql/` directory and `*.sql` files. `git add` failed with "paths are ignored" error.
**Fix:** Confirmed this is intentional project behavior — SQL migrations are applied manually and not tracked in git. Skipped git commit for SQL files. TypeScript changes (types.ts) were committed normally.
**Impact:** None — files exist on disk at correct paths for manual application.

None for tasks 1 and 2 (code changes). Plan executed exactly as written for TypeScript changes.

## Artifacts Produced

### sql/migrations/add_status_motiv_antrenamente.sql
```sql
ALTER TABLE program_antrenamente
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'planificat';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conname = 'program_antrenamente_status_check'
      AND conrelid = 'program_antrenamente'::regclass)
  THEN
    ALTER TABLE program_antrenamente
      ADD CONSTRAINT program_antrenamente_status_check
        CHECK (status IN ('planificat', 'anulat', 'efectuat'));
  END IF;
END; $$;

ALTER TABLE program_antrenamente
  ADD COLUMN IF NOT EXISTS motiv_anulare text;
```

### sql/migrations/add_pret_tipuri_stagii.sql
```sql
ALTER TABLE tipuri_stagii
  ADD COLUMN IF NOT EXISTS pret numeric(10,2);
```

### types.ts changes
- `Antrenament` interface: added `status?: 'planificat' | 'anulat' | 'efectuat'` and `motiv_anulare?: string | null`
- New exported interface `TipStagiu` with `cod: string`, `denumire: string`, `pret?: number | null`

## Verification

- [x] `add_status_motiv_antrenamente.sql`: contains ADD COLUMN IF NOT EXISTS for status (DEFAULT planificat) and motiv_anulare; CHECK constraint with 3 values; idempotent DO block
- [x] `add_pret_tipuri_stagii.sql`: contains ADD COLUMN IF NOT EXISTS pret numeric(10,2) on tipuri_stagii, no DEFAULT
- [x] `types.ts`: Antrenament has status? + motiv_anulare?; TipStagiu interface exported with pret?: number | null
- [x] `npm run lint` (tsc --noEmit): passes with no new errors
- [ ] Checkpoint Task 3: manual Supabase application pending user confirmation

## Known Stubs

None.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries beyond those documented in the plan's threat model (T-01-01, T-01-02, T-01-03).

## Self-Check: PASSED

- [x] `sql/migrations/add_status_motiv_antrenamente.sql` exists on disk
- [x] `sql/migrations/add_pret_tipuri_stagii.sql` exists on disk
- [x] `types.ts` modified and committed (7cc6dbb)
- [x] TypeScript compilation passes
