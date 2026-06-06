---
phase: 05-color-theme-system
plan: "01"
subsystem: theme-system
tags: [typescript, css-variables, themes, sql-migration, icons]
dependency_graph:
  requires: []
  provides:
    - ThemeConfig interface (types.ts)
    - lib/themes.ts (PREDEFINED_THEMES, DEFAULT_THEME, applyTheme)
    - 12 --t-* CSS custom properties in index.css
    - PaletteIcon in components/icons.tsx
    - sql/add_tema_config.sql migration (on disk, gitignored)
  affects:
    - types.ts (ThemeConfig added)
    - index.css (--t-* vars added)
    - components/icons.tsx (PaletteIcon added)
tech_stack:
  added:
    - lib/ directory created
  patterns:
    - CSS custom property namespace --t-* (coexists with --bg-*, --brand-*)
    - ThemeConfig typed theme objects with 12 color fields
key_files:
  created:
    - lib/themes.ts
    - sql/add_tema_config.sql (gitignored, on disk only)
  modified:
    - types.ts (ThemeConfig interface appended)
    - index.css (12 --t-* vars in :root)
    - components/icons.tsx (Palette import + PaletteIcon export)
decisions:
  - Use --t-* CSS variable prefix to avoid collision with existing --bg-*, --brand-*, --accent vars
  - lib/themes.ts (not root) to avoid collision with root themes.ts used by SystemGuardian
  - Club.theme_config stays as Record<string,string>|null (legacy); new ThemeConfig is separate type
  - sql/ directory is gitignored per project convention (DB structure treated as sensitive)
metrics:
  duration: "~20 minutes"
  completed: "2026-06-06"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 3
---

# Phase 05 Plan 01: Theme System Foundation Summary

**One-liner:** ThemeConfig TypeScript interface + 8 predefined themes library (lib/themes.ts) + 12 --t-* CSS fallback vars + PaletteIcon + idempotent SQL migration for tema_config columns.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ThemeConfig in types.ts + lib/themes.ts | c136a0f | types.ts, lib/themes.ts |
| 2 | CSS vars + PaletteIcon + SQL migration | db450d6 | index.css, components/icons.tsx |

## What Was Built

### Task 1: ThemeConfig + lib/themes.ts

Added `ThemeConfig` interface to `types.ts` (appended after `CerereCoechipier`):
- 13 fields: `name` + 12 color tokens (bg, surface, surface2, border, text, textMuted, primary, primaryHover, primaryFg, secondary, secondaryHover, secondaryFg)

Created `lib/themes.ts` with:
- `DEFAULT_THEME`: QwanKiDo Blue theme (bg=#020617, primary=#3b82f6)
- `PREDEFINED_THEMES`: array of 8 themes [QwanKiDo Blue, Midnight Navy, Forest, Crimson, Violet, Amber, Ocean, Graphite]
- `applyTheme(theme: ThemeConfig)`: sets 12 --t-* CSS vars on document.documentElement

Root `themes.ts` (SystemGuardian, uses --bg-main vars) was not touched.

### Task 2: CSS Variables + Icon + SQL Migration

Added 12 `--t-*` CSS custom properties to `:root` in `index.css`:
```css
--t-bg: #020617;
--t-surface: #0f172a;
--t-surface-2: #1e293b;
--t-border: #1e293b;
--t-text: #f8fafc;
--t-text-muted: #94a3b8;
--t-primary: #3b82f6;
--t-primary-hover: #2563eb;
--t-primary-fg: #ffffff;
--t-secondary: #1e293b;
--t-secondary-hover: #334155;
--t-secondary-fg: #e2e8f0;
```

Added `Palette` to lucide-react import in `components/icons.tsx` and exported `PaletteIcon = Palette`.

Created `sql/add_tema_config.sql` (on disk, gitignored per project convention):
- ALTER TABLE cluburi ADD COLUMN IF NOT EXISTS tema_config jsonb
- ALTER TABLE utilizatori ADD COLUMN IF NOT EXISTS tema_config jsonb
- DO $$ blocks for RLS policies: cluburi_tema_config_admin_update + utilizatori_tema_config_self_update

## Deviations from Plan

### Note: SQL Migration Applied Manually Required

**Found during:** Task 2 — SQL application step

**Issue:** No Supabase CLI installed, no management API personal access token available. The service role key (`sb_secret_*` format) is not accepted by the Supabase Management API. The `exec_sql` RPC function does not exist in the project's public schema.

**Resolution:** SQL file created at `sql/add_tema_config.sql` (verified correct content). The file is gitignored per project convention (comment in `.gitignore`: "SQL — schema DB, migrații, RLS policies, fixuri (informații sensibile despre structura DB)"). The migration must be applied manually via the Supabase Dashboard SQL Editor or CLI.

**Action required:** Apply `sql/add_tema_config.sql` in the Supabase SQL Editor for project `wuhidifzsutwgdfkwhmd` before Plan 02 uses the tema_config columns.

**Verification query after applying:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name IN ('cluburi', 'utilizatori') AND column_name = 'tema_config';
-- Should return 2 rows
```

### Note: sql/ directory gitignored

**Found during:** Task 2 commit

**Issue:** `sql/` is listed in `.gitignore` (lines 13-15) as intentionally excluded. SQL file exists on disk but was not committed to git.

**Status:** Expected behavior per project convention. File is still present at `C:/Users/lungu/portal-phihau/sql/add_tema_config.sql`.

## Decisions Made

1. **--t-* prefix namespace**: Avoids collision with existing --bg-*, --brand-*, --accent CSS vars. ThemeContext (Plan 02) will call applyTheme() to override these at runtime.

2. **lib/themes.ts location**: Separate from root `themes.ts` (used by SystemGuardian for --bg-main vars). lib/themes.ts handles the new --t-* system exclusively.

3. **Club.theme_config untouched**: Existing `Club.theme_config: Record<string, string> | null` field preserved. New `ThemeConfig` is the canonical type for the new color theme system.

4. **8 predefined themes**: Covers dark-mode-only palette variants that match existing app aesthetics.

## Known Stubs

None. All artifacts are complete and functional. The only pending item is the manual SQL migration application.

## Threat Flags

No new security surface beyond what was modeled in the plan's threat model (T-05-01, T-05-02 addressed via RLS in the migration; T-05-03 accepted).

## Self-Check: PASSED

- types.ts: ThemeConfig interface FOUND
- lib/themes.ts: EXISTS, exports DEFAULT_THEME + PREDEFINED_THEMES (8) + applyTheme
- index.css: 13 lines with --t-* (12 vars + 1 comment line with --t- in it) FOUND
- components/icons.tsx: PaletteIcon export FOUND
- sql/add_tema_config.sql: EXISTS on disk (gitignored)
- git commits: c136a0f + db450d6 both FOUND in log
- tsc --noEmit: PASSED (no errors)
- root themes.ts: unchanged (no --t-* vars)
