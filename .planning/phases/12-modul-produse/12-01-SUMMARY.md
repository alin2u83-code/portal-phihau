---
phase: 12-modul-produse
plan: 01
subsystem: database
tags: [supabase, postgresql, rls, typescript, produse, echipamente]

# Dependency graph
requires:
  - phase: existing
    provides: "clubs, sportivi, plati tabele — FK-uri folosite de schema produse"
provides:
  - "sql/12-produse-schema.sql — schema completă 7 tabele + RLS + seed 8 categorii"
  - "types.ts — 7 interfețe DB + 4 tipuri compuse pentru modulul Produse"
  - "View union extins: 'produse' | 'vanzari-produse'"
affects:
  - 12-02-service-catalog
  - 12-03-intrari-marfa
  - 12-04-vanzari
  - 12-05-raport

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RLS pe club_id via header active-role-context-id — același pattern ca restul modulelor"
    - "Snapshot prețuri la vânzare: pret_vanzare_snapshot + pret_intrare_snapshot + denumire_snapshot în produse_vanzari_detalii"
    - "Categorii globale cu seed predefinit — extensibile de SUPER_ADMIN_FEDERATIE"

key-files:
  created:
    - sql/12-produse-schema.sql
    - (adăugat în types.ts — secțiunea MODUL PRODUSE)
  modified:
    - types.ts

key-decisions:
  - "Catalog per club — produse.club_id FK → clubs.id ON DELETE CASCADE"
  - "Variante separate tabel produse_variante cu produs_id FK — un produs are N variante cu prețuri diferite"
  - "Categorii globale în produse_categorii — seed 8 predefinite, extensibil de SUPER_ADMIN"
  - "Snapshot prețuri la vânzare: pret_vanzare_snapshot + pret_intrare_snapshot stocate pe linia de vânzare (D-09)"
  - "Vânzare linkată la Plata: produse_vanzari.plata_id FK → plati.id ON DELETE SET NULL"
  - "sql/ este gitignored (securitate DB) — fișierul există pe disk pentru aplicare manuală în Supabase SQL Editor"

patterns-established:
  - "RLS produse: SELECT filtrează pe club_id din header + bypass SUPER_ADMIN_FEDERATIE"
  - "RLS variante: securitate moștenită prin JOIN la produse (nu club_id direct pe variantă)"
  - "Tipuri compuse: interfețe DB + interfețe extins cu relații (Produs extends ProdusDB cu variante[])"

requirements-completed: [PRD-01, PRD-02, PRD-03, PRD-04, PRD-05, PRD-06]

# Metrics
duration: 15min
completed: 2026-06-20
---

# Phase 12 Plan 01: DB Schema + Types Summary

**Schema PostgreSQL completă pentru modulul Produse: 7 tabele cu RLS pe club_id, seed 8 categorii echipamente QwanKiDo, snapshot prețuri la vânzare, și 11 tipuri TypeScript noi în types.ts**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-20T07:00:00Z
- **Completed:** 2026-06-20T07:14:42Z
- **Tasks:** 2
- **Files modified:** 2 (sql/12-produse-schema.sql creat, types.ts modificat)

## Accomplishments

- Schema SQL completă cu 7 tabele: produse_categorii, produse, produse_variante, produse_intrari, produse_intrari_detalii, produse_vanzari, produse_vanzari_detalii
- RLS activat pe toate 7 tabelele — filtrare strictă pe club_id din header active-role-context-id
- Seed 8 categorii predefinite: Vo-phuc, Centuri/Esarfe, Mănuși, Tibiere, Platose, Veste, Embleme, Alte echipamente
- 7 interfețe DB + 4 tipuri compuse adăugate în types.ts, View union extins cu 'produse' | 'vanzari-produse'
- tsc --noEmit și vite build trec fără erori

## Task Commits

1. **Task 1: SQL Migration schema produse** - sql/12-produse-schema.sql creat pe disk (gitignored — aplicare manuală în Supabase SQL Editor, nu comis în git — vezi Deviations)
2. **Task 2: TypeScript types** - `28360b2` (feat)

**Plan metadata:** SUMMARY.md adăugat (docs)

## Files Created/Modified

- `sql/12-produse-schema.sql` - Schema completă 7 tabele + RLS + seed categorii (fișier local, gitignored)
- `types.ts` - 7 interfețe DB Produse + 4 tipuri compuse + View union extins

## Decisions Made

- Snapshot prețuri la vânzare (D-09): `pret_vanzare_snapshot` + `pret_intrare_snapshot` + `denumire_snapshot` stocate pe linia de vânzare — raportul financiar nu depinde de varianta curentă
- Variantele moștenesc RLS de la produs prin JOIN — nu au column club_id propriu (variantele nu știu direct de club)
- SUPER_ADMIN_FEDERATIE: bypass complet pe SELECT produse + gestionare categorii globale

## Deviations from Plan

### Gitignore constraint pe sql/12-produse-schema.sql

**1. [Documented Constraint] sql/ este gitignored pentru securitate — fișier creat dar nu comis**
- **Found during:** Task 1 (SQL Migration)
- **Issue:** `.gitignore` exclude explicit `sql/` și `*.sql` (commit `0ad12a0` a eliminat deliberat aceste fișiere din tracking din motive de securitate — schema DB cu RLS policies considerate informații sensibile)
- **Fix:** Fișierul `sql/12-produse-schema.sql` a fost creat pe disk și există pentru aplicare manuală în Supabase SQL Editor. Nu a fost forțat în git (`git add -f`) deoarece decizia de securitate este intenționată.
- **Files modified:** sql/12-produse-schema.sql (creat pe disk, necomis)
- **Impact:** Fișierul există local. Dezvoltatorul îl aplică manual în Supabase SQL Editor conform workflow-ului existent al proiectului.

---

**Total deviations:** 1 (gitignore constraint documentat)
**Impact on plan:** Fișierul SQL există și este complet. Workflow-ul de aplicare manuală este conform cu practica proiectului pentru fișierele sql/.

## Issues Encountered

- sql/ gitignored prin decizie deliberată de securitate — Task 1 completat (fișier creat pe disk), dar commit-ul pentru sql/ nu a fost posibil. Toate celelalte criterii de acceptanță sunt îndeplinite.

## User Setup Required

**Aplicare migration Supabase (manuală):**
1. Deschide Supabase Dashboard → SQL Editor
2. Copiază conținutul din `sql/12-produse-schema.sql`
3. Execută — toate 7 tabele se creează cu RLS și seed 8 categorii
4. Verificare: `SELECT * FROM produse_categorii;` → 8 rânduri

## Self-Check

- [x] `sql/12-produse-schema.sql` există pe disk: confirmat
- [x] types.ts conține `export interface ProdusVariantaDB` cu pret_intrare, pret_vanzare, stoc_curent, stoc_minim
- [x] types.ts conține `export interface ProdusVanzareDetaliuDB` cu pret_vanzare_snapshot, pret_intrare_snapshot, denumire_snapshot
- [x] types.ts conține `export interface Produs extends ProdusDB` cu `variante: ProdusVariantaDB[]`
- [x] View type conține 'produse' și 'vanzari-produse'
- [x] tsc --noEmit: zero erori noi
- [x] vite build: succes (30.47s)
- [x] Commit `28360b2` există: confirmat

## Self-Check: PASSED

## Next Phase Readiness

- Schema DB completă — planurile 12-02..12-05 pot folosi toate tabelele
- Tipurile TypeScript disponibile pentru import în servicii și componente
- Blocant pending: ADMIN_CLUB trebuie să aplice manual `sql/12-produse-schema.sql` în Supabase înainte ca planurile 12-02+ să funcționeze în producție

## Threat Flags

Niciun endpoint sau suprafață de securitate nouă introdusă în acest plan (SQL și TS types only — zero UI sau API routes).

---
*Phase: 12-modul-produse*
*Completed: 2026-06-20*
