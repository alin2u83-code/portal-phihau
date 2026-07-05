---
phase: quick-260705-irg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - sql/migrations/fix_rls_context_aware_role_helpers.sql
  - components/Sportivi/DeduplicareSportivi/index.tsx
  - components/Sportivi/DeduplicareSportivi/CardPereache.tsx
  - components/Sportivi/DeduplicareSportivi/SportivInfoCard.tsx
autonomous: false
requirements: [RLS-CTX-01, DEDUP-CLUB-02]

must_haves:
  truths:
    - "is_super_admin() returns true only when the active-role-context-id header points to a SUPER_ADMIN_FEDERATIE row"
    - "este_staff_club(p_club_id) / has_access_to_club(p_club_id) evaluate only the active role context row, not any row for the user"
    - "A multi-role user in ADMIN_CLUB context sees only their own club's sportivi in Deduplicare Sportivi (no cross-club pairs)"
    - "Club name is shown per sportiv in Deduplicare Sportivi only when the active role is SUPER_ADMIN_FEDERATIE"
  artifacts:
    - path: "sql/migrations/fix_rls_context_aware_role_helpers.sql"
      provides: "Context-aware redefinitions of is_super_admin, este_staff_club, has_access_to_club"
      contains: "active-role-context-id"
    - path: "components/Sportivi/DeduplicareSportivi/SportivInfoCard.tsx"
      provides: "Optional club-name row rendered for federation admins"
  key_links:
    - from: "RLS helper functions"
      to: "request.headers -> active-role-context-id -> utilizator_roluri_multicont.id"
      via: "current_setting('request.headers', true)::json ->> 'active-role-context-id'"
      pattern: "active-role-context-id"
    - from: "DeduplicareSportivi/index.tsx"
      to: "SportivInfoCard club name"
      via: "clubMap + afiseazaClub props through CardPereache"
      pattern: "clubMap"
---

<objective>
Fix a cross-club RLS leak in Supabase project `wuhidifzsutwgdfkwhmd`: the `SECURITY DEFINER` helpers `is_super_admin()`, `este_staff_club(p_club_id)` and `has_access_to_club(p_club_id)` currently check whether the user holds a role on ANY row (`user_id = auth.uid()`), ignoring the active-role-context-id request header. A multi-role user (ADMIN_CLUB + SUPER_ADMIN_FEDERATIE) therefore sees all clubs' sportivi even when the active context is ADMIN_CLUB. Rewrite the helpers to evaluate only the `utilizator_roluri_multicont` row identified by the `active-role-context-id` header, matching the pattern already used correctly in policy `Select_Sportivi_Unified`.

Also surface each sportiv's club name in the Deduplicare Sportivi UI, gated to the SUPER_ADMIN_FEDERATIE context only.

Purpose: Enforce context-scoped visibility so RLS matches the active role, and give federation admins the club context they need when reviewing cross-club duplicates.
Output: A committed SQL migration applied to the live DB, plus three edited frontend files.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@components/Sportivi/DeduplicareSportivi/index.tsx
@components/Sportivi/DeduplicareSportivi/CardPereache.tsx
@components/Sportivi/DeduplicareSportivi/SportivInfoCard.tsx

Reference — the correct header-reading pattern (from policy `Select_Sportivi_Unified.qual`):
the row is selected via `utilizator_roluri_multicont.id = (NULLIF((current_setting('request.headers', true))::json ->> 'active-role-context-id', ''))::uuid`, joined with `user_id = auth.uid()`.

Frontend facts confirmed while reading the codebase:
- `useData()` exposes both `permissions` and `activeRoleContext`; `permissions.isFederationAdmin` is true for SUPER_ADMIN_FEDERATIE (see `usePermissions`).
- `gradeMap` is fetched in `index.tsx` from `supabase.from('grade').select('id, nume')` and threaded through `CardPereache` into `SportivInfoCard`. The club map follows the identical shape.
- Clubs live in table `cluburi` with columns `id` and `nume`.
- `SportivCard` already carries `club_id` (see `DeduplicareSportivi/types.ts`).
</context>

<tasks>

<task type="auto">
  <name>Task 1: Context-aware RLS helper migration (write + apply + verify)</name>
  <files>sql/migrations/fix_rls_context_aware_role_helpers.sql</files>
  <action>
Create the migration file with `CREATE OR REPLACE FUNCTION` statements for all three helpers, preserving their existing signatures, return types, `LANGUAGE plpgsql`, `SECURITY DEFINER`, and `SET search_path TO 'public', 'pg_catalog'` (keep `is_super_admin` `STABLE`).

Rewrite each helper so its EXISTS check is scoped to the single `utilizator_roluri_multicont` row identified by the active-role-context-id header, i.e. add both `user_id = auth.uid()` AND `id = (NULLIF((current_setting('request.headers', true))::json ->> 'active-role-context-id', ''))::uuid` to the WHERE clause, then apply the role/club predicate on that row only:
- `is_super_admin()`: that active-context row has `rol_denumire = 'SUPER_ADMIN_FEDERATIE'`.
- `este_staff_club(p_club_id)`: that active-context row has `club_id = p_club_id AND rol_denumire = ANY (ARRAY['ADMIN_CLUB','INSTRUCTOR'])`.
- `has_access_to_club(p_club_id)`: that active-context row satisfies `rol_denumire IN ('SUPER_ADMIN_FEDERATIE','ADMIN') OR (club_id = p_club_id AND rol_denumire IN ('ADMIN_CLUB','INSTRUCTOR'))`.

Keep the `NULLIF(...,'')::uuid` guard so a missing/empty header yields NULL (no row matches → helper returns false) rather than a cast error. Do NOT change the RPCs in `add_deduplicare_sportivi.sql`.

After writing the file, apply it to the live project via `mcp__plugin_supabase_supabase__apply_migration` (project_id `wuhidifzsutwgdfkwhmd`, name `fix_rls_context_aware_role_helpers`). Do NOT hand-edit functions only in the DB — the file is the source of truth and must match.
  </action>
  <verify>
    <automated>Run mcp__plugin_supabase_supabase__execute_sql on project wuhidifzsutwgdfkwhmd: `SELECT proname, pg_get_functiondef(oid) FROM pg_proc WHERE proname IN ('is_super_admin','este_staff_club','has_access_to_club');` and confirm each definition contains the substring `active-role-context-id`.</automated>
  </verify>
  <done>All three deployed function definitions read the active-role-context-id header; the migration file exists in sql/migrations/ and its SQL is identical to what was applied.</done>
</task>

<task type="auto">
  <name>Task 2: Show club name in Deduplicare Sportivi for federation admins</name>
  <files>components/Sportivi/DeduplicareSportivi/index.tsx, components/Sportivi/DeduplicareSportivi/CardPereache.tsx, components/Sportivi/DeduplicareSportivi/SportivInfoCard.tsx</files>
  <action>
In `index.tsx`: destructure `permissions` from `useData()` alongside `setSportivi`. Add a `clubMap` state (`Record<string, string>`) and, inside `incarcaDate` next to the existing `grade` fetch, load `supabase.from('cluburi').select('id, nume')` and build the id→nume map (mirror the `gradeMap` construction exactly). Compute `const afiseazaClub = permissions.isFederationAdmin;`. Pass `clubMap={clubMap}` and `afiseazaClub={afiseazaClub}` into every `<CardPereache>` render (and optionally `<ModalConfirmareFuzionare>` if it also renders `SportivInfoCard`; only add there if needed to keep types consistent).

In `CardPereache.tsx`: add `clubMap: Record<string, string>` and `afiseazaClub: boolean` to the props type, accept them in the destructure, and forward both to each `<SportivInfoCard>`.

In `SportivInfoCard.tsx`: add `clubMap: Record<string, string>` and `afiseazaClub: boolean` to the props type. When `afiseazaClub && sportiv.club_id`, render a club-name line inside the existing detail `space-y-1` block (place it near the grad line), e.g. a small muted paragraph showing `clubMap[sportiv.club_id] || '—'` prefixed with `Club:`. Render nothing when `afiseazaClub` is false, so ADMIN_CLUB/INSTRUCTOR contexts are unaffected.
  </action>
  <verify>
    <automated>npm run lint</automated>
  </verify>
  <done>`tsc --noEmit` passes; club name renders per sportiv only for SUPER_ADMIN_FEDERATIE context; no club line appears in other contexts; no new Supabase query added beyond the single cluburi fetch.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Context-aware RLS helpers applied to the live DB and club-name display gated to federation admins in Deduplicare Sportivi.</what-built>
  <how-to-verify>
1. Log in as the multi-role user (Sportiv + ADMIN_CLUB @ C.S. Phi Hau + SUPER_ADMIN_FEDERATIE).
2. Select the "Admin - C.S. Phi Hau" context, open Sportivi -> Deduplicare Sportivi. Confirm NO cross-club pairs appear (previously 38 pairs including `@frqkd.ro` / `@kimlongdaofalticeni.ro`); only C.S. Phi Hau sportivi should show, and no "Club:" line should be visible.
3. Switch to the SUPER_ADMIN_FEDERATIE context, reopen Deduplicare Sportivi. Cross-club pairs may now legitimately appear, and each sportiv card should now show a "Club:" line with the club name.
  </how-to-verify>
  <resume-signal>Type "approved" or describe the discrepancy.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| authenticated client -> Supabase RLS | Client sets `active-role-context-id` header; RLS helpers must honor it |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-irg-01 | Elevation of Privilege | is_super_admin/este_staff_club/has_access_to_club | mitigate | Scope EXISTS to the active-context row so a lower-privilege active context cannot inherit a higher role held on another row |
| T-irg-02 | Information Disclosure | sportivi RLS policies | mitigate | Header-scoped helpers stop cross-club sportivi leaking into ADMIN_CLUB context |
| T-irg-03 | Spoofing | active-role-context-id header | accept | Header validity is already enforced by joining on `utilizator_roluri_multicont.id = header AND user_id = auth.uid()`; a forged id not owned by the user matches no row |
</threat_model>

<verification>
- Deployed definitions of all three helpers contain `active-role-context-id` (Task 1 verify query).
- `npm run lint` (tsc --noEmit) passes after frontend edits.
- Human verification confirms context-scoped visibility and gated club display.
</verification>

<success_criteria>
- RLS helpers are context-aware and applied live to project `wuhidifzsutwgdfkwhmd`, with a matching committed migration file.
- ADMIN_CLUB context no longer leaks other clubs' sportivi in Deduplicare Sportivi.
- Club name displays per sportiv only under SUPER_ADMIN_FEDERATIE context.
- No new Supabase queries beyond a single `cluburi` fetch; existing component APIs stay backward compatible.
</success_criteria>

<output>
Create `.planning/quick/260705-irg-fix-rls-context-aware-role-check-si-afis/260705-irg-SUMMARY.md` when done.
</output>
