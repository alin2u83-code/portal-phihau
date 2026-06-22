---
phase: 13-tracking-comenzi-produse
plan: "01"
subsystem: comenzi-produse
tags: [database, schema, typescript, rls, enums, tracking]
dependency_graph:
  requires: [12-modul-produse]
  provides: [comenzi_produse, cereri_produse, comenzi_produse_iteme, comenzi_produse_cluburi, CerereProdusFull, ComandaProduseiFull]
  affects: [types.ts, produse]
tech_stack:
  added: []
  patterns: [PostgreSQL enums, RLS policies, TypeScript union types, nullable FK with CHECK constraint]
key_files:
  created:
    - sql/migrations/14-comenzi-produse-schema.sql
  modified:
    - types.ts
decisions:
  - "SQL în sql/migrations/ ca fișier de referință — directorul este în .gitignore (schema DB exclusă din versionare per convenție proiect). Aplicare manuală via Supabase Dashboard sau supabase CLI."
  - "comenzi_produse.club_id NULLABLE cu CHECK condiționat: impus NOT NULL doar pentru tip_comanda='club_furnizor'; NULL permis pentru 'federatie_club' și 'club_federatie'"
  - "tip_produs adăugat ca câmp opțional pe ProdusDB (string | undefined) pentru compatibilitate retroactivă cu produse existente fără câmpul setat"
metrics:
  completed_date: "2026-06-22"
  tasks_completed: 3
  tasks_total: 3
  duration_estimate: "~40 min"
---

# Phase 13 Plan 01: Schema DB + Tipuri TypeScript Comenzi Produse Summary

**One-liner:** Schema PostgreSQL pentru tracking comenzi (4 tabele + 3 enum-uri + RLS policies) și tipuri TypeScript corespunzătoare în types.ts — fundație pentru toate planurile Phase 13.

## What Was Built

### Task 1: Migrație SQL — 4 tabele + enums + tip_produs + RLS

Creat `sql/migrations/14-comenzi-produse-schema.sql` cu:

**Enum-uri PostgreSQL (idempotente):**
- `stare_cerere_produs`: SOLICITATA, CONFIRMATA, PLASATA, SOSITA, PREDATA, PLATITA, ANULATA (7 stări)
- `tip_comanda_produs`: club_furnizor, federatie_club, club_federatie
- `stare_comanda_produs`: DESCHISA, PLASATA, SOSITA, FINALIZATA, ANULATA

**Tabele noi (FK order corect):**
1. `comenzi_produse` — header comandă; `club_id` NULLABLE cu CHECK condiționat (NOT NULL doar pentru `club_furnizor`)
2. `cereri_produse` — cerere individuală sportiv; FK la comenzi_produse, produse_variante, sportivi, plati
3. `comenzi_produse_iteme` — iteme agregate per comandă
4. `comenzi_produse_cluburi` — destinatari per-club pentru comenzile federației (UNIQUE pe comanda_id + club_id)

**ALTER existent:**
- `ALTER TABLE produse ADD COLUMN IF NOT EXISTS tip_produs TEXT NOT NULL DEFAULT 'per_sportiv' CHECK (tip_produs IN ('per_sportiv', 'per_club'))`

**RLS activ pe toate tabelele noi** folosind `public.is_super_admin()` și `public.get_active_club_id()`.

**Indecși** pentru queries frecvente (club_id, stare_cerere, comanda_id pe toate tabelele relevante).

### Task 2: Tipuri TypeScript în types.ts

Adăugat la finalul secțiunii Produse din `types.ts`:

- Union types: `StareCerereProdusTip`, `TipComandaProdusTip`, `StareComandaProdusTip`
- Interfețe BD: `CerereProdusBD`, `ComandaProduseBD`, `ComandaProduseItemBD`, `ComandaProduseClubBD`
- Interfețe Full: `CerereProdusFull` (cu varianta + produs join), `ComandaProduseiFull` (cu cereri + iteme + cluburi)
- `tip_produs?: 'per_sportiv' | 'per_club'` adăugat pe `ProdusDB`
- `ComandaProduseBD.club_id: string | null` (compatibil cu Flux B)

### Task 3: supabase db push

**COMPLETAT** — Migrația aplicată via Supabase MCP (`apply_migration` tool) de orchestrator.

Confirmat de orchestrator:
- Tabele create cu RLS activat: `comenzi_produse`, `cereri_produse`, `comenzi_produse_iteme`, `comenzi_produse_cluburi`
- Coloana `tip_produs` adăugată la tabela `produse` (TEXT NOT NULL, default 'per_sportiv')
- Toți indecșii creați
- Toate politicile RLS create

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] sql/ directory în .gitignore — fișierul SQL nu poate fi comis**

- **Found during:** Task 1 — post-commit, `git status` nu arăta fișierul creat
- **Issue:** `.gitignore` conține `sql/` și `*.sql` — schema DB este exclusă din versionare per convenție proiect (securitate)
- **Fix:** Fișierul SQL rămâne pe disk la `sql/migrations/14-comenzi-produse-schema.sql` ca referință pentru developer; modificările commitabile (types.ts) au fost grupate cu documentarea contextului
- **Impact:** Planul menționează calea `sql/migrations/14-comenzi-produse-schema.sql` — aceasta este convenția de naming din RESEARCH.md, nu o cale Supabase CLI. Fișierul există local pentru aplicare manuală.
- **Files modified:** types.ts (singurul fișier comisibil din plan)
- **Commit:** cff6487

**2. [Rule 3 - Blocking] sql/migrations/13-catalog-global-produse.sql referit în plan nu există**

- **Found during:** Task 1 — citire context
- **Issue:** Planul referă `sql/migrations/13-catalog-global-produse.sql` pentru pattern RLS, dar migrația Phase 12 a fost aplicată direct în Supabase (commit 1310a50 menționează "DB aplicat direct în Supabase")
- **Fix:** Pattern-ul RLS a fost extras din migrațiile existente în `supabase/migrations/` (20260507_sportivi_vizibili_competitii.sql, 20260529_categorii_template.sql) care folosesc `public.is_super_admin()` și `get_active_club_id()`
- **Files modified:** N/A — impact doar pe cum am identificat pattern-ul

## Commits

| Hash | Task | Description |
|------|------|-------------|
| cff6487 | Task 1 + Task 2 | feat(13-01): schema DB + tipuri TypeScript sistem comenzi produse |
| 434c128 | docs | docs(13-01): SUMMARY plan 01 — schema DB + tipuri TypeScript comenzi produse |

Notă: Task 1 (SQL) și Task 2 (types.ts) au fost grupate în același commit deoarece fișierul SQL nu poate fi comis (exclud .gitignore). Task 3 (migrație DB) aplicat via Supabase MCP de orchestrator — nu necesită commit suplimentar în repo.

## Verification

- `grep -c "CREATE TABLE" sql/migrations/14-comenzi-produse-schema.sql` → 4
- `grep -q "stare_cerere_produs.*SOLICITATA"` (prin DO $$ bloc) → prezent cu 7 valori
- `grep -q "tip_comanda = 'club_furnizor' AND club_id IS NOT NULL"` → prezent
- `grep -q "CerereProdusFull" types.ts` → prezent
- `grep -q "ComandaProduseiFull" types.ts` → prezent
- `npx tsc --noEmit` → 0 erori
- `sql/migrations/14-comenzi-produse-schema.sql` există pe disk (în .gitignore, neversioned)

## Known Stubs

Niciun stub UI în acest plan — plan pur DB + tipuri. Toate cele 3 task-uri sunt complete.

## Threat Flags

Plan implementează explicit toate mitigările din threat model:
- T-13-01: RLS UPDATE pe cereri_produse cu club_id = get_active_club_id() implementat
- T-13-02: RLS SELECT cu filtru club_id și sportiv user_id implementat
- T-13-03: Enum stare_cerere_produs previne valori invalide
- T-13-04: CHECK (cantitate > 0) pe cereri_produse și comenzi_produse_iteme
- T-13-05: CHECK constraint impune club_id NOT NULL când tip_comanda='club_furnizor'

## Self-Check: PASSED

- sql/migrations/14-comenzi-produse-schema.sql: FOUND (pe disk, neversioned per .gitignore)
- types.ts modificat: FOUND
- Commit cff6487: FOUND
- tsc --noEmit: PASSED (0 erori)
- Task 3 — migrație DB aplicată: CONFIRMED via Supabase MCP (orchestrator verification)
  - comenzi_produse: CREATED cu RLS
  - cereri_produse: CREATED cu RLS
  - comenzi_produse_iteme: CREATED cu RLS
  - comenzi_produse_cluburi: CREATED cu RLS
  - produse.tip_produs: COLUMN ADDED
  - Toți indecșii: CREATED
  - Toate politicile RLS: CREATED
