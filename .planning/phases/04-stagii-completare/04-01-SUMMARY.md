---
phase: "04-stagii-completare"
plan: "01"
subsystem: "stagii/db-types"
tags: [sql, typescript, schema, migrations, types]
dependency_graph:
  requires: []
  provides:
    - "sql/migrations/add_pret_per_categorie_stagiu.sql — migrație SQL idempotentă pentru coloane prețuri și FK plati→evenimente"
    - "types.ts Eveniment.pret_copii|pret_grade|pret_centuri — tipuri pentru prețuri per categorie stagiu"
    - "types.ts Plata.eveniment_id — FK TypeScript pentru tracking plată per eveniment"
    - "types.ts Rezultat.created_at — timestamp tracking participare eveniment"
  affects:
    - "components/Competitii/StagiiCompetitii.tsx (va folosi pret_copii|pret_grade|pret_centuri în Plan 04-02)"
    - "hooks/useDataProvider.ts (AppData.plati: Plata[] acum include eveniment_id)"
tech_stack:
  added: []
  patterns:
    - "Câmpuri nullable cu fallback chain: pret_copii → tipuri_stagii.pret → preturiConfig global"
    - "ALTER TABLE IF NOT EXISTS pentru idempotență migrație SQL"
    - "FK ON DELETE SET NULL pentru protecție integritate la ștergere eveniment"
key_files:
  created:
    - "sql/migrations/add_pret_per_categorie_stagiu.sql"
  modified:
    - "types.ts"
decisions:
  - "sql/ rămâne gitignored (decizie proiect) — fișierul SQL există pe disc pentru aplicare manuală în Supabase"
  - "pret_copii|pret_grade|pret_centuri nullable fără DEFAULT — NULL = fallback la tipuri_stagii.pret"
  - "eveniment_id FK cu ON DELETE SET NULL — ștergerea evenimentului nu corupe plățile existente (T-04-01)"
  - "Rezultat.created_at adăugat ca optional string — tracking temporal participare"
metrics:
  duration: "8 minute"
  completed: "2026-06-05"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 1
---

# Phase 04 Plan 01: Schema DB & Contracte TypeScript — Prețuri Per Categorie Stagiu

**One-liner:** Migrație SQL idempotentă + extindere types.ts pentru prețuri per categorie (pret_copii/pret_grade/pret_centuri) și FK plati→evenimente (eveniment_id).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrație SQL — prețuri per categorie + FK plati→evenimente | N/A (sql/ gitignored) | `sql/migrations/add_pret_per_categorie_stagiu.sql` |
| 2 | Update types.ts — extinde Eveniment, Plata, Rezultat | `9ff764c` | `types.ts` |

## What Was Built

### Task 1: Migrație SQL

Fișierul `sql/migrations/add_pret_per_categorie_stagiu.sql` conține două blocuri ALTER TABLE:

**Bloc 1 — coloane prețuri pe `public.evenimente`:**
- `pret_copii NUMERIC(10,2)` — sportivi 7–12 ani
- `pret_grade NUMERIC(10,2)` — min 13 ani, grade colorate (până la Dan 1)
- `pret_centuri NUMERIC(10,2)` — centuri negre (Dan 1+)
- Toate cu `ADD COLUMN IF NOT EXISTS` (idempotente)
- NULL = fallback la `tipuri_stagii.pret`, apoi la `preturiConfig` global

**Bloc 2 — FK pe `public.plati`:**
- `eveniment_id UUID REFERENCES public.evenimente(id) ON DELETE SET NULL`
- Plățile existente rămân cu `eveniment_id = NULL` (fără migrare retroactivă)

### Task 2: types.ts extins

Trei interfețe modificate:

1. **`Eveniment`** — câmpuri noi după `tip_stagiu?`:
   ```typescript
   pret_copii?: number | null;
   pret_grade?: number | null;
   pret_centuri?: number | null;
   ```

2. **`Plata`** — câmp nou după `sesiune_id?`:
   ```typescript
   eveniment_id?: string | null; // FK → evenimente.id (pentru 'Taxa Stagiu' și 'Taxa Competitie')
   ```

3. **`Rezultat`** — câmp nou după `probe?`:
   ```typescript
   created_at?: string;
   ```

## Verification Results

1. `grep -c "pret_copii" sql/migrations/add_pret_per_categorie_stagiu.sql` → **2** (commentariu + ALTER TABLE)
2. `npx tsc --noEmit` → **0 erori** (fără erori noi introduse)
3. `grep -n "pret_copii|pret_grade|pret_centuri" types.ts` → **3 matches** în interfața Eveniment (liniile 390-392)
4. `grep -n "eveniment_id" types.ts` → **match la linia 167** în interfața Plata
5. `grep -n "created_at" types.ts` → **match la linia 401** în interfața Rezultat

## Deviations from Plan

### Context: sql/ gitignored — Task 1 nu s-a putut comite

**Found during:** Task 1
**Issue:** `.gitignore` include `sql/` și `*.sql` — fișierele SQL sunt ignorate intenționat de proiect (conțin informații sensibile despre structura DB).
**Fix:** Fișierul SQL a fost creat pe disc la calea corectă (`sql/migrations/add_pret_per_categorie_stagiu.sql`) dar nu poate fi commitit fără `git add -f`. Conform regulilor GSD executor, nu se face `git add -f` pe fișiere gitignored fără permisiunea explicită a utilizatorului.
**Impact:** Fișierul există și poate fi aplicat manual în Supabase Dashboard. Planul 04-02 nu depinde de commit-ul SQL — depinde doar de tipurile TypeScript (commitite).
**Classification:** Comportament intenționat al proiectului, nu o deviere.

## Known Stubs

Niciun stub prezent. Interfețele TypeScript sunt complete și pot fi referențiate imediat din Plan 04-02.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: tampering-mitigated | sql/migrations/add_pret_per_categorie_stagiu.sql | ON DELETE SET NULL pe FK eveniment_id protejează plățile existente la ștergerea unui eveniment (T-04-01) |

## Self-Check: PASSED

- [x] `sql/migrations/add_pret_per_categorie_stagiu.sql` există pe disc
- [x] `types.ts` modificat cu toate câmpurile planificate
- [x] `9ff764c` — commit types.ts există în git log
- [x] TypeScript compilation: 0 erori
- [x] Planul 04-02 poate referenția `eveniment.pret_copii` fără erori de tip
