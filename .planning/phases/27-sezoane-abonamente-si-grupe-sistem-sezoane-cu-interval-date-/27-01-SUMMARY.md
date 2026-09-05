---
phase: 27-sezoane-abonamente-si-grupe-sistem-sezoane-cu-interval-date-
plan: 01
subsystem: database
tags: [supabase, rls, postgres, react-query, typescript]

requires: []
provides:
  - "Tabel public.sezoane pe DB live (interval liber per club, un singur sezon activ per club impus prin index unic)"
  - "grupe.tip_grupa/sezon_id/arhivat si tipuri_abonament.sezon_id"
  - "hooks/useSezoane.ts (useSezoane/useSezonActiv/useSezonActivCurent)"
  - "interface Sezon in types.ts + 'sezoane' in View"
  - "CopyIcon in components/icons.tsx"
affects: [27-02, 27-03, 27-04, 27-05]

tech-stack:
  added: []
  patterns:
    - "Gate de rol pe politica RLS scopat STRICT pe randul active-role-context-id (nu doar user_id) — altfel un user cu roluri multiple trece gate-ul prin alt rand decat contextul activ"

key-files:
  created:
    - supabase/migrations/20260902_add_sezoane_grupe_tipuri_abonament.sql
    - tests/rls_izolare_sezoane_faza27.ts
    - hooks/useSezoane.ts
  modified:
    - types.ts
    - hooks/useDataProvider.ts
    - components/icons.tsx

key-decisions:
  - "sezoane_write foloseste EXISTS(...) scopat pe id = header active-role-context-id, identic cu is_super_admin()/has_access_to_club() — nu doar user_id (bug prins de test, fixat live)"
  - "DEVIATIE fata de presupunerea din research: plati.tip_abonament_id EXISTA (nullable) — planul 27-01 presupunea ca facturarea e denormalizata exclusiv prin suma+descriere. Nu s-a modificat nimic in aceasta migratie; relevant pentru 27-04/27-05."

patterns-established:
  - "Orice politica RLS noua cu gate de rol trebuie sa scopeze EXISTS-ul pe randul de context activ (active-role-context-id), nu doar pe auth.uid() — pattern canonic din fix_rls_context_aware_role_helpers.sql, acum si in politici custom pe tabele noi"

requirements-completed: [SEZ-01, SEZ-02, SEZ-03, SEZ-04, SEZ-06, SEZ-08]

duration: ~50min
completed: 2026-09-05
---

# Phase 27 Plan 01: Fundatie sezoane Summary

**Tabel public.sezoane aplicat live cu RLS scopat pe rol+context activ, index unic "un sezon activ per club", plus contractele TS (Sezon, useSezoane, sezon_id pe grupe/tipuri_abonament) consumate de restul fazei 27.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 3
- **Files modified:** 6 (1 nou SQL, 1 nou test, 1 nou hook, 3 modificate)

## Accomplishments
- Tabel `public.sezoane` live cu 7 coloane, 2 politici RLS, index unic partial `idx_sezoane_activ_per_club`
- Bug real de securitate prins si fixat: gate-ul de rol pe `sezoane_write` nu era scopat pe contextul activ — fixat inainte de a ajunge in productie neverificat
- `grupe.tip_grupa/sezon_id/arhivat` si `tipuri_abonament.sezon_id` adaugate fara sa afecteze cele 15 grupe / 5 tipuri de abonament existente
- Test automat `tests/rls_izolare_sezoane_faza27.ts` — 8/8 verificari PASS (izolare cross-club, gate rol INSTRUCTOR, enforcement DB pentru un singur sezon activ)
- Contracte TS complete: `Sezon`, `useSezoane`/`useSezonActiv`/`useSezonActivCurent`, `sezon_id` in select-ul `tipuri_abonament`, `CopyIcon`

## Task Commits

1. **Task 1: Audit live + scriere migratie** - `246f7e4` (feat)
2. **Task 2: Aplicare migratie live + test RLS (include fix bug gate rol)** - `0f961cb` (feat)
3. **Task 3: Contracte TypeScript** - `2b44652` (feat)

## Files Created/Modified
- `supabase/migrations/20260902_add_sezoane_grupe_tipuri_abonament.sql` - DDL sezoane + RLS + ALTER grupe/tipuri_abonament (fortat in git cu -f, pattern existent — `supabase/` e in .gitignore dar migratiile sunt urmarite explicit)
- `tests/rls_izolare_sezoane_faza27.ts` - test automat izolare cross-club + gate rol + enforcement D-03
- `hooks/useSezoane.ts` - useSezoane/useSezonActiv/useSezonActivCurent
- `types.ts` - interface Sezon, Grupa.tip_grupa/sezon_id/arhivat, TipAbonament.sezon_id, 'sezoane' in View
- `hooks/useDataProvider.ts` - sezon_id adaugat in select-ul explicit tipuri_abonament
- `components/icons.tsx` - CopyIcon

## Decisions Made
- Politica `sezoane_write` scopeaza gate-ul de rol pe randul de context activ (id = header), nu doar pe `auth.uid()` — pattern canonic, altfel un user ADMIN_CLUB+INSTRUCTOR ar trece gate-ul prin randul ADMIN_CLUB chiar si cu contextul activ pe INSTRUCTOR.

## Deviations from Plan

### Auto-fixed Issues

**1. [Correctness/Security] Gate de rol pe sezoane_write nescopat pe context activ**
- **Found during:** Task 2 (rulare test, verificarea 5 — INSERT ca INSTRUCTOR)
- **Issue:** Politica initiala verifica `EXISTS(... WHERE user_id = auth.uid() AND rol_denumire IN (...))` fara sa scopeze pe randul de context activ. Userul de test avea atat rand ADMIN_CLUB cat si rand INSTRUCTOR la CLUB_A; cu contextul activ setat pe INSTRUCTOR, INSERT-ul reusea gresit (trecea gate-ul prin randul ADMIN_CLUB).
- **Fix:** Adaugat `AND id = (NULLIF((current_setting('request.headers', true))::json ->> 'active-role-context-id', ''))::uuid` in EXISTS, identic cu pattern-ul din `is_super_admin()`/`has_access_to_club()`.
- **Files modified:** supabase/migrations/20260902_add_sezoane_grupe_tipuri_abonament.sql (fisier + aplicare live)
- **Verificare:** Test re-rulat, 8/8 PASS inclusiv verificarea 5.
- **Committed in:** 0f961cb

**2. Documentare deviatie factuala (nu cod)**
- **Found during:** Task 1 (audit live)
- **Issue:** 27-01-PLAN.md presupunea ca `plati` NU are `tip_abonament_id` (facturare denormalizata prin suma+descriere). Auditul live arata ca `plati.tip_abonament_id` EXISTA (nullable, uuid).
- **Fix:** Nicio schimbare de cod in acest plan — doar documentat aici pentru ca e load-bearing pe 27-04/27-05 (regula unica de rezolvare a tipului de abonament pe sezon trebuie sa ia in calcul si acest FK, nu doar sportivi/familii/participare_vacanta).
- **Files modified:** niciunul (doar comentariu in migratie + acest SUMMARY)

---

**Total deviations:** 2 (1 fix de securitate live, 1 corectare factuala documentata)
**Impact on plan:** Fix-ul de securitate era necesar — fara el D-02 (gate de rol) era spart silentios. Deviatia factuala nu schimba scope-ul acestui plan dar trebuie citita de planurile 27-04/27-05.

## Issues Encountered
- Dispatch prin subagent (worktree si non-worktree) blocat de clasificatorul auto-mode al mediului (migratie live pe DB productie) — plan executat inline, direct, cu confirmare explicita a utilizatorului pentru abordarea sequential/inline.

## Next Phase Readiness
- Wave 2 (27-02..27-05) poate incepe — toate contractele (`Sezon`, `useSezonActiv`/`useSezonActivCurent`, `CopyIcon`, `sezon_id` in date) sunt disponibile.
- Atentie pentru 27-04/27-05: `plati.tip_abonament_id` exista pe DB — regula de rezolvare a tipului de abonament activ trebuie sa acopere si acest camp, nu doar referintele din sportivi/familii/participare_vacanta enumerate in research.

---
*Phase: 27-sezoane-abonamente-si-grupe-sistem-sezoane-cu-interval-date-*
*Completed: 2026-09-05*
