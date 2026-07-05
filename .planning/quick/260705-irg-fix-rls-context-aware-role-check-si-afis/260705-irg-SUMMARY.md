---
status: complete
---

# Quick Task 260705-irg: Fix RLS context-aware role check + club display — Summary

## What was built

1. **`sql/migrations/fix_rls_context_aware_role_helpers.sql`** — Rewrote `is_super_admin()`, `este_staff_club(p_club_id)`, `has_access_to_club(p_club_id)` to scope their `EXISTS` check to the single `utilizator_roluri_multicont` row identified by the `active-role-context-id` request header (joined with `user_id = auth.uid()`), instead of matching any row the user holds. Applied live to Supabase project `wuhidifzsutwgdfkwhmd` and verified via `pg_get_functiondef`.

2. **`sql/migrations/fix_select_sportivi_unified_club_scope.sql`** (follow-up, found during live verification) — The `Select_Sportivi_Unified` policy also had `EXISTS (inscrieri_competitie) OR EXISTS (echipa_sportivi)` branches that granted unconditional cross-club visibility to any sportiv registered in ANY competition/team, bypassing the header-scoped fix entirely. Confirmed live via raw REST query (a `kimlongdaofalticeni.ro` sportiv was visible under the Phi Hau ADMIN_CLUB context solely because of team membership). Removed those branches; policy is now `is_super_admin() OR club_id = (active-context club)`. User approved this scope expansion via AskUserQuestion mid-task.

3. **Frontend club display** — `components/Sportivi/DeduplicareSportivi/{index.tsx,CardPereache.tsx,SportivInfoCard.tsx}` (commit `d9e0ec8`): added a `clubMap` (id→nume from `cluburi`, fetched alongside the existing `gradeMap`) and `afiseazaClub = permissions.isFederationAdmin`, threaded through `CardPereache` into `SportivInfoCard`. A "Club: {nume}" line now renders per sportiv only when the active context is SUPER_ADMIN_FEDERATIE.

## Verification

- Direct RLS test (curl with real JWT + `active-role-context-id` header): ADMIN_CLUB (C.S. Phi Hau) context returns `[]` for another club's sportivi (was leaking ~20 rows before the second fix); SUPER_ADMIN_FEDERATIE context still returns them (unrestricted, as intended).
- Live Playwright UI test: ADMIN_CLUB context — 31 duplicate pairs, all confirmed same-club (no more `kimlongdaofalticeni.ro` cross-club pair), no "Club:" line shown. SUPER_ADMIN_FEDERATIE context — 38 pairs (cross-club legitimately visible), "Club: C.S. Phi Hau" line renders per sportiv.
- `npm run lint` (tsc --noEmit) — not re-run after the second SQL fix since it's DB-only; frontend files unchanged since original lint pass by the executor.

## Notes

- `sql/` is gitignored project-wide (deliberate convention — DB structure not tracked in git); both migration files exist on disk locally but are not committed. They are the source of truth for what was applied live; re-apply manually if the DB is ever restored from an older snapshot.
- A debug probe function (`debug_headers_probe`) was created and dropped during investigation — no trace left in the DB.
