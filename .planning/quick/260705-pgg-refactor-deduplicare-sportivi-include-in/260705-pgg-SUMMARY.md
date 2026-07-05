---
status: complete
---

# Quick Task 260705-pgg: Refactor Deduplicare Sportivi — include inactivi + merge delete + acces pe rol — Summary

## What was built

1. **`sql/fixes/fix_deduplicare_include_inactivi_merge_delete.sql`** (new migration, written to disk, **NOT applied live**) — redefines both RPC functions used by the Deduplicare Sportivi module:
   - `find_similar_sportivi()`: removed the `WHERE s.status IS DISTINCT FROM 'Inactiv'` filter (per DEDUP-INACTIVI, inactive athletes now appear as potential duplicates), added exclusion of legacy merge tombstones (`(propunere_modificare ->> 'merge_in') IS NULL`) so already-merged pairs from before this migration don't resurface, and added explicit club scoping (`is_super_admin() OR club_id = <active-context club>`) mirroring the `Select_Sportivi_Unified` policy pattern — required because the function is `SECURITY DEFINER` and cannot rely on RLS to filter it.
   - `merge_sportivi(p_primar_id, p_secundar_id)`: added an access guard right after the row locks (`has_access_to_club(primar.club_id) AND has_access_to_club(secundar.club_id)`, raises an exception otherwise) so ADMIN_CLUB can only merge within its own club while SUPER_ADMIN_FEDERATIE can merge cross-club; replaced the hardcoded 12-table reassignment loop with dynamic FK discovery via `information_schema` (any column in `public` schema that FKs to `sportivi.id`, discovered at call time — no future migration needed when a new referencing table is added); replaced the final `UPDATE ... SET status='Inactiv'` + tombstone with an actual `DELETE FROM public.sportivi WHERE id = p_secundar_id`, still inside the same transaction as the FK reassignment (so any leftover unreassigned FK causes a `foreign_key_violation` and a full rollback — no data loss). Return JSON now reports `'secundar_sters': true` instead of `'secundar_dezactivat': true`. Added `GRANT EXECUTE ... TO authenticated` for both functions and a documentation header.

2. **Frontend alignment** (`components/Sportivi/DeduplicareSportivi/index.tsx`, `ModalConfirmareFuzionare.tsx`, `types.ts`) — commit `70db87e`:
   - Local fallback path (used only when the RPC is unavailable) in `executaFuzionare`: now completes `telefon` and `adresa` on the primary record (in addition to the fields it already completed), and performs an actual `DELETE` of the duplicate row, falling back to the old `status: 'Inactiv'` update only if the delete errors (defensive — the RPC path is primary and always deletes).
   - Extended the local `SportivCard` interface (module-scoped file, not root `types.ts`) with `adresa?: string | null`, and added `adresa` to the fallback-mode `select(...)` query — without this the completion logic for `adresa` would have been silently inert (fixed as a Rule 1 bug: the plan asked to add `adresa` to the completion object, but the field was never fetched in fallback mode).
   - Success toast now says the duplicate account was "eliminat" (removed) instead of "dezactivat" (deactivated).
   - `ModalConfirmareFuzionare.tsx` warning box now says the secondary account "se șterge definitiv" instead of "se dezactivează".
   - Left untouched: root `types.ts`, `components/ui.tsx`, `DataContext`, `useDataProvider`, `CardPereache.tsx`, `SportivInfoCard.tsx`, `utils.ts` (status Activ/Inactiv display already existed there, so inactive athletes will show correctly once they appear in the list).

## Migration NOT applied live

Per explicit task constraint, the SQL migration was **written to disk only** and was **not** applied to the Supabase database (no `apply_migration` call was made). `merge_sportivi()` now performs an irreversible `DELETE` on `public.sportivi` (previously only deactivated the row), so the user should review the file before applying it.

**To apply when ready, pick one:**

- **Supabase SQL Editor (recommended for review):** open the project's SQL Editor, paste the contents of `sql/fixes/fix_deduplicare_include_inactivi_merge_delete.sql`, review, then run it.
- **Supabase MCP `apply_migration`:** from an agent session with Supabase MCP access, call `apply_migration` with the contents of that file against the active project (`wuhidifzsutwgdfkwhmd`, per the prior `260705-irg` task's live project).

**Suggested verification after applying** (also documented in the plan's `<verify>` block):

1. `SELECT count(*) FILTER (WHERE (sportiv_a_json->>'status')='Inactiv' OR (sportiv_b_json->>'status')='Inactiv') FROM find_similar_sportivi();` — should be able to return `> 0` if inactive duplicates exist.
2. On a test pair: `SELECT merge_sportivi('<primar>', '<secundar>');` then `SELECT count(*) FROM sportivi WHERE id = '<secundar>';` — should return `0` (row deleted).
3. Confirm an FK-referencing row (e.g. in `plati`) that belonged to the secondary athlete now has `sportiv_id = <primar>`.
4. As an ADMIN_CLUB, confirm attempting to merge a pair from a different club raises the access-guard exception; as SUPER_ADMIN_FEDERATIE, confirm cross-club merge succeeds.

Note: `sql/` is gitignored project-wide in this repo (deliberate convention — DB structure/migrations not tracked in git, confirmed by the prior `260705-irg` task and `.gitignore` line 14). The migration file exists on disk locally only; it was not committed to git (git commit was not attempted for it, consistent with repo convention — attempting to force-add gitignored `sql/` content would violate the project's security convention).

## Deferred / notable decisions

- Extending the local `SportivCard` interface with `adresa` was necessary (not just cosmetic) — without it, TypeScript would still compile via the `(x as any).adresa` pattern the plan allowed as a fallback, but a clean typed field was used instead since the file is module-local and out of the root `types.ts` scope restriction.
- Adding `adresa` to the fallback-mode `select(...)` query was an additional fix beyond the plan's literal wording (which only mentioned adding it to the `completari` object) — without the column being fetched, the new completion logic for `adresa` would never have any data to act on. Tracked as `[Rule 1 - Bug] Fixed missing adresa column in fallback select query`.

## Verification

- `npm run lint` (`tsc --noEmit`) — passes clean, no errors.
- SQL migration verification is deferred to the user per the task's explicit constraint (no live DB changes performed by this executor run).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing `adresa` column in fallback-mode select query**
- **Found during:** Task 2
- **Issue:** The plan instructed adding `telefon`/`adresa` completion logic to the local fallback path, but the fallback's `select(...)` query only fetched `telefon`, not `adresa` — so `secundar.adresa` would always be `undefined` and the new completion branch would never fire.
- **Fix:** Added `adresa` to the `select('id, nume, prenume, ..., telefon, adresa, ...')` string in the fallback branch of `incarcaDate`.
- **Files modified:** `components/Sportivi/DeduplicareSportivi/index.tsx`
- **Commit:** `70db87e`

## Known Stubs

None.

## Threat Flags

None — this plan's SQL migration directly implements the mitigations from its own `<threat_model>` (T-pgg-01, T-pgg-02, T-pgg-03); no new unmitigated surface was introduced.

## Self-Check

- `sql/fixes/fix_deduplicare_include_inactivi_merge_delete.sql` — FOUND (written to disk, not committed — gitignored per repo convention)
- `components/Sportivi/DeduplicareSportivi/index.tsx` — FOUND (modified, commit `70db87e`)
- `components/Sportivi/DeduplicareSportivi/ModalConfirmareFuzionare.tsx` — FOUND (modified, commit `70db87e`)
- `components/Sportivi/DeduplicareSportivi/types.ts` — FOUND (modified, commit `70db87e`)
- Commit `70db87e` — present in `git log`

## Self-Check: PASSED
